# Sprint 1 Board

## Status

Sprint started by CTO on 2026-06-02.

Current CTO checkpoint as of 2026-07-15: Sprint 1 has moved beyond the original mock/fallback checkpoint. Completed work now includes Vercel link and production readiness checks, Supabase link and first DB push, live session/user-scoped repository split, admin operations, staff coupons end-to-end into `/app`, invite/onboarding code and live smoke script, OAuth callback routing, push mock delivery with retry fields, simplified landing/dashboard UX, login/signup production error handling, local Pretendard font loading, organization-scoped CMS content consumption in `/app`, and staff attendance quick-check API/UI. Remaining work is release sign-off and provider/ops hardening, not basic project linking or schema push.

## Workstreams

| Role | Agent | Ownership | Expected Output | Status |
| --- | --- | --- | --- | --- |
| CTO | Main thread | `docs/sprint-1-cto-charter.md`, `docs/sprint-1-board.md`, integration decisions | Charter, board, review order, final merge plan | Complete for Sprint 1 mock/fallback checkpoint |
| Backend | Socrates | API routes, service layer, Supabase schema | Stronger API validation, JSON error handling, persistence-ready services | Live guards, user-scoped repositories, onboarding invites, staff coupon API, admin ops API, and push mock delivery complete; provider integrations remain future work |
| Frontend | Raman | Frontend components and limited page integration | Event forms, coupon wallet, responsive improvements | `/app` staff coupon wallet, simplified landing/dashboard, auth/onboarding surfaces, admin console tabs, local Pretendard, and mobile UX passes complete |
| AI Integration | Franklin | AI adapters and AI API routes | OpenAI/Naver adapter structure with fallback behavior | First pass complete; live provider credentials pending |
| Designer / UX | Nash | UX audit and small frontend refinements | Director/teacher workflow review and prioritized UI improvements | First pass complete; mobile/print verification pending |
| QA | Faraday | QA docs and smoke scenarios | Release checklist and exact smoke-test steps | Admin browser/auth smoke, admin live smoke, staff coupon E2E, onboarding invite live smoke, and push delivery contract documented; manual browser/print sign-off still pending |
| Deployment / Ops | CTO subagent | GitHub, Vercel CLI, Supabase CLI, Node/npm readiness | New PC operational readiness report | Vercel link complete, production URL ready, Supabase project linked, first migration pushed and linted; env values must be verified in the target environment before each live smoke |

## CTO Review Order

1. Backend changes first because they define route behavior and validation.
2. AI integration next because it is isolated to AI endpoints.
3. Frontend changes after backend/API contracts are stable.
4. Designer changes after frontend changes, unless they are documentation-only.
5. QA checklist last, updated against the integrated behavior.

## Merge Rules

- Do not accept changes that remove the existing working dashboard or mock fallback behavior.
- Keep the app usable without Supabase, OpenAI, Naver, Jumbokids, or messaging API keys.
- Reject broad rewrites that touch unrelated workstreams.
- Every accepted implementation change must pass `npm run lint` and `npm run build`.

## First Checkpoint

CTO will collect agent results, identify conflicts, and integrate in the review order above. If an agent proposes a larger change than Sprint 1 needs, CTO will split it into a later sprint item.

## 2026-06-02 New PC / CTO Checkpoint Results

- GitHub repo `papascompany/kidsmemo` is connected and pushed.
- Latest commit: `e3a2a4d Add kidsmemo app scaffold`.
- Main workspace verification:
  - `npm run lint`: passed.
  - `npm run build`: passed.
  - `git status`: clean on `main...origin/main`.
- Subagent QA found most API smoke tests pass.
- Reminder job currently returns `duplicate_job` because mock seed data already contains the target job. CTO must decide whether to update QA expectation or mock seed.
- First browser visual QA pass found and fixed mobile clipping in the director workspace. Mobile quick navigation is implemented. Manual browser and print sign-off should still be done before starting Supabase persistence.

## 2026-06-09 Coupon Direction Correction

- Product intent was corrected: coupons are not currently for teachers to send to parents.
- Active coupon feature is now the `점보키즈 쿠폰함`:
  - Jumbokids administrators provide coupons or discount codes.
  - Directors and teachers copy/download those codes.
  - Codes are used on Jumbokids or GodoMall order flows.
- Parent-facing coupon campaign work was removed from the active source because it was not part of the original product scope.
  - Removed legacy coupon campaign UI.
  - Removed public coupon landing route.
  - Removed `/api/admin/coupon-campaigns/**`.
  - Removed event-to-coupon-campaign coupling.
- Main dashboard now imports `JumbokidsCouponWallet` instead of the parent campaign builder.

## Next CTO Queue

1. Run current release smoke in the intended environment:
   - `npm run lint`
   - `npm run build`
   - `npm run qa:admin-browser-auth`
   - `npm run smoke:admin-operations-live`
   - `npm run test:staff-coupon-e2e`
   - `npm run smoke:onboarding-invite-live`
2. Complete manual browser QA for `/`, `/app`, `/admin`, `/login`, `/signup`, `/signup/jumbokids`, and `/onboarding`.
3. Re-check 320/390/768/1440 responsive layouts, coupon copy/download, AI generate buttons, admin table scroll, and print preview.
4. Verify target Vercel/Supabase env values before live smoke. Old notes about Vercel link pending, initial `db push` blocked, and missing anon key were June checkpoint blockers and should not be treated as current unless re-confirmed.
5. Decide next provider integrations separately: real push provider, Jumbokids/GodoMall coupon sync, Naver Shopping, and production email/SMS/Kakao messaging.

## 2026-07-15 CTO Orchestration Checkpoint

- Organization CMS is now consumed by the live session context and `/app` workspace. Published `workspace-hero`, `organization-profile`, `ai-helper`, and `coupon-wallet` blocks plus organization media slots can change the corresponding workspace surfaces.
- Staff attendance quick-check is available at `/api/attendance` and in the `/app` dashboard. Owner, manager, and teacher sessions can read and bulk-save their current organization attendance; closure remains an admin operation.
- Migration `20260715090000_staff_attendance_write.sql` adds organization-staff insert/update RLS for attendance records.
- Responsive smoke on the production `/app` route found no horizontal overflow at 320, 390, 768, or 1440 px. Authenticated attendance and CMS live verification remain deployment gates.

## Design Direction For Next Frontend Pass

- Target users are kindergarten/nursery directors and teachers.
- The product should feel warm, soft, refined, and modern.
- Responsive UX quality is a release-level requirement, not a decoration pass.
- Prefer real photos/image cuts and text overlays for hero/content sections.
- Use image-backed editorial cards where they improve meaning and emotional tone.
- Keep the operational dashboard efficient and scannable, but avoid a cold generic admin look.
- Emoji and decorative icons should be secondary; images, typography, spacing, and clear controls carry the experience.
- My page should feel like a calm personal workspace for "my kindergarten", not a generic account settings page.
- The current organization context must be visible and reassuring across desktop and mobile.

## Organization Workspace Requirements

- Every director account manages only their own kindergarten/nursery content unless explicitly assigned to multiple organizations.
- Organization-owned data includes events, coupon campaigns, coupon items, targets, notices, AI generations, message jobs, and delivery history.
- The frontend must never imply cross-organization access for directors or teachers.
- Backend API routes must enforce user session, membership, and role before Supabase persistence is enabled.
- Supabase RLS must be designed around `organization_id` and memberships.
- Service admin access is separate from director my page access.

## 2026-06-03 CTO Next Development Plan

Phase 1: pre-Supabase product hardening.

- Run browser visual QA for desktop/mobile widths before adding persistence complexity.
- Tighten the warm modern visual direction with Pretendard, image-backed editorial cards, and clearer operational hierarchy.
- Design the director my page as the primary organization workspace, including current-organization context, event schedule, AI advice history, coupon settings, and sending history.
- Add mobile quick navigation if browser QA confirms workflow friction.
- Update reminder job QA expectations around the current `duplicate_job` seeded behavior.

Phase 2: Supabase/auth architecture after explicit approval.

- Confirm Supabase project and Vercel project link.
- Add session, membership, and role guard utilities before any live repository replacement.
- Expand schema/RLS around `organization_id`, memberships, events, coupon campaigns, AI generations, message jobs, and delivery history.
- Keep service-role access restricted to cron, webhook, and operator-only server tasks.

Phase 3: persistence and release readiness.

- Replace mock repositories incrementally, starting with organization-scoped event CRUD.
- Implement organization-scoped coupon campaign/item/target/notice persistence.
- Store AI generation history under each organization workspace.
- Persist reminder jobs and delivery records with idempotency.
- Re-run lint, build, API smoke, browser responsive QA, and print QA before release.

## 2026-06-03 CTO Orchestration Results

- Frontend/UX subagent implemented the first director organization workspace UI slice.
  - Added an image-backed, warm editorial "my kindergarten" workspace.
  - Surfaced current organization context, institution profile, event schedule, AI advice history, coupon settings, and sending summary.
  - Wired the workspace into the top dashboard while keeping the mock/fallback app path intact.
- QA/Release subagent updated Sprint 1 QA documentation.
  - Current-date reminder behavior on 2026-06-03 now expects empty arrays because no 2026-06-04 seeded event exists.
  - Seeded duplicate reminder behavior is verified through an explicit `now: "2026-06-02T09:00:00+09:00"` fixture.
  - Director organization workspace QA criteria were added.
- Backend/Auth subagent found a critical sequencing risk.
  - The current Supabase service-role repository path can bypass RLS if live env vars are enabled before route guards and repository separation.
  - At the time, `coupon_campaigns` needed organization ownership before live coupon persistence. This was superseded by the 2026-06-10 staff coupon wallet model.
  - RLS policies must be expanded before live CRUD.
- CTO integrated decision:
  - Continue with frontend/QA hardening now.
  - Do not enable Supabase env or `supabase link/db push` yet.
  - Next backend implementation after approval must start with auth guard utilities, user-scoped repositories, service-role-only cron/webhook paths, and event route guards before coupons.

## 2026-06-03 CTO Visual QA And Follow-Up Orchestration

- Commit `0fbdd91` fixed the first mobile visual QA issue:
  - Added mobile text wrapping and `min-w-0`/`overflow-x-hidden` safeguards to the dashboard, app shell, and director organization workspace.
  - Production screenshots at 320, 390, 768, and 1440 px no longer showed the original director workspace clipping risk in code-level fixes.
- QA and Frontend/UX subagents identified an AI workbench release blocker:
  - The frontend was treating normalized `{ ok: true, data }` API responses as raw AI payloads.
  - CTO fixed the AI workbench to unwrap `data`, show loading/status states, and preserve printable result panels.
  - `npm run lint` and `npm run build` pass after the fix.
- Backend/Auth subagent set the next Supabase gate:
  - Supabase env vars alone must not activate live repositories.
  - Live Supabase should also require an explicit opt-in flag so preview environments stay on mock data.
  - Add an explicit data backend flag, auth/session utilities, membership guards, and repository separation before `supabase link`, `db push`, or live CRUD.

Next execution order:

1. Manual browser QA and print QA on the current mock/fallback app.
2. Vercel project selection/link after user confirms the target project.
3. Backend live-readiness guard work only after explicit Supabase approval.

## 2026-06-03 CTO Mobile Quick Navigation

- Implemented mobile quick navigation in `AppShell`:
  - Mobile users now have direct access to home, event schedule, coupon management, AI helper, message writer, and admin console.
  - The quick nav uses existing lucide icons and short Korean labels to keep 320 px screens usable.
  - Section anchor offsets were adjusted with `scroll-mt-32` on mobile so sticky navigation does not cover headings.
- Verification:
  - `npm run lint`: passed.
  - `npm run build`: passed.
  - `next start` served `/` with HTTP 200 during CTO check.
  - Production HTML includes `aria-label="모바일 빠른 이동"` and the adjusted section scroll offsets.
- Remaining release check:
  - Manual in-browser visual sign-off and print preview are still required because headless Chrome screenshot file output was unreliable in this workspace session.

## 2026-06-04 CTO AI And Workspace Orchestration

- CTO implemented the AI workbench form-depth pass:
  - Event advice inputs now include event name, age group, preparation days, budget, location, season, and mood.
  - Parent message inputs now include purpose, tone, event name, sender, and child/event context.
  - All AI responses still unwrap normalized `{ ok: true, data }` envelopes and preserve printable result panels.
- Frontend worker implemented the organization workspace action/empty-state pass:
  - Hero actions now expose 일정 관리, 쿠폰 설정, AI 조언 열기, and 발송 상태 보기.
  - Workspace cards now show empty states for missing events, AI advice, campaigns, and scheduled sends.
  - All data remains mock/local; no Supabase live connection was added.
- QA explorer found and CTO fixed two follow-up issues:
  - Select controls now use the same mobile-friendly input styling as text fields.
  - Duplicate `calendar`, `coupons`, and `ai-helper` DOM ids were removed from workspace cards so anchor navigation remains stable.
- Verification:
  - `npm run lint`: passed after the integrated changes.
  - `npm run build`: passed after the integrated changes.
- Remaining release check:
  - Manual browser visual QA and print preview remain required before release.

## 2026-06-04 CTO QA And Deployment Inventory

- Production route/API smoke at that checkpoint:
  - `/`: `200`
  - `/api/ai/event-assistant`: `200 ok=true`, 3 ideas
  - `/api/ai/parent-message`: `200 ok=true`, 3 candidates
- The old `/coupon/*` checks from this checkpoint were removed from the active product contract on 2026-06-10.
- Print check:
  - Print CSS remains implemented.
  - Chrome headless PDF output did not materialize a file, so manual print preview remains required.
- Deployment inventory:
  - Added `docs/deployment-env-inventory.md`.
  - Vercel CLI `54.7.1`, account `papas-yohan`.
  - `.vercel/project.json` is absent; Vercel project is not linked.
  - Vercel project list did not include `kidsmemo`, so project creation/link requires user confirmation.
  - Supabase CLI `2.104.0`; no `supabase link` or `db push` was run.
  - GitHub CLI token is currently invalid for `gh auth status`, but git remote push has been working separately.
- Safety flag:
  - Added `KIDSMEMO_DATA_BACKEND=mock` to `.env.example`.
  - Repository selection now stays on mock unless `KIDSMEMO_DATA_BACKEND=supabase` is explicitly set.
  - With fake Supabase env vars and `KIDSMEMO_DATA_BACKEND=mock`, `/api/events` returned `200 ok=true` with mock events.

## 2026-06-10 Supabase Link Result

- Supabase project was created and linked locally.
  - Project URL: `https://fhakjrppirmjdgqlljzd.supabase.co`
  - Project ref: `fhakjrppirmjdgqlljzd`
  - Linked metadata name: `kidsmemo Project`
- `supabase/config.toml` was generated by `supabase init`.
- `.temp` link metadata is intentionally ignored by `supabase/.gitignore`.
- Do not run `supabase db push` yet:
  - `supabase/schema.sql` is a reviewed draft target, not a timestamped migration yet.
  - RLS policies need live CRUD review before production use.
  - Auth/session guards and user-scoped repositories are not implemented yet.

## 2026-06-10 Legacy Coupon Removal

- Removed the parent-facing coupon campaign source from the active app.
- Removed `/coupon/[campaignId]` and `/api/admin/coupon-campaigns/**`.
- Removed event-to-coupon-campaign coupling from types, mock data, event forms, repositories, and reminder jobs.
- Updated `supabase/schema.sql` draft around `staff_coupons` and `staff_coupon_downloads`.
- Current browser QA target is `/`; old `/coupon/coupon-2` route is no longer part of the product contract.

## 2026-06-12 Teacher Usability Pass

- CTO orchestrated parallel UX audits for overall workflow, navigation information architecture, and mobile usability.
- Primary navigation was reduced to four daily workflow items: today, schedule, coupon, AI.
- Dashboard now starts with three quick actions instead of broad feature/status inventory.
- Event registration now prioritizes title, date, and audience, with templates and optional detail fields.
- Coupon wallet now emphasizes code copy, shortens the mobile hero, and collapses operational guidance.
- AI workbench now uses a two-option tool switch so teachers choose either event planning or message generation first.

## Current Release Gates

- Manual responsive and print QA is still required before a production confidence claim.
- Live smoke requires valid Supabase/Vercel env in the active shell or target deployment; do not paste keys into docs.
- External providers are still mocked or future work unless explicitly wired in a later task.

## 2026-06-19 QA/Deployment Live Status

- QA/Deployment worker performed a documentation-only, read-only live status check.
- No Vercel env mutation, deployment, Supabase local start, or app-code edit was performed.
- Vercel production is `Ready`:
  - URL: `https://kidsmemo.vercel.app`
  - Deployment ID: `dpl_kMTyYgiDMxHHYtpcZ2h2GvkvNNn6`
  - Created: 2026-06-17 22:14:25 KST
- Live route checks:
  - `/`: `200 OK`
  - `/app`: `200 OK`
  - `/admin`: `200 OK`
  - `/api/events`: `401 Unauthorized`, `authentication_required`
- Vercel production envs found:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `KIDSMEMO_DATA_BACKEND`
  - `KIDSMEMO_ALLOW_LIVE_SUPABASE`
- Vercel production envs still needed:
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` for browser auth and bearer-token user repository QA
  - `SUPABASE_SERVICE_ROLE_KEY` only for explicit server-only job validation
- Supabase migration status remains aligned: local and remote both show `20260617073000`.
- Next exact QA gate: add the public anon key, create or identify two-organization test users plus platform admin, then run live auth/RLS smoke before any production confidence claim.

## 2026-06-17 Ops/DB Readiness Refresh

- Ops/DB worker performed a documentation-only readiness check.
- No `supabase db push`, production deployment, `vercel link`, or Supabase local start was run.
- Read-only/local checks:
  - Node `v24.14.0`
  - npm `11.11.0`
  - npm registry `https://registry.npmjs.org/`
  - Vercel CLI `54.7.1`
  - Supabase CLI `2.104.0`
  - `.vercel/project.json` absent
  - `supabase/.temp` absent
- Supabase config notes:
  - `supabase/config.toml` exists with `project_id = "kidsmemo"` and DB major version `17`.
  - `db.migrations.enabled = true`, and `supabase/migrations/20260617073000_initial_schema.sql` is present as the first reviewed migration.
  - `db.seed.enabled = true`, and `supabase/seed.sql` is present as an intentional empty placeholder.
  - `supabase/schema.sql` remains the human-readable draft target; the timestamped migration is the push target.
- Current DB readiness risks for CTO:
  - remote migration `20260617073000` is applied and must be verified with Supabase Studio or `psql`;
  - live user repositories are now user-scoped, but need test-user RLS smoke before env opt-in;
  - Vercel is linked to the existing `kidsmemo` project, but env rollout and deploy remain separate approval steps.

## 2026-06-17 Supabase DB Push

- CTO created `supabase/migrations/20260617073000_initial_schema.sql` from the reviewed Sprint 1 schema.
- Added `supabase/seed.sql` as an intentional empty placeholder so local reset matches `supabase/config.toml`.
- Revalidated Supabase link for project ref `fhakjrppirmjdgqlljzd`.
- Ran `supabase db push`; migration `20260617073000_initial_schema.sql` applied successfully.
- Ran `supabase migration list`; local and remote both show `20260617073000`.
- Ran `supabase db lint --linked --fail-on error`; no schema errors found.
- The app remains mock/fallback by default. Live repository use still requires both `KIDSMEMO_DATA_BACKEND=supabase` and `KIDSMEMO_ALLOW_LIVE_SUPABASE=true`.

## 2026-06-17 Session Guard And Repository Split

- Added live-mode Supabase Bearer token verification in access control.
- API routes now use the async verified access context.
- Live user repositories now use anon-key user clients with the verified token so RLS applies.
- Service-role access is separated into `getServiceRepositories()` for explicit server-side jobs.
- Mock/fallback behavior remains unchanged when live flags are off.
- Verification:
  - `npm run lint`: passed.
  - `npx tsc --noEmit`: passed.
  - `npm run build`: passed.
  - `supabase db lint --linked --fail-on error`: passed.
  - `npm run dev`: foreground Ready confirmed at `http://localhost:3000`.

## 2026-06-17 Vercel Link

- `npx vercel project ls` confirmed the existing `kidsmemo` project.
- `npx vercel link --yes --project kidsmemo` linked the local workspace.
- Vercel CLI wrote `.vercel/repo.json`; `.gitignore` now excludes `.vercel`.
- No deploy or env var mutation was performed.

## 2026-06-15 Public Landing / Auth Entry / Admin Console

- CTO orchestration updated the product entry structure:
  - `/` is now the public service landing page.
  - `/app` preserves the existing mock/fallback director and teacher dashboard.
  - `/login`, `/signup`, `/signup/jumbokids`, and `/onboarding` define the auth and institution onboarding skeleton.
  - `/admin` defines the platform operator console skeleton for institution coupons, codes, links, Jumbokids verification, and download history.
- Existing dashboard anchors remain under `/app`:
  - `/app#dashboard`
  - `/app#calendar`
  - `/app#coupons`
  - `/app#ai-helper`
- Transitional redirects were added for older intent routes:
  - `/dashboard` -> `/app`
  - `/calendar` -> `/app#calendar`
  - `/coupons` -> `/app#coupons`
  - `/ai-helper` -> `/app#ai-helper`
- Product policy:
  - The public landing must not expose mock institution data or staff coupon codes.
  - The staff coupon product remains Jumbokids-admin-provided coupons for directors and teachers.
  - Parent-facing coupon campaign creation and public coupon landing remain out of active scope.
- Supabase remains locked:
  - Auth pages are UI/IA skeletons only.
  - They must not be treated as real session enforcement.
  - Live persistence still requires reviewed session guards, role separation, and RLS completion.

## 2026-06-17 Frontend QA Planning Pass

- Frontend/QA worker completed a static planning pass for `/`, `/app`, `/admin`, `/login`, `/signup`, `/signup/jumbokids`, and `/onboarding`.
- `docs/qa-sprint-1.md` now includes:
  - route-specific responsive checks at 320, 390, 768, and 1440 px.
  - static findings for public landing separation, app anchors, admin console scope, auth skeleton copy, and print CSS intent.
  - print preview checks for `/app#ai-helper`.
  - open browser-signoff risks for remote images, clipboard/download behavior, and admin table overflow.
- No Supabase start, `supabase db push`, or code changes were performed in this pass.
- Lint/build were not rerun because the pass was documentation-only.
