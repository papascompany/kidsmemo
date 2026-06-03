# Sprint 1 Board

## Status

Sprint started by CTO on 2026-06-02.

Current CTO checkpoint: Sprint 1 mock/fallback integration is complete. New PC handoff, GitHub push, and CTO subagent readiness review are complete. Supabase connection remains paused until explicit user approval.

## Workstreams

| Role | Agent | Ownership | Expected Output | Status |
| --- | --- | --- | --- | --- |
| CTO | Main thread | `docs/sprint-1-cto-charter.md`, `docs/sprint-1-board.md`, integration decisions | Charter, board, review order, final merge plan | Complete for Sprint 1 mock/fallback checkpoint |
| Backend | Socrates | API routes, service layer, Supabase schema | Stronger API validation, JSON error handling, persistence-ready services | First pass complete; Supabase auth/RLS/persistence pending |
| Frontend | Raman | Frontend components and limited page integration | Event/coupon forms wired to API routes, responsive improvements | First pass complete; browser visual QA and mobile quick nav pending |
| AI Integration | Franklin | AI adapters and AI API routes | OpenAI/Naver adapter structure with fallback behavior | First pass complete; live provider credentials pending |
| Designer / UX | Nash | UX audit and small frontend refinements | Director/teacher workflow review and prioritized UI improvements | First pass complete; mobile/print verification pending |
| QA | Faraday | QA docs and smoke scenarios | Release checklist and exact smoke-test steps | Smoke pass complete with reminder-job caveat |
| Deployment / Ops | CTO subagent | GitHub, Vercel CLI, Supabase CLI, Node/npm readiness | New PC operational readiness report | Complete; Vercel link and Supabase login/link pending |

## CTO Review Order

1. Backend changes first because they define route behavior and validation.
2. AI integration next because it is isolated to AI endpoints.
3. Frontend changes after backend/API contracts are stable.
4. Designer changes after frontend changes, unless they are documentation-only.
5. QA checklist last, updated against the integrated behavior.

## Merge Rules

- Do not accept changes that remove the existing working dashboard, coupon landing, or mock fallback behavior.
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
- Browser visual QA is pending and should be done before starting Supabase persistence.

## Next CTO Queue Before Supabase

1. Update QA expectation for reminder job duplicate behavior.
2. Run browser QA for `/`, `/coupon/coupon-2`, `/coupon/unknown-campaign`.
3. Check 320/390/768/1440 responsive layouts and print preview.
4. Align frontend visual direction with the warm modern kindergarten-teacher concept:
   - Pretendard typography polish.
   - image-backed hero/content cards.
   - refined magazine-like section rhythm.
   - reduced dependence on emoji/icon decoration.
5. Define my page / organization workspace UX:
   - director's own kindergarten profile.
   - organization-scoped event schedule.
   - organization-scoped AI event advice history.
   - organization-scoped coupon campaigns and sending settings.
   - clear current-organization indicator and optional organization switcher.
6. Decide and implement mobile quick navigation if approved.
7. Prepare Vercel project link and environment variable inventory.
8. Confirm Supabase login/project candidates without applying schema.

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

## Blocked Until Explicit Approval

- `supabase link`
- `supabase db push`
- applying `supabase/schema.sql`
- replacing mock repositories with live Supabase repositories
- production deployment
