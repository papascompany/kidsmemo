import { z } from "zod";
import { AccessControlError } from "./access-control";
import { isLiveSupabaseMode } from "./env-flags";
import { createSupabaseUserClient } from "./supabase";
import type { Role } from "./types";

const inviteRoleSchema = z.enum(["manager", "teacher"]);

export const adminInviteCreateSchema = z.object({
  organizationId: z.string().trim().uuid("기관 ID를 확인해 주세요."),
  role: inviteRoleSchema.default("teacher"),
  code: z.string().trim().min(6, "초대 코드는 6자 이상이어야 합니다.").max(64, "초대 코드가 너무 깁니다.").optional(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
  maxUses: z.coerce.number().int().positive().optional().nullable()
});

export const adminInviteDeleteSchema = z.object({
  id: z.string().trim().uuid("초대 ID를 확인해 주세요.")
});

export type AdminInviteCreateInput = z.infer<typeof adminInviteCreateSchema>;

export type AdminInvite = {
  id: string;
  code: string;
  organizationId: string;
  organizationName: string;
  organizationRegion: string;
  role: Extract<Role, "manager" | "teacher">;
  expiresAt: string | null;
  revokedAt: string | null;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
};

export type AdminInviteRemovalResult = {
  id: string;
  action: "deleted" | "revoked";
  revokedAt: string | null;
};

type InviteRow = {
  id: string;
  code: string;
  organization_id: string;
  role: Extract<Role, "manager" | "teacher">;
  expires_at: string | null;
  revoked_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
  organizations:
    | {
        name: string;
        region: string;
      }
    | Array<{
        name: string;
        region: string;
      }>
    | null;
};

type InviteRemovalRow = {
  id: string;
  used_count: number;
  revoked_at: string | null;
};

export async function listAdminInvites(accessToken?: string): Promise<AdminInvite[]> {
  if (!isLiveSupabaseMode()) {
    return [];
  }

  const supabase = requireSupabase(accessToken);
  const { data, error } = await supabase
    .from("invites")
    .select("id, code, organization_id, role, expires_at, revoked_at, max_uses, used_count, created_at, organizations(name, region)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return ((data ?? []) as InviteRow[]).map(mapInvite);
}

export async function createAdminInvite(
  accessToken: string | undefined,
  input: AdminInviteCreateInput,
  profileId: string | null
): Promise<AdminInvite> {
  if (!isLiveSupabaseMode()) {
    return mapInvite({
      id: globalThis.crypto.randomUUID(),
      code: input.code?.trim() || generateInviteCode(),
      organization_id: input.organizationId,
      role: input.role,
      expires_at: input.expiresAt ?? null,
      revoked_at: null,
      max_uses: input.maxUses ?? null,
      used_count: 0,
      created_at: new Date().toISOString(),
      organizations: { name: "Mock organization", region: "mock" }
    });
  }

  const supabase = requireSupabase(accessToken);
  const { data, error } = await supabase
    .from("invites")
    .insert({
      code: input.code?.trim() || generateInviteCode(),
      organization_id: input.organizationId,
      role: input.role,
      expires_at: input.expiresAt ?? null,
      max_uses: input.maxUses ?? null,
      created_by: profileId
    })
    .select("id, code, organization_id, role, expires_at, revoked_at, max_uses, used_count, created_at, organizations(name, region)")
    .single();

  if (error) throw mapInviteDatabaseError(error);

  await writeInviteAudit(supabase, profileId, "create", (data as InviteRow).id, {
    organizationId: input.organizationId,
    role: input.role
  });

  return mapInvite(data as InviteRow);
}

export async function removeAdminInvite(
  accessToken: string | undefined,
  inviteId: string,
  profileId: string | null
): Promise<AdminInviteRemovalResult> {
  if (!isLiveSupabaseMode()) {
    return { id: inviteId, action: "deleted", revokedAt: null };
  }

  const supabase = requireSupabase(accessToken);
  const existing = await supabase.from("invites").select("id, used_count, revoked_at").eq("id", inviteId).single();
  if (existing.error) throw existing.error;

  const invite = existing.data as InviteRemovalRow;
  if (invite.used_count > 0) {
    const revokedAt = invite.revoked_at ?? new Date().toISOString();
    const { error } = await supabase.from("invites").update({ revoked_at: revokedAt }).eq("id", inviteId);
    if (error) throw error;

    await writeInviteAudit(supabase, profileId, "revoke", inviteId, { usedCount: invite.used_count });
    return { id: inviteId, action: "revoked", revokedAt };
  }

  const { error } = await supabase.from("invites").delete().eq("id", inviteId);
  if (error) throw error;

  await writeInviteAudit(supabase, profileId, "delete", inviteId, { usedCount: invite.used_count });
  return { id: inviteId, action: "deleted", revokedAt: null };
}

function requireSupabase(accessToken?: string) {
  const supabase = accessToken ? createSupabaseUserClient(accessToken) : null;
  if (!supabase) {
    throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
  }
  return supabase;
}

async function writeInviteAudit(
  supabase: NonNullable<ReturnType<typeof createSupabaseUserClient>>,
  profileId: string | null,
  action: string,
  resourceId: string,
  metadata: Record<string, unknown>
) {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_profile_id: profileId,
    action,
    resource_type: "invites",
    resource_id: resourceId,
    metadata
  });
  if (error) throw error;
}

function mapInvite(row: InviteRow): AdminInvite {
  const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;

  return {
    id: row.id,
    code: row.code,
    organizationId: row.organization_id,
    organizationName: organization?.name ?? "",
    organizationRegion: organization?.region ?? "",
    role: row.role,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    createdAt: row.created_at
  };
}

function mapInviteDatabaseError(error: Error & { code?: string }) {
  if (error.code === "23505") {
    return new AccessControlError("duplicate_invite_code", "이미 사용 중인 초대 코드입니다.", 409);
  }

  if (error.message.toLowerCase().includes("row-level security")) {
    return new AccessControlError("forbidden_invite", "초대 코드를 관리할 권한이 없습니다.", 403);
  }

  return error;
}

function generateInviteCode() {
  return `KIDS-${globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
