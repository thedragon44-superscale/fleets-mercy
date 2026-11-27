# GEMINI.md — Fleet's Mercy

## 1. Project Overview & Stack
- **Architecture:** 60Hz authoritative Go backend (`backend/`) + React/TypeScript/Canvas/Tauri frontend (`src/`) + PostgreSQL (`spacetactics`).
- **Active Initiative:** Building a 10+ game multiplayer "everyone vs. house" casino suite alongside the existing Sandbox and 20v20 TDM (`backend/internal/game/teamDeathMatch/`) modes. **Do not modify Sandbox or TDM unless explicitly asked.**
- **Current Game Mode:** Space Pirates (`space_pirates_design.md`).
- **Deployment Flow:** Local dev -> GitHub (`origin main`) -> Raspberry Pi 5 (`streetcode101.local`, `~/fleets-mercy`).

---

## 2. Hard Architectural Rules (Non-Negotiable)
- **Zero Mock Data / Zero Hardcoding:** Never stub fake balances, fake players, or hardcoded unit stats/rules. All configs live in PostgreSQL (`sp_rulesets`, `sp_unit_configs`, `sp_resources`, `sp_cluster_variants`) and load into thread-safe in-memory caches (`db.SPCache`).
- **Pure FlatBuffers Over WebSockets:** No JSON-over-WebSocket hybrids for 60Hz rooms. Each game mode gets its own dedicated, self-contained schema (`schemas/<mode>.fbs`) so `schemas/game_state.fbs` never bloats.
- **Integer Cents Only:** All currency values (`balance_cents`, `base_cost_cents`, `payout_cents`, `delta_cents`) must be `int64` / `BIGINT` cents. Never use floats for money.
- **Protect the 60Hz Tick:** Never run synchronous PostgreSQL queries inside the 16ms physics loop. Read from in-memory caches and dispatch wallet/ledger updates asynchronously using row-locked atomic transactions (`SELECT ... FOR UPDATE`).
- **Strict Mode Isolation:** Keep each game mode self-contained in `backend/internal/game/<mode>/` and `src/components/casino/<mode>/`.
- **Idempotent Migrations:** All DB schema changes go into numbered files in `backend/migrations/` using `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`.

---

## 3. Workflow & Interaction Rules
- **Discuss In Depth Before Editing:** Always explain the proposed changes, design trade-offs, affected files, and edge cases *in depth* and wait for explicit user confirmation before writing or modifying any files.
- **Micro-Step Execution:** Work strictly one micro-step / file at a time following the active design roadmap. Do not jump ahead.
- **Safe Local Verification:** You may run safe, read-only/local verification commands (`go build`, `flatc`, `tsc --noEmit`) after edits, **provided you narrate what you are running and report the output clearly**.
- **Forbidden Actions (Require Explicit Request):** Never run `git push`, SSH commands, or destructive SQL (`DROP`, `TRUNCATE`, `DELETE` on prod data) on your own.
- **Token-Conscious Roadmap Updates:** Only check off `[x]` items in `space_pirates_design.md` if it can be done cheaply (e.g., a small targeted edit or batched at the end of a phase). Do not rewrite large markdown files just to flip a single checkbox.
- **Clean Edits:** When showing code or updating existing files, keep placements unambiguous (full drop-in files or exact targeted diffs).

---

## 4. Common Local Commands
```bash
# Compile Space Pirates FlatBuffers (Go + TS)
flatc --go -o backend/internal/generated schemas/space_pirates.fbs
flatc --ts -o src/generated schemas/space_pirates.fbs

# Verify Go server builds cleanly
cd backend && go build ./cmd/server

# Verify frontend TypeScript types
npx tsc --noEmit
