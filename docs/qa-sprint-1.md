# Kidsmemo Sprint 1 QA Checklist

## 2026-07-09 Current QA/Handoff Snapshot

- 현재 완료 범위: admin operations, staff coupon E2E into `/app`, invite/onboarding code and smoke script, OAuth callback, push mock delivery/retry fields, simplified landing/dashboard UX, login/signup production error handling, local Pretendard font loading.
- 오래된 blocker 정리: Vercel link pending, first `db push` blocked, Supabase project link pending은 과거 checkpoint 문구다.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 누락은 2026-06-19 Vercel env 목록 기준 기록이다. 현재 blocker로 단정하지 말고, live smoke 직전에 target env에서 다시 확인한다.
- 현재 release gate는 env 재확인, live smoke 재실행, manual browser/print sign-off다.

Recommended smoke order:

```powershell
npm run lint
npm run build
npm run qa:admin-browser-auth
npm run smoke:admin-operations-live
npm run test:staff-coupon-e2e
npm run smoke:onboarding-invite-live
```

Required live-smoke env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- admin/owner/teacher QA account env required by each smoke script

## 2026-07-08 Landing Simplification

- `/` 첫 화면을 핵심 가치 문장, `/signup` CTA, `/app` 데모 진입 중심으로 단순화했다.
- 운영 권한/기관 데이터처럼 보이는 상세 패널을 랜딩에서 제거하고 행사 일정, AI 안내문, 점보키즈 혜택 확인만 가볍게 노출한다.
- 다음 수동 QA에서는 320, 390, 768, 1440 px에서 히어로 CTA와 하단 가치 스트립의 줄바꿈/간격을 확인한다.

## 2026-06-27 Admin Operations Expansion

- E2E QA 계정 bootstrap 스크립트 추가: `npm run bootstrap:e2e-memberships`
- 관리자 운영 live smoke 추가: `npm run smoke:admin-operations-live`
- 관리자 이미지 업로드 API 추가: `POST /api/admin/media-upload`
- 관리자 이미지 탭에서 파일 업로드 후 URL 자동 반영 가능
- Supabase Storage public bucket `admin-media`와 platform admin write 정책 추가
- 푸시 발송 요청 API 추가: `POST /api/admin/push/campaigns/:campaignId/send`
- 푸시 발송 이력 조회 API 추가: `GET /api/admin/push/campaigns/:campaignId/deliveries?limit=20`
- 푸시 탭에서 draft/scheduled 캠페인 mock 발송 요청 가능
- 푸시 탭에서 캠페인별 delivery log 요약과 최근 목록 조회 가능
- 푸시 delivery log는 `push_deliveries`에 저장되며 실제 외부 provider 발송은 아직 하지 않는다.
- 푸시 provider abstraction은 현재 `mock` 구현체만 활성화되어 있으며 외부 provider 호출은 없다.
- 푸시 실패는 `failed` delivery와 `failureReason`, `retryCount`, `nextRetryAt`으로 기록한다.
- 적용된 migration:
  - `20260627130000_media_storage.sql`
  - `20260627131000_push_delivery.sql`
  - `20260630120000_push_delivery_retry_policy.sql`

Push delivery API contract:

- `POST /api/admin/push/campaigns/:campaignId/send`
  - Auth: `Authorization: Bearer <platform-admin-token>` required.
  - Body: `{ "providerMode": "auto" | "mock", "mockResult": "sent" | "skipped" | "failed" | "mixed", "limit"?: number }`.
  - Response: `{ ok: true, data: { campaignId, provider, requested, sent, skipped, failed, campaignStatus, deliveries } }`.
- `GET /api/admin/push/campaigns/:campaignId/deliveries?limit=20`
  - Auth: `Authorization: Bearer <platform-admin-token>` required.
  - Query: `limit` is optional, positive, and capped at 100.
  - Response: `{ ok: true, data: { campaignId, summary: { total, sent, skipped, failed }, deliveries } }`.
  - Delivery rows include `id`, `organizationId`, `recipientProfileId`, `recipientRole`, `provider`, `status`, `skippedReason`, `failureReason`, `providerMessageId`, `retryCount`, `nextRetryAt`, and `createdAt`.

## 2026-06-24 Admin Operations Expansion

- 관리자 기관 입력을 UUID 직접 입력에서 기관명/지역 검색 선택기로 교체했다.
- `GET /api/admin/organizations`는 platform admin만 기관 목록을 조회할 수 있다.
- 관리자 저장 smoke: `npm run smoke:admin-live`
- 쿠폰 전체 흐름 E2E: `npm run test:staff-coupon-e2e`
- 두 live 스크립트는 Supabase 로그인 환경변수가 있는 로컬 터미널에서 실행하며 토큰과 비밀번호를 출력하지 않는다.

## Latest Verification

Run date: 2026-06-20

- Local service-role bootstrap created or reused the default owner QA account, profile, organization, membership, and seed event for organization `70190539-92f8-4d48-9f44-a515c0b53e34`.
- Supabase Auth password login for the default owner QA account returned a bearer token; the token was used only for live smoke testing and was not recorded.
- `GET https://kidsmemo.vercel.app/api/events` without a bearer token returned `401 Unauthorized`.
- `GET https://kidsmemo.vercel.app/api/events` with bearer token plus the default organization header returned `200 OK` and organization-scoped events.
- `POST https://kidsmemo.vercel.app/api/events` with bearer token plus the default organization header returned `201 Created`.
- `GET https://kidsmemo.vercel.app/api/events` with the same bearer token but a non-member organization header returned `200 OK` with an empty list.
- `POST https://kidsmemo.vercel.app/api/events` with the same bearer token and a non-member organization id returned `403 forbidden_organization`.
- Real browser login/signup UI QA was pending at this checkpoint; current QA should use the 2026-07-09 smoke order and re-check target env first.

## 2026-06-19 Live Verification

- Live production deployment inspected with `npx vercel inspect https://kidsmemo.vercel.app`: status `Ready`, target `production`, deployment `dpl_kMTyYgiDMxHHYtpcZ2h2GvkvNNn6`, created 2026-06-17 22:14:25 KST.
- Live aliases: `https://kidsmemo.vercel.app`, `https://kidsmemo-yohans-projects-de3234df.vercel.app`, and `https://kidsmemo-papas-yohan-yohans-projects-de3234df.vercel.app`.
- `HEAD https://kidsmemo.vercel.app`: `200 OK`.
- `HEAD https://kidsmemo.vercel.app/app`: `200 OK`.
- `HEAD https://kidsmemo.vercel.app/admin`: `200 OK`.
- `GET https://kidsmemo.vercel.app/api/events`: `401 Unauthorized` with `{ ok: false, error: { code: "authentication_required", message: "로그인이 필요한 작업입니다." } }`.
- Vercel production env list contains `NEXT_PUBLIC_SUPABASE_URL`, `KIDSMEMO_DATA_BACKEND`, and `KIDSMEMO_ALLOW_LIVE_SUPABASE`.
- Vercel production env list did not show `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` at this checkpoint.
- The `401 authentication_required` API response implied the live backend flags were armed in production. Treat the anon-key note as historical until target env is rechecked.
- Supabase remote migration list matches local migration `20260617073000`.
- No Vercel env mutation, deploy, or app-code edit was performed in this pass.

## 2026-06-19 Live QA Checklist

Live prerequisite check:

- Confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` exists in the intended Vercel/local environment before real login/signup QA. Keep this as a public anon key only; do not use the service-role key in browser-exposed env.
- Create or identify QA users in Supabase Auth:
  - owner or manager in organization A
  - teacher in organization A
  - owner or manager in organization B
  - platform admin account, if the admin-console route is ready for live admin validation
- Confirm each QA user has a `profiles` row and the expected `memberships` row before route testing.

Read-only live availability:

- Confirm `https://kidsmemo.vercel.app` returns `200`.
- Confirm `/app`, `/admin`, `/login`, `/signup`, `/signup/jumbokids`, and `/onboarding` return `200`.
- Confirm `/api/events` without an Authorization header returns `401 authentication_required`.
- Confirm an invalid bearer token returns an auth failure and does not expose mock data.

Auth and session smoke after anon key is present:

- Visit `/login` and verify the missing-public-key warning no longer appears when submitting the email form.
- Sign in as the organization A owner/manager and open `/app`.
- Capture the Supabase access token from the browser session only for CLI smoke testing; do not paste it into docs or commit it.
- Call `GET /api/events` with `Authorization: Bearer <org-a-owner-token>` and verify it returns only organization A data.
- Repeat with organization A teacher and verify role-allowed reads work.
- Repeat with organization B owner/manager and verify organization A data is not returned.

Live CRUD and RLS smoke:

- As organization A owner/manager, create one clearly labeled QA event through the UI or API.
- Patch that QA event and confirm the update is visible only to organization A members.
- Try to patch the organization A event with an organization B token and confirm `403` or equivalent denial.
- Try staff coupon read/download with organization A and organization B tokens and confirm coupon visibility is organization-scoped.
- Run AI event assistant and parent-message flows while signed in and confirm generated records, if persisted, are organization-scoped.

Manual browser QA after auth smoke:

- Re-run the 320, 390, 768, and 1440 px matrix for `/`, `/app`, `/admin`, `/login`, `/signup`, `/signup/jumbokids`, and `/onboarding`.
- Confirm live login state does not expose mock fallback headers or cross-organization data.
- Confirm `/app#ai-helper` print preview still hides dashboard chrome and prints AI result panels cleanly.
- Confirm coupon copy/download works only for the signed-in user's organization.

Rollback gate:

- If auth, RLS, or organization scoping fails, turn production back to mock mode by changing Vercel env in a separate approved ops task; do not attempt doc-only QA fixes.

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
- `/admin` is visually and structurally separate from the teacher/director dashboard and requires a live platform admin session before operational data is shown.
- `/admin` includes content, image, gift-code, push-campaign, and audit-log management tabs.
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
- Verify the `점보키즈 쿠폰함` section on `/app` shows coupons provided by Jumbokids admins for directors/teachers.
- Verify each coupon card supports code copy and text-file download.
- Verify the UI does not imply directors or teachers send coupons to parents.
- Verify `/coupon/coupon-2` and `/api/admin/coupon-campaigns` are not part of the active route contract.
- Run the current live smoke scripts listed in the 2026-07-09 snapshot when live env and QA accounts are available.

## Auth And Membership

Manual checks:

- Confirm the admin console section on `/` lists Kakao OAuth, Google OAuth, and email/password direct signup.
- Confirm the product copy describes joining by creating an organization or using an invite code.
- Confirm the Supabase schema has tables or contracts for `organizations`, `profiles`, and `memberships`.
- Confirm role labels cover `owner`, `manager`, `teacher`, and `admin`.

Bootstrap smoke setup:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://fhakjrppirmjdgqlljzd.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run bootstrap:test-membership
```

On Windows PowerShell:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://fhakjrppirmjdgqlljzd.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
npm run bootstrap:test-membership
```

The script creates or reuses a confirmed test auth user, profile, organization, owner membership, and a seed event for RLS smoke testing.

Platform admin bootstrap:

```powershell
npm run bootstrap:admin-membership
```

Run this in the same local terminal after setting `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and any intended `KIDSMEMO_BOOTSTRAP_*` account values. It reuses the same auth user/profile/organization and upserts the membership role to `admin` without creating another seed event.

By default, the admin bootstrap uses a separate platform QA account and organization so it does not overwrite the owner QA membership. Override with `KIDSMEMO_ADMIN_EMAIL`, `KIDSMEMO_ADMIN_PASSWORD`, `KIDSMEMO_ADMIN_PROFILE_NAME`, or `KIDSMEMO_ADMIN_ORG_NAME` when a named admin account is needed.

Supabase-ready checks once connected:

- Kakao and Google buttons call Supabase OAuth and return through `/auth/callback`.
- OAuth callback routes users with an organization membership to `/app` and users without one to `/onboarding`.
- OAuth configuration or provider errors show a safe user-facing message without exposing tokens or provider secrets.
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

Landing and app responsive QA guardrails:

- At every checked width, confirm `document.documentElement.scrollWidth <= window.innerWidth + 1`; any horizontal page scroll is a release blocker unless it is contained inside a deliberate table/nav scroller.
- At 320 px, check Korean headings, organization names, coupon codes, URLs, email addresses, and button labels for forced wrapping with no clipped glyphs or text over neighboring controls.
- At 390 px, check paired CTAs and quick-action controls wrap into readable rows without shrinking icons, hiding labels, or producing uneven tap targets under 44 px high.
- At 768 px, check grid transitions: cards should reflow from single-column to multi-column without nested card-on-card framing, cramped gutters, or orphaned one-word lines in section headings.
- At 1440 px, check max-width behavior: content should stay grouped and scannable, image-backed blocks should keep enough contrast, and dashboard/sidebar regions should not stretch long text into hard-to-scan lines.
- For `/`, verify the first viewport shows the public value proposition plus a hint of the next section, while CTA rows remain reachable and do not wrap into more than two visual lines.
- For `/app`, verify the mobile quick nav remains horizontally scrollable only within the nav strip, anchor jumps to `#dashboard`, `#calendar`, `#coupons`, and `#ai-helper` leave headings visible, and coupon/AI panels keep long generated content inside their cards.
- When a component intentionally scrolls horizontally, such as compact nav or admin-style tables, confirm the body itself does not gain a second horizontal scrollbar.

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

Automated admin browser/DOM QA:

- Run `npm run qa:admin-browser` against a local dev server; default base URL is `http://localhost:3000`.
- Override the target with `KIDSMEMO_ADMIN_BROWSER_QA_TARGET=production` or an explicit `KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL`.
- The script checks `/admin` availability, anonymous `/api/admin/operations` rejection, admin tab labels in the rendered shell, and page-level horizontal overflow guards.
- If Playwright is installed, `KIDSMEMO_ADMIN_BROWSER_QA_MODE=playwright` runs mobile and desktop viewport checks. Without Playwright, `auto` mode falls back to lightweight HTTP/DOM checks.
- Without `KIDSMEMO_ADMIN_BROWSER_QA_ACCESS_TOKEN`, the Playwright path intentionally verifies only the anonymous admin denial state after confirming `/api/admin/operations` returns `401 authentication_required`.
- To click through authenticated admin tabs in Playwright mode, set `KIDSMEMO_ADMIN_BROWSER_QA_ACCESS_TOKEN` to a platform-admin Supabase access token. The script injects it only into `/api/admin/**` browser requests and must not print this token.
- `KIDSMEMO_ADMIN_BROWSER_QA_MODE=auto` is recommended for shared CI/smoke use: it runs Playwright checks when the package is available and otherwise completes the HTTP/DOM guard checks.
- `KIDSMEMO_ADMIN_BROWSER_QA_MODE=playwright` is recommended for release sign-off because it fails if Playwright is unavailable.
- `npm run qa:admin-browser-auth` signs in with `KIDSMEMO_ADMIN_EMAIL` and `KIDSMEMO_ADMIN_PASSWORD`, injects the returned bearer token into the browser QA process, and keeps the token out of logs.

Example local run:

```powershell
npm run dev
npm run qa:admin-browser
```

Example authenticated local browser run:

```powershell
$env:KIDSMEMO_ADMIN_BROWSER_QA_MODE="playwright"
$env:KIDSMEMO_ADMIN_BROWSER_QA_ACCESS_TOKEN="<platform-admin-access-token>"
npm run qa:admin-browser
```

Example production run:

```powershell
$env:KIDSMEMO_ADMIN_BROWSER_QA_TARGET="production"
npm run qa:admin-browser
```

Example authenticated production browser run:

```powershell
$env:KIDSMEMO_ADMIN_BROWSER_QA_TARGET="production"
$env:KIDSMEMO_ADMIN_BROWSER_QA_MODE="playwright"
$env:KIDSMEMO_ADMIN_BROWSER_QA_ACCESS_TOKEN="<platform-admin-access-token>"
npm run qa:admin-browser
```

Example authenticated production browser run with automatic admin login:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://fhakjrppirmjdgqlljzd.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="<public-anon-key>"
$env:KIDSMEMO_ADMIN_EMAIL="<platform-admin-email>"
$env:KIDSMEMO_ADMIN_PASSWORD="<platform-admin-password>"
$env:KIDSMEMO_ADMIN_BROWSER_QA_TARGET="production"
npm run qa:admin-browser-auth
```

Production/local configuration notes:

- Local default: `KIDSMEMO_ADMIN_BROWSER_QA_LOCAL_BASE_URL` falls back to `http://localhost:3000`; HTTP is allowed only for localhost.
- Production default: `KIDSMEMO_ADMIN_BROWSER_QA_PRODUCTION_BASE_URL` falls back to `https://kidsmemo.vercel.app`; production/custom base URLs must use HTTPS.
- `KIDSMEMO_ADMIN_BROWSER_QA_BASE_URL` overrides both target defaults when validating a preview deployment.
- Keep access tokens in the shell environment only; do not paste them into docs, logs, commits, or issue comments.

Invite onboarding live smoke:

- `npm run smoke:onboarding-invite-live` ensures two confirmed Supabase Auth users with the service role, signs both in with the anon key, creates a QA organization through `/api/onboarding`, creates a one-use invite, joins the second account as `teacher`, verifies `/api/onboarding` status, and cleans up the QA organization/invite/memberships unless `KIDSMEMO_ONBOARDING_SMOKE_KEEP_RECORD=true`.
- Required env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Optional account env: `KIDSMEMO_ONBOARDING_OWNER_EMAIL`, `KIDSMEMO_ONBOARDING_OWNER_PASSWORD`, `KIDSMEMO_ONBOARDING_JOINER_EMAIL`, and `KIDSMEMO_ONBOARDING_JOINER_PASSWORD`.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://fhakjrppirmjdgqlljzd.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="<public-anon-key>"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
npm run smoke:onboarding-invite-live
```

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
- Confirm `/admin` denies anonymous and non-admin sessions before any operational data is shown.
## 2026-07-15 live 운영 검증 명령

실제 운영 smoke는 아래 환경변수를 현재 PowerShell 세션에만 설정한 뒤 실행합니다. 이메일과 비밀번호, service-role key는 저장소나 로그에 기록하지 않습니다.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://fhakjrppirmjdgqlljzd.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="<public-anon-key>"
$env:KIDSMEMO_ADMIN_EMAIL="<platform-admin-email>"
$env:KIDSMEMO_ADMIN_PASSWORD="<platform-admin-password>"
$env:KIDSMEMO_TEACHER_EMAIL="<teacher-email>"
$env:KIDSMEMO_TEACHER_PASSWORD="<teacher-password>"
npm run smoke:organization-cms-live
```

`smoke:organization-cms-live`는 관리자 bearer로 기관 범위 `workspace-hero`를 published 상태로 저장하고, 교사 bearer의 `/api/session/context`에서 동일 콘텐츠가 반환되는지 확인한 뒤 기존 콘텐츠를 복원합니다. 기존 콘텐츠가 없었던 경우 관리자 bearer의 RLS 권한으로 임시 행을 삭제합니다.

2026-07-15 scope correction: 직원 휴가·연차와 원아 출석체크 기능은 제품 범위가 아니므로 화면, API, 계산기, smoke 및 운영 문서에서 제거했습니다. 기존 Supabase에 생성된 관련 테이블은 제거 migration으로 정리합니다.
