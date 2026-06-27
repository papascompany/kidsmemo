import { z } from "zod";
import {
  AccessControlError,
  assertRoleScope,
  resolveRequestAccessContext,
  type RequestAccessContext
} from "./access-control";
import { isLiveSupabaseMode } from "./env-flags";
import { createSupabaseUserClient } from "./supabase";
import type { Role } from "./types";

type Row = Record<string, unknown>;
type SupabaseClient = NonNullable<ReturnType<typeof createSupabaseUserClient>>;
type PushCampaignStatus = "draft" | "scheduled" | "sent" | "failed" | "cancelled";
type MockResult = "sent" | "skipped" | "mixed";
type PushDeliveryStatus = "sent" | "skipped";

const sendableCampaignStatuses: PushCampaignStatus[] = ["draft", "scheduled"];
const mockMemberships = [
  {
    organization_id: "00000000-0000-0000-0000-000000000001",
    profile_id: "00000000-0000-0000-0000-000000000101",
    role: "owner"
  },
  {
    organization_id: "00000000-0000-0000-0000-000000000001",
    profile_id: "00000000-0000-0000-0000-000000000102",
    role: "teacher"
  }
] satisfies MembershipRow[];

export const pushCampaignIdSchema = z.string().uuid();

export const pushSendRequestSchema = z
  .object({
    providerMode: z.enum(["auto", "mock"]).default("auto"),
    mockResult: z.enum(["sent", "skipped", "mixed"]).default("sent"),
    limit: z.coerce.number().int().positive().max(1000).optional()
  })
  .default({});

export type PushSendRequest = z.infer<typeof pushSendRequestSchema>;

interface CampaignRow {
  id: string;
  organization_id: string | null;
  title: string;
  body: string;
  target_role: Role | null;
  status: PushCampaignStatus;
  scheduled_for: string | null;
}

interface MembershipRow {
  organization_id: string;
  profile_id: string;
  role: Role;
}

interface DeliverySummary {
  campaignId: string;
  provider: "mock";
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  campaignStatus: PushCampaignStatus;
  deliveries: PushDeliveryItem[];
}

interface PushDeliveryItem {
  id: string | null;
  organizationId: string;
  recipientProfileId: string;
  recipientRole: Role;
  provider: "mock";
  status: PushDeliveryStatus;
  skippedReason: string | null;
  providerMessageId: string | null;
  createdAt: string;
}

export async function requirePushAdmin(request: Request) {
  const access = await resolveRequestAccessContext(request);
  if (access.source === "anonymous") {
    throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
  }
  assertRoleScope(access, ["admin"]);
  return access;
}

export async function sendPushCampaign(
  access: RequestAccessContext,
  campaignId: string,
  input: PushSendRequest
): Promise<DeliverySummary> {
  if (!isLiveSupabaseMode()) {
    return sendMockCampaign(campaignId, input);
  }

  const supabase = requireSupabase(access);
  const campaign = await getCampaign(supabase, campaignId);
  assertCampaignSendable(campaign);

  const memberships = await getTargetMemberships(supabase, campaign, input.limit);
  const now = new Date().toISOString();
  const deliveryRows = memberships.map((membership, index) =>
    toDeliveryInsert(campaign, membership, access.profileId, input.mockResult, index, now)
  );

  let insertedRows: Row[] = [];
  if (deliveryRows.length > 0) {
    const { data, error } = await supabase
      .from("push_deliveries")
      .insert(deliveryRows)
      .select("id, organization_id, recipient_profile_id, recipient_role, provider, status, skipped_reason, provider_message_id, created_at");
    if (error) throw error;
    insertedRows = (data ?? []) as Row[];
  }

  const sentCount = insertedRows.filter((row) => row.status === "sent").length;
  const skippedCount = insertedRows.filter((row) => row.status === "skipped").length;
  const nextStatus: PushCampaignStatus = "sent";
  const { error: updateError } = await supabase
    .from("push_campaigns")
    .update({ status: nextStatus, sent_at: now })
    .eq("id", campaign.id);
  if (updateError) throw updateError;

  await writeAuditLog(supabase, access.profileId, campaign, {
    provider: "mock",
    requested: memberships.length,
    sent: sentCount,
    skipped: skippedCount
  });

  return {
    campaignId: campaign.id,
    provider: "mock",
    requested: memberships.length,
    sent: sentCount,
    skipped: skippedCount,
    failed: 0,
    campaignStatus: nextStatus,
    deliveries: insertedRows.map(mapDelivery)
  };
}

async function getCampaign(supabase: SupabaseClient, campaignId: string): Promise<CampaignRow> {
  const { data, error } = await supabase
    .from("push_campaigns")
    .select("id, organization_id, title, body, target_role, status, scheduled_for")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new AccessControlError("push_campaign_not_found", "푸시 캠페인을 찾을 수 없습니다.", 404);
  }

  return {
    id: asString(data.id),
    organization_id: nullableString(data.organization_id),
    title: asString(data.title),
    body: asString(data.body),
    target_role: parseNullableRole(data.target_role),
    status: parseCampaignStatus(data.status),
    scheduled_for: nullableString(data.scheduled_for)
  };
}

function assertCampaignSendable(campaign: CampaignRow) {
  if (!sendableCampaignStatuses.includes(campaign.status)) {
    throw new AccessControlError(
      "push_campaign_not_sendable",
      "draft 또는 scheduled 상태의 푸시 캠페인만 발송 요청할 수 있습니다.",
      409,
      { campaignId: campaign.id, status: campaign.status }
    );
  }
}

async function getTargetMemberships(supabase: SupabaseClient, campaign: CampaignRow, limit?: number) {
  let query = supabase
    .from("memberships")
    .select("organization_id, profile_id, role")
    .order("created_at", { ascending: true });

  if (campaign.organization_id) {
    query = query.eq("organization_id", campaign.organization_id);
  }

  if (campaign.target_role) {
    query = query.eq("role", campaign.target_role);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as Row[]).map((row) => ({
    organization_id: asString(row.organization_id),
    profile_id: asString(row.profile_id),
    role: parseRole(row.role)
  }));
}

function toDeliveryInsert(
  campaign: CampaignRow,
  membership: MembershipRow,
  requestedBy: string | null,
  mockResult: MockResult,
  index: number,
  now: string
) {
  const shouldSkip = mockResult === "skipped" || (mockResult === "mixed" && index % 2 === 1);
  return {
    campaign_id: campaign.id,
    organization_id: membership.organization_id,
    recipient_profile_id: membership.profile_id,
    recipient_role: membership.role,
    provider: "mock",
    status: shouldSkip ? "skipped" : "sent",
    provider_message_id: shouldSkip ? null : `mock:${campaign.id}:${membership.profile_id}:${now}`,
    skipped_reason: shouldSkip ? "mock_provider_skipped" : null,
    metadata: {
      campaignTitle: campaign.title,
      targetRole: campaign.target_role,
      providerMode: "mock"
    },
    requested_by: requestedBy
  };
}

async function writeAuditLog(
  supabase: SupabaseClient,
  profileId: string | null,
  campaign: CampaignRow,
  metadata: Record<string, unknown>
) {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_profile_id: profileId,
    action: "send",
    resource_type: "pushCampaigns",
    resource_id: campaign.id,
    metadata
  });
  if (error) throw error;
}

function sendMockCampaign(campaignId: string, input: PushSendRequest): DeliverySummary {
  const now = new Date().toISOString();
  const memberships = mockMemberships.slice(0, input.limit ?? mockMemberships.length);
  const campaign: CampaignRow = {
    id: campaignId,
    organization_id: null,
    title: "Mock push campaign",
    body: "Mock provider delivery",
    target_role: null,
    status: "draft",
    scheduled_for: null
  };
  const deliveries = memberships.map((membership, index) =>
    mapDelivery({
      id: `mock-push-delivery-${index + 1}`,
      organization_id: membership.organization_id,
      recipient_profile_id: membership.profile_id,
      recipient_role: membership.role,
      provider: "mock",
      status: input.mockResult === "skipped" || (input.mockResult === "mixed" && index % 2 === 1) ? "skipped" : "sent",
      skipped_reason:
        input.mockResult === "skipped" || (input.mockResult === "mixed" && index % 2 === 1)
          ? "mock_provider_skipped"
          : null,
      provider_message_id:
        input.mockResult === "skipped" || (input.mockResult === "mixed" && index % 2 === 1)
          ? null
          : `mock:${campaign.id}:${membership.profile_id}:${now}`,
      created_at: now
    })
  );

  return {
    campaignId,
    provider: "mock",
    requested: memberships.length,
    sent: deliveries.filter((delivery) => delivery.status === "sent").length,
    skipped: deliveries.filter((delivery) => delivery.status === "skipped").length,
    failed: 0,
    campaignStatus: "sent",
    deliveries
  };
}

function requireSupabase(access: RequestAccessContext) {
  const supabase = access.accessToken ? createSupabaseUserClient(access.accessToken) : null;
  if (!supabase) throw new Error("Supabase user client is not configured.");
  return supabase;
}

function mapDelivery(row: Row): PushDeliveryItem {
  return {
    id: nullableString(row.id),
    organizationId: asString(row.organization_id),
    recipientProfileId: asString(row.recipient_profile_id),
    recipientRole: parseRole(row.recipient_role),
    provider: "mock",
    status: row.status === "skipped" ? "skipped" : "sent",
    skippedReason: nullableString(row.skipped_reason),
    providerMessageId: nullableString(row.provider_message_id),
    createdAt: asString(row.created_at)
  };
}

function parseCampaignStatus(value: unknown): PushCampaignStatus {
  return typeof value === "string" && ["draft", "scheduled", "sent", "failed", "cancelled"].includes(value)
    ? (value as PushCampaignStatus)
    : "draft";
}

function parseRole(value: unknown): Role {
  return typeof value === "string" && ["owner", "manager", "teacher", "admin"].includes(value)
    ? (value as Role)
    : "teacher";
}

function parseNullableRole(value: unknown): Role | null {
  return typeof value === "string" && ["owner", "manager", "teacher", "admin"].includes(value)
    ? (value as Role)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}
