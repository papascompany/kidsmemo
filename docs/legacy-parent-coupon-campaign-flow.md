# Legacy Parent Coupon Campaign Flow

Status: archived for future reactivation.

This document preserves the previous coupon concept that was implemented before the product direction was corrected on 2026-06-09.

## Why It Is Archived

The current coupon feature is **not** for kindergarten/daycare teachers to send coupons to parents.

The active product direction is:

- Jumbokids administrators provide coupons or discount codes.
- Kindergarten/daycare directors and teachers view the provided benefits in Kidsmemo.
- Directors and teachers copy or download the code.
- The code is used on Jumbokids or GodoMall order flows.

The previous implementation can still be useful later if Kidsmemo adds a separate parent-facing promotional campaign feature. Until then, it should remain out of the main dashboard.

## Preserved Source

- `src/components/coupon-manager.tsx`
  - Exported as `LegacyParentCouponCampaignManager`.
  - Keeps the old campaign creation UI, target selection, notice HTML/image fields, and API calls.
  - No longer imported by `src/app/page.tsx`.
- `src/app/coupon/[campaignId]/page.tsx`
  - Keeps the old public coupon landing route.
  - Not linked from the current director/teacher coupon wallet.
- `src/app/api/admin/coupon-campaigns/**`
  - Keeps the old mock/API contract for campaign, item, target, and notice persistence readiness.

## Old Flow Summary

1. Institution user creates a coupon campaign.
2. Campaign issue mode is selected:
   - `manual`
   - `jumbokids_api`
3. Target scope is selected:
   - `all_members`
   - `selected_members`
4. Notice content is registered as HTML or image.
5. A public coupon landing page can show coupon items.
6. Reminder/message jobs can later send links through Kakao/SMS/email.

## Reactivation Conditions

Before this flow is reactivated:

- Rename UI to clearly distinguish it from the staff coupon wallet.
- Add opt-in and message consent checks for parent recipients.
- Add organization membership and role guards.
- Add Supabase RLS policies for campaign ownership and target access.
- Review Kakao/SMS/email template approval requirements.
- Run mobile visual QA for both the coupon wallet and the parent campaign flow.
