# Light Healthcare — HMS

AI-native hospital management platform. pnpm + Turborepo monorepo.

```
apps/
  web/          Next.js 15 — all staff portals, role-based routing
  mobile/       Expo — patient app (Phase 3)
  ai-services/  FastAPI — AI microservices (Phase 10)
packages/
  shared-types/ TS types shared across web + mobile
  ui/           shared component library
```

## Setup

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # fill Supabase keys
pnpm --filter @light/web dev                          # http://localhost:3000
```

## Stack

Next.js 15 · TypeScript · Tailwind · Supabase (DB/Auth/Realtime/Storage) ·
Razorpay · Cloudflare R2.

## Status

- [x] Phase 1 — Schema + RLS (in Supabase)
- [x] Phase 2 — Auth + role middleware
- [ ] Phase 3 — Patient app: booking + check-in ← **next**

Role routing: sign in at `/login` → middleware reads `staff.role` → redirects to
`/reception`, `/doctor`, `/diagnostics`, `/pharmacy`, or `/admin`, and blocks
cross-role access.

Test accounts: `doctor@test.com`, `reception@test.com` — `Test1234!`
