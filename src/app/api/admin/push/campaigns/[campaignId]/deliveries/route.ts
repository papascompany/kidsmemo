import { handleApiError, ok } from "@/lib/api-response";
import {
  getPushDeliveryLog,
  pushCampaignIdSchema,
  pushDeliveryQuerySchema,
  requirePushAdmin
} from "@/lib/push-operations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const access = await requirePushAdmin(request);
    const url = new URL(request.url);
    const query = pushDeliveryQuerySchema.parse(Object.fromEntries(url.searchParams));
    const result = await getPushDeliveryLog(access, pushCampaignIdSchema.parse(campaignId), query);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
