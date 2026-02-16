# DutyMD Migration Plan: Legacy -> Next.js SaaS

## Goal
Move from the current Express monolith in Netlify Function to a multi-tenant Next.js 14 SaaS without downtime.

## Current State
- Runtime API: `src/app.js` behind Netlify Function.
- Static frontend: `public/*.html`.
- Auth bridge: `x-user-id` header mock.
- Supabase access in backend for persistence.

## Target State
- Next.js 14 App Router as primary runtime.
- Supabase Auth + RLS as source of truth for tenancy.
- Typed contracts via Zod in `/types`.
- API Route Handlers under `/app/api`.

## Phase 0 - Preconditions (Done/Ready)
1. Multi-tenant SQL migration available and executed in Supabase.
2. Netlify env vars configured for public and server keys.
3. Baseline tests passing on legacy (`npm test`).

## Phase 1 - Parallel Foundation
1. Add Next.js app shell and routing (`/app`), keep legacy running.
2. Add typed Supabase SSR clients (`/lib/supabase/server.ts`, `/lib/supabase/client.ts`).
3. Add Route Handler parity for onboarding CRM endpoint:
   - New: `/app/api/onboarding/crm/route.ts`
   - Legacy route remains active.
4. Gate traffic with feature flag:
   - `NEXT_API_CRM_ENABLED=true` to use new endpoint.

## Phase 2 - Vertical Slice Cutover
1. Move one full flow to Next.js:
   - Login -> onboarding CRM -> profile update.
2. Update frontend calls to the new route.
3. Keep legacy endpoint as fallback for one release cycle.
4. Introduce telemetry:
   - success rate
   - p95 latency
   - error rate by endpoint

## Phase 3 - Auth Hardening
1. Remove `x-user-id` from client paths.
2. Enforce Supabase Auth token validation everywhere.
3. Apply organization membership checks in each data query.
4. Add policy-level integration tests for RLS boundaries.

## Phase 4 - Frontend Migration
1. Rebuild static pages in App Router:
   - `/login`
   - `/onboarding/crm`
   - `/dashboard`
2. Keep static pages as fallback until parity is validated.
3. Switch Netlify publish target to Next output through plugin/runtime.

## Phase 5 - Legacy Retirement
1. Freeze legacy writes.
2. Run final data consistency checks.
3. Remove deprecated files:
   - `src/app.js`
   - `src/index.js`
   - `public/*.html`
   - legacy routes and mocks.
4. Remove legacy dependencies:
   - `express`
   - `serverless-http`
   - `cors`

## Rollback Plan
1. Keep legacy API and static pages deployable for at least one release.
2. Feature-flag route switching by environment variable.
3. If incident detected:
   - disable Next endpoint flag
   - route traffic back to legacy endpoint
   - preserve data model compatibility.

## Exit Criteria
1. 100% authenticated requests via Supabase Auth.
2. No production reads/writes requiring `x-user-id`.
3. No traffic served by legacy Express stack.
4. RLS integration tests passing in CI.
