---
phase: 04-mobile-patient-app
plan: 02
status: complete
requirements: [MOB-01, MOB-02]
key-files:
  created:
    - apps/mobile/lib/slots.ts
    - apps/mobile/lib/slots.test.ts
  modified:
    - apps/mobile/app/(tabs)/index.tsx
    - apps/mobile/app/(tabs)/book.tsx
---

# Plan 04-02 Summary — Home tab + Booking wizard

## What was built

- **Home tab (MOB-01):** greeting from patient row, next-upcoming-appointment card (soonest `slot_time >= now`, status booked/checked_in, doctor + department + specialization embed), quick actions linking to Book and Reports tabs. Empty state when no upcoming appointment.
- **Booking wizard (MOB-02):** staged single-screen flow — departments list (scrollable, built for 15-20+ departments per Scale Targets) → doctors of department with specialization → free future slots (`is_booked=false, slot_time >= now`) → confirm → `supabase.rpc("book_appointment", { p_slot_id })` → success screen with QR (react-native-qrcode-svg, value = appointment id). "Slot already booked" RPC error surfaces as alert + slot list refresh.
- **`filterFreeFutureSlots`** pure helper extracted with RED→GREEN vitest coverage (15/15 tests green across mobile suite).

## Commits

- `8acece1` feat(04-02): home tab — greeting, next-appointment card, quick actions (MOB-01)
- `f84bbf0` test(04-02): add failing filterFreeFutureSlots spec (RED)
- `e923e7f` feat(04-02): booking wizard staging — dept → doctor → slot (MOB-02, GREEN)
- `08ecda8` feat(04-02): confirm booking via atomic book_appointment RPC + QR success (MOB-02)

## Verification (re-run by orchestrator after session interruption)

- `pnpm --filter @light/mobile exec tsc --noEmit` — exit 0
- `pnpm --filter @light/mobile test` — 15/15 (2 files)
- `npx expo export --platform ios` — bundle exported clean
- Live REST validation of all wizard queries (home embed, departments, doctors-by-dept, free slots) against the real project with the dev patient token — 200s, shapes match (done by executor mid-run; local DNS NXDOMAIN for the project host required a pinned-IP workaround — machine-local resolver issue, not app code).

## Notes

- Executor session was killed after the last code commit; this SUMMARY and state updates were completed by the orchestrator from verified disk state.
- Booking e2e on a real device remains a human-verify item (no simulator in this environment).
