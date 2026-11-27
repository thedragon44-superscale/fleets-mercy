# Fleet's Mercy — Universal Map Object Builder & Environment Roadmap

**Scope:** Upgrade the Space Pirates Asteroid Cluster Designer into a data-driven **Environment Blueprint Studio** supporting all celestial bodies and tactical hazards, integrate full 60Hz environmental physics into **Space Pirates**, and lay the shared database/UI foundation for the **Universal Map Builder** across Sandbox, TDM, and Games #2–#10.  
**Engine:** 60Hz Authoritative Go Server + PostgreSQL (`spacetactics`) + Pure Binary FlatBuffers + React/Canvas/Tauri Client

---

## CLI Handoff Instructions (Start Here)

> **For the CLI Agent:** Follow all rules in root `GEMINI.md`:
> 1. **Discuss changes in depth** (design, edge cases, affected files) and wait for explicit confirmation before editing any file.
> 2. **Work one micro-step at a time** in the order listed in Section 5.
> 3. **Zero hardcoding / zero mock data:** Object sizes, physics radii, speed/spin envelopes, and spawn pools must live in PostgreSQL and load into thread-safe in-memory caches (`db.EnvCache`).
> 4. **Protect the 60Hz tick:** Never run synchronous DB queries inside the 16ms game loop. Use `bounding_radius` broad-phase culling before running per-component physics.
> 5. **Do not modify Sandbox or 20v20 TDM gameplay** during Phases 1–4.
> 6. Run safe local verification (`go build ./cmd/server`, `flatc`, `npx tsc --noEmit`) after edits and report the output clearly.

---

## 1. Locked-In Architectural & Design Decisions

* **Unified Composite Blueprints (`env_blueprints`):** Every map object (Worlds, Planetoids, Gas Giants, Nebulas, Singularity Rifts, Moons, Dense Belts, Asteroid Clusters, Comets) is built in local `(0, 0)` space using the same composable schema: **Geometry Components** + **Physics Profile** + **Motion Profile**.
* **Data-Driven, Proportional Sizing (Zero Hardcoded Radii):** No object type has a hardcoded size in Go or TypeScript. Each blueprint defines its own local-space radii and `scale_min` / `scale_max`, while per-mode spawn pools (`mode_env_pools`) and map placements (`map_env_placements`) support a `scale_override` so large objects (e.g., Gas Giants or Major Worlds) can be scaled proportionally to any canvas size.
* **Decoupled Consumption Model:**
  * **Dynamic Spawner Modes (Space Pirates & future arcade modes):** Pull weighted blueprints from `mode_env_pools` (handling drift, spin, whole-object wrapping, and replacement).
  * **Authored Map Modes (Sandbox, TDM, Universal Map Builder):** Place blueprints onto a persistent map canvas via `map_env_placements` (supporting static landmarks, drifting hazards, and parent-child orbital moons).
* **Space Pirates Targeting Lock-On & Stealth:** Units inside a **Deep Nebula Plasma Field** or **Gas Giant Deep Atmosphere** break AI targeting lock-on and become invisible to long-range targeting. Ships must close within **50% of their visual/weapon acquisition range** to spot and engage targets inside stealth zones.
* **Space Pirates Resource & Destructibility Scope:**
  * All resource nodes in Space Pirates remain **unlimited** (matching current cluster behavior).
  * **Destructibility is deferred:** Cave mouths on Major Worlds and veins on Planetoids will **not** collapse or exhaust in this update. Reserve the schema flags (`is_destructible`, `cave_mouth` component type) as inert metadata for a future dedicated Destructibility Update.

---

## 2. Environmental Archetypes & Physics Matrix

| ID | `object_type` | Composable Geometry | Physics & Field Behavior | Space Pirates Motion & Rules |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `major_world` | Solid core + `cave_mouth` sockets | Heavy gravity pull, solid pathing/LoS barrier, blocks projectiles, radar-transparent | Proportional scale; Metal/Ore nodes unlimited; cave mouths indestructible for now |
| **02** | `mineral_planetoid` | Solid core + surface crater nodes | Weak localized gravity well, solid barrier/LoS, blocks projectiles, radar-transparent | Slow drift + wrap; exposed Metal/Ore mining; indestructible |
| **03** | `gas_giant` | 3 concentric envelopes (`gas_core` 0–60%, `gas_deep` 60–85%, `gas_outer` 85–100%) | Core: instant kill. Deep: pulls 1W to core, slows & damages 2W+, **breaks AI lock-on**. Outer: safe skimming, minor drag on 2W+ | Proportional scale; volatile Plasma/Isotope skimming; AI avoids Core |
| **04** | `nebula_field` | Multi-blob soft cloud corridor | **Breaks AI lock-on** (50% visual range inside), inertial drag on 1W–3W (`plasma_skimmer` immune), 0 DoT, projectiles pass through | Drift + wrap; Plasma Gas & Isotope nodes |
| **05** | `singularity_rift` | Compact core + repulsion field ring | Pushes 1W–3W outward, resists 4W–5W (`grav_extractor` immune), **refracts projectiles** at predictable angles, radar-transparent | Drift + wrap; Graviton Core nodes |
| **06** | `moon` | Solid core (+/- resource nodes) | Solid barrier/LoS, blocks projectiles, radar-transparent | Can spawn standalone or **orbit a parent blueprint** (`major_world`, `gas_giant`, `mineral_planetoid`) |
| **07** | `asteroid_belt` | Multi-rock corridor cluster | Blocks projectiles/LoS, `max_passable_weight = 2` (1W/2W weave through, 3W+ must route around), non-mineable | Drift + wrap; pure tactical cover corridor |
| **08** | `asteroid_cluster` | Multi-rock cluster + resource slots | Blocks projectiles/LoS, unlimited slot-rolled resource nodes (existing Space Pirates behavior) | Migrated directly from `sp_cluster_variants` |
| **09** | `comet` | Compact 1W core + velocity vector | High-speed edge-to-edge transit; weight-scaled impact (1W/2W instant melt, 3W/4W heavy dmg, 5W shield absorb); broadcasts trajectory warning | Periodic transient pass; AI attempts lateral evasion |

---

## 3. PostgreSQL Database Design (`002_universal_env_blueprints.sql`)

1. **`env_blueprints` (Global Object Library):**
   * `blueprint_id` (`SERIAL PRIMARY KEY`), `name` (`UNIQUE`), `object_type`, `components` (`JSONB` array of local-space primitives: `{id, kind, dx, dy, radius, inner_radius, is_node, slot_tier, pinned_resource, color_hex}`), `orbiting_children` (`JSONB` array of `{child_blueprint_id, orbit_radius, orbit_speed, start_angle, scale}`), `physics_profile` (`JSONB`: gravity/repulsion, drag, `max_passable_weight`, `projectile_behavior`, `radar_opaque`, `visual_range_mult`, `immune_unit_classes`, `impact_profile`), `motion_profile` (`JSONB`: mode, `scale_min/max`, `speed_min/max`, `spin_rate`, `min/max_wraps`), `bounding_radius`, `is_enabled`, `created_at`, `updated_at`.
   * Migrates existing rows from `sp_cluster_variants` into `env_blueprints` with `object_type = 'asteroid_cluster'` so zero existing work is lost.
2. **`mode_env_pools` (Arcade / Dynamic Spawner Assignment):**
   * `pool_id`, `game_mode` (`'space_pirates'`), `ruleset_id`, `blueprint_id` (FK -> `env_blueprints`), `spawn_weight`, `max_concurrent`, `scale_override` (nullable float), `is_enabled`.
   * Controls exactly which blueprints appear in Space Pirates and at what proportional scale.
3. **`map_env_placements` (Universal Map Builder Persistence):**
   * `placement_id`, `map_id`, `blueprint_id` (FK -> `env_blueprints`), `pos_x`, `pos_y`, `scale`, `angle`, `vel_x`, `vel_y`, `parent_placement_id` (self-FK for orbital moons), `orbit_radius`, `orbit_speed`, `overrides` (`JSONB`).

---

## 4. Folder Architecture (`[EXISTING]` / `[UPGRADE]` / `[NEW]`)

```text
fleets-mercy/
├── schemas/
│   └── space_pirates.fbs                          # [UPGRADE] Generalize SPAsteroidNode -> SPEnvObject + SPEnvComponent
│
├── backend/
│   ├── migrations/
│   │   └── 002_universal_env_blueprints.sql       # [NEW] env_blueprints, mode_env_pools, map_env_placements + cluster migration
│   ├── cmd/server/
│   │   └── main.go                                # [UPGRADE] Register /api/env/* routes & load db.EnvCache on boot
│   └── internal/
│       ├── models/
│       │   └── env_structs.go                     # [NEW] Blueprint, Component, PhysicsProfile, MotionProfile, Pool, Placement
│       ├── db/
│       │   └── env_db.go                          # [NEW] Thread-safe db.EnvCache + CRUD for blueprints, pools, placements
│       ├── api/
│       │   └── env_handlers.go                    # [NEW] GET/POST/DELETE for blueprints, pools, and map placements
│       └── game/spacePirates/
│           ├── sp_types.go                        # [UPGRADE] Add ActiveEnvObject, EnvComponent, Stealth/Gravity fields
│           ├── sp_world.go                        # [UPGRADE] Universal Env Director (pools, orbits, wraps, Comets)
│           ├── sp_env_physics.go                  # [NEW] Gravity, Gas Giant layers, Nebula drag/stealth, Rift refraction, Belt filter, Comets
│           ├── sp_ai.go                           # [UPGRADE] Stealth lock-break (50% visual range), Comet evasion, Core avoidance, Belt routing
│           ├── sp_codec.go                        # [UPGRADE] Encode SPEnvObject / SPEnvComponent vectors
│           └── sp_room.go                         # [UPGRADE] Run sp_env_physics in 60Hz tick
│
└── src/
    ├── services/
    │   └── envService.ts                          # [NEW] Typed CRUD client for /api/env/* endpoints
    ├── parsers/
    │   └── spacePiratesCodec.ts                   # [UPGRADE] Decode SPEnvObject / SPEnvComponent frames
    └── components/
        ├── casino/
        │   ├── CasinoLobby.tsx                    # [UPGRADE] Link to Environment Blueprint Studio
        │   ├── envStudio/                         # [NEW] Replaces/evolves clusterEditor/
        │   │   ├── EnvStudioView.tsx              # Main 3-pane studio layout
        │   │   ├── EnvLibrarySidebar.tsx          # Filterable blueprint library by object_type
        │   │   ├── EnvCanvasEditor.tsx            # Archetype-aware local canvas, rings, blobs, moons, scale ghosts, Test Shot
        │   │   └── EnvInspectorPanel.tsx          # Physics, motion, proportional scale, and Space Pirates pool controls
        │   └── spacePirates/
        │       └── SpacePiratesViewport.tsx       # [UPGRADE] Render all 9 archetypes, stealth clouds, refraction FX, Comet warnings
        └── mapBuilder/
            └── UniversalMapBuilder.tsx            # [NEW] Phase 5 multi-mode arena placement canvas using env_blueprints
```

---

## 5. Step-by-Step, File-by-File Implementation Roadmap

### Phase 1 — Unified PostgreSQL Schema & Go Data Layer (COMPLETE)
- [x] **Step 1.1:** `backend/migrations/002_universal_env_blueprints.sql` — Write idempotent migration creating `env_blueprints`, `mode_env_pools`, and `map_env_placements`; migrate existing `sp_cluster_variants` into `env_blueprints` + `mode_env_pools`; seed 1 starter blueprint per new archetype (Planetoid, Nebula, Singularity Rift, Dense Belt, Moon, Comet, plus scaled Gas Giant & Major World templates disabled by default in Space Pirates until toggled in Studio).
- [x] **Step 1.2:** `backend/internal/models/env_structs.go` — Define Go structs with JSON tags for `EnvBlueprint`, `EnvComponentSpec`, `OrbitingChildSpec`, `EnvPhysicsProfile`, `EnvMotionProfile`, `ModeEnvPoolEntry`, and `MapEnvPlacement`.
- [x] **Step 1.3:** `backend/internal/db/env_db.go` — Implement `db.EnvCache` (`LoadEnvCache`), automatic `ComputeEnvBoundingRadius` (including orbiting moon envelopes), and full CRUD for `env_blueprints`, `mode_env_pools`, and `map_env_placements`.
- [x] **Step 1.4:** `backend/internal/api/env_handlers.go` & `backend/cmd/server/main.go` — Expose `/api/env/blueprints`, `/api/env/pools`, and `/api/env/placements` (refreshing `db.EnvCache` on every write), call `db.LoadEnvCache()` on server boot, and verify with `go build ./cmd/server`.

### Phase 2 — Environment Blueprint Studio (Frontend Object Builder) (COMPLETE)
- [x] **Step 2.1:** `src/services/envService.ts` — Implement typed TypeScript interfaces and fetch helpers for blueprints, Space Pirates spawn pools, and map placements.
- [x] **Step 2.2:** `src/components/casino/envStudio/EnvLibrarySidebar.tsx` — Build the left sidebar with archetype filter tabs (`All`, `Cluster`, `Belt`, `Nebula`, `Rift`, `Planetoid`, `World`, `Gas Giant`, `Moon`, `Comet`), "New Blueprint" archetype picker, duplicate, enable/disable, and delete controls.
- [x] **Step 2.3:** `src/components/casino/envStudio/EnvCanvasEditor.tsx` — Build the interactive local-space canvas:
  * *Clusters / Belts:* Click-to-place rocks, drag, scroll-resize, Cover vs. Resource Slot toggle, plus a **1W/2W Corridor Gap Overlay**.
  * *Gas Giants / Rifts / Worlds:* Interactive concentric ring handles (Core / Deep / Outer or Repulsion Radius) and clickable socket placement (crater nodes / cave mouths).
  * *Nebulas:* Multi-blob cloud painter.
  * *Moons:* "Attach Orbiting Moon" ring editor selecting any saved `moon` blueprint.
  * *Testing Tools:* Toggleable `1W` / `Mining Barge` / `5W` scale reference ghosts, **Live Motion Preview** (drift, spin, moon orbits), and a **"Test Shot" raycaster** to verify solid cover blocking and Singularity refraction angles live.
- [x] **Step 2.4:** `src/components/casino/envStudio/EnvInspectorPanel.tsx` — Build the right inspector for naming, motion profile (`static` / `drift_wrap` / `orbital` / `transient_transit`), speed/spin/wrap envelopes, proportional `scale_min`/`scale_max`, physics sliders (gravity, repulsion, drag, `max_passable_weight`, immunity checkboxes), and Space Pirates `mode_env_pools` toggle/weight/scale override.
- [x] **Step 2.5:** `src/components/casino/envStudio/EnvStudioView.tsx` & `src/components/casino/CasinoLobby.tsx` — Assemble the 3-pane studio and replace the old Cluster Designer button in `CasinoLobby.tsx` with **Environment Studio**. Verify with `npx tsc --noEmit`.

### Phase 3 — Pure FlatBuffers Upgrade & Space Pirates 60Hz Physics (COMPLETE)
- [x] **Step 3.1:** `schemas/space_pirates.fbs` — Add `EnvObjectType` and `EnvComponentKind` enums plus `SPEnvObject` and `SPEnvComponent` tables (keeping `SPAsteroidNode` or cleanly replacing it across codec/viewport); run `flatc` for both Go and TypeScript.
- [x] **Step 3.2:** `backend/internal/game/spacePirates/sp_types.go` & `sp_world.go` — Upgrade the Cluster Director into the **Universal Env Director**: read active pool entries from `db.EnvCache`, apply `scale_override` and slot-based resource rolling, update rigid-body drift/spin + orbiting moon world positions, handle whole-object edge wrapping & replacement, and manage periodic edge-to-edge **Comet** spawns.
- [x] **Step 3.3:** `backend/internal/game/spacePirates/sp_env_physics.go` — Implement broad-phase-culled 60Hz environmental physics:
  * **Gravity Wells & Repulsion Fields:** Apply acceleration vectors to ships (respecting `immune_unit_classes` like `grav_extractor`).
  * **Gas Giant 3-Layer Zones:** Instant kill in Core; pull 1W + slow/DoT 2W+ in Deep Atmosphere; minor drag on 2W+ in Outer Atmosphere.
  * **Nebula Fields:** Inertial drag on 1W–3W (`plasma_skimmer` immune), zero DoT.
  * **Singularity Refraction:** Predictably bend projectile velocity vectors passing through a Rift's refraction field instead of destroying them.
  * **Dense Asteroid Belts:** Enforce `max_passable_weight` (1W/2W pass through, 3W+ pushed outside).
  * **Comet Impacts:** Weight-scaled collision damage (1W/2W instant melt, 3W/4W heavy dmg, 5W shield absorb).
  * **Stealth Helper (`IsUnitStealthed`):** Returns true if a unit is inside any `radar_opaque` zone (Nebula or Gas Giant Deep Atmosphere).
- [x] **Step 3.4:** `backend/internal/game/spacePirates/sp_ai.go`, `sp_codec.go`, & `sp_room.go`:
  * **Targeting Lock-On Break:** Player and House AI drop target locks on stealthed units unless within **50% of acquisition/weapon range**.
  * **Hazard Awareness:** Automated ships steer laterally to evade approaching Comets, refuse to path through Gas Giant Deep/Core zones, and route around Dense Belts if `WeightClass > max_passable_weight`.
  * Wire `sp_env_physics.go` into `sp_room.go`'s 60Hz tick, encode `SPEnvObject`/`SPEnvComponent` in `sp_codec.go`, and verify `go build ./cmd/server`.

### Phase 4 — Space Pirates Frontend Rendering Upgrade (COMPLETE)
- [x] **Step 4.1:** `src/parsers/spacePiratesCodec.ts` & `src/hooks/useSpacePiratesSocket.ts` — Decode the new `SPEnvObject` and `SPEnvComponent` vectors into the 60fps canvas ref.
- [x] **Step 4.2:** `src/components/casino/spacePirates/SpacePiratesViewport.tsx` — Render all environmental archetypes cleanly at 60fps: layered Gas Giant rings, translucent Nebula plasma corridors (with subtle visual dimming on units inside), pulsing Singularity Rifts with refraction ripples, solid Worlds/Planetoids/Moons with orbital paths, Dense Asteroid Belts, and high-speed Comets with dashed full-arena radar trajectory warning lines.

### Phase 5 — Universal Map Builder Promotion (All Game Modes) (COMPLETE)
- [x] **Step 5.1:** `src/components/mapBuilder/UniversalMapBuilder.tsx` — Build the full-arena placement canvas that consumes `env_blueprints` and saves layouts to `map_env_placements`, allowing you to drag-and-drop any custom celestial body, link orbiting moons, set drift/static modes, and export maps for Sandbox, TDM, and Games #2–#10.