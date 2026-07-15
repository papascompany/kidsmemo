import { handleApiError, ok } from "@/lib/api-response";
import {
  attendanceBulkUpsertSchema,
  attendanceScopeSchema,
  bulkUpsertAttendance,
  getAttendanceRoster,
  requireAttendanceStaff
} from "@/lib/attendance-operations";

export async function GET(request: Request) {
  try {
    const access = await requireAttendanceStaff(request);
    const url = new URL(request.url);
    const scope = attendanceScopeSchema.parse({
      organizationId: access.organizationId,
      attendanceDate: url.searchParams.get("attendanceDate"),
      className: url.searchParams.get("className")
    });
    return ok(await getAttendanceRoster(access, scope));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requireAttendanceStaff(request);
    const input = attendanceBulkUpsertSchema.parse(await request.json());
    if (input.organizationId !== access.organizationId) {
      return new Response(JSON.stringify({ ok: false, error: { code: "organization_scope_mismatch", message: "현재 기관의 출석부만 수정할 수 있습니다." } }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    return ok(await bulkUpsertAttendance(access, input));
  } catch (error) {
    return handleApiError(error);
  }
}
