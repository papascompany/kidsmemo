import { handleApiError, ok } from "@/lib/api-response";
import { assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { jumbokidsBenefitsWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    const payload = jumbokidsBenefitsWebhookSchema.parse(await request.json());
    assertRoleScope(access, ["admin"]);

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
