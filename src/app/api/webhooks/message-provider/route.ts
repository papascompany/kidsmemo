import { handleApiError, ok } from "@/lib/api-response";
import { assertRoleScope, getRequestAccessContext } from "@/lib/access-control";
import { messageProviderWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = messageProviderWebhookSchema.parse(await request.json());
    const access = getRequestAccessContext(request);
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
