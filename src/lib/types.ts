export type Role = "owner" | "manager" | "teacher" | "admin";

export type MessageChannel = "alimtalk" | "sms" | "email";

export type DeliveryStatus = "queued" | "sent" | "failed" | "fallback";

export type CouponUseSite = "jumbokids" | "godomall";

export type StaffCouponStatus = "available" | "downloaded" | "used";

export type StaffCouponAssignee = "owner" | "teacher" | "all_staff";

export interface Organization {
  id: string;
  name: string;
  type: "daycare" | "kindergarten";
  region: string;
  memberCount: number;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  organizationId: string;
  role: Role;
}

export interface EventSchedule {
  id: string;
  organizationId: string;
  title: string;
  eventDate: string;
  audience: string;
  classNames: string[];
  description: string;
  supplies: string[];
  reminderStatus: "not_scheduled" | "scheduled" | "sent" | "failed";
  repeatRule?: "yearly";
}

export interface StaffCoupon {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  code: string;
  amountLabel: string;
  validUntil: string;
  assignedTo: StaffCouponAssignee;
  status: StaffCouponStatus;
  sites: CouponUseSite[];
  siteUrls: Record<CouponUseSite, string>;
}

export interface MessageJob {
  id: string;
  eventId: string;
  scheduledFor: string;
  channels: MessageChannel[];
  status: DeliveryStatus;
  recipientCount: number;
}

export interface ReminderJobSummary {
  eventId: string;
  status: "queued" | "skipped" | "failed";
  reason?: string;
}

export interface MessageDelivery {
  id: string;
  jobId: string;
  recipientProfileId: string;
  channel: MessageChannel;
  status: DeliveryStatus;
  providerMessageId?: string;
  failureReason?: string;
}

export interface EventAssistantRequest {
  eventName: string;
  ageGroup: string;
  preparationDays: number;
  budget: string;
  location: string;
  season: string;
  mood: string;
}

export interface EventAssistantResult {
  ideas: string[];
  checklist: string[];
  timeline: string[];
  parentNoticeDraft: string;
  shoppingRecommendations: ShoppingRecommendation[];
}

export interface ShoppingRecommendation {
  title: string;
  priceLabel: string;
  mallName: string;
  url: string;
  reason: string;
}

export interface ParentMessageRequest {
  purpose: "event_notice" | "thanks" | "growth_record" | "participation" | "apology";
  tone: "warm" | "formal" | "short" | "emotional";
  eventName: string;
  childContext?: string;
  senderName: string;
}

export interface ParentMessageResult {
  candidates: string[];
  safetyNotes: string[];
}

export interface ReminderRunResult {
  generatedJobs: MessageJob[];
  jobSummaries: ReminderJobSummary[];
}
