import { channelLabels } from "./format";
import { profiles } from "./mock-data";
import type { EventSchedule, MessageChannel, MessageDelivery } from "./types";

export const defaultChannelOrder: MessageChannel[] = ["alimtalk", "sms", "email"];

export function buildReminderCopy(event: EventSchedule) {
  return {
    title: `[${event.title}] 행사 안내`,
    text: `${event.title} 행사가 예정되어 있습니다. 행사 일정과 준비물을 확인해 주세요.`
  };
}

export async function sendMessageWithFallback({ event }: { event: EventSchedule }) {
  const recipients = profiles.filter((profile) => profile.organizationId === event.organizationId);
  const copy = buildReminderCopy(event);
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
