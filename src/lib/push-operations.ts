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
type PushDeliveryProviderName = "mock";
type PushDeliveryStatus = "sent" | "skipped" | "failed";

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

export const pushDeliveryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export type PushSendRequest = z.infer<typeof pushSendRequestSchema>;
export type PushDeliveryQuery = z.infer<typeof pushDeliveryQuerySchema>;

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
  provider: PushDeliveryProviderName;
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  campaignStatus: PushCampaignStatus;
  deliveries: PushDeliveryItem[];
}

export interface PushDeliveryItem {
  id: string | null;
  organizationId: string;
  recipientProfileId: string;
  recipientRole: Role;
  provider: PushDeliveryProviderName;
  status: PushDeliveryStatus;
  skippedReason: string | null;
  failureReason: string | null;
  providerMessageId: string | null;
  createdAt: string;
}

export interface PushDeliveryLog {
  campaignId: string;
  summary: {
    total: number;
    sent: number;
    skipped: number;
    failed: number;
  };
  deliveries: PushDeliveryItem[];
}

interface PushProviderDeliveryResult {
  membership: MembershipRow;
  provider: PushDeliveryProviderName;
  status: PushDeliveryStatus;
  providerMessageId: string | null;
  skippedReason: string | null;
  failureReason: string | null;
}

interface PushProviderRequest {
  campaign: CampaignRow;
  memberships: MembershipRow[];
  mockResult: MockResult;
  now: string;
}

interface PushProvider {
  name: PushDeliveryProviderName;
  send(request: PushProviderRequest): Promise<PushProviderDeliveryResult[]>;
}

const mockPushProvider: PushProvider = {
  name: "mock",
  async send({ campaign, memberships, mockResult, now }) {
    return memberships.map((membership, index) => {
      const shouldSkip = mockResult === "skipped" || (mockResult === "mixed" && index % 2 === 1);
      return {
        membership,
        provider: "mock",
        status: shouldSkip ? "skipped" : "sent",
        providerMessageId: shouldSkip ? null : `mock:${campaign.id}:${membership.profile_id}:${now}`,
        skippedReason: shouldSkip ? "mock_provider_skipped" : null,
        failureReason: null
      };
    });
  }
};

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
  const provider = resolvePushProvider(input);
  const providerResults = await provider.send({
    campaign,
    memberships,
    mockResult: input.mockResult,
    now
  });
  const deliveryRows = providerResults.map((result) =>
    toDeliveryInsert(campaign, result, access.profileId)
  );

  let insertedRows: Row[] = [];
  if (deliveryRows.length > 0) {
    const { data, error } = await supabase
      .from("push_deliveries")
      .insert(deliveryRows)
      .select("id, organization_id, recipient_profile_id, recipient_role, provider, status, skipped_reason, failure_reason, provider_message_id, created_at");
    if (error) throw error;
    insertedRows = (data ?? []) as Row[];
  }

  const sentCount = insertedRows.filter((row) => row.status === "sent").length;
  const skippedCount = insertedRows.filter((row) => row.status === "skipped").length;
  const failedCount = insertedRows.filter((row) => row.status === "failed").length;
  const nextStatus: PushCampaignStatus = "sent";
  const { error: updateError } = await supabase
    .from("push_campaigns")
    .update({ status: nextStatus, sent_at: now })
    .eq("id", campaign.id);
  if (updateError) throw updateError;

  await writeAuditLog(supabase, access.profileId, campaign, {
    provider: provider.name,
    requested: memberships.length,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount
  });

  return {
    campaignId: campaign.id,
    provider: provider.name,
    requested: memberships.length,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount,
    campaignStatus: nextStatus,
    deliveries: insertedRows.map(mapDelivery)
  };
}

export async function getPushDeliveryLog(
  access: RequestAccessContext,
  campaignId: string,
  query: PushDeliveryQuery
): Promise<PushDeliveryLog> {
  if (!isLiveSupabaseMode()) {
    return getMockDeliveryLog(campaignId, query);
  }

  const supabase = requireSupabase(access);
  const campaign = await getCampaign(supabase, campaignId);
  const [{ data: summaryRows, error: summaryError }, { data: deliveryRows, error: deliveryError }] =
    await Promise.all([
      supabase.from("push_deliveries").select("status").eq("campaign_id", campaign.id),
      supabase
        .from("push_deliveries")
        .select("id, organization_id, recipient_profile_id, recipient_role, provider, status, skipped_reason, failure_reason, provider_message_id, created_at")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false })
        .limit(query.limit)
    ]);

  if (summaryError) throw summaryError;
  if (deliveryError) throw deliveryError;

  const deliveries = ((deliveryRows ?? []) as Row[]).map(mapDelivery);
  const summary = summarizeDeliveryRows((summaryRows ?? []) as Row[]);

  return {
    campaignId: campaign.id,
    summary,
    deliveries
  };
}

function resolvePushProvider(_input: PushSendRequest): PushProvider {
  return mockPushProvider;
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
  result: PushProviderDeliveryResult,
  requestedBy: string | null
) {
  return {
    campaign_id: campaign.id,
    organization_id: result.membership.organization_id,
    recipient_profile_id: result.membership.profile_id,
    recipient_role: result.membership.role,
    provider: result.provider,
    status: result.status,
    provider_message_id: result.providerMessageId,
    skipped_reason: result.skippedReason,
    failure_reason: result.failureReason,
    metadata: {
      campaignTitle: campaign.title,
      targetRole: campaign.target_role,
      providerMode: result.provider
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
      failure_reason: null,
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

function getMockDeliveryLog(campaignId: string, query: PushDeliveryQuery): PushDeliveryLog {
  const deliveries = sendMockCampaign(campaignId, {
    providerMode: "mock",
    mockResult: "mixed",
    limit: query.limit
  }).deliveries;

  return {
    campaignId,
    summary: summarizeDeliveryItems(deliveries),
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
    status: parseDeliveryStatus(row.status),
    skippedReason: nullableString(row.skipped_reason),
    failureReason: nullableString(row.failure_reason),
    providerMessageId: nullableString(row.provider_message_id),
    createdAt: asString(row.created_at)
  };
}

function summarizeDeliveryRows(rows: Row[]): PushDeliveryLog["summary"] {
  return summarizeDeliveryItems(
    rows.map((row) => ({
      id: null,
      organizationId: "",
      recipientProfileId: "",
      recipientRole: "teacher",
      provider: "mock",
      status: parseDeliveryStatus(row.status),
      skippedReason: null,
      failureReason: null,
      providerMessageId: null,
      createdAt: ""
    }))
  );
}

function summarizeDeliveryItems(deliveries: PushDeliveryItem[]): PushDeliveryLog["summary"] {
  return {
    total: deliveries.length,
    sent: deliveries.filter((delivery) => delivery.status === "sent").length,
    skipped: deliveries.filter((delivery) => delivery.status === "skipped").length,
    failed: deliveries.filter((delivery) => delivery.status === "failed").length
  };
}

function parseCampaignStatus(value: unknown): PushCampaignStatus {
  return typeof value === "string" && ["draft", "scheduled", "sent", "failed", "cancelled"].includes(value)
    ? (value as PushCampaignStatus)
    : "draft";
}

function parseDeliveryStatus(value: unknown): PushDeliveryStatus {
  return typeof value === "string" && ["sent", "skipped", "failed"].includes(value)
    ? (value as PushDeliveryStatus)
    : "sent";
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
