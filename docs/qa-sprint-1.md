# Kidsmemo Sprint 1 QA Checklist

## Latest Verification

Run date: 2026-06-02

- `npm run lint`: passed.
- `npm run build`: passed.
- Previous blocker resolved: `src/components/coupon-manager.tsx` is present and `src/app/page.tsx` imports both event and coupon manager components successfully.
- Current implementation status: Sprint 1 is integrated on mock/repository fallback data. Supabase connection and live provider credentials remain intentionally out of scope until the next phase.

## Release Gate

- Run `npm run lint` and confirm it exits with status `0`.
- Run `npm run build` and confirm it exits with status `0`.
- Start the app with `npm run dev` and verify `/` loads without console errors that block interaction.
- Verify `/coupon/coupon-2` loads and shows the manual coupon image notice plus multiple coupon items.
- Confirm `/coupon/unknown-campaign` renders the Next.js not-found path.
- Confirm every API smoke test below returns predictable JSON for valid requests.
- Confirm invalid API payloads are rejected with the normalized API error shape: `{ "ok": false, "error": { "code": "...", "message": "...", "details": [...] } }`.

## Auth And Membership

Manual checks:

- Confirm the admin console section on `/` lists the three intended auth methods: Kakao OAuth, Google OAuth, and email/password direct signup.
- Confirm the product copy describes joining by creating an organization or using an invite code.
- Confirm the Supabase schema has tables or contracts for `organizations`, `profiles`, and `memberships`.
- Confirm role labels cover `owner`, `manager`, `teacher`, and `admin`.

Supabase-ready checks once connected:

- Kakao signup creates a profile and allows organization creation.
- Google signup creates a profile and allows invite-code organization join.
- Email/password signup creates a profile and requires email verification if enabled.
- A teacher cannot access admin coupon campaign management.
- An owner can manage only their own organization data.
- An admin can view cross-organization operational data.
- RLS prevents direct access to another organization by changing ids in API requests.

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
    "supplies": ["포토존", "안내문"],
    "couponCampaignId": "coupon-2"
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

```bash
curl -i -sS -X PATCH http://localhost:3000/api/events/missing-event \
  -H 'Content-Type: application/json' \
  -d '{"title":"없는 행사"}'
```

Acceptance:

- `GET /api/events` returns `{ ok: true, data: [...] }` with the seeded event list.
- `POST /api/events` returns `201` and `{ ok: true, data }` with a generated `id` and `reminderStatus: "not_scheduled"`.
- `PATCH /api/events/event-1` returns `{ ok: true, data }` with merged event fields.
- Missing event patch returns `404` and `{ ok: false, error: { code: "not_found", ... } }`.
- Invalid `POST /api/events` payload, such as an empty `title`, is rejected.
- On `/`, the annual event list shows event title, date, connected coupon, and reminder status on desktop and mobile.

## Coupon Campaigns

Smoke commands:

```bash
curl -sS http://localhost:3000/api/admin/coupon-campaigns
```

```bash
curl -sS -X POST http://localhost:3000/api/admin/coupon-campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "수동 쿠폰 QA 팩",
    "description": "QA용 수동 쿠폰 캠페인",
    "issueMode": "manual",
    "targetScope": "selected_members",
    "validFrom": "2026-06-01",
    "validUntil": "2026-07-31",
    "noticeType": "html",
    "noticeHtml": "<h2>QA 쿠폰 안내</h2><p>수동 쿠폰 HTML 안내입니다.</p>",
    "selectedOrganizationIds": ["org-1"],
    "selectedProfileIds": ["user-1"]
  }'
```

```bash
curl -sS -X POST http://localhost:3000/api/admin/coupon-campaigns \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "점보키즈 API 쿠폰 QA",
    "description": "QA용 API 발급 캠페인",
    "issueMode": "jumbokids_api",
    "targetScope": "all_members",
    "validFrom": "2026-06-01",
    "validUntil": "2026-07-31",
    "noticeType": "html",
    "noticeHtml": "<h2>API 발급 쿠폰 안내</h2>"
  }'
```

```bash
curl -sS -X PATCH http://localhost:3000/api/admin/coupon-campaigns/coupon-2 \
  -H 'Content-Type: application/json' \
  -d '{"name":"졸업 앨범 수동 쿠폰팩 QA", "isActive": true}'
```

Acceptance:

- Both issue modes are accepted: `manual` and `jumbokids_api`.
- Both target scopes are accepted: `all_members` and `selected_members`.
- Campaign creation returns `201` and `{ ok: true, data }` with generated `id`, `isActive: true`, and `createdBy`.
- Campaign patch returns `{ ok: true, data }` with merged campaign fields.
- Missing campaign patch returns `404` and `{ ok: false, error: { code: "not_found", ... } }`.
- Invalid enum values are rejected.
- `selected_members` campaign creation requires at least one selected organization or selected profile.
- `noticeType: "html"` requires non-empty `noticeHtml`.
- `noticeType: "image"` requires a valid `noticeImageUrl`.
- UI campaign creation controls can switch issue mode, target scope, and notice type without layout shift.

## Coupon Items, Targets, And Notices

Smoke commands:

```bash
curl -sS -X POST http://localhost:3000/api/admin/coupon-campaigns/coupon-2/items \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "QA 앨범 5,000원 쿠폰",
    "benefitType": "coupon",
    "amountLabel": "5,000원 할인",
    "manualCode": "QA-ALBUM-5000",
    "manualUrl": "https://jumbokids.example.com/coupons/qa-album"
  }'
```

```bash
curl -sS -X POST http://localhost:3000/api/admin/coupon-campaigns/coupon-1/items \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "QA 포토북 API 쿠폰",
    "benefitType": "coupon",
    "amountLabel": "20% 할인",
    "jumbokidsBenefitType": "discount_coupon"
  }'
```

```bash
curl -sS -X POST http://localhost:3000/api/admin/coupon-campaigns/coupon-2/targets \
  -H 'Content-Type: application/json' \
  -d '{
    "selectedOrganizationIds": ["org-1"],
    "selectedProfileIds": ["user-1", "user-2"]
  }'
```

```bash
curl -sS -X POST http://localhost:3000/api/admin/coupon-campaigns/coupon-2/notice \
  -H 'Content-Type: application/json' \
  -d '{
    "noticeType": "image",
    "noticeImageUrl": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
  }'
```

```bash
curl -sS -X POST http://localhost:3000/api/admin/coupon-campaigns/coupon-2/notice \
  -H 'Content-Type: application/json' \
  -d '{
    "noticeType": "html",
    "noticeHtml": "<h2>졸업 앨범 쿠폰 안내</h2><p>행사 사진을 앨범으로 남겨보세요.</p>"
  }'
```

Acceptance:

- Manual coupon item accepts shared `manualCode` and `manualUrl`.
- API-issued coupon item accepts `jumbokidsBenefitType`.
- Target update returns `targetCount` equal to selected organization count plus selected profile count.
- Image notice accepts a valid URL.
- HTML notice accepts non-empty HTML.
- Image notice without a URL is rejected.
- HTML notice without `noticeHtml` is rejected.
- `/coupon/coupon-2` displays the campaign notice and all registered coupon items on the landing page.
- Manual multi-coupon campaigns use one landing page link rather than separate SMS/Kakao links per item.

## Reminder Job

Smoke command:

```bash
curl -sS -X POST http://localhost:3000/api/jobs/send-reminders
```

Acceptance:

- The job returns `generatedJobs` and `issuedBenefits` arrays.
- With the seeded date context, the event dated `2026-06-03` should be included when the server date is `2026-06-02` in Asia/Seoul-aligned expectations.
- API-issued campaigns produce `issuedBenefits.status: "issued"` when the adapter fallback succeeds.
- Manual campaigns produce `issuedBenefits.status: "manual_ready"` and include manual code/link when their event is tomorrow.
- Generated jobs use channel order `alimtalk`, `sms`, `email`.
- Re-running the smoke command should be checked for duplicate prevention once persistence is added. Current mock-only behavior does not persist generated jobs, so duplicate detection is not enforceable yet.

## AI Outputs

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
    "childContext": "행사 사진은 점보키즈 혜택 안내와 함께 전달됩니다.",
    "senderName": "햇살나무 어린이집"
  }'
```

Acceptance:

- Event assistant returns `ideas`, `checklist`, `timeline`, `parentNoticeDraft`, and `shoppingRecommendations`.
- Shopping recommendations include `title`, `priceLabel`, `mallName`, `url`, and `reason`.
- Parent message endpoint returns exactly usable candidate messages and `safetyNotes`.
- Empty `eventName`, invalid `purpose`, invalid `tone`, or non-integer `preparationDays` are rejected.
- With no external API keys, endpoints still return schema-valid fallback results.
- With external API keys later configured, output must remain schema-compatible with the fallback shape.
- Parent message output must avoid sensitive child information, purchase pressure, and exaggerated claims.

## Responsive UI

Manual viewport matrix:

- Desktop: 1440 x 900.
- Tablet: 768 x 1024.
- Mobile: 390 x 844.
- Narrow mobile: 320 x 568.

Acceptance:

- Navigation links remain usable and do not overlap.
- Dashboard stat cards wrap cleanly.
- Event list switches from table-like desktop layout to readable mobile articles.
- Coupon creation controls remain tappable at mobile widths.
- Coupon cards do not nest visually into confusing card stacks.
- AI result panels stack on smaller screens.
- Long Korean labels fit in buttons and badges.
- `/coupon/coupon-2` coupon action buttons remain visible and readable on mobile.
- No horizontal page scroll appears at 320 px width.

## Print Flow

Manual checks:

- Open `/`.
- Generate or use existing AI 행사 도우미 content.
- Click the print icon in the AI 행사 도우미 panel or run `window.print()` in the browser console.
- Confirm print preview hides dashboard, calendar, coupons, admin, buttons, and inputs.
- Confirm AI 행사 도우미 and AI 감동 문구 content remain printable.
- Confirm page background is white and print cards do not split awkwardly across pages where avoidable.

Acceptance:

- `.no-print` elements are hidden.
- `#dashboard`, `#calendar`, `#coupons`, and `#admin` are hidden.
- `.print-page` content remains visible and readable.
- Korean text is rendered with Pretendard or acceptable fallback.

## API Error Smoke Tests

Use these to verify validation behavior:

```bash
curl -i -sS -X POST http://localhost:3000/api/events \
  -H 'Content-Type: application/json' \
  -d '{"organizationId":"org-1","title":"","eventDate":"2026-10-15","audience":"전체","couponCampaignId":"coupon-1"}'
```

```bash
curl -i -sS -X POST http://localhost:3000/api/admin/coupon-campaigns \
  -H 'Content-Type: application/json' \
  -d '{"name":"Invalid","issueMode":"manual_only","targetScope":"all_members","validFrom":"2026-06-01","validUntil":"2026-07-31","noticeType":"html"}'
```

```bash
curl -i -sS -X POST http://localhost:3000/api/admin/coupon-campaigns/coupon-2/notice \
  -H 'Content-Type: application/json' \
  -d '{"noticeType":"image"}'
```

```bash
curl -i -sS -X POST http://localhost:3000/api/ai/parent-message \
  -H 'Content-Type: application/json' \
  -d '{"purpose":"sale_push","tone":"warm","eventName":"가족 운동회","senderName":"햇살나무 어린이집"}'
```

Expected Sprint 1 release behavior:

- Invalid requests should return `4xx` and a predictable JSON error body.
- Normalized backend routes should return `{ ok: false, error: { code, message, details? } }`.
- If any route returns an unstructured framework error, record it as a backend follow-up before release.

## Known Sprint 1 Risks To Track

- Current UI uses mock data and local client state for some create flows; persistence acceptance requires Supabase wiring.
- Current reminder job uses mock data, so idempotency and duplicate prevention cannot be fully proven.
- Live Kakao/SMS/email, Jumbokids, OpenAI, and Naver behavior is adapter-contract scope only until real credentials are connected.
- Image notice upload is represented by URL storage in current contracts; Supabase Storage upload flow still needs end-to-end verification when implemented.
- Frontend can create a campaign in local state, but follow-up item/target/notice calls may not persist across refresh until Supabase-backed repositories are connected.
- Mobile quick navigation is still a UX improvement item from design review.
