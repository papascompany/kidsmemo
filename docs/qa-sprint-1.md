# Kidsmemo Sprint 1 QA Checklist

## Latest Verification

Run date: 2026-06-10

- `npm run lint`: passed after legacy coupon removal.
- `npm run build`: passed after legacy coupon removal.
- Supabase project link is complete for `fhakjrppirmjdgqlljzd`.
- Active coupon product surface is the `점보키즈 쿠폰함`.
- Parent-facing coupon campaign creation, public coupon landing, and `/api/admin/coupon-campaigns/**` are removed from the active source.
- Browser visual QA and print preview remain manual release gates.

## Release Gate

- Run `npm run lint` and confirm it exits with status `0`.
- Run `npm run build` and confirm it exits with status `0`.
- Start the app with `npm run dev` and verify `/` loads without blocking console errors.
- Verify the `점보키즈 쿠폰함` section on `/` shows coupons provided by Jumbokids admins for directors/teachers.
- Verify each coupon card supports code copy and text-file download.
- Verify the UI does not imply directors or teachers send coupons to parents.
- Verify `/coupon/coupon-2` and `/api/admin/coupon-campaigns` are not part of the active route contract.

## Auth And Membership

Manual checks:

- Confirm the admin console section on `/` lists Kakao OAuth, Google OAuth, and email/password direct signup.
- Confirm the product copy describes joining by creating an organization or using an invite code.
- Confirm the Supabase schema has tables or contracts for `organizations`, `profiles`, and `memberships`.
- Confirm role labels cover `owner`, `manager`, `teacher`, and `admin`.

Supabase-ready checks once connected:

- Kakao signup creates a profile and allows organization creation.
- Google signup creates a profile and allows invite-code organization join.
- Email/password signup creates a profile and requires email verification if enabled.
- Owner and teacher accounts can access only their organization data.
- Admin views are separated from director/teacher workspace views.
- RLS prevents direct access to another organization by changing ids in API requests.

## Director Organization Workspace

Manual checks:

- Confirm the director experience is framed as a "my kindergarten/nursery" workspace.
- Confirm the current organization name, region, and role are clearly visible.
- Confirm organization-owned areas include event schedule, AI event advice/history, staff coupon wallet, and recent reminder status.
- Confirm director and teacher UI copy does not imply cross-organization access.
- Confirm organization switching, when present, is deliberate and visible on desktop and mobile.

## Event CRUD

Smoke commands:

```bash
curl -sS http://localhost:3000/api/events
```

```bash
curl -sS -X POST http://localhost:3000/api/events \
  -H 'Content-Type: application/json' \
  -d '{
    "organizationId": "org-1",
    "title": "가을 가족 사진의 날",
    "eventDate": "2026-10-15",
    "audience": "전체 원아",
    "classNames": ["햇살반", "나무반"],
    "description": "가족 참여 촬영 행사",
    "supplies": ["포토존", "안내문"]
  }'
```

```bash
curl -sS -X PATCH http://localhost:3000/api/events/event-1 \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "봄 소풍 리허설",
    "supplies": ["이름표", "돗자리", "비상약"]
  }'
```

Acceptance:

- `GET /api/events` returns `{ ok: true, data: [...] }` with the seeded event list.
- `POST /api/events` returns `201` and `{ ok: true, data }` with a generated `id` and `reminderStatus: "not_scheduled"`.
- `PATCH /api/events/event-1` returns `{ ok: true, data }` with merged event fields.
- Missing event patch returns `404` and `{ ok: false, error: { code: "not_found", ... } }`.
- Invalid event payloads are rejected with the normalized API error shape.
- On `/`, the annual event list shows event title, date, audience/class, and reminder status.

## Jumbokids Coupon Wallet

Manual checks:

- Confirm `/` shows the section title `점보키즈 쿠폰함`.
- Confirm coupon cards explain that Jumbokids administrators provided the codes for directors/teachers.
- Confirm each coupon card has a visible coupon/discount code.
- Confirm `코드 복사` copies the code and changes to a copied state.
- Confirm `쿠폰 다운로드` downloads a text file containing institution name, coupon title, code, benefit, valid date, and usable sites.
- Confirm site buttons are labeled as Jumbokids or GodoMall destinations.
- Confirm the old campaign creation form is not visible.

Supabase-ready checks once connected:

- Only coupons assigned to the current organization are returned.
- Owner/teacher role-based coupon visibility is enforced server-side.
- Download/copy history is stored under the current organization and user.
- Jumbokids/GodoMall coupon URLs are provided by admin data, not hard-coded UI assumptions.

## Reminder Job

Smoke command:

```bash
curl -sS -X POST http://localhost:3000/api/jobs/send-reminders \
  -H 'Content-Type: application/json' \
  -d '{"now":"2026-06-02T09:00:00+09:00"}'
```

Acceptance:

- The job returns `{ ok: true, data }`.
- `generatedJobs` and `jobSummaries` reference events only, not coupon campaigns.
- Duplicate seeded reminder jobs are skipped with `reason: "duplicate_job"`.
- No issued coupon benefit payload is returned.

## AI APIs

Smoke commands:

```bash
curl -sS -X POST http://localhost:3000/api/ai/event-assistant \
  -H 'Content-Type: application/json' \
  -d '{
    "eventName": "가족 운동회",
    "ageGroup": "전체 원아",
    "preparationDays": 14,
    "budget": "중간 예산",
    "location": "실내 강당",
    "season": "여름",
    "mood": "밝고 활기찬"
  }'
```

```bash
curl -sS -X POST http://localhost:3000/api/ai/parent-message \
  -H 'Content-Type: application/json' \
  -d '{
    "purpose": "event_notice",
    "tone": "warm",
    "eventName": "가족 운동회",
    "senderName": "햇살나무 어린이집",
    "childContext": "행사 사진은 정리 후 별도 안내드립니다."
  }'
```

Acceptance:

- Event assistant returns 3-5 ideas, 4-8 checklist items, 4-8 timeline items, parent notice draft, and shopping recommendations.
- Parent message returns exactly 3 candidates and safety notes.
- With no external API keys, endpoints still return schema-valid fallback results.

## Responsive And Print QA

Manual checks:

- Verify `/` at 320, 390, 768, and 1440 px widths.
- Confirm text, buttons, cards, and quick navigation do not overlap or overflow.
- Confirm image-backed cards retain readable contrast.
- Confirm print preview keeps AI content printable and hides operational dashboard chrome.
