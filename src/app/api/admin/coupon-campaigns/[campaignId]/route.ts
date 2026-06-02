import { handleApiError, notFound, ok } from "@/lib/api-response";
import { getRepositories } from "@/lib/repositories";
import { couponCampaignPatchSchema } from "@/lib/validation";

export async function PATCH(
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
    const payload = couponCampaignPatchSchema.parse(await request.json());
    const updatedCampaign = await repositories.coupons.updateCampaign(campaignId, payload);

    return ok(updatedCampaign);
  } catch (error) {
    return handleApiError(error);
  }
}
