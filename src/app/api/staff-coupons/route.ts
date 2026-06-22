import { handleApiError, ok } from "@/lib/api-response";
import { assertRoleScope, resolveRequestAccessContext } from "@/lib/access-control";
import { getRepositories } from "@/lib/repositories";

export async function GET(request: Request) {
  try {
    const access = await resolveRequestAccessContext(request);
    assertRoleScope(access, ["owner", "manager", "teacher"]);
    const repositories = getRepositories(access);
    const coupons = await repositories.staffCoupons.list();
    const scopedCoupons = access.organizationId
      ? coupons.filter((coupon) => coupon.organizationId === access.organizationId)
      : coupons;

    return ok(scopedCoupons);
  } catch (error) {
    return handleApiError(error);
  }
}
