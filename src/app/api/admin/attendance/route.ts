import { handleApiError, ok } from "@/lib/api-response";
import {
  attendanceBulkUpsertSchema,
  attendanceScopeSchema,
  bulkUpsertAttendance,
  getAttendanceRoster,
  requireAttendanceAdmin
} from "@/lib/attendance-operations";

export async function GET(request: Request) {
  try {
    const access = await requireAttendanceAdmin(request);
    const url = new URL(request.url);
    const scope = attendanceScopeSchema.parse({
      organizationId: url.searchParams.get("organizationId"),
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
    const access = await requireAttendanceAdmin(request);
    const input = attendanceBulkUpsertSchema.parse(await request.json());
    return ok(await bulkUpsertAttendance(access, input));
  } catch (error) {
    return handleApiError(error);
  }
}
