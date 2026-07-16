import { events, staffCoupons } from "./mock-data";
import { AccessControlError, type RequestAccessContext } from "./access-control";
import { isEnabledEnvFlag, isLiveSupabaseMode } from "./env-flags";
import { isTomorrow } from "./format";
import { sendMessageWithFallback } from "./messages";
import {
  getRepositories,
  type EventRepository,
  type MessageJobRepository
} from "./repositories";
import type { MessageJob, ReminderRunResult } from "./types";

interface RunReminderJobOptions {
  now?: Date;
  eventRepository?: EventRepository;
  messageJobRepository?: MessageJobRepository;
  access?: RequestAccessContext;
}

export async function runReminderJob(options: RunReminderJobOptions = {}): Promise<ReminderRunResult> {
  const now = options.now ?? new Date();
  const repositories = getRepositories(options.access);
  const eventRepository = options.eventRepository ?? repositories.events;
  const messageJobRepository = options.messageJobRepository ?? repositories.messageJobs;
  const generatedJobs: MessageJob[] = [];
  const jobSummaries: ReminderRunResult["jobSummaries"] = [];
  const scheduledDate = now.toISOString().slice(0, 10);

  if (isLiveSupabaseMode() && !isEnabledEnvFlag(process.env.KIDSMEMO_ALLOW_MOCK_MESSAGING)) {
    throw new AccessControlError(
      "message_provider_not_configured",
      "실제 메시지 provider가 연결되지 않아 리마인더 발송을 진행할 수 없습니다.",
      503
    );
  }

  for (const event of await eventRepository.findTomorrow(now)) {
    const existingJob = await messageJobRepository.findExistingJob(event.id, scheduledDate);
    if (existingJob) {
      jobSummaries.push({
        eventId: event.id,
        status: "skipped",
        reason: "duplicate_job"
      });
      continue;
    }

    generatedJobs.push({
      id: `job-${event.id}`,
      eventId: event.id,
      scheduledFor: now.toISOString(),
      channels: ["alimtalk", "sms", "email"],
      status: "queued",
      recipientCount: 0
    });

    jobSummaries.push({
      eventId: event.id,
      status: "queued"
    });

    await sendMessageWithFallback({ event });
  }

  return {
    generatedJobs,
    jobSummaries
  };
}

export function getReminderHealth() {
  return {
    availableStaffCoupons: staffCoupons.filter((coupon) => coupon.status !== "used").length,
    tomorrowEvents: events.filter((event) => isTomorrow(event.eventDate)).length,
    providerOrder: ["카카오 알림톡", "SMS/LMS", "이메일"]
  };
}
