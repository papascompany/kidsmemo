import { couponCampaigns, events } from "./mock-data";
import { issueJumbokidsBenefit } from "./coupons";
import { isTomorrow } from "./format";
import { sendMessageWithFallback } from "./messages";
import {
  getRepositories,
  type CouponRepository,
  type EventRepository,
  type MessageJobRepository
} from "./repositories";
import type { MessageJob, ReminderRunResult } from "./types";

interface RunReminderJobOptions {
  now?: Date;
  eventRepository?: EventRepository;
  couponRepository?: CouponRepository;
  messageJobRepository?: MessageJobRepository;
}

export async function runReminderJob(options: RunReminderJobOptions = {}): Promise<ReminderRunResult> {
  const now = options.now ?? new Date();
  const repositories = getRepositories();
  const eventRepository = options.eventRepository ?? repositories.events;
  const couponRepository = options.couponRepository ?? repositories.coupons;
  const messageJobRepository = options.messageJobRepository ?? repositories.messageJobs;
  const generatedJobs: MessageJob[] = [];
  const issuedBenefits: ReminderRunResult["issuedBenefits"] = [];
  const jobSummaries: ReminderRunResult["jobSummaries"] = [];
  const scheduledDate = now.toISOString().slice(0, 10);

  for (const event of await eventRepository.findTomorrow(now)) {
    const campaign = await couponRepository.findCampaignById(event.couponCampaignId);

    if (!campaign || !campaign.isActive) {
      jobSummaries.push({
        eventId: event.id,
        campaignId: campaign?.id,
        status: "skipped",
        reason: "active_coupon_campaign_not_found"
      });
      continue;
    }

    const existingJob = await messageJobRepository.findExistingJob(event.id, campaign.id, scheduledDate);
    if (existingJob) {
      jobSummaries.push({
        eventId: event.id,
        campaignId: campaign.id,
        status: "skipped",
        reason: "duplicate_job"
      });
      continue;
    }

    const recipients = await couponRepository.listRecipients(campaign);
    const landingUrl = `https://kidsmemo.example.com/coupon/${campaign.id}`;

    generatedJobs.push({
      id: `job-${event.id}`,
      eventId: event.id,
      campaignId: campaign.id,
      scheduledFor: now.toISOString(),
      channels: ["alimtalk", "sms", "email"],
      status: "queued" as const,
      recipientCount: recipients.length,
      landingUrl
    });

    jobSummaries.push({
      eventId: event.id,
      campaignId: campaign.id,
      status: "queued"
    });

    const items = await couponRepository.listItems(campaign.id);

    for (const item of items) {
      if (campaign.issueMode === "manual") {
        issuedBenefits.push({
          campaignId: campaign.id,
          itemId: item.id,
          status: "manual_ready",
          code: item.manualCode,
          landingUrl: item.manualUrl
        });
        continue;
      }

      for (const recipient of recipients) {
        const result = await issueJumbokidsBenefit({
          campaign,
          item,
          recipient,
          eventId: event.id
        });

        issuedBenefits.push({
          campaignId: campaign.id,
          itemId: item.id,
          recipientProfileId: recipient.id,
          status: result.status,
          code: result.status === "issued" ? result.code : undefined,
          landingUrl: result.status === "issued" ? result.landingUrl : undefined,
          failureReason: result.status === "failed" ? result.error : undefined
        });
      }
    }

    await sendMessageWithFallback({ event, campaign });
  }

  return {
    generatedJobs,
    issuedBenefits,
    jobSummaries
  };
}

export function getReminderHealth() {
  return {
    activeCampaigns: couponCampaigns.filter((campaign) => campaign.isActive).length,
    tomorrowEvents: events.filter((event) => isTomorrow(event.eventDate)).length,
    providerOrder: ["카카오 알림톡", "SMS/LMS", "이메일"]
  };
}
