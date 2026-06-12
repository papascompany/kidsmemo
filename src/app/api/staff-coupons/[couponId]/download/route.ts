import { z } from "zod";
import { handleApiError, ok } from "@/lib/api-response";
import {
  assertOrganizationScope,
  assertRoleScope,
  getRequestAccessContext
} from "@/lib/access-control";
import {
  getStaffCouponById,
  staffCouponDownloads,
  staffCoupons
} from "@/lib/mock-data";

const schema = z.object({
  organizationId: z.string().min(1),
  profileId: z.string().min(1)
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params;
    const payload = schema.parse(await request.json());
    const access = getRequestAccessContext(request);
    const coupon = getStaffCouponById(couponId);

    if (!coupon) {
      return ok({
        recorded: false,
        reason: "coupon_not_found"
      });
    }

    assertOrganizationScope(access, payload.organizationId);
    assertRoleScope(access, ["owner", "manager", "teacher"]);

    if (coupon.organizationId !== payload.organizationId) {
      return ok({
        recorded: false,
        reason: "organization_mismatch"
      });
    }

    const existing = staffCouponDownloads.find(
      (download) =>
        download.couponId === couponId &&
        download.organizationId === payload.organizationId &&
        download.profileId === payload.profileId
    );

    if (existing) {
      return ok({
        recorded: true,
        duplicate: true,
        download: existing
      });
    }

    const download = {
      id: `staff-coupon-download-${staffCouponDownloads.length + 1}`,
      couponId,
      organizationId: payload.organizationId,
      profileId: payload.profileId,
      downloadedAt: new Date().toISOString()
    };

    staffCouponDownloads.push(download);

    const couponRow = staffCoupons.find((item) => item.id === couponId);
    if (couponRow && couponRow.status === "available") {
      couponRow.status = "downloaded";
    }

    return ok({
      recorded: true,
      download
    });
  } catch (error) {
    return handleApiError(error);
  }
}
