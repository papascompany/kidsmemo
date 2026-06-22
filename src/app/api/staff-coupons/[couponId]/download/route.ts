import { z } from "zod";
import { handleApiError, ok } from "@/lib/api-response";
import {
  AccessControlError,
  assertOrganizationScope,
  assertProfileScope,
  assertRoleScope,
  resolveRequestAccessContext
} from "@/lib/access-control";
import { getRepositories } from "@/lib/repositories";

const schema = z.object({
  organizationId: z.string().min(1),
  profileId: z.string().min(1).optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params;
    const payload = schema.parse(await request.json());
    const access = await resolveRequestAccessContext(request);
    const profileId = access.profileId ?? payload.profileId;

    if (!profileId) {
      throw new AccessControlError("forbidden_profile", "선택한 사용자로 작업할 권한이 없습니다.", 403);
    }

    assertOrganizationScope(access, payload.organizationId);
    assertProfileScope(access, profileId);
    assertRoleScope(access, ["owner", "manager", "teacher"]);
    const repositories = getRepositories(access);
    const result = await repositories.staffCoupons.recordDownload({
      couponId,
      organizationId: payload.organizationId,
      profileId
    });

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
