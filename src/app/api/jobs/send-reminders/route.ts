import { handleApiError, ok } from "@/lib/api-response";
import { runReminderJob } from "@/lib/reminders";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { now?: string };
    const result = await runReminderJob({
      now: payload.now ? new Date(payload.now) : undefined
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
