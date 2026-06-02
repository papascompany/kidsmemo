import { handleApiError, notFound, ok } from "@/lib/api-response";
import { getRepositories } from "@/lib/repositories";
import { campaignTargetsSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  const repositories = getRepositories();
  const campaign = await repositories.coupons.findCampaignById(campaignId);

  if (!campaign) {
    return notFound("쿠폰 캠페인을 찾을 수 없습니다.");
  }

  try {
    const payload = campaignTargetsSchema.parse(await request.json());
    const updatedCampaign = await repositories.coupons.updateTargets(campaignId, payload);

    return ok({
      campaignId,
      targetScope: "selected_members",
      targetCount: payload.selectedOrganizationIds.length + payload.selectedProfileIds.length,
      ...payload,
      campaign: updatedCampaign
    });
  } catch (error) {
    return handleApiError(error);
  }
}
