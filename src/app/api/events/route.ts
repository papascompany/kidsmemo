import { created, handleApiError, ok } from "@/lib/api-response";
import { getRepositories } from "@/lib/repositories";
import { eventCreateSchema } from "@/lib/validation";

export async function GET() {
  const repositories = getRepositories();
  const events = await repositories.events.list();

  return ok(events);
}

export async function POST(request: Request) {
  try {
    const repositories = getRepositories();
    const payload = eventCreateSchema.parse(await request.json());
    const event = await repositories.events.create(payload);

    return created(event);
  } catch (error) {
    return handleApiError(error);
  }
}
