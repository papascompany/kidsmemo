import type { Role } from "./types";
import { isLiveSupabaseMode } from "./env-flags";
import { createSupabaseUserClient } from "./supabase";

type MembershipRow = {
  organization_id: string;
  role: Role;
};

export type RequestAccessSource = "anonymous" | "header" | "session";

export interface RequestAccessContext {
  profileId: string | null;
  organizationId: string | null;
  role: Role | null;
  source: RequestAccessSource;
  accessToken?: string;
}

const ACCESS_HEADER_PREFIX = "x-kidmemo-";
const ROLE_VALUES: Role[] = ["owner", "manager", "teacher", "admin"];

export class AccessControlError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 403, details?: unknown) {
    super(message);
    this.name = "AccessControlError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getRequestAccessContext(request: Request): RequestAccessContext {
  const profileId = normalizeHeader(request.headers.get(`${ACCESS_HEADER_PREFIX}profile-id`));
  const organizationId = normalizeHeader(request.headers.get(`${ACCESS_HEADER_PREFIX}organization-id`));
  const role = parseRole(request.headers.get(`${ACCESS_HEADER_PREFIX}role`));

  if (!profileId && !organizationId && !role) {
    return {
      profileId: null,
      organizationId: null,
      role: null,
      source: "anonymous"
    };
  }

  return {
    profileId,
    organizationId,
    role,
    source: "header"
  };
}

export async function resolveRequestAccessContext(request: Request): Promise<RequestAccessContext> {
  if (!isLiveSupabaseMode()) {
    return getRequestAccessContext(request);
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return anonymousAccess();
  }

  const supabase = createSupabaseUserClient(accessToken);
  if (!supabase) {
    throw new AccessControlError("supabase_not_configured", "Supabase 인증 설정이 필요합니다.", 500);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return anonymousAccess();
  }

  const requestedOrganizationId = normalizeHeader(request.headers.get(`${ACCESS_HEADER_PREFIX}organization-id`));
  let query = supabase.from("memberships").select("organization_id, role").eq("profile_id", userData.user.id);

  if (requestedOrganizationId) {
    query = query.eq("organization_id", requestedOrganizationId);
  }

  const { data, error } = await query.order("created_at", { ascending: true }).limit(1);
  if (error) {
    throw error;
  }

  const membership = (data?.[0] ?? null) as MembershipRow | null;

  return {
    profileId: userData.user.id,
    organizationId: membership?.organization_id ?? requestedOrganizationId,
    role: membership?.role ?? null,
    source: "session",
    accessToken
  };
}

export function assertOrganizationScope(
  access: RequestAccessContext,
  organizationId: string,
  message = "선택한 기관에 접근할 권한이 없습니다."
) {
  if (access.source === "anonymous" || !access.organizationId) {
    if (isLiveSupabaseMode()) {
      throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
    }
    return;
  }

  if (access.organizationId !== organizationId) {
    throw new AccessControlError("forbidden_organization", message, 403, {
      requestedOrganizationId: organizationId,
      sessionOrganizationId: access.organizationId
    });
  }
}

export function assertRoleScope(
  access: RequestAccessContext,
  allowedRoles: Role[],
  message = "이 작업을 수행할 권한이 없습니다."
) {
  if (access.source === "anonymous" || !access.role) {
    if (isLiveSupabaseMode()) {
      throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
    }
    return;
  }

  if (!allowedRoles.includes(access.role)) {
    throw new AccessControlError("forbidden_role", message, 403, {
      role: access.role,
      allowedRoles
    });
  }
}

export function assertProfileScope(
  access: RequestAccessContext,
  profileId: string,
  message = "선택한 사용자로 작업할 권한이 없습니다."
) {
  if (access.source === "anonymous" || !access.profileId) {
    if (isLiveSupabaseMode()) {
      throw new AccessControlError("authentication_required", "로그인이 필요한 작업입니다.", 401);
    }
    return;
  }

  if (access.profileId !== profileId) {
    throw new AccessControlError("forbidden_profile", message, 403, {
      requestedProfileId: profileId,
      sessionProfileId: access.profileId
    });
  }
}

function normalizeHeader(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function anonymousAccess(): RequestAccessContext {
  return {
    profileId: null,
    organizationId: null,
    role: null,
    source: "anonymous"
  };
}

function getBearerToken(request: Request) {
  const authorization = normalizeHeader(request.headers.get("authorization"));
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function parseRole(value: string | null): Role | null {
  const normalized = normalizeHeader(value);
  return normalized && ROLE_VALUES.includes(normalized as Role) ? (normalized as Role) : null;
}
