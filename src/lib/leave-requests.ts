import { z } from "zod";
import {
  AccessControlError,
  assertOrganizationScope,
  assertProfileScope,
  assertRoleScope,
  resolveRequestAccessContext,
  type RequestAccessContext
} from "@/lib/access-control";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { createSupabaseUserClient } from "@/lib/supabase";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.");
const roleSchema = z.enum(["owner", "manager", "teacher", "admin"]);

export const leaveRequestCreateSchema = z.object({
  organizationId: z.string().uuid(),
  leaveType: z.string().trim().min(1).max(40).default("annual"),
  startDate: dateSchema,
  endDate: dateSchema,
  requestedDays: z.coerce.number().positive().max(366),
  reason: z.string().trim().max(500).default("")
}).superRefine(validateDateRange);

export const leaveRequestCancelSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: z.literal("cancelled")
});

export const leaveRequestListSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional()
});

export const leaveRequestReviewSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  status: z.enum(["approved", "rejected"])
});

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveRequestRole = z.infer<typeof roleSchema>;

type Row = Record<string, unknown>;

export async function requireLeaveStaff(request: Request, organizationId?: string) {
  const access = await resolveScopedAccess(request, organizationId);
  if (access.source === "anonymous") {
    throw new AccessControlError("authentication_required", "직원 로그인이 필요합니다.", 401);
  }
  assertRoleScope(access, ["owner", "manager", "teacher", "admin"], "기관 직원만 휴가를 신청할 수 있습니다.");
  if (!access.profileId || !access.organizationId) {
    throw new AccessControlError("membership_required", "기관 멤버십을 확인할 수 없습니다.", 403);
  }
  return access;
}

export async function requireLeaveReviewer(request: Request, organizationId?: string) {
  // Platform admins may review any institution, so resolve their global role
  // before applying the requested organization scope.
  const access = await resolveRequestAccessContext(withoutOrganizationHeader(request));
  if (access.source === "anonymous") {
    throw new AccessControlError("authentication_required", "관리자 로그인이 필요합니다.", 401);
  }
  assertRoleScope(access, ["owner", "manager", "admin"], "원장·매니저·관리자만 휴가 요청을 검토할 수 있습니다.");
  if (!access.profileId || !access.organizationId) {
    if (access.role !== "admin" || !organizationId) {
      throw new AccessControlError("membership_required", "기관 멤버십을 확인할 수 없습니다.", 403);
    }
  }
  if (access.role === "admin" && organizationId) return { ...access, organizationId };
  if (organizationId) assertOrganizationScope(access, organizationId);
  return access;
}

export async function listOwnLeaveRequests(
  access: RequestAccessContext,
  status?: LeaveRequestStatus
) {
  const supabase = requireSupabase(access);
  let query = supabase
    .from("staff_leave_requests")
    .select("*")
    .eq("organization_id", access.organizationId!)
    .eq("profile_id", access.profileId!)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapLeaveRequest);
}

export async function createOwnLeaveRequest(
  access: RequestAccessContext,
  input: z.infer<typeof leaveRequestCreateSchema>
) {
  assertOrganizationScope(access, input.organizationId);
  const supabase = requireSupabase(access);
  const { data, error } = await supabase
    .from("staff_leave_requests")
    .insert({
      organization_id: input.organizationId,
      profile_id: access.profileId,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      requested_days: input.requestedDays,
      reason: input.reason,
      status: "pending"
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapLeaveRequest(data as Row);
}

export async function cancelOwnLeaveRequest(
  access: RequestAccessContext,
  input: z.infer<typeof leaveRequestCancelSchema>
) {
  assertOrganizationScope(access, input.organizationId);
  assertProfileScope(access, access.profileId!);
  const supabase = requireSupabase(access);
  const { data, error } = await supabase
    .from("staff_leave_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("organization_id", input.organizationId)
    .eq("profile_id", access.profileId!)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new AccessControlError(
      "leave_request_not_cancellable",
      "대기 중인 본인 휴가 신청만 취소할 수 있습니다.",
      409
    );
  }
  return mapLeaveRequest(data as Row);
}

export async function listOrganizationLeaveRequests(
  access: RequestAccessContext,
  status?: LeaveRequestStatus
) {
  const supabase = requireSupabase(access);
  let query = supabase
    .from("staff_leave_requests")
    .select("*")
    .eq("organization_id", access.organizationId!)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapLeaveRequest);
}

export async function reviewLeaveRequest(
  access: RequestAccessContext,
  input: z.infer<typeof leaveRequestReviewSchema>
) {
  assertOrganizationScope(access, input.organizationId);
  const supabase = requireSupabase(access);
  const { data, error } = await supabase
    .from("staff_leave_requests")
    .update({
      status: input.status,
      reviewed_by: access.profileId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", input.id)
    .eq("organization_id", input.organizationId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new AccessControlError(
      "leave_request_not_reviewable",
      "대기 중인 기관 휴가 신청만 승인 또는 반려할 수 있습니다.",
      409
    );
  }
  return mapLeaveRequest(data as Row);
}

async function resolveScopedAccess(request: Request, organizationId?: string) {
  const headerOrganizationId = request.headers.get("x-kidmemo-organization-id")?.trim();
  if (organizationId && headerOrganizationId && organizationId !== headerOrganizationId) {
    throw new AccessControlError("organization_scope_mismatch", "요청 기관 범위가 일치하지 않습니다.", 403);
  }

  if (!organizationId || organizationId === headerOrganizationId) {
    return resolveRequestAccessContext(request);
  }

  const headers = new Headers(request.headers);
  headers.set("x-kidmemo-organization-id", organizationId);
  // Access resolution only reads headers; do not reuse a consumed POST body.
  return resolveRequestAccessContext(new Request(request.url, { method: "GET", headers }));
}

function requireSupabase(access: RequestAccessContext) {
  if (!isLiveSupabaseMode()) {
    throw new AccessControlError("live_backend_required", "휴가 신청 기능은 Supabase 운영 모드에서 사용할 수 있습니다.", 503);
  }
  const client = access.accessToken ? createSupabaseUserClient(access.accessToken) : null;
  if (!client) {
    throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
  }
  return client;
}

function withoutOrganizationHeader(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("x-kidmemo-organization-id");
  return new Request(request.url, { method: "GET", headers });
}

function validateDateRange(
  value: { startDate: string; endDate: string; requestedDays: number },
  context: z.RefinementCtx
) {
  const start = parseDate(value.startDate);
  const end = parseDate(value.endDate);
  if (end < start) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "종료일은 시작일보다 빠를 수 없습니다." });
    return;
  }
  const inclusiveDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (value.requestedDays > inclusiveDays) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["requestedDays"], message: "신청 일수는 신청 기간을 초과할 수 없습니다." });
  }
  if (Math.round(value.requestedDays * 2) !== value.requestedDays * 2) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["requestedDays"], message: "신청 일수는 0.5일 단위로 입력해 주세요." });
  }
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new z.ZodError([{ code: z.ZodIssueCode.custom, path: [], message: "유효하지 않은 날짜입니다." }]);
  }
  return date;
}

function mapLeaveRequest(row: Row) {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    profileId: asString(row.profile_id),
    leaveType: asString(row.leave_type),
    startDate: asString(row.start_date),
    endDate: asString(row.end_date),
    requestedDays: Number(row.requested_days ?? 0),
    reason: asString(row.reason),
    status: asString(row.status) as LeaveRequestStatus,
    reviewedBy: nullableString(row.reviewed_by),
    reviewedAt: nullableString(row.reviewed_at),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
