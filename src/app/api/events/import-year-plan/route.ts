import { handleApiError, ok } from "@/lib/api-response";
import { getRepositories } from "@/lib/repositories";
import { yearPlanImportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const repositories = getRepositories();
    const payload = yearPlanImportSchema.parse(await request.json());
    const importedEvents = await Promise.all(
      payload.events.map((event) =>
        repositories.events.create({
          organizationId: payload.organizationId,
          title: event.title,
          eventDate: event.eventDate,
          audience: event.audience,
          classNames: [],
          description: event.description ?? "",
          supplies: [],
          reminderStatus: "not_scheduled"
        })
      )
    );

    return ok({
      imported: importedEvents.length,
      organizationId: payload.organizationId,
      year: payload.year
    });
  } catch (error) {
    return handleApiError(error);
  }
}
