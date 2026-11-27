# Space Pirates — Complete Game Mode Design & Architecture

**Genre:** Multiplayer Arcade Raid / Fish-Table Survival (Everyone vs. The House)  
**Engine:** Fleet's Mercy 60Hz Authoritative Go Server + PostgreSQL (Raspberry Pi 5) + React/Canvas/Tauri Client  
**WebSocket Route:** `/ws/casino/space-pirates?tableId=<id>`  
**Wire Protocol:** 100% Pure Binary FlatBuffers (`schemas/space_pirates.fbs`)

---

## 1. Core Concept & Table Rules

Up to **4 players** share a single fixed-screen space arena, deploying autonomous combat ships to raid a House mining operation while competing to land the killing blow on high-value harvesters and armed bosses.

* **Everyone vs. The House:** Players never deal weapon or collision damage to each other. Every player is an independent faction (`OwnerID = seatID`) for AI coordination and payout attribution, while targeting and damage check `IsHouse`.
* **Player-to-Player Shoving:** Heavier player ships physically shove lighter player ships out of the way (reusing `collisions.go`'s asymmetric `WeightClass` separation) with **zero collision damage** between players.
* **1-Click Base Deployment:** Players have no manual flight controls. Clicking a unit on the deploy bar immediately deducts `BaseCost * Multiplier` from their real wallet balance and spawns the ship at their corner base.
* **Finite Ammo Self-Destruct:** Every deployed player ship carries a fixed magazine (`MaxAmmo`). The instant it fires its final round (`CurrentAmmo <= 0`), it self-destructs. No repair or logistics units exist for players.
* **Bet Multiplier (`1x, 2x, 5x, 10x, 25x`):** Scales both deployment cost and kill payouts for any unit deployed while active. The multiplier is locked onto the unit at spawn and stamped onto every projectile it fires—meaning a unit's final shot still pays out at its multiplier even if the ship self-destructs mid-flight.
* **Last-Hit Attribution:** Whoever fires the killing projectile receives the full bounty multiplied by that projectile's `BetMultiplier`.
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
| **`flagship`** | **Jackpot Boss** | Armed Boss | Escape timer (45–60s) | $5.00 (flat) | — | $125.00 | Yes |

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
  * **3W `cryo_flak`:** Roams laying Cryo AoE payloads (light DoT + 40–50% slow) if Squad Leader; blankets the leader's target with Cryo clouds if Follower.
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

## 6. Folder Architecture

```text
fleets-mercy/
├── schemas/
│   ├── game_state.fbs                            # Existing Sandbox/TDM schema (untouched)
│   └── space_pirates.fbs                         # Dedicated pure-binary Space Pirates schema
│
├── backend/
│   ├── cmd/server/
│   │   └── main.go                               # Register auth, wallet, admin, cluster CRUD & /ws/casino/space-pirates
│   ├── migrations/
│   │   └── 001_casino_and_space_pirates.sql      # Full PostgreSQL DDL + seed data
│   └── internal/
│       ├── db/
│       │   ├── postgres.go                       # Existing DB connection
│       │   ├── wallet_repo.go                    # Atomic wallet debits/credits, ledger writes, house_admin minting
│       │   └── sp_repo.go                        # Load/save sp_rulesets, sp_unit_configs, sp_resources, sp_cluster_variants
│       ├── api/
│       │   ├── handlers.go                       # Existing handlers (upgrade login to bcrypt)
│       │   ├── auth_wallet_handlers.go           # Register, wallet balance/ledger, house_admin mint/revoke endpoints
│       │   └── sp_cluster_handlers.go            # GET/POST/DELETE /api/casino/sp/clusters
│       ├── generated/
│       │   └── SpacePirates/                     # flatc --go output
│       └── game/
│           └── spacePirates/                     # Self-contained Space Pirates server package
│               ├── sp_types.go                   # Runtime structs (Seat, Unit, Projectile, Cluster, CryoCloud, PayoutEvent)
│               ├── sp_world.go                   # Cluster Director, slot-based resource rolling, whole-cluster wrap, Cryo clouds
│               ├── sp_ai.go                      # Harvester loop, cutting-the-pie escorts, dynamic squads, LOS cover check
│               ├── sp_room.go                    # 60Hz tick loop, seat/wallet sync, forfeit-on-exit, shoving collisions, Boss
│               └── sp_codec.go                   # Pure FlatBuffers SPServerState encoder & SPClientAction decoder
│
└── src/
    ├── generated/
    │   └── space-pirates/                        # flatc --ts output
    ├── parsers/
    │   └── spacePiratesCodec.ts                  # Pure FlatBuffers TypeScript encoder/decoder
    ├── hooks/
    │   └── useSpacePiratesSocket.ts              # Binary WebSocket hook for 60fps canvas + seat HUD
    ├── services/
    │   ├── walletService.ts                      # Auth, self-register, wallet balance, admin mint API calls
    │   └── clusterService.ts                     # Asteroid cluster CRUD API calls
    └── components/
        └── casino/
            ├── CasinoLobby.tsx                   # Game selector, table browser, admin minting drawer
            ├── clusterEditor/
            │   ├── ClusterEditorViewport.tsx     # Local-space canvas, drag/resize rocks, cover vs. node slots, motion preview
            │   ├── ClusterInspectorPanel.tsx     # Speed, spin, scale, wrap budget, spawn weight, max concurrent
            │   └── ClusterLibrarySidebar.tsx     # Saved PostgreSQL variants list (duplicate, edit, toggle, delete)
            └── spacePirates/
                ├── SpacePiratesViewport.tsx      # Fixed-camera 2400x1600 canvas, glows, asteroids, cryo FX, payout popups
                ├── DeployControlDeck.tsx         # Live wallet balance, 1x–25x multiplier, 1W–5W dock, Boss Meter, Leave modal
                └── TableSeatsHUD.tsx             # 4-corner seat status cards (color, multiplier, active units)
```

---

## 7. Step-by-Step, File-by-File Development Roadmap

### Phase 1 — PostgreSQL Schema, Accounts & House-Issued Wallets
- [ ] **Step 1.1:** `backend/migrations/001_casino_and_space_pirates.sql` — Write and run the PostgreSQL migration creating `wallets`, `wallet_ledger`, `casino_tables`, `table_sessions`, `sp_rulesets`, `sp_unit_configs`, `sp_resources`, and `sp_cluster_variants`, extending `players` with `role`, and seeding initial Space Pirates rules, resources, and unit configs.
- [ ] **Step 1.2:** `backend/internal/db/wallet_repo.go` — Implement transactional wallet creation, optimistic/row-locked `AdjustBalance` + `wallet_ledger` logging, session tracking (`table_sessions`), and unlimited `house_admin` mint/revoke queries.
- [ ] **Step 1.3:** `backend/internal/db/sp_repo.go` — Implement PostgreSQL loaders and in-memory caches for `sp_rulesets`, `sp_unit_configs`, `sp_resources`, and CRUD operations for `sp_cluster_variants`.
- [ ] **Step 1.4:** `backend/internal/api/auth_wallet_handlers.go` & `backend/internal/api/handlers.go` — Add `POST /api/register` (self-registration with `$0.00` wallet), upgrade `LoginHandler` to bcrypt + return `role`, add `GET /api/wallet`, and add admin-gated `POST /api/admin/wallet/adjust`.

### Phase 2 — Pure FlatBuffers Schema & Codegen
- [ ] **Step 2.1:** `schemas/space_pirates.fbs` — Create the dedicated Space Pirates FlatBuffers schema (`SPServerState`, `SPClientAction`, `SPUnit`, `SPProjectile`, `SPAsteroidNode`, `SPCryoCloud`, `SPSeatState`, `SPPayoutEvent`).
- [ ] **Step 2.2:** `package.json` — Add `"gen:sp-fbs"` script and run `flatc` to generate `backend/internal/generated/SpacePirates/` and `src/generated/space-pirates/`.
- [ ] **Step 2.3:** `src/parsers/spacePiratesCodec.ts` — Build the TypeScript binary encoder (for `JoinSeat`, `LeaveSeat`, `SetMultiplier`, `DeployUnit`) and zero-overhead `SPServerState` decoder.

### Phase 3 — Asteroid Cluster Designer (Backend CRUD + Frontend Viewport)
- [ ] **Step 3.1:** `backend/internal/api/sp_cluster_handlers.go` & `backend/cmd/server/main.go` — Expose `GET`, `POST`, and `DELETE` endpoints on `/api/casino/sp/clusters` with automatic `bounding_radius` calculation and live server cache refresh.
- [ ] **Step 3.2:** `src/services/clusterService.ts` — Implement typed frontend fetch helpers for cluster CRUD.
- [ ] **Step 3.3:** `src/components/casino/clusterEditor/ClusterEditorViewport.tsx` — Build the interactive local-space canvas (click-to-place, drag, scroll-resize, cover vs. `Common`/`Mid`/`Rare` resource slot toggle, bounding radius ring, ship scale reference ghost, and live drift/spin preview).
- [ ] **Step 3.4:** `ClusterInspectorPanel.tsx` & `ClusterLibrarySidebar.tsx` — Build the right-hand motion/spawn property editor and left-hand saved variant browser.

### Phase 4 — Space Pirates Authoritative Go Engine
- [ ] **Step 4.1:** `backend/internal/game/spacePirates/sp_types.go` — Define runtime structs hydrated directly from `sp_repo.go` (zero hardcoded stats).
- [ ] **Step 4.2:** `backend/internal/game/spacePirates/sp_world.go` — Implement the Cluster Director (slot-based resource rolling, rigid-body drift/spin, whole-cluster edge wrapping & replacement), Cryo Flak AoE clouds (slow + DoT), and asteroid projectile-blocking ray/circle collisions.
- [ ] **Step 4.3:** `backend/internal/game/spacePirates/sp_ai.go` — Implement the 3-state Harvester loop with edge-wrap detach, "cutting the pie" House escorts (`viper_interceptor` & `command_escort`), per-seat dynamic squad splitting (including multi-5W division & target de-duplication), and asteroid line-of-sight firing checks.
- [ ] **Step 4.4:** `backend/internal/game/spacePirates/sp_codec.go` & `sp_room.go` — Build the 60Hz loop, real wallet-backed seat join/deploy/payouts (with async DB writer goroutine), forfeit-on-exit, shoving-only player collisions, finite-ammo self-destruct, and the expended-unit Boss Meter + Jackpot `flagship` escape timer.
- [ ] **Step 4.5:** `backend/cmd/server/main.go` — Wire `/ws/casino/space-pirates` into the Go HTTP server.

### Phase 5 — Space Pirates Frontend Client & Casino Hub
- [ ] **Step 5.1:** `src/services/walletService.ts` & `src/components/system/LoginScreen.tsx` — Add self-registration flow and store authenticated `playerId`, `username`, and `role`.
- [ ] **Step 5.2:** `src/hooks/useSpacePiratesSocket.ts` — Connect to `/ws/casino/space-pirates`, stream 60Hz binary snapshots into a canvas ref, and expose `joinSeat`, `leaveSeat`, `setMultiplier`, and `deployUnit` actions.
- [ ] **Step 5.3:** `src/components/casino/spacePirates/SpacePiratesViewport.tsx` — Build the fixed-camera `2400 x 1600` canvas renderer with red/seat-color silhouette glows, drifting asteroid clusters & colored resource nodes, ammo pip bars, harvester cargo rings, Cryo clouds, and floating `+$X.XX` payout popups.
- [ ] **Step 5.4:** `DeployControlDeck.tsx` & `TableSeatsHUD.tsx` — Build the 1x–25x multiplier bar, 5-button instant-deploy dock with dynamic costs, table-wide Boss Meter & escape banner, 4-corner seat cards, and the Leave Table forfeit warning.
- [ ] **Step 5.5:** `src/components/casino/CasinoLobby.tsx` — Wire up the Casino Hub linking Space Pirates tables, the Asteroid Cluster Designer, and your `house_admin` currency minting panel.