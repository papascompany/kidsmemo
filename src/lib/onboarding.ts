import { z } from "zod";
import { AccessControlError } from "./access-control";
import { createSupabaseUserClient } from "./supabase";
import type { Role } from "./types";

const organizationTypeSchema = z.enum(["daycare", "kindergarten"]);
const inviteRoleSchema = z.enum(["manager", "teacher"]);

export const onboardingRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    profileName: z.string().trim().min(1, "이름을 입력해 주세요."),
    profilePhone: z.string().trim().optional().default(""),
    organizationName: z.string().trim().min(1, "기관명을 입력해 주세요."),
    organizationType: organizationTypeSchema,
    organizationRegion: z.string().trim().min(1, "지역을 입력해 주세요.")
  }),
  z.object({
    action: z.literal("join"),
    profileName: z.string().trim().min(1, "이름을 입력해 주세요."),
    profilePhone: z.string().trim().optional().default(""),
    inviteCode: z
      .string()
      .trim()
      .min(6, "초대 코드를 입력해 주세요.")
      .max(64, "초대 코드가 너무 깁니다.")
  }),
  z.object({
    action: z.literal("createInvite"),
    organizationId: z.string().trim().uuid("기관 ID를 확인해 주세요."),
    role: inviteRoleSchema.default("teacher"),
    code: z.string().trim().min(6, "초대 코드는 6자 이상이어야 합니다.").max(64, "초대 코드가 너무 깁니다.").optional(),
    expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
    maxUses: z.number().int().positive().optional().nullable()
  })
]);

export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;
export type CompleteOnboardingRequest = Extract<OnboardingRequest, { action: "create" | "join" }>;
export type CreateInviteRequest = Extract<OnboardingRequest, { action: "createInvite" }>;

export type OnboardingResult = {
  profileId: string;
  organizationId: string;
  role: Extract<Role, "owner" | "manager" | "teacher">;
};

export type InviteResult = {
  id: string;
  code: string;
  organizationId: string;
  role: Extract<Role, "manager" | "teacher">;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
};

export type OnboardingStatus = {
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    organizationType: "daycare" | "kindergarten";
    organizationRegion: string;
    role: Role;
  }>;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type MembershipRow = {
  organization_id: string;
  role: Role;
  organizations:
    | {
        id: string;
        name: string;
        type: "daycare" | "kindergarten";
        region: string;
      }
    | Array<{
        id: string;
        name: string;
        type: "daycare" | "kindergarten";
        region: string;
      }>
    | null;
};

type InviteRow = {
  id: string;
  code: string;
  organization_id: string;
  role: Extract<Role, "manager" | "teacher">;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
};

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

export async function getOnboardingStatus(accessToken: string): Promise<OnboardingStatus> {
  const supabase = getOnboardingSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
  }

  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from("profiles").select("id, name, email, phone").eq("id", userData.user.id).maybeSingle(),
    supabase
      .from("memberships")
      .select("organization_id, role, organizations(id, name, type, region)")
      .eq("profile_id", userData.user.id)
      .order("created_at", { ascending: true })
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (membershipsResult.error) {
    throw membershipsResult.error;
  }

  const profile = profileResult.data as ProfileRow | null;
  const memberships = ((membershipsResult.data ?? []) as MembershipRow[])
    .map((membership) => {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;

      if (!organization) {
        return null;
      }

      return {
        organizationId: membership.organization_id,
        organizationName: organization.name,
        organizationType: organization.type,
        organizationRegion: organization.region,
        role: membership.role
      };
    })
    .filter((membership): membership is NonNullable<typeof membership> => Boolean(membership));

  return {
    user: {
      id: userData.user.id,
      email: userData.user.email ?? ""
    },
    profile: profile
      ? {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? ""
        }
      : null,
    memberships
  };
}

export async function completeOnboarding(
  accessToken: string,
  input: CompleteOnboardingRequest
): Promise<OnboardingResult> {
  const supabase = getOnboardingSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
  }

  const rpcResult =
    input.action === "create"
      ? await supabase.rpc("create_onboarding_organization", {
          profile_name: input.profileName,
          profile_phone: input.profilePhone,
          organization_name: input.organizationName,
          organization_type: input.organizationType,
          organization_region: input.organizationRegion
        })
      : await supabase.rpc("join_onboarding_organization", {
          profile_name: input.profileName,
          profile_phone: input.profilePhone,
          invite_code: input.inviteCode
        });

  if (rpcResult.error) {
    throw mapOnboardingDatabaseError(rpcResult.error);
  }

  return rpcResult.data as OnboardingResult;
}

export async function createOnboardingInvite(accessToken: string, input: CreateInviteRequest): Promise<InviteResult> {
  const supabase = getOnboardingSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
  }

  const code = input.code?.trim() || generateInviteCode();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      code,
      organization_id: input.organizationId,
      role: input.role,
      expires_at: input.expiresAt ?? null,
      max_uses: input.maxUses ?? null,
      created_by: userData.user.id
    })
    .select("id, code, organization_id, role, expires_at, max_uses, used_count")
    .single();

  if (error) {
    throw mapInviteDatabaseError(error);
  }

  const invite = data as InviteRow;
  return {
    id: invite.id,
    code: invite.code,
    organizationId: invite.organization_id,
    role: invite.role,
    expiresAt: invite.expires_at,
    maxUses: invite.max_uses,
    usedCount: invite.used_count
  };
}

function getOnboardingSupabaseClient(accessToken: string) {
  const supabase = createSupabaseUserClient(accessToken);
  if (!supabase) {
    throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
  }

  return supabase;
}

function mapOnboardingDatabaseError(error: Error & { code?: string }) {
  if (error.message.includes("invalid_invite_code")) {
    return new AccessControlError("invalid_invite_code", "초대 코드를 확인해 주세요.", 400);
  }

  if (error.message.includes("authentication_required")) {
    return new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
  }

  return error;
}

function mapInviteDatabaseError(error: Error & { code?: string }) {
  if (error.code === "23505") {
    return new AccessControlError("duplicate_invite_code", "이미 사용 중인 초대 코드입니다.", 409);
  }

  if (error.message.toLowerCase().includes("row-level security")) {
    return new AccessControlError("forbidden_invite", "초대 코드를 만들 권한이 없습니다.", 403);
  }

  return error;
}

function generateInviteCode() {
  return `KIDS-${globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
