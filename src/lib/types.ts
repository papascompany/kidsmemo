export type Role = "owner" | "manager" | "teacher" | "admin";

export type BenefitIssueMode = "jumbokids_api" | "manual";

export type TargetScope = "all_members" | "selected_members";

export type NoticeType = "image" | "html";

export type MessageChannel = "alimtalk" | "sms" | "email";

export type DeliveryStatus = "queued" | "sent" | "failed" | "fallback";

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
  couponCampaignId: string;
  reminderStatus: "not_scheduled" | "scheduled" | "sent" | "failed";
  repeatRule?: "yearly";
}

export interface CouponCampaign {
  id: string;
  name: string;
  description: string;
  issueMode: BenefitIssueMode;
  targetScope: TargetScope;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  noticeType: NoticeType;
  noticeHtml?: string;
  noticeImageUrl?: string;
  createdBy: string;
  selectedOrganizationIds: string[];
  selectedProfileIds: string[];
}

export interface CouponItem {
  id: string;
  campaignId: string;
  title: string;
  benefitType: "coupon" | "credit";
  amountLabel: string;
  manualCode?: string;
  manualUrl?: string;
  jumbokidsBenefitType?: "discount_coupon" | "photo_credit" | "album_coupon";
}

export interface MessageJob {
  id: string;
  eventId: string;
  campaignId: string;
  scheduledFor: string;
  channels: MessageChannel[];
  status: DeliveryStatus;
  recipientCount: number;
  landingUrl: string;
}

export interface IssuedBenefit {
  campaignId: string;
  itemId: string;
  recipientProfileId?: string;
  status: "issued" | "manual_ready" | "failed";
  code?: string;
  landingUrl?: string;
  failureReason?: string;
}

export interface ReminderJobSummary {
  eventId: string;
  campaignId?: string;
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
  issuedBenefits: IssuedBenefit[];
  jobSummaries: ReminderJobSummary[];
}
