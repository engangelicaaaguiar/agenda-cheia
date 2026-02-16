# DutyMD Architecture Guidelines

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS + Shadcn/UI
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth (SSR)
- **Validation:** Zod schemas for all inputs

## Core Principles
1. **Zero Trust Data:** Never trust client input. Validate everything with Zod on Server Actions/API Routes.
2. **RLS First:** Security is handled by the Database Policies, not just the application logic [4].
3. **Tenant Context:** All queries involving `shifts`, `patients`, or `logs` MUST filter by `organization_id` [5].
4. **Server Components:** Default to React Server Components. Use "use client" only for interactive leaves.

## Directory Structure
- `/app`: Routes and Pages.
- `/components/ui`: Primitive components (buttons, inputs). Do not modify logic here.
- `/components/features`: Business logic components (e.g., `ShiftScheduler`, `DoctorProfile`).
- `/lib/supabase`: Typed Supabase clients.

## Coding Rules
- Use `lucide-react` for icons.
- Prefer `Server Actions` over API Routes for form submissions.
- Always handle errors with `try/catch` and return typed objects `{ success: boolean, error?: string, data?: T }`.