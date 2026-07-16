import { handleApiError, ok } from "@/lib/api-response";
import { assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { messageProviderWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    const payload = messageProviderWebhookSchema.parse(await request.json());
    assertRoleScope(access, ["admin"]);

    return ok({
      received: true,
      providerMessageId: payload.providerMessageId,
      status: payload.status,
      failureReason: payload.failureReason
    });
  } catch (error) {
    return handleApiError(error);
  }
}
