import { handleApiError, ok } from "@/lib/api-response";
import {
  pushCampaignIdSchema,
  pushSendRequestSchema,
  requirePushAdmin,
  sendPushCampaign
} from "@/lib/push-operations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const access = await requirePushAdmin(request);
    const input = pushSendRequestSchema.parse(await request.json().catch(() => ({})));
    const result = await sendPushCampaign(access, pushCampaignIdSchema.parse(campaignId), input);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
