import { handleApiError, ok } from "@/lib/api-response";
import {
  attendanceClosureSchema,
  requireAttendanceAdmin,
  setAttendanceClosure
} from "@/lib/attendance-operations";

export async function PATCH(request: Request) {
  try {
    const access = await requireAttendanceAdmin(request);
    const input = attendanceClosureSchema.parse(await request.json());
    return ok(await setAttendanceClosure(access, input));
  } catch (error) {
    return handleApiError(error);
  }
}
