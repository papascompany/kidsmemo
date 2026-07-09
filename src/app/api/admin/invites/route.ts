import { AccessControlError, assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import {
  adminInviteCreateSchema,
  adminInviteDeleteSchema,
  createAdminInvite,
  listAdminInvites,
  removeAdminInvite
} from "@/lib/admin-invites";
import { created, handleApiError, ok } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    if (access.source === "anonymous") {
      throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
    }

    assertRoleScope(access, ["admin"], "초대 관리는 platform admin만 사용할 수 있습니다.");
    return ok({ invites: await listAdminInvites(access.accessToken) });
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

    assertRoleScope(access, ["admin"], "초대 관리는 platform admin만 사용할 수 있습니다.");
    const input = adminInviteCreateSchema.parse(await request.json());
    return created(await createAdminInvite(access.accessToken, input, access.profileId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    if (access.source === "anonymous") {
      throw new AccessControlError("authentication_required", "운영 관리자 로그인이 필요합니다.", 401);
    }

    assertRoleScope(access, ["admin"], "초대 관리는 platform admin만 사용할 수 있습니다.");
    const url = new URL(request.url);
    const input = adminInviteDeleteSchema.parse({ id: url.searchParams.get("id") });
    return ok(await removeAdminInvite(access.accessToken, input.id, access.profileId));
  } catch (error) {
    return handleApiError(error);
  }
}
