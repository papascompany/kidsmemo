import type { Role } from "./types";

export type ContentScope = "landing" | "organization";
export type ContentStatus = "draft" | "published" | "archived";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type GiftCodeStatus = "available" | "issued" | "redeemed" | "expired" | "void";
export type PushCampaignStatus = "draft" | "scheduled" | "sent" | "failed" | "cancelled";

export interface AdminContentBlock {
  id: string;
  scope: ContentScope;
  organizationId: string | null;
  slot: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  sortOrder: number;
  status: ContentStatus;
  updatedAt?: string;
}

export interface AdminMediaAsset {
  id: string;
  scope: ContentScope;
  organizationId: string | null;
  label: string;
  url: string;
  altText: string;
  usageSlot: string;
  status: ContentStatus;
  createdAt?: string;
}

export interface AdminAttendanceRecord {
  id: string;
  organizationId: string;
  attendanceDate: string;
  className: string;
  childName: string;
  status: AttendanceStatus;
  note: string;
}

export interface AdminGiftCode {
  id: string;
  organizationId: string | null;
  title: string;
  code: string;
  amountLabel: string;
  status: GiftCodeStatus;
  assignedToProfileId: string | null;
  expiresAt: string | null;
}

export interface AdminPushCampaign {
  id: string;
  organizationId: string | null;
  title: string;
  body: string;
  targetRole: Role | null;
  status: PushCampaignStatus;
  scheduledFor: string | null;
}

export interface AdminAuditLog {
  id: string;
  actorProfileId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
}

export interface AdminOperationsPayload {
  contentBlocks: AdminContentBlock[];
  mediaAssets: AdminMediaAsset[];
  attendanceRecords: AdminAttendanceRecord[];
  giftCodes: AdminGiftCode[];
  pushCampaigns: AdminPushCampaign[];
  auditLogs: AdminAuditLog[];
}

export const adminMockOperations: AdminOperationsPayload = {
  contentBlocks: [
    {
      id: "mock-content-hero",
      scope: "landing",
      organizationId: null,
      slot: "hero",
      title: "행사는 놓치지 않고, 안내문은 더 따뜻하게.",
      body: "키즈메모 랜딩 히어로 기본 문구입니다.",
      imageUrl: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1800&q=82",
      ctaLabel: "간편가입 시작하기",
      ctaUrl: "/signup",
      sortOrder: 0,
      status: "published"
    }
  ],
  mediaAssets: [],
  attendanceRecords: [],
  giftCodes: [],
  pushCampaigns: [],
  auditLogs: []
};
