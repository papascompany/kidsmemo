import { handleApiError, notFound, ok } from "@/lib/api-response";
import { getRepositories } from "@/lib/repositories";
import { eventUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const repositories = getRepositories();
  const event = await repositories.events.findById(eventId);

  if (!event) {
    return notFound("행사를 찾을 수 없습니다.");
  }

  try {
    const payload = eventUpdateSchema.parse(await request.json());
    const updatedEvent = await repositories.events.update(eventId, payload);

    return ok(updatedEvent);
  } catch (error) {
    return handleApiError(error);
  }
}
