import { handleApiError, ok } from "@/lib/api-response";
import { AccessControlError, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { messageProviderWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    assertRoleScope(access, ["admin"]);

    if (isLiveSupabaseMode()) {
      throw new AccessControlError(
        "message_provider_webhook_not_configured",
        "메시지 provider webhook 계약과 인증 방식이 설정되지 않아 수신을 중단했습니다.",
        503
      );
    }

    const payload = messageProviderWebhookSchema.parse(await request.json());

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
