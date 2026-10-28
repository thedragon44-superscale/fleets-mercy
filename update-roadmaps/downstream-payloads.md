# Space Tactics - Downstream Telemetry & Live Event Catalog

## 1. Downstream FleetUnit Telemetry Extensions (Expanded Schema)
The following properties are targeted for addition to the downstream `FleetUnit` binary FlatBuffers table to enable real-time UI synchronization and eliminate HTTP polling overhead:

* **Sensor & Radar Systems:**
  * `sensor_range` (double): Live sensor bubble radius for client-side minimap rendering[cite: 9].
  * `aggro_range` (double): Threat detection and engagement range boundaries[cite: 9].
* **Physics & Motion Dynamics:**
  * `vel` (Vector2D): Linear velocity vector for local extrapolation, drift, and exhaust particle effects[cite: 9].
  * `turn_rate` (double): Angular maneuverability metrics[cite: 9].
  * `speed` (double): Current authoritative movement speed[cite: 9].
* **Combat, Thermal & Ammo Systems:**
  * `current_thermal` (double): Active heat accumulation from sustained fire[cite: 9].
  * `max_thermal_capacity` (double): Maximum thermal threshold before overheating[cite: 9].
  * `current_ammo` (int): Remaining ammunition in current magazine/loadout[cite: 9].
  * `max_ammo_capacity` (int): Maximum ammunition storage capacity[cite: 9].
  * `dps` (double): Output damage per second rating for inspectors/HUD[cite: 9].
* **Stealth & Tactical States:**
  * `stealth_active` (bool): Active camouflage and cloaking status[cite: 9].
  * `radar_immunity_active` (bool): Electronic countermeasures flag[cite: 9].
  * `ai_state` (string): Running AI finite-state machine label (`GUARD`, `SEEK`, `RETREAT`)[cite: 9].
* **Logistics & Resource Management:**
  * `resource_cache` (double): Current held cargo or harvested materials[cite: 9].
  * `max_resource_capacity` (double): Maximum cargo hold volume[cite: 9].
* **Hierarchy & Fleet Management:**
  * `is_battalion_commander` (bool): Capital command ship classification flag[cite: 9].
  * `buddy_id` (string): Wingman or tactical tether linkage identifier[cite: 9].

---

## 2. Live Tactical Event Stream (`EventLogEntry`)
Structured event types broadcasted downstream per tick/frame to drive the UI event feed, audio cues, and click-to-pan camera features:

* **Combat & Destruction Telemetry:**
  * `UnitDestroyed`: Triggers when a unit's hull is breached and destroyed (includes killer ID, victim ID, and last known spatial coordinates).
  * `ShieldCollapse`: Triggers when specific quadrant shields fail (`front`, `rear`, `port`, `starboard`).
  * `UnitKilledUnit`: Attribution event tracking explicit combat credits between units.
  * `CriticalHit`: Subsystem failure or heavy component damage notifications.
* **Sensor, Recon & Discovery Telemetry:**
  * `ResourceDiscovered`: Triggers when a recon probe or scanner detects an uncharted gas giant or resource node.
  * `EnemyContact`: Initial sector entry alerts for hostile signatures.
  * `StealthBroken`: Triggered when a cloaked unit fires weapons or takes unmasked actions.
* **Logistics, Docking & Resource Telemetry:**
  * `DockingComplete`: Hangar bay transactions and secure docking state notifications.
  * `ResourceHarvested`: Cargo extraction milestones by mining barges or extractors.
  * `ReinforcementsArrived`: Squad deployment and hangar launch confirmations.
* **AI & Tactical State Transitions:**
  * `TacticalRetreat`: Triggered when squad health/shields drop below threshold and units execute fallback maneuvers.
  * `LeadershipTransfer`: Promotion notification when a squad leader is lost and another unit assumes command.
