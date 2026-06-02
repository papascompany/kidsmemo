# Sprint 1 Board

## Status

Sprint started by CTO on 2026-06-02.

## Workstreams

| Role | Agent | Ownership | Expected Output | Status |
| --- | --- | --- | --- | --- |
| CTO | Main thread | `docs/sprint-1-cto-charter.md`, `docs/sprint-1-board.md`, integration decisions | Charter, board, review order, final merge plan | In progress |
| Backend | Socrates | API routes, service layer, Supabase schema | Stronger API validation, JSON error handling, persistence-ready services | Running |
| Frontend | Raman | Frontend components and limited page integration | Event/coupon forms wired to API routes, responsive improvements | Running |
| AI Integration | Franklin | AI adapters and AI API routes | OpenAI/Naver adapter structure with fallback behavior | Running |
| Designer / UX | Nash | UX audit and small frontend refinements | Director/teacher workflow review and prioritized UI improvements | Running |
| QA | Faraday | QA docs and smoke scenarios | Release checklist and exact smoke-test steps | Running |

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
