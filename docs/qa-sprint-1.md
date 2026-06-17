# Kidsmemo Sprint 1 QA Checklist

## Latest Verification

Run date: 2026-06-17

- `npm run lint`: passed after legacy coupon removal.
- `npm run build`: passed after legacy coupon removal.
- Supabase project link is complete for `fhakjrppirmjdgqlljzd`.
- Active coupon product surface is the `점보키즈 쿠폰함`.
- Parent-facing coupon campaign creation, public coupon landing, and `/api/admin/coupon-campaigns/**` are removed from the active source.
- Frontend QA planning pass completed for `/`, `/app`, `/admin`, `/login`, `/signup`, `/signup/jumbokids`, and `/onboarding` by static route/code inspection.
- `npm run dev` foreground check reached Next.js Ready at `http://localhost:3000`.
- Browser visual QA and print preview remain manual release gates.

## 2026-06-17 Frontend QA Planning Pass

Scope:

- Public entry: `/`
- App workspace: `/app`
- Platform console: `/admin`
- Auth and onboarding skeletons: `/login`, `/signup`, `/signup/jumbokids`, `/onboarding`
- Transitional redirects: `/dashboard`, `/calendar`, `/coupons`, `/ai-helper`

Static findings:

- `/` is a public landing page and links to `/signup`, `/login`, `/signup/jumbokids`, and `/app`.
- `/` does not import mock institution data, coupon codes, member lists, runtime state, or admin details.
- `/app` still renders the mock/fallback dashboard through `KidsmemoDashboard` and preserves the `dashboard`, `calendar`, `coupons`, and `ai-helper` anchors.
- `next.config.ts` keeps transitional redirects from legacy intent routes to `/app` anchors.
- `/admin` is visually and structurally separate from the teacher/director dashboard and labels the current surface as a mock Supabase-pre-live skeleton.
- `/admin` includes institution, coupon/discount code, benefit, valid date, role target, Jumbokids URL, and GodoMall URL fields.
- Auth pages describe Kakao, Google, and email paths as UI/IA skeletons or "ready/preparing" flows rather than live auth.
- Print CSS hides dashboard chrome and operational sections while keeping `#ai-helper` and `.print-page` content printable.

Responsive browser matrix for the next manual pass:

| Route | 320 px | 390 px | 768 px | 1440 px | Priority focus |
| --- | --- | --- | --- | --- | --- |
| `/` | Header CTAs fit; hero text wraps; feature cards stack | Hero and CTA spacing | Editorial cards and signup flow | Hero first viewport shows next section hint | Public page must not leak mock operational data |
| `/app` | Sticky mobile quick nav, quick actions, coupon cards, AI form fields | Coupon copy/download state | Dashboard grid and AI panels | Sidebar nav, workspace, tables/cards | Check anchor offsets for `#calendar`, `#coupons`, `#ai-helper` |
| `/admin` | Header badges wrap; table scrolls horizontally | Coupon form and panels stack | Metrics and admin panels | Two-column coupon setup layout | Table overflow must remain intentional, not page overflow |
| `/login` | Login method buttons and email form fit | Buttons preserve icon/text alignment | Two-column transition begins cleanly | Left auth card and right status panel balance | Copy must not imply live auth is enabled |
| `/signup` | Signup option cards fit | CTA and next-step card stack | Main/signup panels readable | Two-column signup layout | OAuth copy remains skeleton-safe |
| `/signup/jumbokids` | Verification form fits | State cards stack | Form and state panel spacing | Two-column verification layout | No live Jumbokids API behavior implied |
| `/onboarding` | Form controls fit | Completion checklist readable | Cards/grid spacing | Onboarding card and form layout | Institution membership copy remains organization-scoped |

Print manual pass:

- On `/app#ai-helper`, generate or keep sample AI results, open print preview, and confirm sidebar, mobile nav, dashboard metrics, calendar, coupons, forms, and buttons are hidden.
- Confirm event assistant result sections, parent notice draft, shopping recommendation text, message candidates, and safety notes print legibly without clipped content.
- Confirm print preview does not include coupon codes unless the user intentionally prints from the coupon area outside the release print flow.

Open risks for browser sign-off:

- Remote image URLs on `/` and `/app` must be visually confirmed for contrast and load behavior in the target deployment environment.
- Clipboard and download interactions require real browser verification because static inspection cannot confirm browser permission behavior.
- `/admin` table uses a deliberate horizontal scroll at small widths; manual QA should confirm the page itself does not create a second unintended horizontal scroll.

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

- Confirm `/app` shows the section title `점보키즈 쿠폰함`.
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

- Verify `/` at 320, 390, 768, and 1440 px widths as the public landing.
- Verify `/app` at 320, 390, 768, and 1440 px widths as the operational dashboard.
- Confirm text, buttons, cards, and quick navigation do not overlap or overflow.
- Confirm image-backed cards retain readable contrast.
- Confirm print preview keeps AI content printable and hides operational dashboard chrome.

## Public Landing And Auth Entry

Manual checks:

- Confirm `/` is a public landing page and does not render institution mock data, staff coupon codes, member lists, or runtime admin details.
- Confirm `/` has clear CTA paths to `/signup`, `/login`, `/signup/jumbokids`, and `/app`.
- Confirm `/app` renders the existing institution dashboard and keeps these anchors working:
  - `/app#dashboard`
  - `/app#calendar`
  - `/app#coupons`
  - `/app#ai-helper`
- Confirm transitional redirects work:
  - `/dashboard` redirects to `/app`
  - `/calendar` redirects to `/app#calendar`
  - `/coupons` redirects to `/app#coupons`
  - `/ai-helper` redirects to `/app#ai-helper`
- Confirm `/login` explains Kakao, Google, and email login without implying live auth is already enabled.
- Confirm `/signup` explains simple signup and routes users toward Jumbokids verification and onboarding.
- Confirm `/signup/jumbokids` captures the intended Jumbokids ID verification states without calling a live Jumbokids API.
- Confirm `/onboarding` explains institution creation, invite-code participation, and selected-organization readiness.

## Platform Admin Console

Manual checks:

- Confirm `/admin` is visually separated from the teacher/director dashboard.
- Confirm `/admin` includes institution coupon/code setup fields:
  - institution
  - coupon or discount code
  - benefit label
  - valid-until date
  - role target
  - Jumbokids URL
  - GodoMall URL
- Confirm `/admin` does not reintroduce parent-facing coupon campaigns or public coupon landing language.
- Confirm `/admin` surfaces Jumbokids verification state as a managed platform-admin concept.
- Confirm `/admin` still labels the current build as mock/fallback until Supabase live guards and RLS are complete.
