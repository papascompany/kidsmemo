# Sprint 1 CTO Charter

## Goal

Turn the current prototype into the first data-backed SaaS slice:

- Supabase-ready auth and membership model
- Event CRUD backed by stable API contracts
- Staff coupon wallet backed by admin-provided coupon codes
- AI feature contracts ready for real provider integration
- QA scenarios for the first end-to-end release path
- Warm, modern, refined responsive UI direction for kindergarten and nursery operators
- Organization-scoped my page/workspace where each director manages only their own kindergarten/nursery content

## Sprint Boundary

In scope:

- Persistable schema/API contracts for organizations, profiles, memberships, events, staff coupons, coupon downloads, message jobs, and AI generations.
- Frontend forms and flows for event management and staff coupon downloads using existing mock/API boundaries.
- My page / organization workspace UX concept for directors and teachers.
- OpenAI and Naver integration adapters with env-based fallback behavior.
- UX review for nursery/kindergarten operators.
- QA checklist and smoke-test coverage for the core user journey.
- Design direction alignment: Pretendard typography, responsive control quality, warm modern tone, image-backed editorial cards for hero/content sections where appropriate.

Out of scope for this sprint:

- Production Kakao/SMS/email provider contracts beyond adapter boundaries.
- Final Jumbokids API credentials or live coupon download tracking.
- Payment/subscription management.
- Parent-recipient mass messaging.

## Owners

- CTO: orchestration, decisions, integration order, final review.
- Backend: Supabase schema/API/RLS and persistence design.
- Frontend: event UI, coupon wallet UI, and responsive interaction.
- AI Integration: OpenAI/Naver adapters and structured output validation.
- Designer: workflow and UI quality review.
- QA: acceptance tests and release checklist.

## Interface Contract

The following API route names remain stable during Sprint 1:

- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `POST /api/events/import-year-plan`
- `POST /api/ai/event-assistant`
- `POST /api/ai/parent-message`
- `POST /api/jobs/send-reminders`

The coupon product surface is the staff coupon wallet. Directors and teachers can view, copy, and download coupons provided by Jumbokids administrators.

## Acceptance Criteria

- `npm run lint` passes.
- `npm run build` passes.
- Core screens remain accessible at `/`.
- Event and AI APIs validate input with Zod and return predictable JSON errors.
- Staff coupon wallet shows admin-provided codes with copy/download actions.
- AI endpoints return schema-valid results with and without external API keys.
- QA checklist covers auth, event CRUD, staff coupon wallet, reminder job, AI outputs, responsive UI, and print flow.
- Director and teacher workflows are scoped to the current organization.
- My page/workspace UX makes it clear which kindergarten/nursery is currently being managed.
- Events, staff coupons, coupon downloads, AI generations, message jobs, and member settings are designed to be organization-owned data.
- Live Supabase implementation must prevent one organization from reading or mutating another organization's data.
- UI remains fully responsive across mobile, tablet, and desktop without text or control overlap.
- Korean UI uses Pretendard and avoids cramped administrative styling.
- Hero/content sections that need emotional context should prefer real photo/image cuts with readable text overlays over emoji/icon-heavy decoration.
- The app should feel like a polished teacher-facing operations tool with a warm magazine-like visual rhythm, not a generic enterprise dashboard.

## Integration Order

1. Backend persistence contracts and API error handling.
2. Frontend event forms and coupon wallet wired to the active data model.
3. AI adapter integration and fallback behavior.
4. Design refinements from UX review.
5. QA checklist, smoke tests, and build verification.
