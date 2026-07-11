# apps/mobile — Patient app

Expo (SDK 52) + expo-router v4 + NativeWind v4 patient app for Light Healthcare.

## Development

```bash
pnpm --filter @light/mobile exec expo start
```

Env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) live in `.env`
(gitignored) — copy from `.env.example` and fill in the values from
`apps/web/.env.local` (same Supabase project).

Consumes `@light/shared-types` for DB types.
