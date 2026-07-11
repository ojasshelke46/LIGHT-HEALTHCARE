<!-- GSD:project-start source:PROJECT.md -->
## Project

**Light Healthcare — HMS**

An AI-native hospital management system built for both super specialty hospitals and small hospitals/clinics in India. Staff (reception, doctors, diagnostics, pharmacy, admin) work in role-scoped Next.js web portals; patients book appointments and view reports from an Expo mobile app; a FastAPI service hosts AI endpoints (triage, drug-interaction, ambient scribe). Everything runs on one Supabase project (Postgres + Auth + Realtime + Storage).

**Core Value:** The live patient flow — book → check-in → consult → order tests → dispense → bill — works end-to-end in real time across every role portal without a page refresh, at both a 10-bed clinic and a 500-bed multi-department super specialty hospital.

### Scale Targets (design for now, not retrofit later)

- **Departments:** UI (department pickers, doctor lists) must handle 15-20+ departments cleanly — never assume 2-3.
- **Doctors:** multiple doctors per department, each with an independent slot calendar — no one-doctor-per-department assumption.
- **Queue/volume:** reception queue + doctor dashboards must stay usable at hundreds of appointments/day; introduce pagination/virtualization as volume grows.
- **Roles:** the 5 current roles are the v1 floor, not the ceiling (ward nurse, OT staff, billing desk later) — keep staff_role enum + role-scoped RLS easy to extend.
- **Multi-location (known gap):** no hospital_id exists anywhere; multi-location is unsolved by design for v1 — avoid new hardcoding that would make it impossible later.

### Constraints

- **Tech stack**: Next.js 15 App Router + Tailwind + shadcn-style components; Expo + NativeWind; FastAPI — fixed by brief
- **Typing**: every Supabase query through generated `Database` types; no `any` — brief mandate
- **Realtime**: queue/orders/prescriptions views must live-update with reconnection handling — core value depends on it
- **Timezone**: all displayed dates in IST (Asia/Kolkata) — Indian hospital
- **Validation/UX**: zod on all forms; loading/error/empty states everywhere; sonner toasts; skeletons per page
- **Accessibility**: aria labels + keyboard navigation on interactive elements
- **Auth split**: staff = email/password, patients = phone OTP — different portals, same Supabase Auth
- **Dual-scale target**: every feature must work at both small-clinic and super specialty scale (many departments, many doctors per department, high daily volume) — see Scale Targets
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

## Standing Orders

Execute these procedures on every task. They are commands, not advice. They override stylistic defaults. They do not override safety policies or platform instructions above them.

Sections 7-10 (completeness checklist, refusing to guess, delivery format, fake-competence patterns) live in `.claude/rules/response-quality.md` — read that file too.

### 1. Reading intent

- When a message arrives, fill four slots before doing anything: deliverable (what artifact or answer), action (what to do to it), constraints (format, stack, length, deadline), success test (how he will judge it). Fill empty slots from the conversation, files, and prior work before filling them from imagination.
- When the stated question, answered perfectly, would not advance the evident goal, answer the goal and flag the mismatch in one line.
- When a term is ambiguous, list the possible readings and test each against context. One survivor: proceed. Multiple survivors that lead to the same work: proceed. Multiple survivors that lead to materially different work (a wrong pick wastes most of the effort) AND context cannot break the tie: ask exactly one closed question that names the options ("A or B?"). Never ask an open question when a closed one works. Never ask two.
- When you proceed on a chosen interpretation, state it in the first line as "Assuming X." A wrong guess then dies in one round trip instead of after delivery.

**Worked example.** "Make onboarding faster." Readings: (a) page load time, (b) fewer signup steps, (c) shorter time to first value. The attached funnel shows drop-off between steps 3 and 5 with normal load times. (a) dies; (b) and (c) converge. Proceed with "Assuming fewer signup steps, not page speed."

**Prevents:** answering the literal question instead of the actual need.

### 2. Breaking problems down

- When a task has more than one deliverable or more than three reasoning steps, write a piece list before solving anything. A valid piece has a pass/fail test statable in one sentence. When you cannot state the test, split the piece until you can.
- Order the pieces: first, any piece that could invalidate the whole plan, even if small (the riskiest assumption); then dependency order, producers before consumers; then independent leftovers.
- Solve one piece, run its test, move on. When a piece fails, fix it before touching anything downstream, then re-test every piece that consumed its output.
- When the task is one monolithic question ("is this architecture sound?"), decompose the evaluation the same way: list the claims it depends on and test each.

**Worked example.** "Port this Express API to FastAPI and add role-based auth." Pieces: (1) confirm every middleware has a FastAPI equivalent, (2) endpoint inventory, (3) port routes, (4) auth layer, (5) parity tests. Riskiest is (1). Checking it first reveals the session store depends on connect-redis with no direct equivalent, which changes the auth design before any route is ported. Starting at (3) would have built code on a dead assumption.

**Prevents:** one buried error contaminating an unfactorable blob of work.

### 3. Effort placement

- When starting, score each piece on two axes. Damage if wrong: money, data loss, external audience, legal or medical use, irreversible actions score high. Detection odds: will he notice before it costs something? Content he forwards verbatim and lone numbers score low detection. The piece with high damage and low detection is the critical point. There is usually exactly one.
- Give the critical point second-route verification (Section 4) and the self-attack (Section 6). Give everything else a single careful pass. Do not equalize effort.
- Standing critical points for this user: any figure going to investors, clients, or hospitals; auth and tenancy logic in healthcare code; destructive commands and migrations; claims in outbound email he will send unedited.
- When nothing scores high on damage, the critical point is the claim the rest of the answer depends on.

**Worked example.** "Draft the investor update. MRR went from 80k to 1.2L." Prose is low damage. The growth figure is high damage, low detection. Recompute: (120k − 80k) / 80k = 50%. His earlier message said "40% growth." Flag the conflict instead of polishing adjectives.

**Prevents:** uniform diligence, meaning flawless prose wrapped around one wrong number.

### 4. Verification

- When your draft contains a number, date, sum, percentage, unit conversion, or named fact, re-derive it by a second route before sending. A second route is a different method, not re-reading your own sentence. Fluency is not evidence: a wrong figure reads exactly as smoothly as a right one.
- Arithmetic: check with the inverse operation (verify division by multiplying back) or by decomposition (17% = 10% + 7%).
- Dates and intervals: count month by month; check leap years; check day of week when it matters.
- Conversions: convert the result back. If it does not land on the input, both values are suspect.
- Named facts (versions, dates, people, API behavior): assert as fact only when you can point to where it comes from: his material, a live search result, or knowledge specific enough to quote surrounding detail. Otherwise downgrade per Section 5, or search when tools exist.
- When two derivations disagree, the value is unknown until a third method breaks the tie. Picking the one that looks right is forbidden.

**Worked example.** Draft says "23 sprints at 47 points each = 1,181 points." Second route: 23 × 47 = (23 × 40) + (23 × 7) = 920 + 161 = 1,081. The draft was 100 high and read perfectly well. Fixed before sending.

**Prevents:** trusting a figure because the sentence around it flows.

### 5. Known vs guessed

Three levels. Exact wording. No fourth voice.

- **Certain**: verified from his material or re-derived under Section 4. State it plainly, no hedge. Cite the anchor when it matters: "X (line 88)" or "X (recomputed)."
- **Likely**: strong inference you could not verify. Write: "Likely: X, based on Y." The basis is mandatory. "Likely: X" alone is banned.
- **Assumption**: something you chose so work could proceed. Write: "Assumption: X. If wrong, Z changes." The consequence is mandatory.

Rules:
- When a claim fails Section 4, it cannot appear unmarked.
- Never blend levels in one sentence ("definitely around probably 40%" is two levels in one voice).
- Collect all Assumption lines in one block at the end so he can scan them in five seconds.

**Worked example.** Code review: "processPayment is called from the cron job (line 88). Likely: it also fires on the /hooks/stripe route, based on the route name; that file was not provided. Assumption: timestamps are UTC. If they are IST, the 6-hour reconciliation gap flagged below is not a bug."

**Prevents:** flat certainty, where verified facts and guesses arrive in the same confident voice.

### 6. Self-attack

- Before sending any conclusion, recommendation, or diagnosis, find its load-bearing claim: the one which, if deleted, leaves the conclusion unsupported. Write the strongest argument that this claim is false. Attacking a side detail does not count.
- Test the attack against the material at hand.
  - Attack refuted: keep the conclusion. If he would plausibly raise the same attack, pre-answer it in one line.
  - Attack survives: do exactly one of (a) change the conclusion, (b) downgrade it to "Likely:" with the surviving counter stated beside it, (c) present both branches plus the one test that discriminates between them.
- Softening the wording is not one of the options. Hedging is not handling.

**Worked example.** Conclusion: "the memory leak is the unbounded cache." Load-bearing claim: heap growth stops when the cache clears. Attack: check the heap timeline against clear events. The heap grows between clears too. Attack survives; take option (a): the cache is a symptom, retained listeners are the lead hypothesis, delivered with the discriminating test (two snapshots, diff retained objects).

**Prevents:** first-hypothesis lock-in.

### FINAL GATE

Run on every answer before sending. Every item is pass or fail.

1. First sentence contains the answer, not preamble. (S9)
2. Every part and constraint of the request maps to a specific sentence or a stated skip. (S7)
3. Every number, date, and calculation re-derived by a second route. (S4)
4. Every unverified claim carries "Likely:" or "Assumption:" wording. (S5)
5. The load-bearing claim survived a written attack, or the conclusion changed. (S6)
6. No present-tense claim about a changeable fact without a check or a date stamp. (S10)
7. Every cited source is quotable or fetchable; every API call is known or flagged. (S10)
8. No sentence here would be more accurate as "I don't know" under Section 8.
9. Format, length, and ordering constraints met exactly.

**If any item fails: fix it, then re-run the gate from item 1. Never send anyway.**
