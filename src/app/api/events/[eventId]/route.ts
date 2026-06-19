import { handleApiError, notFound, ok } from "@/lib/api-response";
import {
  AccessControlError,
  assertOrganizationScope,
  assertRoleScope,
  resolveRequestAccessContext
} from "@/lib/access-control";
import { getRepositories } from "@/lib/repositories";
import { eventUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const access = await resolveRequestAccessContext(request);
    const repositories = getRepositories(access);
    const event = await repositories.events.findById(eventId);

    if (!event) {
      return notFound("행사를 찾을 수 없습니다.");
    }

    assertOrganizationScope(access, event.organizationId);
    assertRoleScope(access, ["owner", "manager", "teacher"]);
    const { organizationId, ...payload } = eventUpdateSchema.parse(await request.json());
    if (organizationId && organizationId !== event.organizationId) {
      throw new AccessControlError("forbidden_organization_change", "행사의 기관은 변경할 수 없습니다.", 403, {
        requestedOrganizationId: organizationId,
        eventOrganizationId: event.organizationId
      });
    }

    const updatedEvent = await repositories.events.update(eventId, payload);

    return ok(updatedEvent);
  } catch (error) {
    return handleApiError(error);
  }
}
