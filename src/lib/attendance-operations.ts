import { z } from "zod";
import {
  AccessControlError,
  assertRoleScope,
  resolveRequestAccessContext,
  type RequestAccessContext
} from "./access-control";
import { isLiveSupabaseMode } from "./env-flags";
import { createSupabaseUserClient } from "./supabase";

type Row = Record<string, unknown>;
type SupabaseClient = NonNullable<ReturnType<typeof createSupabaseUserClient>>;

export const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused"]);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "유효한 날짜를 입력하세요.");
const classNameSchema = z.string().trim().min(1).max(100);

export const attendanceScopeSchema = z.object({
  organizationId: z.string().uuid(),
  attendanceDate: dateSchema,
  className: classNameSchema
});

export const attendanceBulkUpsertSchema = attendanceScopeSchema
  .extend({
    records: z
      .array(
        z.object({
          childName: z.string().trim().min(1).max(100),
          status: attendanceStatusSchema,
          note: z.string().max(1000).default("")
        })
      )
      .min(1)
      .max(500)
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.records.forEach((record, index) => {
      const key = record.childName.toLocaleLowerCase();
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["records", index, "childName"],
          message: "같은 원아를 한 요청에 중복해서 저장할 수 없습니다."
        });
      }
      seen.add(key);
    });
  });

export const attendanceClosureSchema = attendanceScopeSchema.extend({
  action: z.enum(["close", "reopen"])
});

export type AttendanceScope = z.infer<typeof attendanceScopeSchema>;
export type AttendanceBulkUpsert = z.infer<typeof attendanceBulkUpsertSchema>;
export type AttendanceClosureMutation = z.infer<typeof attendanceClosureSchema>;

export interface AttendanceRosterItem {
  id: string | null;
  childName: string;
  status: z.infer<typeof attendanceStatusSchema>;
  note: string;
  updatedAt: string | null;
}

export interface AttendanceRoster {
  organizationId: string;
  attendanceDate: string;
  className: string;
  isClosed: boolean;
  closedAt: string | null;
  roster: AttendanceRosterItem[];
}

const MOCK_CHILDREN = ["김하늘", "이도윤", "박서아"];
const mockRecords = new Map<string, AttendanceRosterItem[]>();
const mockClosures = new Map<string, { isClosed: boolean; closedAt: string | null }>();

export async function requireAttendanceAdmin(request: Request) {
  const access = await resolveRequestAccessContext(request);
  if (access.source === "anonymous") {
    throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
  }
  assertRoleScope(access, ["admin"]);
  return access;
}

export async function requireAttendanceStaff(request: Request) {
  const access = await resolveRequestAccessContext(request);
  if (access.source === "anonymous") {
    throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
  }
  assertRoleScope(access, ["admin", "owner", "manager", "teacher"]);
  if (!access.organizationId) {
    throw new AccessControlError("membership_required", "기관 멤버십이 필요합니다.", 403);
  }
  return access;
}

export async function getAttendanceRoster(access: RequestAccessContext, scope: AttendanceScope) {
  if (!isLiveSupabaseMode()) {
    return getMockRoster(scope);
  }

  const supabase = requireSupabase(access);
  const [recordsResult, closureResult] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("id, attendance_date, child_name, status, note, updated_at")
      .eq("organization_id", scope.organizationId)
      .eq("class_name", scope.className)
      .order("attendance_date", { ascending: false }),
    supabase
      .from("attendance_closures")
      .select("is_closed, closed_at")
      .eq("organization_id", scope.organizationId)
      .eq("attendance_date", scope.attendanceDate)
      .eq("class_name", scope.className)
      .maybeSingle()
  ]);

  if (recordsResult.error) throw recordsResult.error;
  if (closureResult.error) throw closureResult.error;

  const rows = (recordsResult.data ?? []) as Row[];
  const currentRows = new Map(
    rows
      .filter((row) => row.attendance_date === scope.attendanceDate)
      .map((row) => [asString(row.child_name), row])
  );
  const rosterByChild = new Map<string, AttendanceRosterItem>();
  for (const row of rows) {
    const childName = asString(row.child_name);
    if (!childName || rosterByChild.has(childName)) continue;

    const currentRow = currentRows.get(childName);
    rosterByChild.set(childName, {
      id: nullableString(currentRow?.id),
      childName,
      status: currentRow ? parseAttendanceStatus(currentRow.status) : "present",
      note: currentRow ? asString(currentRow.note) : "",
      updatedAt: nullableString(currentRow?.updated_at)
    });
  }

  const closure = closureResult.data as Row | null;
  return {
    ...scope,
    isClosed: closure?.is_closed === true,
    closedAt: nullableString(closure?.closed_at),
    roster: [...rosterByChild.values()].sort((a, b) => a.childName.localeCompare(b.childName, "ko"))
  } satisfies AttendanceRoster;
}

export async function bulkUpsertAttendance(access: RequestAccessContext, input: AttendanceBulkUpsert) {
  if (!isLiveSupabaseMode()) {
    const key = scopeKey(input);
    const closure = mockClosures.get(key);
    if (closure?.isClosed) throw attendanceClosedError();

    const updatedAt = new Date().toISOString();
    const records = input.records.map((record, index) => ({
      id: `mock-attendance-${index + 1}`,
      ...record,
      updatedAt
    }));
    mockRecords.set(key, records);
    return { saved: true, count: records.length, roster: getMockRoster(input) };
  }

  const supabase = requireSupabase(access);
  await assertAttendanceOpen(supabase, input);

  const now = new Date().toISOString();
  const rows = input.records.map((record) => ({
    organization_id: input.organizationId,
    attendance_date: input.attendanceDate,
    class_name: input.className,
    child_name: record.childName,
    status: record.status,
    note: record.note,
    recorded_by: access.profileId,
    updated_at: now
  }));
  const { data, error } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "organization_id,attendance_date,class_name,child_name" })
    .select("id");
  if (error) throw error;

  if (access.role === "admin") {
    await writeAuditLog(supabase, access.profileId, "bulk_upsert", input, {
      recordCount: rows.length
    });
  }

  return {
    saved: true,
    count: (data ?? []).length,
    roster: await getAttendanceRoster(access, input)
  };
}

export async function setAttendanceClosure(
  access: RequestAccessContext,
  input: AttendanceClosureMutation
) {
  const isClosed = input.action === "close";
  const now = new Date().toISOString();

  if (!isLiveSupabaseMode()) {
    mockClosures.set(scopeKey(input), { isClosed, closedAt: isClosed ? now : null });
    return {
      updated: true,
      ...input,
      isClosed,
      closedAt: isClosed ? now : null
    };
  }

  const supabase = requireSupabase(access);
  const row = {
    organization_id: input.organizationId,
    attendance_date: input.attendanceDate,
    class_name: input.className,
    is_closed: isClosed,
    closed_at: isClosed ? now : null,
    closed_by: isClosed ? access.profileId : null,
    reopened_at: isClosed ? null : now,
    reopened_by: isClosed ? null : access.profileId,
    updated_at: now
  };
  const { data, error } = await supabase
    .from("attendance_closures")
    .upsert(row, { onConflict: "organization_id,attendance_date,class_name" })
    .select("is_closed, closed_at")
    .single();
  if (error) throw error;

  await writeAuditLog(supabase, access.profileId, input.action, input);

  return {
    updated: true,
    ...input,
    isClosed: data.is_closed === true,
    closedAt: nullableString(data.closed_at)
  };
}

function getMockRoster(scope: AttendanceScope): AttendanceRoster {
  const key = scopeKey(scope);
  const closure = mockClosures.get(key);
  const records =
    mockRecords.get(key) ??
    MOCK_CHILDREN.map((childName, index) => ({
      id: `mock-attendance-${index + 1}`,
      childName,
      status: "present" as const,
      note: "",
      updatedAt: null
    }));

  return {
    ...scope,
    isClosed: closure?.isClosed ?? false,
    closedAt: closure?.closedAt ?? null,
    roster: records
  };
}

async function assertAttendanceOpen(supabase: SupabaseClient, scope: AttendanceScope) {
  const { data, error } = await supabase
    .from("attendance_closures")
    .select("is_closed")
    .eq("organization_id", scope.organizationId)
    .eq("attendance_date", scope.attendanceDate)
    .eq("class_name", scope.className)
    .maybeSingle();
  if (error) throw error;
  if (data?.is_closed) throw attendanceClosedError();
}

async function writeAuditLog(
  supabase: SupabaseClient,
  profileId: string | null,
  action: string,
  scope: AttendanceScope,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_profile_id: profileId,
    action,
    resource_type: "attendance",
    metadata: {
      organizationId: scope.organizationId,
      attendanceDate: scope.attendanceDate,
      className: scope.className,
      ...metadata
    }
  });
  if (error) throw error;
}

function requireSupabase(access: RequestAccessContext) {
  const supabase = access.accessToken ? createSupabaseUserClient(access.accessToken) : null;
  if (!supabase) throw new Error("Supabase user client is not configured.");
  return supabase;
}

function attendanceClosedError() {
  return new AccessControlError(
    "attendance_closed",
    "마감된 출석부입니다. 재오픈한 뒤 수정하세요.",
    409
  );
}

function scopeKey(scope: AttendanceScope) {
  return `${scope.organizationId}:${scope.attendanceDate}:${scope.className}`;
}

function parseAttendanceStatus(value: unknown): z.infer<typeof attendanceStatusSchema> {
  const parsed = attendanceStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "present";
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}
