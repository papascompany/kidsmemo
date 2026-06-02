import { z } from "zod";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.");
const idString = z.string().min(1);
const nonEmptyString = z.string().trim().min(1);

export const eventCreateSchema = z.object({
  organizationId: idString,
  title: nonEmptyString,
  eventDate: dateString,
  audience: nonEmptyString,
  classNames: z.array(nonEmptyString).default([]),
  description: z.string().default(""),
  supplies: z.array(nonEmptyString).default([]),
  couponCampaignId: idString,
  repeatRule: z.literal("yearly").optional()
});

export const eventUpdateSchema = eventCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "수정할 필드를 1개 이상 입력해야 합니다."
});

export const yearPlanImportSchema = z.object({
  organizationId: idString,
  year: z.number().int().min(2024).max(2100),
  events: z.array(
    z.object({
      title: nonEmptyString,
      eventDate: dateString,
      audience: nonEmptyString,
      description: z.string().optional()
    })
  )
});

export const campaignBaseSchema = z.object({
  name: nonEmptyString,
  description: z.string().default(""),
  issueMode: z.enum(["jumbokids_api", "manual"]),
  targetScope: z.enum(["all_members", "selected_members"]),
  validFrom: dateString,
  validUntil: dateString,
  noticeType: z.enum(["image", "html"]),
  noticeHtml: z.string().optional(),
  noticeImageUrl: z.string().url().optional(),
  selectedOrganizationIds: z.array(idString).default([]),
  selectedProfileIds: z.array(idString).default([])
});

export const couponCampaignCreateSchema = campaignBaseSchema.superRefine((value, context) => {
  if (value.validUntil < value.validFrom) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validUntil"],
      message: "유효 종료일은 시작일 이후여야 합니다."
    });
  }

  if (value.targetScope === "selected_members") {
    const hasTargets = value.selectedOrganizationIds.length > 0 || value.selectedProfileIds.length > 0;
    if (!hasTargets) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetScope"],
        message: "선택된회원 발행은 기관 또는 회원 대상을 1개 이상 지정해야 합니다."
      });
    }
  }

  if (value.noticeType === "html" && !value.noticeHtml?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["noticeHtml"],
      message: "HTML 안내를 선택하면 안내 HTML이 필요합니다."
    });
  }

  if (value.noticeType === "image" && !value.noticeImageUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["noticeImageUrl"],
      message: "이미지 안내를 선택하면 이미지 URL이 필요합니다."
    });
  }
});

export const couponCampaignPatchSchema = campaignBaseSchema
  .extend({ isActive: z.boolean().optional() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "수정할 필드를 1개 이상 입력해야 합니다."
  });

export const couponItemSchema = z
  .object({
    title: nonEmptyString,
    benefitType: z.enum(["coupon", "credit"]),
    amountLabel: nonEmptyString,
    manualCode: z.string().trim().optional(),
    manualUrl: z.string().url().optional(),
    jumbokidsBenefitType: z.enum(["discount_coupon", "photo_credit", "album_coupon"]).optional()
  })
  .superRefine((value, context) => {
    const hasManualValue = Boolean(value.manualCode?.trim() || value.manualUrl);
    if (!hasManualValue && !value.jumbokidsBenefitType) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jumbokidsBenefitType"],
        message: "수동 쿠폰 코드/URL 또는 점보키즈 혜택 타입 중 하나가 필요합니다."
      });
    }
  });

export const campaignTargetsSchema = z
  .object({
    selectedOrganizationIds: z.array(idString).default([]),
    selectedProfileIds: z.array(idString).default([])
  })
  .refine((value) => value.selectedOrganizationIds.length + value.selectedProfileIds.length > 0, {
    message: "기관 또는 회원 대상을 1개 이상 지정해야 합니다."
  });

export const campaignNoticeSchema = z.discriminatedUnion("noticeType", [
  z.object({
    noticeType: z.literal("html"),
    noticeHtml: nonEmptyString
  }),
  z.object({
    noticeType: z.literal("image"),
    noticeImageUrl: z.string().url()
  })
]);

export const messageProviderWebhookSchema = z.object({
  providerMessageId: nonEmptyString,
  status: z.enum(["queued", "sent", "failed", "fallback"]),
  failureReason: z.string().optional()
});

export const jumbokidsBenefitsWebhookSchema = z.object({
  benefitId: nonEmptyString,
  status: z.enum(["issued", "redeemed", "expired", "failed"]),
  code: z.string().optional(),
  landingUrl: z.string().url().optional()
});

