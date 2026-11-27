# Space Pirates — Complete Game Mode Design & CLI Handoff Roadmap

**Genre:** Multiplayer Arcade Raid / Fish-Table Survival (Everyone vs. The House)  
**Engine:** Fleet's Mercy 60Hz Authoritative Go Server + PostgreSQL (Raspberry Pi 5) + React/Canvas/Tauri Client  
**WebSocket Route:** `/ws/casino/space-pirates?tableId=<id>`  
**Wire Protocol:** 100% Pure Binary FlatBuffers (`schemas/space_pirates.fbs`)

---

## CLI Handoff Status (Start Here)

> **Instructions for CLI Agent:** Follow all rules in root `GEMINI.md` (discuss changes in depth before editing, work one micro-step at a time, zero mock data, integer cents only, never block the 60Hz tick on PostgreSQL).
>
> **Completed So Far (ALL PHASES 1–5 COMPLETE):**
> - **Phase 1 (PostgreSQL & Auth/Wallets):** Migration `001_casino_and_space_pirates.sql` applied & seeded; atomic wallets, ledger, `OpenTableSession`/`CloseTableSession`, `SPCache`, cluster CRUD, and REST routes complete.
> - **Phase 2 (Pure FlatBuffers):** `schemas/space_pirates.fbs` compiled for Go & TS; `sp_codec.go` and `src/parsers/spacePiratesCodec.ts` complete.
> - **Phase 3 (Asteroid Cluster Designer):** `src/services/clusterService.ts`, `ClusterEditorViewport.tsx`, `ClusterInspectorPanel.tsx`, `ClusterLibrarySidebar.tsx`, and `ClusterDesignerView.tsx` complete.
> - **Phase 4 (Authoritative 60Hz Go Engine):** `sp_types.go`, `sp_world.go`, `sp_ai.go`, `sp_codec.go`, `sp_room.go`, and `/ws/casino/space-pirates` in `backend/cmd/server/main.go` complete.
> - **Phase 5 (Space Pirates Frontend & Casino Hub):** `walletService.ts`, self-registration `LoginScreen.tsx`, `useSpacePiratesSocket.ts`, `SpacePiratesViewport.tsx`, `TableSeatsHUD.tsx`, `DeployControlDeck.tsx`, `SpacePiratesTableView.tsx`, `CasinoLobby.tsx`, and `src/App.tsx` routing complete.

---

## 1. Core Concept & Table Rules

Up to **4 players** share a single fixed-screen space arena, deploying autonomous combat ships to raid a House mining operation while competing to land the killing blow on high-value harvesters and armed bosses.

* **Everyone vs. The House:** Players never deal weapon or collision damage to each other. Every player is an independent faction (`OwnerID = seatID`) for AI coordination and payout attribution, while targeting and damage check `IsHouse`.
* **Player-to-Player Shoving:** Heavier player ships physically shove lighter player ships out of the way (asymmetric `WeightClass` separation) with **zero collision damage** between players.
* **1-Click Base Deployment:** Players have no manual flight controls. Clicking a unit on the deploy bar immediately deducts `BaseCost * Multiplier` from their real wallet balance and spawns the ship at their corner base.
* **Finite Ammo Self-Destruct:** Every deployed player ship carries a fixed magazine (`MaxAmmo`). The instant it fires its final round (`CurrentAmmo <= 0`), it self-destructs. No repair or logistics units exist for players.
* **Bet Multiplier (`1x, 2x, 5x, 10x, 25x`):** Scales both deployment cost and kill payouts for any unit deployed while active. The multiplier is locked onto the unit at spawn and stamped onto every projectile it fires—meaning a unit's final shot still pays out at its multiplier even if the ship self-destructs mid-flight.
* **Last-Hit Attribution:** Whoever fires the killing projectile (or deals the killing Cryo cloud tick) receives the full bounty multiplied by that projectile/cloud's `BetMultiplier`.
* **Forfeit on Exit:** Leaving the table or disconnecting immediately deletes all of that player's active units and in-flight projectiles with no refund.
* **House-Issued Currency:** Players can self-register accounts (starting at `$0.00`). Only `house_admin` accounts have unlimited minting/revoking power to distribute or adjust in-game currency.

---

## 2. Arena Layout, Map Objects & Visuals

* **Dimensions:** Fixed-camera **`2400 x 1600`** arena (no panning; entire battlefield visible to all seats).
* **Always-On Telemetry:** Radar fog-of-war is bypassed in this mode so deployed units immediately acquire targets.
* **4 Corner Seats:** Player bases are anchored in the **NW, NE, SW, and SE corners** for symmetrical travel distance to the center.
* **Drifting Asteroid Clusters (Sole Map Object):**
  * Clusters are rigid-body groups defined in PostgreSQL (`sp_cluster_variants`) with custom shapes, sizes, drift speeds, and optional spin rates.
  * **Slot-Based Resource Rolling:** Each cluster blueprint flags specific rocks as decorative cover or unlimited **Resource Slots** (`Common`, `Mid`, `Rare`, or pinned). On spawn, slots roll their exact resource from `sp_resources` using `spawn_weight`.
  * **Whole-Cluster Edge Wrapping:** Clusters drift completely off-screen (`arena_bounds + bounding_radius`) before wrapping cleanly to the opposite edge. After `wraps_remaining` hits `0`, the cluster exits permanently and is replaced by a fresh rolled variant.
  * **Tactical Cover:** Asteroid rocks physically block both player and House projectiles. Player AI performs a line-of-sight check before firing and repositions around rocks to avoid wasting paid ammo.
  * **Harvester Detach on Wrap:** When a cluster drifts off-screen to wrap/despawn, any harvester mining it detaches at the arena border and immediately re-acquires the nearest in-bounds matching node (or switches to `ESCAPE` if already full).
* **Silhouette Glows (Instant Readability):**
  * **House Units:** Distinct **red glow** (plus Boss crown/skull indicator).
  * **Player Units:** Distinct **seat-assigned color glow** (with a compact ammo pip bar underneath).

---

## 3. Unit Rosters & Economy

### A. Player Combat Roster (1-Click Deployable)
*1W units carry more bullets with lower per-shot damage; 5W units carry fewer bullets with massive burst damage. Stored in `sp_unit_configs`.*

| Weight | Unit Class | 1x Cost | 25x Cost | Starter Ammo | Dmg / Shot | Total Dmg Budget |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1W** | `viper_interceptor` | $0.10 | $2.50 | 30 | 40 | 1,200 |
| **2W** | `assault_gunship` | $0.25 | $6.25 | 20 | 150 | 3,000 |
| **3W** | `cryo_flak` | $0.50 | $12.50 | 12 | 450 AoE | 5,400+ |
| **4W** | `torpedo_bomber` | $0.75 | $18.75 | 6 | 1,500 | 9,000 |
| **5W** | `flagship` | $1.00 | $25.00 | 4 | 3,000 | 12,000 |

### B. Resource Hierarchy (Most to Least Valuable)
1. **Graviton Core** (`Rare` — $1.50 max cargo)
2. **Plasma Gas** (`Mid` — $1.25 max cargo)
3. **Isotopes** (`Mid` — $1.00 max cargo)
4. **Ore** (`Common` — $0.75 max cargo)
5. **Metal** (`Common` — $0.50 max cargo)

### C. House Roster & Payouts
*Max harvester payout equals its max cargo bounty (before multiplier). Harvesters do not return fire; House escorts and the Boss actively shoot at player ships.*

| House Unit | Role | Target Resource(s) | Fill / Stay Timer | 1x Empty (Base) | 1x Full Cargo (Max) | 25x Max Payout | Return Fire? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`mining_barge`** | Harvester | Metal / Ore | 30s | $0.05 | $0.50 / $0.75 | $12.50 / $18.75 | No |
| **`plasma_skimmer`** | Harvester | Isotopes / Plasma Gas | 45s | $0.10 | $1.00 / $1.25 | $25.00 / $31.25 | No |
| **`grav_extractor`** | Harvester | Graviton Core | 60s | $0.25 | $1.50 | $37.50 | No |
| **`viper_interceptor`** | Harvester Escort | Guards Harvester | Until killed / VIP exits | $0.15 (flat) | — | $3.75 | Yes |
| **`command_escort`** | Boss Escort | Guards Boss | Leashed to Boss | $0.25 (flat) | — | $6.25 | Yes |
| **`flagship`** | **Jackpot Boss** | Armed Boss | Escape timer (50s) | $5.00 (flat) | — | $125.00 | Yes |

### D. Growing Bounty Formula
For any House Harvester destroyed mid-run, payout scales linearly with its fill progress (integer cents):

$$\text{Payout} = \left(\text{Base} + (\text{MaxCargo} - \text{Base}) \times \frac{\text{HarvestTicks}}{\text{FillDurationTicks}}\right) \times \text{Multiplier}$$

---

## 4. Autonomous AI State Machines

### A. House Harvesters
1. **`APPROACH`:** Spawns from a random arena edge trajectory and flies toward the nearest in-bounds drifting resource node matching its resource type.
2. **`HARVEST`:** Matches the asteroid cluster's drift velocity and fills cargo over its timer (`30s` / `45s` / `60s`). Visual cargo ring/glow intensifies as bounty grows.
3. **`ESCAPE`:** At 100% cargo, breaks off and sprints to the nearest arena edge to warp out and forfeit its bounty.
4. **Edge-Wrap Detach:** If its target cluster drifts off-screen to wrap/despawn, the harvester detaches at the border and re-acquires the nearest in-bounds matching node.

### B. House Combatants
* **Harvester Escort (`viper_interceptor`):** Spawns linked to a harvester via `BuddyID`. Positions itself between the harvester and nearby player ships, executing a lateral **"cutting the pie"** sweeping arc while firing. If its harvester is destroyed, it drops its leash and indiscriminately attacks player units.
* **Jackpot Boss (`flagship`):** Triggered by a **table-wide Jackpot Meter** that fills based on **all expended player units** (both combat losses and empty-ammo self-destructs). Sweeps across the arena on a visible escape timer, continuously firing on the nearest player ship.
* **Boss Escort (`command_escort`):** Spawns with the Boss, executing the same "cutting the pie" defensive sweep leashed to the Boss.

### C. Player Fleet (Per-Seat Independent)
* **Dynamic Squad Assignment:**
  * The highest-weight active unit for a seat acts as **Squad Leader**; all other units of that seat leash to it.
  * If **2 or more `5W` (`flagship`)** units are active for the same seat, all remaining `1W–4W` units divide evenly among the `5W` leaders.
  * **Target De-duplication:** Each squad leader claims a distinct harvester so squads do not pile onto the same target.
  * **Line-of-Sight Check:** Before firing, player units raycast against asteroid rocks and strafe around cover if obstructed.
* **Role-Specific Behaviors:**
  * **1W `viper_interceptor`:** Escorts the squad leader, intercepting threats and finishing weak targets.
  * **2W `assault_gunship`:** Actively seeks targets if Squad Leader; holds a trailing formation behind the leader if Follower.
  * **3W `cryo_flak`:** Roams laying Cryo AoE payloads (light DoT + 45% slow) if Squad Leader; blankets the leader's target with Cryo clouds if Follower.
  * **4W `torpedo_bomber`:** Hunts the highest-value target if Squad Leader; focuses the leader's target if Follower.
  * **5W `flagship`:** Always hunts the highest live bounty on the table.

---

## 5. PostgreSQL Database Architecture (Zero-Hardcoding)

* **Shared Accounts & Currency (Reused by Games #2–#10):**
  * `players` *(extended)* — `id`, `username`, `password_hash` (bcrypt), `role` (`player` | `house_admin`), `is_active`, `created_at`, `last_login_at`.
  * `wallets` — `wallet_id`, `player_id` (unique), `balance_cents` (`BIGINT CHECK (balance_cents >= 0)`), `version`, `updated_at`.
  * `wallet_ledger` — Immutable audit log (`ledger_id`, `wallet_id`, `entry_type`, `delta_cents`, `balance_after_cents`, `game_mode`, `session_id`, `issued_by_player_id`, `created_at`).
  * `casino_tables` — Persistent rooms (`table_id`, `game_mode`, `table_name`, `max_seats`, `ruleset_id`, `is_active`).
  * `table_sessions` — Per-seat session analytics & RTP tracking (`session_id`, `table_id`, `player_id`, `seat_index`, `joined_at`, `left_at`, `starting_balance_cents`, `ending_balance_cents`, `total_wagered_cents`, `total_won_cents`, `units_deployed`, `units_forfeited`).
* **Space Pirates Config Tables:**
  * `sp_rulesets` — Arena dimensions, allowed multipliers, Boss threshold/escape timer, max harvesters, target cluster count.
  * `sp_unit_configs` — Keyed by `(unit_class, faction_role)` for all Player and House unit stats, costs, ammo, and bounties.
  * `sp_resources` — 5-tier resource hierarchy, `tier`, `harvester_unit_class`, `max_cargo_bounty_cents`, `spawn_weight`, `color_hex`.
  * `sp_cluster_variants` — Custom asteroid clusters (`variant_id`, `name`, `nodes_layout` JSONB, `bounding_radius`, `scale_min/max`, `speed_min/max`, `spin_rate`, `min/max_wraps`, `spawn_weight`, `max_concurrent`, `is_enabled`).
* **60Hz Persistence Pattern:** Seat balances load from `wallets` on join, update immediately in memory during 60Hz ticks, and flush atomic `wallets` + `wallet_ledger` writes via a dedicated background DB writer goroutine.

---

## 6. Actual Folder Architecture (`[DONE]` vs `[TODO]`)

```text
fleets-mercy/
├── GEMINI.md                                     # [DONE] CLI workflow & architectural rules
├── space_pirates_design.md                       # [DONE] This living design & handoff doc
├── schemas/
│   ├── game_state.fbs                            # [EXISTING] Sandbox/TDM schema (untouched)
│   └── space_pirates.fbs                         # [DONE] Dedicated pure-binary Space Pirates schema
│
├── backend/
│   ├── cmd/server/
│   │   └── main.go                               # [DONE] REST/Auth/Cluster routes & /ws/casino/space-pirates wired
│   ├── migrations/
│   │   └── 001_casino_and_space_pirates.sql      # [DONE] Applied & seeded on Pi PostgreSQL
│   └── internal/
│       ├── models/
│       │   └── casino_structs.go                 # [DONE] Auth, wallet, ledger, ruleset, unit, resource, cluster structs
│       ├── db/
│       │   ├── postgres.go                       # [EXISTING] DB connection
│       │   └── casino_db.go                      # [DONE] Wallet/ledger atomic ops, table_sessions helpers, SPCache, cluster CRUD
│       ├── api/
│       │   ├── handlers.go                       # [EXISTING] Legacy Sandbox/TDM handlers (untouched)
│       │   └── casino_handlers.go                # [DONE] Register, bcrypt login, wallet, admin mint, SP config & cluster CRUD
│       ├── generated/
│       │   └── SpacePirates/                     # [DONE] flatc --go output
│       └── game/
│           └── spacePirates/
│               ├── sp_types.go                   # [DONE] Runtime structs & GetUnitConfig cache helper
│               ├── sp_world.go                   # [DONE] Cluster Director, slot rolling, whole-cluster wrap, cover LOS, Cryo clouds
│               ├── sp_ai.go                      # [DONE] Harvester loop, cutting-the-pie escorts, dynamic squads, LOS flanking
│               ├── sp_codec.go                   # [DONE] Pure FlatBuffers SPServerState encoder & SPClientAction decoder
│               └── sp_room.go                    # [DONE] 60Hz loop, async DB wallet writer, sessions, collisions, Boss, WS handler
│
└── src/
    ├── generated/
    │   └── space-pirates/                        # [DONE] flatc --ts output
    ├── parsers/
    │   └── spacePiratesCodec.ts                  # [DONE] Pure FlatBuffers TypeScript encoder/decoder
    ├── hooks/
    │   └── useSpacePiratesSocket.ts              # [DONE] Binary WebSocket hook for 60fps canvas + seat HUD
    ├── services/
    │   ├── walletService.ts                      # [DONE] Auth, self-register, wallet balance, admin mint API calls
    │   └── clusterService.ts                     # [DONE] Asteroid cluster CRUD API calls
    └── components/
        └── casino/
            ├── CasinoLobby.tsx                   # [DONE] Game selector, table browser, admin minting drawer
            ├── clusterEditor/
            │   ├── ClusterEditorViewport.tsx     # [DONE] Local-space canvas, drag/resize rocks, cover vs. node slots, motion preview
            │   ├── ClusterInspectorPanel.tsx     # [DONE] Speed, spin, scale, wrap budget, spawn weight, max concurrent
            │   ├── ClusterLibrarySidebar.tsx     # [DONE] Saved PostgreSQL variants list (duplicate, edit, toggle, delete)
            │   └── ClusterDesignerView.tsx       # [DONE] Full 3-pane Asteroid Cluster Designer studio
            └── spacePirates/
                ├── SpacePiratesViewport.tsx      # [DONE] Fixed-camera 2400x1600 canvas, glows, asteroids, cryo FX, payout popups
                ├── DeployControlDeck.tsx         # [DONE] Live wallet balance, 1x–25x multiplier, 1W–5W dock, Boss Meter, Leave modal
                ├── TableSeatsHUD.tsx             # [DONE] 4-corner seat status cards (color, multiplier, active units)
                └── SpacePiratesTableView.tsx     # [DONE] Integrated Space Pirates table workspace
```

---

## 7. Step-by-Step, File-by-File Development Roadmap

### Phase 1 — PostgreSQL Schema, Accounts & House-Issued Wallets (COMPLETE)
- [x] **Step 1.1:** `backend/migrations/001_casino_and_space_pirates.sql` — Written, applied to `spacetactics` on Pi, seeded, and `admin01` promoted to `house_admin`.
- [x] **Step 1.2:** `backend/internal/models/casino_structs.go` & `backend/internal/db/casino_db.go` — Implemented atomic row-locked wallet updates, ledger logging, unlimited `house_admin` minting/revoking, `SPCache` loader, and `sp_cluster_variants` CRUD.
- [x] **Step 1.3:** `backend/internal/api/casino_handlers.go` & `backend/cmd/server/main.go` — Wired `/api/register`, bcrypt `/api/login`, `/api/wallet`, `/api/admin/players`, `/api/admin/wallet/adjust`, `/api/casino/sp/config`, and `/api/casino/sp/clusters`.

### Phase 2 — Pure FlatBuffers Schema & Codegen (COMPLETE)
- [x] **Step 2.1:** `schemas/space_pirates.fbs` — Finalized dedicated Space Pirates schema (`player_id: int`, `is_node: bool`, `table_id: string`).
- [x] **Step 2.2:** Compiled Go (`backend/internal/generated/SpacePirates/`) and TypeScript (`src/generated/space-pirates/`) bindings via `flatc`.
- [x] **Step 2.3:** `src/parsers/spacePiratesCodec.ts` — Build the TypeScript binary encoder (for `JoinSeat`, `LeaveSeat`, `SetMultiplier`, `DeployUnit`) and zero-overhead `SPServerState` decoder.

### Phase 3 — Asteroid Cluster Designer (Frontend Viewport) (COMPLETE)
- [x] **Step 3.1:** Backend CRUD endpoints (`GET`/`POST`/`DELETE /api/casino/sp/clusters`) live in `casino_handlers.go` & `main.go`.
- [x] **Step 3.2:** `src/services/clusterService.ts` — Implement typed frontend fetch helpers for cluster CRUD and `/api/casino/sp/config`.
- [x] **Step 3.3:** `src/components/casino/clusterEditor/ClusterEditorViewport.tsx` — Build the interactive local-space canvas (click-to-place, drag, scroll-resize, cover vs. `Common`/`Mid`/`Rare` resource slot toggle, bounding radius ring, ship scale reference ghost, and live drift/spin preview).
- [x] **Step 3.4:** `ClusterInspectorPanel.tsx` & `ClusterLibrarySidebar.tsx` — Build the right-hand motion/spawn property editor and left-hand saved variant browser.

### Phase 4 — Space Pirates Authoritative Go Engine (COMPLETE)
- [x] **Step 4.1:** `backend/internal/game/spacePirates/sp_types.go` — Runtime structs hydrated from `db.SPCache`.
- [x] **Step 4.2:** `backend/internal/game/spacePirates/sp_world.go` — Cluster Director (slot-based resource rolling, rigid-body drift/spin, whole-cluster wrap/replace), tactical cover raycasting, and Cryo Flak AoE clouds.
- [x] **Step 4.3:** `backend/internal/game/spacePirates/sp_ai.go` — 3-state Harvester loop + wrap detach, "cutting the pie" House escorts, Boss patrol/escape, per-seat dynamic squad splitting (including multi-5W division & target de-duplication), and asteroid LOS flanking.
- [x] **Step 4.4:** `backend/internal/db/casino_db.go`, `backend/internal/game/spacePirates/sp_codec.go`, & `backend/internal/game/spacePirates/sp_room.go`:
  - Add `OpenTableSession` and `CloseTableSession` helpers to `casino_db.go`.
  - Implement `sp_codec.go` (pure FlatBuffers `SPServerState` encoder + `SPClientAction` decoder).
  - Implement `sp_room.go` (60Hz loop, seat join loading real `wallets` balance, background async DB writer channel for `UNIT_DEPLOY` / `KILL_PAYOUT` / `SESSION_FORFEIT`, forfeit-on-exit, asymmetric `WeightClass` shoving collisions with zero player-vs-player damage, projectile + asteroid cover blocking + Cryo cloud spawn/DoT, finite-ammo self-destruct, House harvester+escort wave spawner, and expended-unit Boss Meter + Jackpot `flagship` + `command_escort` spawn & escape timer).
- [x] **Step 4.5:** `backend/cmd/server/main.go` — Register `/ws/casino/space-pirates` room manager and verify `go build ./cmd/server`.

### Phase 5 — Space Pirates Frontend Client & Casino Hub (COMPLETE)
- [x] **Step 5.1:** `src/services/walletService.ts` & `src/components/system/LoginScreen.tsx` — Add self-registration flow and store authenticated `playerId`, `username`, `role`, and `balanceCents`.
- [x] **Step 5.2:** `src/hooks/useSpacePiratesSocket.ts` — Connect to `/ws/casino/space-pirates`, stream 60Hz binary snapshots into a canvas ref, and expose `joinSeat`, `leaveSeat`, `setMultiplier`, and `deployUnit` actions.
- [x] **Step 5.3:** `src/components/casino/spacePirates/SpacePiratesViewport.tsx` — Fixed-camera `2400 x 1600` canvas renderer with red/seat-color silhouette glows, drifting asteroid clusters & colored resource nodes, ammo pip bars, harvester cargo rings, Cryo clouds, and floating `+$X.XX` payout popups.
- [x] **Step 5.4:** `DeployControlDeck.tsx` & `TableSeatsHUD.tsx` — 1x–25x multiplier bar, 5-button instant-deploy dock with dynamic costs from `/api/casino/sp/config`, table-wide Boss Meter & escape banner, 4-corner seat cards, and Leave Table forfeit warning.
- [x] **Step 5.5:** `src/components/casino/CasinoLobby.tsx` — Wire up the Casino Hub linking Space Pirates tables, the Asteroid Cluster Designer, and the `house_admin` currency minting panel.
