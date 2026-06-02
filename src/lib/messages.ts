import { channelLabels } from "./format";
import { resolveCampaignRecipients, summarizeCouponForMessage } from "./coupons";
import type { CouponCampaign, EventSchedule, MessageChannel, MessageDelivery } from "./types";

export const defaultChannelOrder: MessageChannel[] = ["alimtalk", "sms", "email"];

export async function buildReminderCopy(event: EventSchedule, campaign: CouponCampaign) {
  const summary = await summarizeCouponForMessage(campaign);
  const landingUrl = `https://kidsmemo.example.com/coupon/${campaign.id}`;

  return {
    title: `[${event.title}] 행사 전날 점보키즈 혜택 안내`,
    text: `${event.title} 행사가 내일 예정되어 있습니다. ${summary} 혜택을 지금 확인해 주세요. ${landingUrl}`,
    landingUrl
  };
}

export async function sendMessageWithFallback({
  event,
  campaign
}: {
  event: EventSchedule;
  campaign: CouponCampaign;
}) {
  const recipients = resolveCampaignRecipients(campaign);
  const copy = await buildReminderCopy(event, campaign);
  const deliveries: MessageDelivery[] = [];

  recipients.forEach((recipient, index) => {
    const channel = defaultChannelOrder[index % defaultChannelOrder.length];
    deliveries.push({
      id: `delivery-${event.id}-${recipient.id}`,
      jobId: `job-${event.id}`,
      recipientProfileId: recipient.id,
      channel,
      status: "sent",
      providerMessageId: `${channel}_${Date.now()}_${index}`
    });
  });

  return {
    copy,
    deliveries,
    channelSummary: defaultChannelOrder.map((channel) => channelLabels[channel]).join(" → ")
  };
}
