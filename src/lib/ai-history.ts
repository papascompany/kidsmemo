import { AccessControlError, assertLiveSupabaseAnonConfigured, type RequestAccessContext } from "./access-control";
import { isLiveSupabaseMode } from "./env-flags";
import { aiGenerations, getOrganizationById, profiles } from "./mock-data";
import { getPrimaryOrganizationId } from "./organization-context";
import { createSupabaseUserClient } from "./supabase";
import type {
  AiGenerationKind,
  AiGenerationRecord,
  EventAssistantRequest,
  EventAssistantResult,
  ParentMessageRequest,
  ParentMessageResult
} from "./types";

type AiInput = EventAssistantRequest | ParentMessageRequest;
type AiOutput = EventAssistantResult | ParentMessageResult;
type Row = Record<string, unknown>;

export interface CreateAiGenerationInput {
  kind: AiGenerationKind;
  input: AiInput;
  output: AiOutput;
}

export interface ListAiHistoryOptions {
  kind?: AiGenerationKind;
  limit?: number;
}

export async function saveAiGeneration(
  access: RequestAccessContext,
  input: CreateAiGenerationInput
): Promise<AiGenerationRecord> {
  const scope = resolveWritableScope(access);

  if (!isLiveSupabaseMode()) {
    const record: AiGenerationRecord = {
      id: `ai-generation-${aiGenerations.length + 1}`,
      organizationId: scope.organizationId,
      profileId: scope.profileId,
      kind: input.kind,
      input: input.input,
      output: input.output,
      createdAt: new Date().toISOString()
    };

    aiGenerations.unshift(record);
    return record;
  }

  const supabase = createScopedSupabaseClient(access);
  const { data, error } = await supabase
    .from("ai_generations")
    .insert({
      organization_id: scope.organizationId,
      profile_id: scope.profileId,
      kind: input.kind,
      input: input.input,
      output: input.output
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapAiGeneration(data as Row);
}

export async function listAiHistory(
  access: RequestAccessContext,
  options: ListAiHistoryOptions = {}
): Promise<AiGenerationRecord[]> {
  const organizationId = resolveReadableOrganizationId(access);
  const limit = clampLimit(options.limit);

  if (!isLiveSupabaseMode()) {
    return aiGenerations
      .filter((record) => record.organizationId === organizationId)
      .filter((record) => !options.kind || record.kind === options.kind)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  const supabase = createScopedSupabaseClient(access);
  let query = supabase
    .from("ai_generations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.kind) {
    query = query.eq("kind", options.kind);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapAiGeneration);
}

function createScopedSupabaseClient(access: RequestAccessContext) {
  if (!access.accessToken || access.source !== "session") {
    assertLiveSupabaseAnonConfigured();
    throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
  }

  const supabase = createSupabaseUserClient(access.accessToken);
  if (!supabase) {
    throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
  }

  return supabase;
}

function resolveWritableScope(access: RequestAccessContext) {
  if (isLiveSupabaseMode()) {
    if (!access.organizationId || !access.profileId) {
      throw new AccessControlError("forbidden_ai_history_scope", "AI 이력을 저장할 기관과 사용자를 확인할 수 없습니다.", 403);
    }

    return {
      organizationId: access.organizationId,
      profileId: access.profileId
    };
  }

  return {
    organizationId: access.organizationId ?? getPrimaryOrganizationId(),
    profileId: access.profileId ?? profiles[0]?.id ?? "mock-profile"
  };
}

function resolveReadableOrganizationId(access: RequestAccessContext) {
  if (isLiveSupabaseMode()) {
    if (!access.organizationId) {
      throw new AccessControlError("forbidden_ai_history_scope", "AI 이력을 조회할 기관을 확인할 수 없습니다.", 403);
    }

    return access.organizationId;
  }

  const organizationId = access.organizationId ?? getPrimaryOrganizationId();
  return getOrganizationById(organizationId)?.id ?? getPrimaryOrganizationId();
}

function clampLimit(value: number | undefined) {
  if (!value || Number.isNaN(value)) {
    return 10;
  }

  return Math.min(Math.max(Math.floor(value), 1), 50);
}

function mapAiGeneration(row: Row): AiGenerationRecord {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    profileId: asString(row.profile_id),
    kind: asAiGenerationKind(row.kind),
    input: asObject(row.input) as AiInput,
    output: asObject(row.output) as AiOutput,
    createdAt: asString(row.created_at)
  };
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asObject(value: unknown) {
  return value && typeof value === "object" ? value : {};
}

function asAiGenerationKind(value: unknown): AiGenerationKind {
  return value === "parent_message" ? "parent_message" : "event_assistant";
}
