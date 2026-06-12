import { handleApiError, ok } from "@/lib/api-response";
import { assertRoleScope, getRequestAccessContext } from "@/lib/access-control";
import { runReminderJob } from "@/lib/reminders";

export async function POST(request: Request) {
  try {
    const access = getRequestAccessContext(request);
    assertRoleScope(access, ["admin"]);
    const payload = (await request.json().catch(() => ({}))) as { now?: string };
    const result = await runReminderJob({
      now: payload.now ? new Date(payload.now) : undefined,
      access
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
