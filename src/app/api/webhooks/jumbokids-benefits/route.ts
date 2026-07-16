import { handleApiError, ok } from "@/lib/api-response";
import { AccessControlError, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { jumbokidsBenefitsWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    assertRoleScope(access, ["admin"]);

    if (isLiveSupabaseMode()) {
      throw new AccessControlError(
        "jumbokids_benefits_webhook_not_configured",
        "점보키즈 혜택 webhook 계약과 인증 방식이 설정되지 않아 수신을 중단했습니다.",
        503
      );
    }

    const payload = jumbokidsBenefitsWebhookSchema.parse(await request.json());

    return ok({
      received: true,
      benefitId: payload.benefitId,
      status: payload.status,
      code: payload.code,
      jumbokidsUrl: payload.jumbokidsUrl,
      godomallUrl: payload.godomallUrl
    });
  } catch (error) {
    return handleApiError(error);
  }
}
