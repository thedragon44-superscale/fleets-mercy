# Universal Map Builder Consolidation & Engine Unification Roadmap

> **CLI HANDOFF INSTRUCTIONS**
> - Follow `GEMINI.md` strictly: discuss each micro-step in depth before editing, run safe local checks (`go build ./cmd/server`, `flatc`, `npx tsc --noEmit`) with clear narration, and never run `git push`, SSH, or destructive prod SQL.
> - **Goal:** Completely remove the legacy "Standard Game" mode and legacy "Map Creator Studio" from the codebase, merge the Environment Blueprint Studio into the Universal Map Builder, add a lightweight customizable Spawn Pool Manager to the Casino Lobby, and unify Sandbox + TDM + Space Pirates onto the same PostgreSQL `env_blueprints` / `map_env_placements` + shared physics + shared canvas renderer pipeline.

---

## Locked-In Architectural Decisions

1. **Full Shared Environmental Physics Everywhere:** Extract environmental physics (gravity wells, Gas Giant 3-layer zones, Nebula drag/stealth, Singularity repulsion/projectile refraction, Asteroid Belt weight filtering, Orbital Moons, and Comets) into a shared Go package (`backend/internal/game/envphysics/`) used by Space Pirates, Unit Testing Sandbox, and Team Deathmatch.
2. **Universal Map Builder (2-Tab Studio):** All object authoring (`env_blueprints`) and full-map authoring (`maps` + `map_env_placements`) happen in one unified studio:
   - **Tab 1 — Object Blueprints:** Full Environment Blueprint Studio (formerly inside Space Pirates) for creating/editing/testing individual celestial objects.
   - **Tab 2 — Map Composer:** Full-arena map builder for placing saved blueprints onto maps, setting arena dimensions, orbital parents, and static/drifting trajectories.
3. **Lightweight Spawn Pool in Casino Lobby:** Space Pirates' lobby retains a focused **Spawn Pool Manager** backed by `sp_env_pool`. Admins/players can add **as many** saved `env_blueprints` to the pool as desired and configure per-entry **speed (`speed_min`, `speed_max`)**, **wrap count (`min_wraps`, `max_wraps`)**, **`spawn_weight`**, **`max_concurrent`**, and optional **`scale_override`**.
4. **Hard Removal of Dead Paths:**
   - **Standard Game:** Completely stripped from both frontend (buttons, routes, views) and backend (`isSandbox == false` branches in `main.go` and `room.go`). `game.GameRoom` becomes purely the Unit Testing Sandbox engine.
   - **Legacy Map Creator Studio:** Completely deleted from frontend components, routes, and unused backend legacy obstacle handlers.
5. **Pre-Launch Map Picker (TDM & Sandbox):** Both Team Deathmatch and Unit Testing Sandbox require picking a saved map from the Universal Map Builder (`GET /api/maps`) before connecting to their WebSocket rooms.

---

## Phase 1 — Database Schema & API Unification

- [x] **Step 1.1: `backend/migrations/003_universal_maps_and_sp_pool.sql`**
  - Write an idempotent PostgreSQL migration ensuring:
    - `sp_env_pool` has explicit per-entry override columns: `speed_min`, `speed_max`, `min_wraps`, `max_wraps`, `scale_override`, `spawn_weight`, `max_concurrent`, `is_enabled` (allowing any number of `env_blueprints` to be added to a ruleset pool with custom drift speed and wrap counts).
    - `maps` carries clean universal metadata (`width`, `height`, `description`, `updated_at`) linked via foreign key to `map_env_placements` (`ON DELETE CASCADE`).
    - Zero starter maps seeded (maps are 100% data-driven; user creates maps in Universal Map Builder).
- [x] **Step 1.2: `backend/internal/db/` & `backend/internal/api/` (Unified Maps & Pool CRUD)**
  - Audit and update map DB queries so `GET /api/maps` returns all Universal Map Builder maps with dimensions and placement counts, `GET /api/map-detail?id=<id>` returns full map metadata + hydrated `map_env_placements` joined with `env_blueprints`, and `POST/DELETE /api/maps` save/delete layouts atomically.
  - Ensure `GET/POST/DELETE /api/casino/sp/pool` supports adding/updating/removing unlimited `env_blueprints` entries with per-entry `speed_min`, `speed_max`, `min_wraps`, `max_wraps`, `spawn_weight`, `max_concurrent`, and `scale_override`, refreshing `db.SPCache` / `db.EnvCache` immediately on write.
  - Remove any dead legacy Map Creator Studio handlers that are no longer referenced.

---

## Phase 2 — Strip Standard Game & Extract Shared Physics Engine

- [x] **Step 2.1: Strip Standard Game from Backend (`backend/cmd/server/main.go` & `backend/internal/game/room.go`)**
  - Remove `isSandbox` branching and non-sandbox match logic from `room.go` and `main.go` so `/ws?mapId=<id>` runs strictly as the Unit Testing Sandbox engine.
  - Remove any unused Standard Game helper functions, structs, or room-key prefixes.
- [x] **Step 2.2: Extract Shared Physics Package (`backend/internal/game/envphysics/`)**
  - Move the universal environment runtime structs, cluster/object motion stepper (static, drift+wrap, orbital, comet transit), broadphase collision checks, solid rock/world collision & LoS raycasting, gravity/repulsion fields, Gas Giant 3-layer zones, Nebula drag & radar/stealth lock-break, Singularity projectile refraction, Dense Asteroid Belt weight filtering, and Comet impact scaling into `backend/internal/game/envphysics/`.
  - Refactor `backend/internal/game/spacePirates/` to consume `envphysics` (respecting Space Pirates' `sp_env_pool` speed/wrap overrides and unlimited nodes) and verify `go build ./cmd/server` passes.
- [x] **Step 2.3: Wire `envphysics` into Sandbox (`game/room.go`) & TDM (`teamDeathMatch/`)**
  - Hydrate `envphysics.World` from PostgreSQL `map_env_placements` + `env_blueprints` on room startup for both Sandbox (`NewGameRoom(mapID)`) and TDM (`NewTDMRoom(mapID, ...)`).
  - Step `envphysics` inside both 60Hz loops (movement forces, solid collisions, LoS, projectile blocking/refraction, stealth/radar blindness, Gas Giant damage, and Comet impacts).

---

## Phase 3 — FlatBuffers Upgrade (`schemas/game_state.fbs`)

- [x] **Step 3.1: Extend `schemas/game_state.fbs` for Universal Environment Objects**
  - Add compact `EnvObject` and `EnvComponent` tables (mirroring Space Pirates' binary layout: `id`, `blueprint_id`, `object_type`, `pos`, `vel`, `angle`, `scale`, `bounding_radius`, `flags`, and active sub-components) to `GameState`.
  - Remove any obsolete legacy static obstacle tables if superseded.
  - Run `flatc` for both Go (`backend/internal/generated`) and TypeScript (`src/generated`).
- [x] **Step 3.2: Wire Encoders & Decoders**
  - Update Sandbox (`game/room.go`) and TDM (`teamDeathMatch/`) FlatBuffers encoders to serialize live `envphysics` objects each tick.
  - Update the frontend `game_state` FlatBuffers parser (`src/parsers/`) to decode the new `EnvObject` array cleanly.

---

## Phase 4 — Shared Renderer & Unified Universal Map Builder (Frontend)

- [x] **Step 4.1: Extract Shared Canvas Renderer (`src/utils/envRenderer.ts`)**
  - Consolidate all celestial object canvas drawing (solid cores, surface craters/cave mouths, concentric Gas Giant rings, Nebula clouds, Singularity rings, Asteroid Belts/Clusters, Orbiting Moons, Comet tails + trajectory warnings) into one shared module.
  - Wire `envRenderer.ts` into Space Pirates, Sandbox, TDM, and the Universal Map Builder so visuals are 100% identical across every mode.
- [x] **Step 4.2: Merge Environment Blueprint Studio into Universal Map Builder**
  - Refactor the Universal Map Builder into a 2-tab workspace:
    - **Object Blueprints Tab:** Houses the full Environment Blueprint Studio (local-space canvas, archetype tools, test-shot preview, live motion preview, PostgreSQL blueprint library).
    - **Map Composer Tab:** Full-arena placement canvas consuming the live `env_blueprints` library, saving to `maps` + `map_env_placements`.
  - **Delete Legacy Map Creator Studio:** Remove all old Map Creator Studio files, imports, and routes.
- [x] **Step 4.3: Lightweight Spawn Pool Manager in Casino Lobby**
  - Remove the full Blueprint Studio route/embed from Space Pirates' lobby (optional quick-link button to open Universal Map Builder).
  - Build a compact **Spawn Pool Manager** drawer/panel inside the Casino Lobby:
    - Pick any saved blueprint from `env_blueprints` and add it to the active `sp_env_pool` (unlimited entries).
    - Inline controls per pool entry for **Speed Min / Max**, **Min / Max Wraps**, **Spawn Weight**, **Max Concurrent**, **Scale Override**, **Toggle Enabled**, and **Remove**.

---

## Phase 5 — Menu Cleanup & Pre-Launch Map Picker (TDM + Sandbox)

- [x] **Step 5.1: Remove "Launch Standard Game" from App Shell & Main Menu**
  - Delete the "Launch Standard Game" button, view states, and any dead Standard Game components/hooks.
  - Clean top-level navigation to: **Team Deathmatch**, **Unit Testing Sandbox**, **Casino / Space Pirates**, and **Universal Map Builder**.
- [x] **Step 5.2: Shared Pre-Launch Map Picker (`src/components/common/MapPickerModal.tsx`)**
  - Fetch saved Universal Map Builder maps via `GET /api/maps` (displaying map name, arena size, and object count).
  - **Unit Testing Sandbox:** Selecting Sandbox opens the Map Picker → launches Sandbox on `/ws?mapId=<selectedId>` using the existing loading screen until the first binary frame arrives.
  - **Team Deathmatch:** Integrate the Map Picker into TDM's pre-match setup (alongside piloted unit & pool selection) → launches TDM on `/ws/tdm?mapId=<selectedId>&...`.
- [x] **Step 5.3: Final Verification Pass**
  - Run `cd backend && go build ./cmd/server`, `go vet ./...`, `npx tsc --noEmit`, and `npm run build` / Vite build check.
  - Verify zero remaining references to Standard Game or legacy Map Creator Studio.
