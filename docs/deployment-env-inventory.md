# Kidsmemo Deployment And Environment Inventory

Run date: 2026-06-10

## Current Deployment State

- GitHub repository: `papascompany/kidsmemo`
- Current branch: `main`
- Vercel CLI: `54.7.1`
- Vercel account: `papas-yohan`
- Vercel local project link: not present. `.vercel/project.json` does not exist.
- Vercel project candidate: no `kidsmemo` project was found in the current Vercel project list.
- Supabase CLI: `2.104.0`
- Supabase project link: present.
  - Project URL: `https://fhakjrppirmjdgqlljzd.supabase.co`
  - Project ref: `fhakjrppirmjdgqlljzd`
  - Project name from CLI link metadata: `kidsmemo Project`
- Production deployment: blocked until explicit approval.

## Runtime And Build

- Local Node observed through Vercel CLI: `24.14.0`
- Vercel project list shows recent projects using Node `24.x`, `22.x`, and `20.x`.
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
