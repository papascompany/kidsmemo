import { z } from "zod";
import { handleApiError, ok } from "@/lib/api-response";
import { AccessControlError, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { adminMockOperations } from "@/lib/admin-operations";
import { isLiveSupabaseMode } from "@/lib/env-flags";
import { createSupabaseUserClient } from "@/lib/supabase";

type Row = Record<string, unknown>;

const resourceSchema = z.enum([
  "contentBlocks",
  "mediaAssets",
  "giftCodes",
  "staffCoupons",
  "pushCampaigns"
]);

const contentBlockSchema = z.object({
  id: z.string().uuid().optional(),
  scope: z.enum(["landing", "organization"]),
  organizationId: z.string().uuid().nullable().optional(),
  slot: z.string().trim().min(1),
  title: z.string().trim().default(""),
  body: z.string().default(""),
  imageUrl: z.string().trim().url().or(z.literal("")).default(""),
  ctaLabel: z.string().trim().default(""),
  ctaUrl: z.string().trim().default(""),
  sortOrder: z.coerce.number().int().default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft")
});

const mediaAssetSchema = z.object({
  id: z.string().uuid().optional(),
  scope: z.enum(["landing", "organization"]).default("landing"),
  organizationId: z.string().uuid().nullable().optional(),
  label: z.string().trim().min(1),
  url: z.string().trim().url(),
  altText: z.string().default(""),
  usageSlot: z.string().trim().default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft")
});

const giftCodeSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  code: z.string().trim().min(1),
  amountLabel: z.string().trim().min(1),
  status: z.enum(["available", "issued", "redeemed", "expired", "void"]).default("available"),
  assignedToProfileId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional()
});

const staffCouponSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string().default(""),
  code: z.string().trim().min(1),
  amountLabel: z.string().trim().min(1),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  assignedTo: z.enum(["owner", "teacher", "all_staff"]).default("all_staff"),
  status: z.enum(["available", "downloaded", "used", "expired"]).default("available"),
  sites: z.array(z.enum(["jumbokids", "godomall"])).min(1).default(["jumbokids"]),
  jumbokidsUrl: z.string().trim().url().or(z.literal("")).default(""),
  godomallUrl: z.string().trim().url().or(z.literal("")).default("")
});

const pushCampaignSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  targetRole: z.enum(["owner", "manager", "teacher", "admin"]).nullable().optional(),
  status: z.enum(["draft", "scheduled", "failed", "cancelled"]).default("draft"),
  scheduledFor: z.string().datetime().nullable().optional()
});

const mutationSchemaBase = z.discriminatedUnion("resource", [
  z.object({ resource: z.literal("contentBlocks"), payload: contentBlockSchema }),
  z.object({ resource: z.literal("mediaAssets"), payload: mediaAssetSchema }),
  z.object({ resource: z.literal("giftCodes"), payload: giftCodeSchema }),
  z.object({ resource: z.literal("staffCoupons"), payload: staffCouponSchema }),
  z.object({ resource: z.literal("pushCampaigns"), payload: pushCampaignSchema })
]);

const mutationSchema = mutationSchemaBase.superRefine((value, context) => {
  if (value.resource === "pushCampaigns" && value.payload.status === "scheduled" && !value.payload.scheduledFor) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payload", "scheduledFor"],
      message: "예약 정보 저장에는 예약 시각이 필요합니다. 자동 발송은 provider 연결 후 지원됩니다."
    });
  }

  if (value.resource !== "contentBlocks" && value.resource !== "mediaAssets") {
    return;
  }

  if (value.payload.scope === "landing" && value.payload.organizationId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payload", "organizationId"],
      message: "landing 범위는 organizationId가 없어야 합니다."
    });
  }

  if (value.payload.scope === "organization" && !value.payload.organizationId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payload", "organizationId"],
      message: "organization 범위는 organizationId가 필요합니다."
    });
  }
});

const resourceConfig = {
  contentBlocks: {
    table: "content_blocks",
    order: "sort_order"
  },
  mediaAssets: {
    table: "media_assets",
    order: "created_at"
  },
  giftCodes: {
    table: "gift_codes",
    order: "created_at"
  },
  staffCoupons: {
    table: "staff_coupons",
    order: "valid_until"
  },
  pushCampaigns: {
    table: "push_campaigns",
    order: "created_at"
  }
} as const;

export async function GET(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    if (access.source === "anonymous") {
      throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
    }
    assertRoleScope(access, ["admin"]);

    if (!isLiveSupabaseMode()) {
      return ok(adminMockOperations);
    }

    const supabase = requireSupabase(access.accessToken);
    const [contentBlocks, mediaAssets, giftCodes, staffCoupons, pushCampaigns, auditLogs] =
      await Promise.all([
        fetchRows(supabase, "contentBlocks"),
        fetchRows(supabase, "mediaAssets"),
        fetchRows(supabase, "giftCodes"),
        fetchRows(supabase, "staffCoupons"),
        fetchRows(supabase, "pushCampaigns"),
        supabase
          .from("admin_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20)
      ]);

    if (auditLogs.error) throw auditLogs.error;

    return ok({
      contentBlocks: contentBlocks.map(mapContentBlock),
      mediaAssets: mediaAssets.map(mapMediaAsset),
      giftCodes: giftCodes.map(mapGiftCode),
      staffCoupons: staffCoupons.map(mapStaffCoupon),
      pushCampaigns: pushCampaigns.map(mapPushCampaign),
      auditLogs: ((auditLogs.data ?? []) as Row[]).map(mapAuditLog)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    if (access.source === "anonymous") {
      throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
    }
    assertRoleScope(access, ["admin"]);
    const mutation = mutationSchema.parse(await request.json());

    if (!isLiveSupabaseMode()) {
      return ok({
        saved: false,
        reason: "mock_mode",
        resource: mutation.resource,
        payload: mutation.payload
      });
    }

    const supabase = requireSupabase(access.accessToken);
    const row = toRow(mutation.resource, mutation.payload, access.profileId);
    const table: string = resourceConfig[mutation.resource].table;
    const query = mutation.payload.id
      ? supabase.from(table).update(row).eq("id", mutation.payload.id)
      : supabase.from(table).insert(row);
    const { data, error } = await query.select("*").single();
    if (error) throw error;

    const auditResult = await supabase.from("admin_audit_logs").insert({
      actor_profile_id: access.profileId,
      action: mutation.payload.id ? "update" : "create",
      resource_type: mutation.resource,
      resource_id: (data as Row).id,
      metadata: { slot: (data as Row).slot ?? null, title: (data as Row).title ?? null }
    });
    if (auditResult.error) throw auditResult.error;

    return ok({
      saved: true,
      resource: mutation.resource,
      item: mapResource(mutation.resource, data as Row)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function requireSupabase(accessToken?: string) {
  const supabase = accessToken ? createSupabaseUserClient(accessToken) : null;
  if (!supabase) {
    throw new Error("Supabase user client is not configured.");
  }
  return supabase;
}

async function fetchRows(
  supabase: NonNullable<ReturnType<typeof createSupabaseUserClient>>,
  resource: z.infer<typeof resourceSchema>
) {
  const config = resourceConfig[resource];
  const { data, error } = await supabase
    .from(config.table)
    .select("*")
    .order(config.order, { ascending: resource === "contentBlocks" });
  if (error) throw error;
  return (data ?? []) as Row[];
}

function toRow(
  resource: z.infer<typeof resourceSchema>,
  payload: Record<string, unknown>,
  profileId: string | null
): Record<string, unknown> {
  if (resource === "contentBlocks") {
    return {
      scope: payload.scope,
      organization_id: payload.organizationId || null,
      slot: payload.slot,
      title: payload.title,
      body: payload.body,
      image_url: payload.imageUrl || null,
      cta_label: payload.ctaLabel || null,
      cta_url: payload.ctaUrl || null,
      sort_order: payload.sortOrder,
      status: payload.status,
      updated_by: profileId,
      updated_at: new Date().toISOString()
    };
  }

  if (resource === "mediaAssets") {
    return {
      scope: payload.scope,
      organization_id: payload.organizationId || null,
      label: payload.label,
      url: payload.url,
      alt_text: payload.altText,
      usage_slot: payload.usageSlot || null,
      status: payload.status,
      created_by: profileId
    };
  }

  if (resource === "giftCodes") {
    return {
      organization_id: payload.organizationId || null,
      title: payload.title,
      code: payload.code,
      amount_label: payload.amountLabel,
      status: payload.status,
      assigned_to_profile_id: payload.assignedToProfileId || null,
      expires_at: payload.expiresAt || null,
      created_by: profileId
    };
  }

  if (resource === "staffCoupons") {
    return {
      organization_id: payload.organizationId,
      title: payload.title,
      description: payload.description,
      code: payload.code,
      amount_label: payload.amountLabel,
      valid_until: payload.validUntil,
      assigned_to: payload.assignedTo,
      status: payload.status,
      sites: payload.sites,
      jumbokids_url: payload.jumbokidsUrl || null,
      godomall_url: payload.godomallUrl || null,
      created_by: profileId
    };
  }

  return {
    organization_id: payload.organizationId || null,
    title: payload.title,
    body: payload.body,
    target_role: payload.targetRole || null,
    status: payload.status,
    scheduled_for: payload.scheduledFor || null,
    created_by: profileId
  };
}

function mapResource(resource: z.infer<typeof resourceSchema>, row: Row) {
  if (resource === "contentBlocks") return mapContentBlock(row);
  if (resource === "mediaAssets") return mapMediaAsset(row);
  if (resource === "giftCodes") return mapGiftCode(row);
  if (resource === "staffCoupons") return mapStaffCoupon(row);
  return mapPushCampaign(row);
}

function mapContentBlock(row: Row) {
  return {
    id: asString(row.id),
    scope: asString(row.scope),
    organizationId: nullableString(row.organization_id),
    slot: asString(row.slot),
    title: asString(row.title),
    body: asString(row.body),
    imageUrl: asString(row.image_url),
    ctaLabel: asString(row.cta_label),
    ctaUrl: asString(row.cta_url),
    sortOrder: Number(row.sort_order ?? 0),
    status: asString(row.status),
    updatedAt: asString(row.updated_at)
  };
}

function mapMediaAsset(row: Row) {
  return {
    id: asString(row.id),
    scope: asString(row.scope),
    organizationId: nullableString(row.organization_id),
    label: asString(row.label),
    url: asString(row.url),
    altText: asString(row.alt_text),
    usageSlot: asString(row.usage_slot),
    status: asString(row.status),
    createdAt: asString(row.created_at)
  };
}

function mapGiftCode(row: Row) {
  return {
    id: asString(row.id),
    organizationId: nullableString(row.organization_id),
    title: asString(row.title),
    code: asString(row.code),
    amountLabel: asString(row.amount_label),
    status: asString(row.status),
    assignedToProfileId: nullableString(row.assigned_to_profile_id),
    expiresAt: nullableString(row.expires_at)
  };
}

function mapStaffCoupon(row: Row) {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    title: asString(row.title),
    description: asString(row.description),
    code: asString(row.code),
    amountLabel: asString(row.amount_label),
    validUntil: asString(row.valid_until),
    assignedTo: asString(row.assigned_to),
    status: asString(row.status),
    sites: Array.isArray(row.sites) ? row.sites.filter((site): site is string => typeof site === "string") : [],
    jumbokidsUrl: asString(row.jumbokids_url),
    godomallUrl: asString(row.godomall_url)
  };
}

function mapPushCampaign(row: Row) {
  return {
    id: asString(row.id),
    organizationId: nullableString(row.organization_id),
    title: asString(row.title),
    body: asString(row.body),
    targetRole: nullableString(row.target_role),
    status: asString(row.status),
    scheduledFor: nullableString(row.scheduled_for)
  };
}

function mapAuditLog(row: Row) {
  return {
    id: asString(row.id),
    actorProfileId: nullableString(row.actor_profile_id),
    action: asString(row.action),
    resourceType: asString(row.resource_type),
    resourceId: nullableString(row.resource_id),
    createdAt: asString(row.created_at)
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}
