import { handleApiError, ok } from "@/lib/api-response";
import {
  cancelOwnLeaveRequest,
  createOwnLeaveRequest,
  leaveRequestCancelSchema,
  leaveRequestCreateSchema,
  leaveRequestListSchema,
  listOwnLeaveRequests,
  requireLeaveStaff
} from "@/lib/leave-requests";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = leaveRequestListSchema.parse({
      organizationId: url.searchParams.get("organizationId"),
      status: url.searchParams.get("status") || undefined
    });
    const access = await requireLeaveStaff(request, input.organizationId);
    return ok({ requests: await listOwnLeaveRequests(access, input.status) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = leaveRequestCreateSchema.parse(await request.json());
    const access = await requireLeaveStaff(request, input.organizationId);
    return ok({ request: await createOwnLeaveRequest(access, input) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = leaveRequestCancelSchema.parse(await request.json());
    const access = await requireLeaveStaff(request, input.organizationId);
    return ok({ request: await cancelOwnLeaveRequest(access, input) });
  } catch (error) {
    return handleApiError(error);
  }
}
