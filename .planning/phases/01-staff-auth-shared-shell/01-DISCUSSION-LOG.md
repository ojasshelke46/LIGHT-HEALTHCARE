# Phase 1 Discussion Log — Staff Auth & Shared Shell

**Mode:** --auto (single pass, recommended defaults selected)
**Date:** 2026-07-09

## Areas Discussed

### UI primitives strategy
- Options: shadcn CLI install / hand-rolled shadcn-style primitives / expand packages/ui
- Selected: hand-rolled shadcn-style in `apps/web/src/components/ui` (recommended — non-interactive session, small dep surface, same API for later swap)

### Sidebar / navigation
- Options: overlay drawer on mobile / push layout / bottom nav
- Selected: fixed desktop sidebar + overlay drawer below md (recommended — brief specifies hamburger)

### Staff identity + logout
- Options: fetch staff row per page / once per role layout / client-side store
- Selected: once per role layout server component, pass down (recommended — fewer queries, server-first)

### Login UX
- Options: inline errors only / toasts + zod field validation
- Selected: toasts (sonner) + zod validation (recommended — brief mandates sonner)

### Async-state conventions
- Options: loading.tsx per route / in-component only / hybrid
- Selected: hybrid — loading.tsx + error.tsx for server routes, in-component states for client realtime views (recommended)

## Deferred Ideas
None.

## Claude's Discretion
Skeleton shapes, icons, spacing, collapse animation, admin stub content.
