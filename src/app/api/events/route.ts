import { created, handleApiError, ok } from "@/lib/api-response";
import { assertOrganizationScope, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { getRepositories } from "@/lib/repositories";
import { eventCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    const repositories = getRepositories(access);
    const events = await repositories.events.list();

    return ok(events);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = eventCreateSchema.parse(await request.json());
    const access = await resolveRequestAccessContext(request);
    const repositories = getRepositories(access);
    assertOrganizationScope(access, payload.organizationId);
    assertRoleScope(access, ["owner", "manager", "teacher"]);
    const event = await repositories.events.create(payload);

    return created(event);
  } catch (error) {
    return handleApiError(error);
  }
}
