import { handleApiError, ok } from "@/lib/api-response";
import { messageProviderWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
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
