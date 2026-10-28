# Space Tactics Sandbox - Master Architectural Upgrade Roadmap

## Phase 1: AI Behavior Formalization & State Machine Refactoring
* **Goal:** Standardize conceptual AI states into a robust, database-backed, and UI-configurable state machine with multi-unit synergies and decoupled processing loops.
* **Target Behaviors & Doctrines:**
  * `GUARD`: Anchoring and defending local sector assets or battalion command anchors.
  * `SEEK`: Aggressive tracking, closing distance, and engaging visible targets.
  * `COMMAND_RELAY`: Capital ship logistics, regional sensor relay, and field repairs.
  * `BODYGUARD`: Escort protocols tethered to protecting command ships.
  * `RETREAT`: Autonomous fallback behavior triggered upon shield/hull failure or casualty thresholds.
  * **Class Synergies:** Iron Anvil (Aegis Wall + Lancer Railgun), Ghost Strike (Specter Jammer + Phantom + Vipers), Freezing Disablement (Ion Disabler + Cryo-Flak + Torpedo Bomber), Sustained Logistics Core, and Industrial Escort Convoy.
* **Performance & Loop Decoupling:**
  * **Physics & Collision Loop ($60\text{ Hz}$):** High-frequency spatial updates and motion interpolation.
  * **AI Target & FSM Evaluation Loop ($10\text{ Hz}$):** Decoupled decision-making for target selection, vector shifts, and state transitions.
  * **Macro-Logistics & Command Loop ($2\text{ Hz}$):** Low-frequency evaluations for resource transfers, repair queue assignments, and sector-wide command auras.
* **Implementation Steps:**
  * Formalize state machine execution in `ai_behaviors.go` via clean switch statements.
  * Map states directly to PostgreSQL `unit_templates.ai_default_state`.

---

## Phase 2: PostgreSQL Database & Go Struct (`models.FleetUnit`) Updates
* **Goal:** Ensure all live runtime attributes, quadrant health data, functional handicaps, and template parameters persist correctly and sync across restarts.
* **Database Updates (`unit_templates` & `fleet_units` tables):**
  * Add/verify columns for advanced telemetry (`sensor_range`, `aggro_range`, `optimal_range`, `max_range`, `vision_range`).
  * Add `QuadrantHealth` schema and boolean flags for capital ship functional handicaps (`is_cannons_disabled`, `is_thrusters_compromised`, `is_repairs_offline`, `is_deployment_offline`).
  * Ensure template override handlers in Go execute explicit SQL `UPDATE` queries so HTTP polling (`/api/templates`) matches memory state.
* **Go Struct Updates (`structs.go`):**
  * Ensure `FleetUnit` and `UnitTemplate` models mirror all expanded telemetry, quadrant health pools (for capital units), and unified health pools (for regular units).
  * Implement in-memory ring buffers and asynchronous batch persistence to prevent disk I/O saturation during massive battles.

---

## Phase 3: FlatBuffers Schema & Binary Pipeline Expansion (`game_state.fbs`)
* **Goal:** Eliminate HTTP polling workarounds by streaming all key telemetry, dirty flags, and quadrant states natively through the 60 FPS downstream binary WebSocket pipeline.
* **Schema Additions (`FleetUnit` table):**
  * `sensor_range` (double): Real-time minimap bubble rendering.
  * `vel` (Vector2D): Client-side extrapolation and exhaust effects.
  * `turn_rate` (double) & `speed` (double): Maneuverability metrics.
  * `current_thermal` / `max_thermal_capacity` (double): Heat management.
  * `current_ammo` / `max_ammo_capacity` (int): Ammunition tracking.
  * `dps` (double): Output damage metrics.
  * `stealth_active` (bool) & `radar_immunity_active` (bool): Cloaking states.
  * `ai_state` (string): Active FSM state broadcasting.
  * `resource_cache` / `max_resource_capacity` (double): Logistics/mining state.
  * `is_battalion_commander` (bool) & `buddy_id` (string): Hierarchy and tether links.
  * **Quadrant Health Array:** `quadrant_shields` [Front, Rear, Left, Right] & `quadrant_hull` [Front, Rear, Left, Right].
  * **Handicap Flags:** `is_cannons_disabled` (bool), `is_thrusters_compromised` (bool), `is_repairs_offline` (bool), `is_deployment_offline` (bool).
* **Codec & Pipeline Updates:**
  * Implement delta-compression and dirty-flag checks so unchanged fields are omitted from binary frames.
  * Update `room.go` packer to serialize new fields and quadrant flags.
  * Update `binaryCodec.ts` unpacker to populate frontend `SnapshotUnit` structs.

---

## Phase 4: Live Tactical Event Log Architecture (`EventLogEntry`) & Reactive Event Bus
* **Goal:** Stream typed simulation events downstream per tick to power tactical HUD feeds and drive dynamic FSM state transitions across surrounding units.
* **Event Types (`EventType` enum):**
  * `UnitDestroyed`: Lethal hull breaches with killer/victim metadata.
  * `ShieldCollapse`: Quadrant failure notifications (triggers opportunity fire for snipers/bombers).
  * `UnitKilledUnit`: Combat attribution and kill credits.
  * `CriticalHit`: Subsystem and component damage alerts (front/rear/port/starboard handicaps).
  * `ResourceDiscovered`: Recon probe anomaly detections (triggers auto-routing for harvesters).
  * `EnemyContact`: Initial sector hostile entry alerts.
  * `StealthBroken`: Cloaked unit action flags (triggers hunt protocols).
  * `DockingComplete`: Hangar bay transaction confirmations.
  * `ResourceHarvested`: Cargo extraction milestones.
  * `ReinforcementsArrived`: Squad deployment confirmations.
  * `TacticalRetreat`: Autonomous fallback triggers.
  * `LeadershipTransfer`: Squad leader casualty promotions or rout cascades.
* **Payload Integration:**
  * Add `events: [EventLogEntry]` vector to `ServerState` in `game_state.fbs`.
  * Pack and broadcast event queues per server tick.

---

## Phase 5: Frontend UI Components & Loadout Garage Integration
* **Goal:** Build and update React components to consume the expanded binary stream, visualize quadrant handicaps, and allow pre-battle FSM loadout customization.
* **Key Components:**
  * **Loadout Garage FSM Configurator:** Pre-battle configuration suite where players select commander traits, squad formations (Wedge, Line Abreast, Echelon, Box Guard), squad leader doctrines, and fallback morale thresholds.
  * **Capital Quadrant Diagnostics Overlay:** Visual HUD element displaying 4-quadrant shield/hull status and active handicap flags (Cannons Offline, Thrusters Compromised, Repairs Offline, Deployment Offline).
  * **Dynamic Radar Viewport:** Consume live `sensor_range` from binary packets to render responsive minimap detection bubbles without HTTP lag.
  * **Tactical Event Feed Panel:** Slide-out terminal component rendering real-time typed events with click-to-pan camera centering (`cameraPos.current`).
  * **Unit Configuration Studio Expansion:** Add UI controls for advanced AI state routing and extended telemetry attributes.

---

## Phase 6: Environmental Hazards & Spatial Terrain (Deferred)
* **Goal:** Integrate celestial structures, nebulae line-of-sight masking, gravity wells, and procedural spatial obstacles once core FSM and payload updates are fully stabilized.
* **Target Features:**
  * Line-of-sight masking behind asteroids and spatial nebulae (`NEBULA_OCCULTATION_AMBUSH`).
  * Orbital assists around gravity wells during retreat/flank vectors (`GRAVITATIONAL_SLINGSHOT_VECTOR`).
  * Permanent structural bolting via Recon Drone anchors (`LANDMARK_BOLT_ANCHOR`).
