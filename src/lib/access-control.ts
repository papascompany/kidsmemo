import type { Role } from "./types";

export type RequestAccessSource = "anonymous" | "session";

export interface RequestAccessContext {
  profileId: string | null;
  organizationId: string | null;
  role: Role | null;
  source: RequestAccessSource;
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
    source: "session"
  };
}

export function assertOrganizationScope(
  access: RequestAccessContext,
  organizationId: string,
  message = "선택한 기관에 접근할 권한이 없습니다."
) {
  if (access.source === "anonymous" || !access.organizationId) {
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
    return;
  }

  if (!allowedRoles.includes(access.role)) {
    throw new AccessControlError("forbidden_role", message, 403, {
      role: access.role,
      allowedRoles
    });
  }
}

function normalizeHeader(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseRole(value: string | null): Role | null {
  const normalized = normalizeHeader(value);
  return normalized && ROLE_VALUES.includes(normalized as Role) ? (normalized as Role) : null;
}
