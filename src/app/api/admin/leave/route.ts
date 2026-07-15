import { z } from "zod";
import { AccessControlError, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { handleApiError, ok } from "@/lib/api-response";
import { calculateAnnualLeave, type LeaveCalculationBasis } from "@/lib/annual-leave";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { createSupabaseUserClient } from "@/lib/supabase";

type Row = Record<string, unknown>;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const settingsSchema = z.object({
  resource: z.literal("settings"),
  organizationId: z.string().uuid(),
  headcount: z.coerce.number().int().min(0).max(100000),
  calculationBasis: z.enum(["hire_date", "calendar_year"]),
  effectiveFrom: dateSchema
});
const employmentSchema = z.object({
  resource: z.literal("employment"),
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  profileId: z.string().uuid(),
  hireDate: dateSchema,
  terminationDate: dateSchema.nullable().optional(),
  weeklyHours: z.coerce.number().min(0).max(168),
  annualAttendanceRate: z.coerce.number().min(0).max(1).nullable().optional(),
  employmentType: z.string().trim().min(1).max(50).default("regular"),
  monthlyAttendance: z.record(z.boolean().nullable()).default({})
});
const mutationSchema = z.discriminatedUnion("resource", [settingsSchema, employmentSchema]);

export async function GET(request: Request) {
  try {
    const access = await requireAdmin(request);
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") || undefined;
    const asOfDate = url.searchParams.get("asOfDate") || new Date().toISOString().slice(0, 10);
    dateSchema.parse(asOfDate);

    if (!isLiveSupabaseMode()) {
      return ok({ settings: [], staff: [], asOfDate, mode: "mock" });
    }

    const supabase = requireSupabase(access.accessToken);
    let employmentQuery = supabase.from("staff_employment_records").select("*").order("hire_date", { ascending: true });
    let settingsQuery = supabase.from("organization_leave_settings").select("*");
    let grantsQuery = supabase.from("annual_leave_grants").select("organization_id, profile_id, used_days");
    let membershipQuery = supabase.from("memberships").select("organization_id, profile_id, role");
    if (organizationId) {
      employmentQuery = employmentQuery.eq("organization_id", organizationId);
      settingsQuery = settingsQuery.eq("organization_id", organizationId);
      grantsQuery = grantsQuery.eq("organization_id", organizationId);
      membershipQuery = membershipQuery.eq("organization_id", organizationId);
    }

    const [employmentResult, settingsResult, grantsResult, membershipResult] = await Promise.all([
      employmentQuery,
      settingsQuery,
      grantsQuery,
      membershipQuery
    ]);
    if (employmentResult.error) throw employmentResult.error;
    if (settingsResult.error) throw settingsResult.error;
    if (grantsResult.error) throw grantsResult.error;
    if (membershipResult.error) throw membershipResult.error;

    const employmentRows = (employmentResult.data ?? []) as Row[];
    const membershipRows = (membershipResult.data ?? []) as Row[];
    const profileIds = [...new Set([
      ...employmentRows.map((row) => asString(row.profile_id)),
      ...membershipRows.map((row) => asString(row.profile_id))
    ].filter(Boolean))];
    const profilesResult = profileIds.length
      ? await supabase.from("profiles").select("id, name, email").in("id", profileIds)
      : { data: [], error: null };
    if (profilesResult.error) throw profilesResult.error;

    const profiles = new Map(((profilesResult.data ?? []) as Row[]).map((row) => [asString(row.id), row]));
    const settings = ((settingsResult.data ?? []) as Row[]).map(mapSettings);
    const settingsByOrganization = new Map(settings.map((item) => [item.organizationId, item]));
    const usedByProfile = new Map<string, number>();
    for (const row of (grantsResult.data ?? []) as Row[]) {
      const key = `${asString(row.organization_id)}:${asString(row.profile_id)}`;
      usedByProfile.set(key, (usedByProfile.get(key) ?? 0) + Number(row.used_days ?? 0));
    }

    return ok({
      asOfDate,
      settings,
      staffMembers: membershipRows.map((row) => ({
        organizationId: asString(row.organization_id),
        profileId: asString(row.profile_id),
        role: asString(row.role),
        name: asString(profiles.get(asString(row.profile_id))?.name),
        email: asString(profiles.get(asString(row.profile_id))?.email)
      })),
      staff: employmentRows.map((row) => {
        const staffOrganizationId = asString(row.organization_id);
        const staffProfileId = asString(row.profile_id);
        const setting = settingsByOrganization.get(staffOrganizationId);
        const summary = calculateAnnualLeave(
          {
            hireDate: asString(row.hire_date),
            asOfDate,
            terminationDate: nullableString(row.termination_date),
            headcount: setting?.headcount ?? 0,
            weeklyHours: Number(row.weekly_hours ?? 0),
            attendanceRate: nullableNumber(row.annual_attendance_rate),
            monthlyAttendance: asMonthlyAttendance(row.monthly_attendance),
            calculationBasis: setting?.calculationBasis ?? "hire_date"
          },
          usedByProfile.get(`${staffOrganizationId}:${staffProfileId}`) ?? 0
        );

        return {
          id: asString(row.id),
          organizationId: staffOrganizationId,
          profileId: staffProfileId,
          name: asString(profiles.get(staffProfileId)?.name),
          email: asString(profiles.get(staffProfileId)?.email),
          hireDate: asString(row.hire_date),
          terminationDate: nullableString(row.termination_date),
          weeklyHours: Number(row.weekly_hours ?? 0),
          annualAttendanceRate: nullableNumber(row.annual_attendance_rate),
          employmentType: asString(row.employment_type),
          monthlyAttendance: asMonthlyAttendance(row.monthly_attendance),
          summary
        };
      })
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAdmin(request);
    const mutation = mutationSchema.parse(await request.json());
    if (!isLiveSupabaseMode()) return ok({ saved: false, reason: "mock_mode", mutation });

    const supabase = requireSupabase(access.accessToken);
    if (mutation.resource === "settings") {
      const { data, error } = await supabase
        .from("organization_leave_settings")
        .upsert({
          organization_id: mutation.organizationId,
          headcount: mutation.headcount,
          calculation_basis: mutation.calculationBasis,
          effective_from: mutation.effectiveFrom,
          updated_by: access.profileId,
          updated_at: new Date().toISOString()
        }, { onConflict: "organization_id" })
        .select("*")
        .single();
      if (error) throw error;
      return ok({ saved: true, resource: "settings", item: mapSettings(data as Row) });
    }

    const row = {
      organization_id: mutation.organizationId,
      profile_id: mutation.profileId,
      hire_date: mutation.hireDate,
      termination_date: mutation.terminationDate || null,
      weekly_hours: mutation.weeklyHours,
      annual_attendance_rate: mutation.annualAttendanceRate ?? null,
      employment_type: mutation.employmentType,
      monthly_attendance: mutation.monthlyAttendance,
      created_by: access.profileId,
      updated_at: new Date().toISOString()
    };
    const query = mutation.id
      ? supabase.from("staff_employment_records").update(row).eq("id", mutation.id)
      : supabase.from("staff_employment_records").upsert(row, { onConflict: "organization_id,profile_id" });
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return ok({ saved: true, resource: "employment", item: mapEmployment(data as Row) });
  } catch (error) {
    return handleApiError(error);
  }
}

async function requireAdmin(request: Request) {
  const access = await resolveRequestAccessContext(request);
  if (access.source === "anonymous") {
    throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
  }
  assertRoleScope(access, ["admin"]);
  return access;
}

function requireSupabase(accessToken?: string) {
  const client = accessToken ? createSupabaseUserClient(accessToken) : null;
  if (!client) throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
  return client;
}

function mapSettings(row: Row) {
  return {
    organizationId: asString(row.organization_id),
    headcount: Number(row.headcount ?? 0),
    calculationBasis: asString(row.calculation_basis) as LeaveCalculationBasis,
    effectiveFrom: asString(row.effective_from)
  };
}

function mapEmployment(row: Row) {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    profileId: asString(row.profile_id),
    hireDate: asString(row.hire_date),
    terminationDate: nullableString(row.termination_date),
    weeklyHours: Number(row.weekly_hours ?? 0),
    annualAttendanceRate: nullableNumber(row.annual_attendance_rate),
    employmentType: asString(row.employment_type),
    monthlyAttendance: asMonthlyAttendance(row.monthly_attendance)
  };
}

function asMonthlyAttendance(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "boolean" ? item : null]));
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
