# Sprint 1 CTO Charter

## Goal

Turn the current prototype into the first data-backed SaaS slice:

- Supabase-ready auth and membership model
- Event CRUD backed by stable API contracts
- Coupon campaign CRUD with API/manual issue modes
- Manual coupon image/HTML notice storage flow
- AI feature contracts ready for real provider integration
- QA scenarios for the first end-to-end release path
- Warm, modern, refined responsive UI direction for kindergarten and nursery operators
- Organization-scoped my page/workspace where each director manages only their own kindergarten/nursery content

## Sprint Boundary

In scope:

- Persistable schema/API contracts for organizations, profiles, memberships, events, coupon campaigns, coupon items, targets, message jobs, and AI generations.
- Frontend forms and flows for event and coupon management using existing mock/API boundaries.
- My page / organization workspace UX concept for directors and teachers.
- OpenAI and Naver integration adapters with env-based fallback behavior.
- UX review for nursery/kindergarten operators.
- QA checklist and smoke-test coverage for the core user journey.
- Design direction alignment: Pretendard typography, responsive control quality, warm modern tone, image-backed editorial cards for hero/content sections where appropriate.

Out of scope for this sprint:

- Production Kakao/SMS/email provider contracts beyond adapter boundaries.
- Final Jumbokids API credentials or live coupon issuance.
- Payment/subscription management.
- Parent-recipient mass messaging beyond coupon reminder flow.

## Owners

- CTO: orchestration, decisions, integration order, final review.
- Backend: Supabase schema/API/RLS and persistence design.
- Frontend: event/coupon CRUD UI and responsive interaction.
- AI Integration: OpenAI/Naver adapters and structured output validation.
- Designer: workflow and UI quality review.
- QA: acceptance tests and release checklist.

## Interface Contract

The following API route names remain stable during Sprint 1:

- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/:eventId`
- `POST /api/events/import-year-plan`
- `GET /api/admin/coupon-campaigns`
- `POST /api/admin/coupon-campaigns`
- `PATCH /api/admin/coupon-campaigns/:campaignId`
- `POST /api/admin/coupon-campaigns/:campaignId/items`
- `POST /api/admin/coupon-campaigns/:campaignId/targets`
- `POST /api/admin/coupon-campaigns/:campaignId/notice`
- `POST /api/ai/event-assistant`
- `POST /api/ai/parent-message`
- `POST /api/jobs/send-reminders`

Coupon issue modes remain:

- `jumbokids_api`
- `manual`

Coupon target scopes remain:

- `all_members`
- `selected_members`

Notice types remain:

- `image`
- `html`

## Acceptance Criteria

- `npm run lint` passes.
- `npm run build` passes.
- Core screens remain accessible at `/` and manual coupon landing remains accessible at `/coupon/coupon-2`.
- Event and coupon APIs validate input with Zod and return predictable JSON errors.
- Manual coupon campaigns support at least one campaign with multiple coupon items.
- AI endpoints return schema-valid results with and without external API keys.
- QA checklist covers auth, event CRUD, coupon modes, manual notice, reminder job, AI outputs, responsive UI, and print flow.
- Director and teacher workflows are scoped to the current organization.
- My page/workspace UX makes it clear which kindergarten/nursery is currently being managed.
- Events, coupon campaigns, AI generations, message jobs, and member settings are designed to be organization-owned data.
- Live Supabase implementation must prevent one organization from reading or mutating another organization's data.
- UI remains fully responsive across mobile, tablet, and desktop without text or control overlap.
- Korean UI uses Pretendard and avoids cramped administrative styling.
- Hero/content sections that need emotional context should prefer real photo/image cuts with readable text overlays over emoji/icon-heavy decoration.
- The app should feel like a polished teacher-facing operations tool with a warm magazine-like visual rhythm, not a generic enterprise dashboard.

## Integration Order

1. Backend persistence contracts and API error handling.
2. Frontend event/coupon forms wired to API contracts.
3. AI adapter integration and fallback behavior.
4. Design refinements from UX review.
5. QA checklist, smoke tests, and build verification.
