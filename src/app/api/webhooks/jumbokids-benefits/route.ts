import { handleApiError, ok } from "@/lib/api-response";
import { jumbokidsBenefitsWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
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
