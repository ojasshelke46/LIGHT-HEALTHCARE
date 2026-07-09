<!-- GSD:project-start source:PROJECT.md -->
## Project

**Light Healthcare — HMS**

An AI-native hospital management system for a small Indian hospital. Staff (reception, doctors, diagnostics, pharmacy, admin) work in role-scoped Next.js web portals; patients book appointments and view reports from an Expo mobile app; a FastAPI service hosts AI endpoints (triage, drug-interaction, ambient scribe). Everything runs on one Supabase project (Postgres + Auth + Realtime + Storage).

**Core Value:** The live patient flow — book → check-in → consult → order tests → dispense → bill — works end-to-end in real time across every role portal without a page refresh.

### Constraints

- **Tech stack**: Next.js 15 App Router + Tailwind + shadcn-style components; Expo + NativeWind; FastAPI — fixed by brief
- **Typing**: every Supabase query through generated `Database` types; no `any` — brief mandate
- **Realtime**: queue/orders/prescriptions views must live-update with reconnection handling — core value depends on it
- **Timezone**: all displayed dates in IST (Asia/Kolkata) — Indian hospital
- **Validation/UX**: zod on all forms; loading/error/empty states everywhere; sonner toasts; skeletons per page
- **Accessibility**: aria labels + keyboard navigation on interactive elements
- **Auth split**: staff = email/password, patients = phone OTP — different portals, same Supabase Auth
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
