import type {
  EventSchedule,
  MessageDelivery,
  MessageJob,
  Organization,
  Profile,
  StaffCouponDownload,
  StaffCoupon
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

export const staffCoupons: StaffCoupon[] = [
  {
    id: "staff-coupon-1",
    organizationId: "org-1",
    title: "원장님 포토북 제작 20% 할인",
    description: "행사 사진을 포토북으로 정리할 때 원장님 계정에서 바로 사용할 수 있는 할인코드입니다.",
    code: "JK-DIRECTOR-20",
    amountLabel: "20% 할인",
    validUntil: "2026-07-31",
    assignedTo: "owner",
    status: "available",
    sites: ["jumbokids", "godomall"],
    siteUrls: {
      jumbokids: "https://jumbokids.example.com",
      godomall: "https://godomall.example.com"
    }
  },
  {
    id: "staff-coupon-2",
    organizationId: "org-1",
    title: "선생님 사진 인화 배송비 지원",
    description: "반 행사 사진 인화 주문 시 교직원 계정에서 사용할 수 있는 배송비 지원 쿠폰입니다.",
    code: "TEACHER-SHIP-3000",
    amountLabel: "배송비 3,000원 지원",
    validUntil: "2026-08-15",
    assignedTo: "teacher",
    status: "downloaded",
    sites: ["jumbokids"],
    siteUrls: {
      jumbokids: "https://jumbokids.example.com/prints",
      godomall: "https://godomall.example.com"
    }
  },
  {
    id: "staff-coupon-3",
    organizationId: "org-1",
    title: "기관 공용 앨범 제작 10,000원 할인",
    description: "유치원/어린이집 공용 주문에 적용할 수 있도록 점보키즈 관리자가 제공한 할인코드입니다.",
    code: "CENTER-ALBUM-10000",
    amountLabel: "10,000원 할인",
    validUntil: "2026-09-30",
    assignedTo: "all_staff",
    status: "available",
    sites: ["godomall"],
    siteUrls: {
      jumbokids: "https://jumbokids.example.com/albums",
      godomall: "https://godomall.example.com/albums"
    }
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
    reminderStatus: "not_scheduled"
  }
];

export const messageJobs: MessageJob[] = [
  {
    id: "job-1",
    eventId: "event-2",
    scheduledFor: "2026-02-19T09:00:00+09:00",
    channels: ["alimtalk", "sms", "email"],
    status: "sent",
    recipientCount: 1
  },
  {
    id: "job-2",
    eventId: "event-3",
    scheduledFor: "2026-06-02T09:00:00+09:00",
    channels: ["alimtalk", "sms", "email"],
    status: "queued",
    recipientCount: 118
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

export const staffCouponDownloads: StaffCouponDownload[] = [];

export function getOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId);
}

export function getStaffCouponById(couponId: string) {
  return staffCoupons.find((coupon) => coupon.id === couponId);
}
