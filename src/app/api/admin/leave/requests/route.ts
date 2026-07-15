import { handleApiError, ok } from "@/lib/api-response";
import {
  leaveRequestListSchema,
  leaveRequestReviewSchema,
  listOrganizationLeaveRequests,
  requireLeaveReviewer,
  reviewLeaveRequest
} from "@/lib/leave-requests";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const input = leaveRequestListSchema.parse({
      organizationId: url.searchParams.get("organizationId"),
      status: url.searchParams.get("status") || undefined
    });
    const access = await requireLeaveReviewer(request, input.organizationId);
    return ok({ requests: await listOrganizationLeaveRequests(access, input.status) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const input = leaveRequestReviewSchema.parse(await request.json());
    const access = await requireLeaveReviewer(request, input.organizationId);
    return ok({ request: await reviewLeaveRequest(access, input) });
  } catch (error) {
    return handleApiError(error);
  }
}
