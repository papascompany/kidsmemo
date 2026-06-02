import type {
  CouponCampaign,
  CouponItem,
  EventSchedule,
  MessageDelivery,
  MessageJob,
  Organization,
  Profile
} from "./types";

export const organizations: Organization[] = [
  {
    id: "org-1",
    name: "햇살나무 어린이집",
    type: "daycare",
    region: "서울 마포구",
    memberCount: 54
  },
  {
    id: "org-2",
    name: "라온숲 유치원",
    type: "kindergarten",
    region: "경기 성남시",
    memberCount: 118
  }
];

export const profiles: Profile[] = [
  {
    id: "user-1",
    name: "김원장",
    email: "director@example.com",
    phone: "010-1234-5678",
    organizationId: "org-1",
    role: "owner"
  },
  {
    id: "user-2",
    name: "이선생",
    email: "teacher@example.com",
    phone: "010-2222-3333",
    organizationId: "org-1",
    role: "teacher"
  },
  {
    id: "user-3",
    name: "박관리",
    email: "admin@example.com",
    phone: "010-5555-7777",
    organizationId: "org-2",
    role: "admin"
  }
];

export const couponCampaigns: CouponCampaign[] = [
  {
    id: "coupon-1",
    name: "봄 소풍 포토북 20% 쿠폰",
    description: "봄 소풍 사진을 포토북으로 제작할 수 있는 점보키즈 할인 쿠폰",
    issueMode: "jumbokids_api",
    targetScope: "all_members",
    validFrom: "2026-04-01",
    validUntil: "2026-05-31",
    isActive: true,
    noticeType: "html",
    noticeHtml:
      "<h2>봄 소풍 사진을 오래 남겨보세요</h2><p>행사 다음 날 바로 사용할 수 있는 포토북 할인 쿠폰입니다.</p>",
    createdBy: "user-3",
    selectedOrganizationIds: [],
    selectedProfileIds: []
  },
  {
    id: "coupon-2",
    name: "졸업 앨범 수동 쿠폰팩",
    description: "관리자가 직접 등록한 앨범 제작 쿠폰과 인쇄 안내 이미지",
    issueMode: "manual",
    targetScope: "selected_members",
    validFrom: "2026-02-01",
    validUntil: "2026-03-15",
    isActive: true,
    noticeType: "image",
    noticeImageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    createdBy: "user-3",
    selectedOrganizationIds: ["org-1"],
    selectedProfileIds: ["user-1"]
  }
];

export const couponItems: CouponItem[] = [
  {
    id: "item-1",
    campaignId: "coupon-1",
    title: "점보키즈 포토북 20% 할인",
    benefitType: "coupon",
    amountLabel: "20% 할인",
    jumbokidsBenefitType: "discount_coupon"
  },
  {
    id: "item-2",
    campaignId: "coupon-2",
    title: "졸업 앨범 제작 10,000원 쿠폰",
    benefitType: "coupon",
    amountLabel: "10,000원 할인",
    manualCode: "GRAD-ALBUM-10000",
    manualUrl: "https://jumbokids.example.com/coupons/grad-album"
  },
  {
    id: "item-3",
    campaignId: "coupon-2",
    title: "사진 인화 배송비 지원",
    benefitType: "credit",
    amountLabel: "배송비 적립금 3,000원",
    manualCode: "PRINT-SHIP-3000",
    manualUrl: "https://jumbokids.example.com/coupons/print-ship"
  }
];

export const events: EventSchedule[] = [
  {
    id: "event-1",
    organizationId: "org-1",
    title: "봄 소풍",
    eventDate: "2026-04-22",
    audience: "만 3-5세",
    classNames: ["햇살반", "나무반"],
    description: "근교 숲 체험과 단체 사진 촬영",
    supplies: ["이름표", "돗자리", "간식", "비상약"],
    couponCampaignId: "coupon-1",
    reminderStatus: "scheduled",
    repeatRule: "yearly"
  },
  {
    id: "event-2",
    organizationId: "org-1",
    title: "졸업 발표회",
    eventDate: "2026-02-20",
    audience: "만 5세",
    classNames: ["열매반"],
    description: "졸업 공연, 가족 사진 촬영, 앨범 안내",
    supplies: ["무대 의상", "초대장", "포토존 배너"],
    couponCampaignId: "coupon-2",
    reminderStatus: "sent"
  },
  {
    id: "event-3",
    organizationId: "org-2",
    title: "가족 운동회",
    eventDate: "2026-06-03",
    audience: "전체 원아",
    classNames: ["전체"],
    description: "운동장 가족 참여 행사와 즉석 사진 촬영",
    supplies: ["팀 조끼", "스티커", "응급 키트", "생수"],
    couponCampaignId: "coupon-1",
    reminderStatus: "not_scheduled"
  }
];

export const messageJobs: MessageJob[] = [
  {
    id: "job-1",
    eventId: "event-2",
    campaignId: "coupon-2",
    scheduledFor: "2026-02-19T09:00:00+09:00",
    channels: ["alimtalk", "sms", "email"],
    status: "sent",
    recipientCount: 1,
    landingUrl: "https://kidsmemo.example.com/coupon/coupon-2"
  },
  {
    id: "job-2",
    eventId: "event-3",
    campaignId: "coupon-1",
    scheduledFor: "2026-06-02T09:00:00+09:00",
    channels: ["alimtalk", "sms", "email"],
    status: "queued",
    recipientCount: 118,
    landingUrl: "https://kidsmemo.example.com/coupon/coupon-1"
  }
];

export const messageDeliveries: MessageDelivery[] = [
  {
    id: "delivery-1",
    jobId: "job-1",
    recipientProfileId: "user-1",
    channel: "alimtalk",
    status: "sent",
    providerMessageId: "ata_20260219_0001"
  },
  {
    id: "delivery-2",
    jobId: "job-2",
    recipientProfileId: "user-3",
    channel: "alimtalk",
    status: "queued"
  }
];

export function getCampaignItems(campaignId: string) {
  return couponItems.filter((item) => item.campaignId === campaignId);
}

export function getCampaignById(campaignId: string) {
  return couponCampaigns.find((campaign) => campaign.id === campaignId);
}

export function getOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId);
}
