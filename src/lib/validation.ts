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

export const messageProviderWebhookSchema = z.object({
  providerMessageId: nonEmptyString,
  status: z.enum(["queued", "sent", "failed", "fallback"]),
  failureReason: z.string().optional()
});

export const jumbokidsBenefitsWebhookSchema = z.object({
  benefitId: nonEmptyString,
  status: z.enum(["issued", "redeemed", "expired", "failed"]),
  code: z.string().optional(),
  jumbokidsUrl: z.string().url().optional(),
  godomallUrl: z.string().url().optional()
});
