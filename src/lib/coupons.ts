import { couponCampaigns, getCampaignItems, profiles } from "./mock-data";
import { mockCouponRepository } from "./repositories";
import type { CouponCampaign, CouponItem, Profile } from "./types";

interface IssueJumbokidsBenefitInput {
  campaign: CouponCampaign;
  item: CouponItem;
  recipient: Profile;
  eventId: string;
}

export async function issueJumbokidsBenefit(input: IssueJumbokidsBenefitInput) {
  if (!input.item.jumbokidsBenefitType) {
    return {
      status: "failed" as const,
      error: "점보키즈 혜택 타입이 필요합니다."
    };
  }

  const baseUrl = process.env.JUMBOKIDS_API_BASE_URL;
  const apiKey = process.env.JUMBOKIDS_API_KEY;

  if (!baseUrl || !apiKey) {
    return {
      status: "issued" as const,
      code: `JK-${input.item.id.toUpperCase()}-${input.recipient.id.toUpperCase()}`,
      landingUrl: `https://jumbokids.example.com/redeem/${input.item.id}?recipient=${input.recipient.id}`
    };
  }

  const endpoint =
    input.item.benefitType === "credit" ? "/v1/credits/grant" : "/v1/coupons/issue";

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      organizationId: input.recipient.organizationId,
      eventId: input.eventId,
      benefitType: input.item.jumbokidsBenefitType,
      amount: input.item.amountLabel,
      expiresAt: input.campaign.validUntil,
      recipientName: input.recipient.name,
      recipientPhone: input.recipient.phone,
      recipientEmail: input.recipient.email
    })
  });

  if (!response.ok) {
    return {
      status: "failed" as const,
      error: await response.text()
    };
  }

  const payload = (await response.json()) as {
    code: string;
    landingUrl: string;
    status: string;
  };

  return {
    status: "issued" as const,
    code: payload.code,
    landingUrl: payload.landingUrl
  };
}

export function buildManualCouponLanding(campaign: CouponCampaign) {
  const items = getCampaignItems(campaign.id);

  return {
    title: campaign.name,
    description: campaign.description,
    noticeType: campaign.noticeType,
    noticeHtml: campaign.noticeHtml,
    noticeImageUrl: campaign.noticeImageUrl,
    items: items.map((item) => ({
      title: item.title,
      amountLabel: item.amountLabel,
      code: item.manualCode,
      url: item.manualUrl
    }))
  };
}

export async function buildManualCouponLandingAsync(campaign: CouponCampaign) {
  const items = await mockCouponRepository.listItems(campaign.id);

  return {
    ...buildManualCouponLanding(campaign),
    items: items.map((item) => ({
      title: item.title,
      amountLabel: item.amountLabel,
      code: item.manualCode,
      url: item.manualUrl
    }))
  };
}

export function resolveCampaignRecipients(campaign: CouponCampaign) {
  if (campaign.targetScope === "all_members") {
    return profiles;
  }

  return profiles.filter((profile) => {
    return (
      campaign.selectedProfileIds.includes(profile.id) ||
      campaign.selectedOrganizationIds.includes(profile.organizationId)
    );
  });
}

export async function summarizeCouponForMessage(campaign: CouponCampaign) {
  const items = await mockCouponRepository.listItems(campaign.id);
  const itemSummary = items.map((item) => `${item.title}(${item.amountLabel})`).join(", ");

  return `${campaign.name}: ${itemSummary}`;
}

export function validateCouponCampaignPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("쿠폰 캠페인 데이터가 필요합니다.");
  }

  const value = payload as Partial<CouponCampaign>;

  if (!value.name || !value.issueMode || !value.targetScope) {
    throw new Error("쿠폰명, 발행 방식, 발행 대상은 필수입니다.");
  }

  if (!["jumbokids_api", "manual"].includes(value.issueMode)) {
    throw new Error("지원하지 않는 발행 방식입니다.");
  }

  if (!["all_members", "selected_members"].includes(value.targetScope)) {
    throw new Error("지원하지 않는 발행 대상입니다.");
  }
}

export function findActiveCampaigns() {
  return couponCampaigns.filter((campaign) => campaign.isActive);
}
