import { apiError, created, handleApiError, notFound } from "@/lib/api-response";
import { getRepositories } from "@/lib/repositories";
import { couponItemSchema } from "@/lib/validation";

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
    const payload = couponItemSchema.parse(await request.json());

    if (campaign.issueMode === "manual" && !payload.manualCode?.trim() && !payload.manualUrl) {
      return apiError("validation_error", "수동발행 캠페인 쿠폰 항목에는 쿠폰 코드 또는 쿠폰 링크가 필요합니다.");
    }

    if (campaign.issueMode === "jumbokids_api" && !payload.jumbokidsBenefitType) {
      return apiError("validation_error", "점보키즈 API 발급 항목에는 혜택 타입이 필요합니다.");
    }

    const item = await repositories.coupons.addItem(campaignId, payload);

    return created(item);
  } catch (error) {
    return handleApiError(error);
  }
}
