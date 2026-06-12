import { z } from "zod";
import { apiError, handleApiError, ok } from "@/lib/api-response";
import { assertRoleScope, getRequestAccessContext } from "@/lib/access-control";
import { generateParentMessages } from "@/lib/ai";

const schema = z.object({
  purpose: z.enum(["event_notice", "thanks", "growth_record", "participation", "apology"]),
  tone: z.enum(["warm", "formal", "short", "emotional"]),
  eventName: z.string().min(1),
  childContext: z.string().optional(),
  senderName: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = await readJson(request);

    if (!body.ok) {
      return apiError("invalid_json_body", "JSON 요청 본문이 필요합니다.");
    }

    const payload = schema.parse(body.value);
    const access = getRequestAccessContext(request);
    assertRoleScope(access, ["owner", "manager", "teacher"]);
    const result = await generateParentMessages(payload);

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}

async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}
