# Kidsmemo Deployment And Environment Inventory

Run date: 2026-06-20

Latest readiness check: 2026-06-20. Production Vercel and linked Supabase status were checked with live bearer-token API smoke tests after a local service-role bootstrap created the default QA organization membership.

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
- Current production deployment status: `Ready` at `https://kidsmemo.vercel.app`.
  - Deployment ID: `dpl_kMTyYgiDMxHHYtpcZ2h2GvkvNNn6`
  - Deployment URL: `https://kidsmemo-2u6btgm6f-yohans-projects-de3234df.vercel.app`
  - Created: 2026-06-17 22:14:25 KST
  - Read-only live route checks on 2026-06-19:
    - `/`: `200 OK`
    - `/app`: `200 OK`
    - `/admin`: `200 OK`
    - `/api/events`: `401 Unauthorized`, `authentication_required`
  - Bearer-token event API smoke on 2026-06-20:
    - unauthenticated `/api/events`: `401 Unauthorized`
    - authenticated default organization `/api/events`: `200 OK`
    - authenticated default organization `POST /api/events`: `201 Created`
    - authenticated non-member organization `GET /api/events`: `200 OK` with an empty list
    - authenticated non-member organization `POST /api/events`: `403 forbidden_organization`

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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Missing from Vercel production env list on 2026-06-19 | Required for browser login/signup and bearer-token user repository QA. Public anon key only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Missing from Vercel production env list on 2026-06-19 | Server-only; needed only for explicit service-role jobs, not normal user routes. Must never be exposed to browser. |

Safety check:

- With fake Supabase URL/service key and `KIDSMEMO_DATA_BACKEND=mock`, `/api/events` returned `200` with mock data.
- Supabase env vars alone no longer switch repositories to the service-role Supabase path.
- Even with `KIDSMEMO_DATA_BACKEND=supabase`, the app stays on mock repositories unless `KIDSMEMO_ALLOW_LIVE_SUPABASE=true` is also set.
- The dashboard now exposes a runtime mode card so operators can see whether the app is locked to mock mode or armed for live Supabase.
- Reserved request headers for the next auth/session layer: `x-kidmemo-profile-id`, `x-kidmemo-organization-id`, `x-kidmemo-role`.
- Those headers now gate the event, reminder job, and staff coupon download skeleton routes when a session is present.
- The same headers now gate AI workbench and internal webhook skeleton routes when a session is present.
- 2026-06-19 production env list includes `NEXT_PUBLIC_SUPABASE_URL`, `KIDSMEMO_DATA_BACKEND`, and `KIDSMEMO_ALLOW_LIVE_SUPABASE` for Production only.
- 2026-06-19 live `/api/events` returns `401 authentication_required`, which implies the production live flags are armed. The missing anon key still blocks real browser auth and token-backed live QA.

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

1. Complete real browser login/signup QA on production using the verified Supabase browser client configuration.
2. Add a second organization QA user and repeat cross-organization read/write checks from the UI, not only CLI.
3. Verify staff coupon read/download, AI history writes, and reminder-job idempotency with live Supabase data.
4. Convert any remaining `supabase/schema.sql` draft deltas into reviewed migrations before future schema changes.
5. Keep the corrected coupon direction intact:
   - active flow: Jumbokids admin-provided staff coupon wallet
   - removed flow: parent-facing coupon campaign and landing
6. Do not expose `SUPABASE_SERVICE_ROLE_KEY` through browser or public Vercel client env.

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
3. Production live flags and public anon key are armed for event API user-session smoke testing.
4. Event API bearer-token and organization-scope smoke passed on 2026-06-20.
5. Smoke test `/app`, staff coupon read/download, AI history writes, and reminder-job idempotency before any production rollout.

## 2026-06-19 Live Status Check

Commands and results:

- `npx vercel env ls`: production envs present for `NEXT_PUBLIC_SUPABASE_URL`, `KIDSMEMO_DATA_BACKEND`, and `KIDSMEMO_ALLOW_LIVE_SUPABASE`; missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- `npx vercel inspect https://kidsmemo.vercel.app`: production deployment `Ready`.
- `Invoke-WebRequest -Uri https://kidsmemo.vercel.app -Method Head`: `200 OK`.
- `Invoke-WebRequest -Uri https://kidsmemo.vercel.app/app -Method Head`: `200 OK`.
- `Invoke-WebRequest -Uri https://kidsmemo.vercel.app/admin -Method Head`: `200 OK`.
- `Invoke-WebRequest -Uri https://kidsmemo.vercel.app/api/events -Method Get -SkipHttpErrorCheck`: `401 Unauthorized`, `authentication_required`.
- `supabase migration list`: local and remote both show migration `20260617073000`.

Current interpretation:

- Vercel production is live and reachable.
- Supabase hosted DB migration state is aligned with the local first migration.
- Production API routes are no longer serving anonymous mock event data.
- The browser auth path cannot be validated until `NEXT_PUBLIC_SUPABASE_ANON_KEY` is added to the target Vercel environment.
- Server-only job paths that require service-role Supabase access cannot be live-validated until `SUPABASE_SERVICE_ROLE_KEY` is added, but that value is not required for normal user-scoped CRUD.

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

## Local Bootstrap Script

- Added `npm run bootstrap:test-membership` for local service-role-only RLS smoke setup.
- Added `npm run bootstrap:admin-membership` for local service-role-only promotion of the configured bootstrap account to the platform `admin` role.
- Required env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Optional env:
  - `KIDSMEMO_BOOTSTRAP_EMAIL`
  - `KIDSMEMO_BOOTSTRAP_PASSWORD`
  - `KIDSMEMO_BOOTSTRAP_PROFILE_NAME`
  - `KIDSMEMO_BOOTSTRAP_ORG_NAME`
  - `KIDSMEMO_BOOTSTRAP_ORG_TYPE`
  - `KIDSMEMO_BOOTSTRAP_ORG_REGION`
  - `KIDSMEMO_BOOTSTRAP_ROLE`
  - `KIDSMEMO_BOOTSTRAP_SEED_EVENT`
- The script must be run locally only. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser or public Vercel client env.
- Admin promotion must also be run locally only, in a terminal where the service-role env is already set.

## 2026-06-20 Bootstrap And RLS Smoke

- `npm run bootstrap:test-membership` created or reused the default QA owner, organization membership, and seed event.
- `npm run bootstrap:admin-membership` reuses the configured bootstrap account and organization, sets the membership role to `admin`, and skips seed-event creation by default.
- Default QA organization: `70190539-92f8-4d48-9f44-a515c0b53e34`.
- API-level production smoke used Supabase Auth password login to obtain a bearer token; the token was not persisted.
- Verified outcomes:
  - no bearer token: `401 authentication_required`
  - bearer token for member organization: `200 OK`
  - create event in member organization: `201 Created`
  - read non-member organization: `200 OK` with no rows
  - create event in non-member organization: `403 forbidden_organization`
- Remaining manual QA: sign in through the production browser UI and verify `/app` renders the same scoped organization data.
