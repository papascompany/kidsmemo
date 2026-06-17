# Kidsmemo Deployment And Environment Inventory

Run date: 2026-06-10

Latest readiness check: 2026-06-17. Supabase project link was revalidated, `supabase db push` applied the first migration, and Vercel was linked to the existing `kidsmemo` project. No production deploy or Supabase local start was run.

## Current Deployment State

- GitHub repository: `papascompany/kidsmemo`
- Current branch: `main`
- Vercel CLI: `54.7.1`
- Vercel account: `papas-yohan`
- Vercel local project link: present. Current CLI wrote `.vercel/repo.json` and `.gitignore` now excludes `.vercel`.
- Vercel project: `kidsmemo`
  - Project ID: `prj_qXXriKQQOX60Gy90Dmbq7vKPmAYg`
  - Org/team ID: `team_dOpgsAqfLyl4qNlVgSiFVm6B`
  - Production URL: `https://kidsmemo.vercel.app`
- Supabase CLI: `2.104.0`
- Supabase project link: previously completed and documented, but the ignored local link metadata is not present in this checkout.
  - Project URL: `https://fhakjrppirmjdgqlljzd.supabase.co`
  - Project ref: `fhakjrppirmjdgqlljzd`
  - Project name from prior CLI link metadata: `kidsmemo Project`
  - 2026-06-17 local check: `supabase/.temp` was recreated by `supabase link --project-ref fhakjrppirmjdgqlljzd`.
- Supabase remote migration state:
  - Local `20260617073000`
  - Remote `20260617073000`
- Supabase linked DB lint:
  - `supabase db lint --linked --fail-on error`: passed, no schema errors found
- Production deployment: blocked until explicit approval.

## Runtime And Build

- Local Node observed through Vercel CLI: `24.14.0`
- Local Node checked directly on 2026-06-17: `v24.14.0`
- Local npm checked directly on 2026-06-17: `11.11.0`
- npm registry: `https://registry.npmjs.org/`
- Vercel project list shows recent projects using Node `24.x`, `22.x`, and `20.x`.
- Existing `kidsmemo` Vercel project uses Node `24.x`.
- Current app build command: `npm run build`
- Current lint command: `npm run lint`
- Next.js version: `16.2.7`

## Environment Variables

### Required For Safe Mock/Fallback Operation

| Variable | Status | Notes |
| --- | --- | --- |
| `KIDSMEMO_DATA_BACKEND` | Added to `.env.example` | Keep as `mock` until Supabase approval. |
| `KIDSMEMO_ALLOW_LIVE_SUPABASE` | Added to `.env.example` | Keep `false` until the live Supabase transition is explicitly approved. |

### Supabase, Blocked Until Approval

| Variable | Status | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Listed | Project URL is `https://fhakjrppirmjdgqlljzd.supabase.co`; keep backend mode as `mock` until auth/RLS guards are ready. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Listed | Public client key, still blocked for live auth phase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Listed | Server-only; must not be exposed to browser or used by normal user routes. |

Safety check:

- With fake Supabase URL/service key and `KIDSMEMO_DATA_BACKEND=mock`, `/api/events` returned `200` with mock data.
- Supabase env vars alone no longer switch repositories to the service-role Supabase path.
- Even with `KIDSMEMO_DATA_BACKEND=supabase`, the app stays on mock repositories unless `KIDSMEMO_ALLOW_LIVE_SUPABASE=true` is also set.
- The dashboard now exposes a runtime mode card so operators can see whether the app is locked to mock mode or armed for live Supabase.
- Reserved request headers for the next auth/session layer: `x-kidmemo-profile-id`, `x-kidmemo-organization-id`, `x-kidmemo-role`.
- Those headers now gate the event, reminder job, and staff coupon download skeleton routes when a session is present.
- The same headers now gate AI workbench and internal webhook skeleton routes when a session is present.

### AI Providers

| Variable | Status | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Listed | Optional for Sprint 1 fallback; required for live OpenAI output. |
| `OPENAI_MODEL` | Added to `.env.example` | Optional override; code falls back when absent. |
| `NAVER_CLIENT_ID` | Listed | Optional for Sprint 1 fallback shopping recommendations. |
| `NAVER_CLIENT_SECRET` | Listed | Optional for Sprint 1 fallback shopping recommendations. |

### External Coupon And Message Providers

| Variable | Status | Notes |
| --- | --- | --- |
| `JUMBOKIDS_API_BASE_URL` | Listed | Optional until live Jumbokids integration. |
| `JUMBOKIDS_API_KEY` | Listed | Optional until live Jumbokids integration. |
| `MESSAGE_PROVIDER_API_BASE_URL` | Listed | Future live message provider endpoint. |
| `MESSAGE_PROVIDER_API_KEY` | Listed | Future live message provider credential. |

## Follow-Up Gates

1. Create or select a Vercel project for `kidsmemo`.
2. Run `vercel link` only after choosing the intended project/team.
3. Keep `KIDSMEMO_DATA_BACKEND=mock` for Vercel preview until Supabase guards are implemented.
4. Before enabling `KIDSMEMO_DATA_BACKEND=supabase`, set `KIDSMEMO_ALLOW_LIVE_SUPABASE=true` only after auth/session guards, membership checks, repository separation, and complete RLS policies are ready.
5. Convert `supabase/schema.sql` into reviewed migrations that match the corrected coupon direction:
   - active flow: Jumbokids admin-provided staff coupon wallet
   - removed flow: parent-facing coupon campaign and landing
6. Do not run `supabase db push`, apply `supabase/schema.sql`, or enable live Supabase repositories until the migration/RLS review is complete.

## Supabase DB Push Result And Runbook

Current local state on 2026-06-17:

- `supabase/config.toml` exists and uses local `project_id = "kidsmemo"`.
- `db.migrations.enabled = true`, and `supabase/migrations/20260617073000_initial_schema.sql` now mirrors the reviewed Sprint 1 schema.
- `db.seed.enabled = true` points to `./seed.sql`, and `supabase/seed.sql` is present as an intentional empty placeholder.
- `supabase/schema.sql` remains the human-readable draft target; the timestamped migration is the file intended for `supabase db push`.
- `supabase/schema.sql` includes RLS helper functions and policies for organization staff, platform admin, events, staff coupons, downloads, message jobs/deliveries, and AI generations.
- App repository selection still falls back to mock unless both `KIDSMEMO_DATA_BACKEND=supabase` and `KIDSMEMO_ALLOW_LIVE_SUPABASE=true` are set.
- Live user API repositories now require a verified Supabase Bearer session and use an anon-key user client with RLS. Service-role repository access is split into `getServiceRepositories()` for explicit server-only jobs.

Completed:

1. Reconfirmed the intended Supabase project ref: `fhakjrppirmjdgqlljzd`.
2. Recreated local Supabase link metadata with `supabase link --project-ref fhakjrppirmjdgqlljzd`.
3. Applied `supabase/migrations/20260617073000_initial_schema.sql` with `supabase db push`.
4. Verified `supabase migration list` shows local and remote migration `20260617073000`.

Remaining after `supabase db push`:

1. Run read-only schema checks in Supabase Studio or `psql`: tables, enums, indexes, functions, and RLS enabled state.
2. Verify policies with test users from at least two organizations plus a platform admin.
3. Keep Vercel preview/prod on `KIDSMEMO_DATA_BACKEND=mock` until verified test-user RLS smoke tests pass.
4. Only after RLS smoke verification, set `KIDSMEMO_DATA_BACKEND=supabase` and `KIDSMEMO_ALLOW_LIVE_SUPABASE=true` in a non-production environment first.
5. Smoke test `/app`, event CRUD, staff coupon read/download, AI history writes, and reminder-job idempotency before any production rollout.

## 2026-06-17 Session Guard And Repository Split

- Added a live-mode Supabase session resolver that reads `Authorization: Bearer <token>`, verifies the user with Supabase Auth, and resolves membership/role from `memberships`.
- Kept `x-kidmemo-*` headers as mock/development fallback only when live Supabase mode is off.
- Changed API routes to use the async verified access context.
- Changed live user repositories to use an anon-key Supabase client with the verified bearer token so RLS policies apply to user CRUD.
- Split service-role repository access into the explicit `getServiceRepositories()` path for cron/webhook/server jobs.
- Verification: `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed.
- Remote DB lint: `supabase db lint --linked --fail-on error` passed with no schema errors.

## 2026-06-17 Vercel Link

- `npx vercel project ls` confirmed an existing `kidsmemo` project under `yohans-projects-de3234df`.
- `npx vercel link --yes --project kidsmemo` linked this local workspace to that project.
- The current Vercel CLI wrote `.vercel/repo.json` rather than `.vercel/project.json`.
- No deploy was run.
