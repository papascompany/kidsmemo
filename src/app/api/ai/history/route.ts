import { z } from "zod";
import { handleApiError, ok } from "@/lib/api-response";
import { assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { listAiHistory } from "@/lib/ai-history";

const querySchema = z.object({
  kind: z.enum(["event_assistant", "parent_message"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export async function GET(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    assertRoleScope(access, ["owner", "manager", "teacher"]);
    const url = new URL(request.url);
    const query = querySchema.parse({
      kind: url.searchParams.get("kind") || undefined,
      limit: url.searchParams.get("limit") || undefined
    });
    const history = await listAiHistory(access, query);

    return ok({ history });
  } catch (error) {
    return handleApiError(error);
  }
}
