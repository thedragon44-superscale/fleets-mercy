# Space Tactics - Exhaustive Downstream Event Log & Reactive Message Catalog

Mapping out the complete taxonomy of downstream event messages *before* touching the database or FlatBuffers schema ensures our reactive event bus, WebSocket serialization pipeline, and frontend HUD feeds have a unified contract. Every event below carries both a structured data payload (for programmatic FSM triggers) and a formatted string template (for the live tactical log terminal).

---

## 1. Combat, Damage & Subsystem Disablement Events
*Events driven by weapon impacts, shield collapses, and capital quadrant degradations.*

* **`SHIELD_COLLAPSE`**
  * *Data Payload:* `{ event_type, target_id, quadrant_index (0=Front, 1=Rear, 2=Left, 3=Right), timestamp }`
  * *Log String Template:* `[SHIELD_COLLAPSE] Quadrant {Quadrant} shields offline on {UnitName} ({UnitID}).`
  * *Reactive Trigger:* Forces snipers and torpedo bombers to execute `OPPORTUNITY_FIRE` and directs nearby guards into `BODYGUARD` mode.
* **`CRITICAL_HIT_SUBSYSTEM`**
  * *Data Payload:* `{ event_type, target_id, affected_quadrant, handicap_type (Cannons, Thrusters, Repairs, Deployment), damage_amount, timestamp }`
  * *Log String Template:* `[CRITICAL_HIT] Severe hull breach on {UnitName} [{Quadrant}]! Subsystem disabled: {HandicapType}.`
  * *Reactive Trigger:* Triggers capital disablement states (e.g., stops production or port repairs) and forces escort rerouting.
* **`UNIT_DESTROYED`**
  * *Data Payload:* `{ event_type, victim_id, killer_id, victim_class, battalion_id, timestamp }`
  * *Log String Template:* `[UNIT_DESTROYED] {VictimClass} {VictimName} vaporized by {KillerName} in Sector {Sector}.`
  * *Reactive Trigger:* Evaluates squad casualty rates and checks for squad leader status.
* **`WEAPON_OVERRIDE_TRIGGERED`**
  * *Data Payload:* `{ event_type, squad_id, synergy_type, target_id, timestamp }`
  * *Log String Template:* `[TACTICAL_SYNERGY] {SynergyName} engaged by Squad {SquadID} against target {TargetID}.`
  * *Reactive Trigger:* Bypasses standard anti-shield sizing rules for synchronized torpedo or railgun strikes.

---

## 2. Command, Leadership & Morale Events
*Events governing squad cohesion, command anchors, and psychological routing.*

* **`LEADERSHIP_TRANSFER`**
  * *Data Payload:* `{ event_type, squad_id, fallen_leader_id, new_leader_id, timestamp }`
  * *Log String Template:* `[LEADERSHIP_TRANSFER] Squad Leader {FallenName} lost. Unit {NewLeaderName} assumed field command.`
  * *Reactive Trigger:* Updates squad offset geometry and re-anchors subordinate movement vectors to the new leader.
* **`COMMAND_DISRUPTION`**
  * *Data Payload:* `{ event_type, battalion_id, command_ship_id, timestamp }`
  * *Log String Template:* `[COMMAND_DISRUPTION] Battalion {BattalionID} command anchor {ShipName} destroyed. Subordinate units shifting to autonomous fallback.`
  * *Reactive Trigger:* Forces unanchored squads into autonomous `RETREAT` or berserk `SEEK` loops.
* **`TACTICAL_ROUT_TRIGGER`**
  * *Data Payload:* `{ event_type, squad_id, current_casualty_percentage, timestamp }`
  * *Log String Template:* `[ROUT_TRIGGER] Squad {SquadID} sustaining heavy attrition ({Percentage}%). Executing panic retreat vector.`
  * *Reactive Trigger:* Overrides all active offensive FSM states, forcing an immediate sprint back toward port.
* **`COMMAND_AURA_SHIFT`**
  * *Data Payload:* `{ event_type, flagship_id, active_doctrine (AggressiveBlitz, FortressStance, ScorchedEarth), timestamp }`
  * *Log String Template:* `[COMMAND_AURA] Flagship {FlagshipName} broadcasting doctrine: {ActiveDoctrine}.`
  * *Reactive Trigger:* Globally biases AI weights for all subordinate squads in the regional zone.

---

## 3. Logistics, Supply & Industrial Events
*Events tracking resource discovery, extraction, manufacturing, and field triage.*

* **`RESOURCE_DISCOVERED`**
  * *Data Payload:* `{ event_type, probe_id, coordinate_x, coordinate_y, resource_type, timestamp }`
  * *Log String Template:* `[RECON_ANOMALY] Recon Probe {ProbeID} logged new {ResourceType} Node at [{X}, {Y}].`
  * *Reactive Trigger:* Automatically routes idle Mining Barges and Plasma Skimmers to the new coordinates.
* **`RESUPPLY_INTERVENTION`**
  * *Data Payload:* `{ event_type, tender_id, target_unit_id, resource_transferred, timestamp }`
  * *Log String Template:* `[RESUPPLY] Supply Tender {TenderID} dispatching emergency ordnance delivery to {TargetName}.`
  * *Reactive Trigger:* Clears ammunition/cache depletion flags on the recipient combat unit.
* **`REPAIR_QUEUE_SATURATION`**
  * *Data Payload:* `{ event_type, corvette_id, active_repair_count, timestamp }`
  * *Log String Template:* `[LOGISTICS_WARNING] Aegis Repair Corvette {CorvetteID} triage queue saturated ({Count} units). Requesting secondary support.`
  * *Reactive Trigger:* Broadcasts distress ping to nearby Supply Tenders or Command Ships.
* **`EMERGENCY_CARGO_JETTISON`**
  * *Data Payload:* `{ event_type, harvester_id, dropped_cargo_amount, timestamp }`
  * *Log String Template:* `[EMERGENCY_DROP] Mining Barge {HarvesterID} jettisoned {Amount} raw ore to maximize escape velocity.`
  * *Reactive Trigger:* Spikes harvester speed rating (`Rank D Acceleration`) to flee incoming raiders.

---

## 4. Stealth, Recon & Electronic Warfare Events
*Events managing radar visibility, cloaking states, and electronic countermeasures.*

* **`STEALTH_BROKEN`**
  * *Data Payload:* `{ event_type, unit_id, compromise_reason (ProximityScan, WeaponDischarge, PulseCharge), timestamp }`
  * *Log String Template:* `[STEALTH_COMPROMISE] Cloak signature failed on {UnitName} due to {Reason}.`
  * *Reactive Trigger:* Triggers `HUNT_PROTOCOL` in nearby patrol units and anti-stealth platforms, converging on the breach coordinates.
* **`JAMMING_FIELD_TOGGLED`**
  * *Data Payload:* `{ event_type, jammer_id, status (Active, ShieldCompromised), timestamp }`
  * *Log String Template:* `[EW_STATUS] Specter Jammer {JammerID} masking field status: {Status}.`
  * *Reactive Trigger:* Controls squad-wide radar immunity and target acquisition delays for opposing factions.
* **`PROXIMITY_ALERT`**
  * *Data Payload:* `{ event_type, probe_id, hostile_id, distance, timestamp }`
  * *Log String Template:* `[RADAR_CONTACT] Recon Probe {ProbeID} detected hostile {HostileName} at {Distance}m.`
  * *Reactive Trigger:* Forces fragile units to execute `EVASION_PROXIMITY_FLEET` orbital maneuvers.

---

## 5. Warp, Movement & Spatial Events
*Events governing quantum transit, wormholes, and spatial mechanics.*

* **`QUANTUM_TOW_INITIATED`**
  * *Data Payload:* `{ event_type, warp_frigate_id, target_anchor_id, units_linked_count, timestamp }`
  * *Log String Template:* `[QUANTUM_WARP] Relay Frigate {FrigateID} anchoring to Recon Probe. Initializing sector evacuation tow.`
  * *Reactive Trigger:* Prepares multi-unit spatial folding sequence for a synchronized fleet jump.
* **`STABILIZED_JUMP_CORRIDOR_OPENED`**
  * *Data Payload:* `{ event_type, warp_frigate_id, canisters_remaining, destination_sector, timestamp }`
  * *Log String Template:* `[JUMP_GATE] Stable wormhole bridge opened to Sector {Sector}. Canisters remaining: {Canisters}/10.`
  * *Reactive Trigger:* Enables live reinforcement spawning directly from Flagship drydocks to frontline anchors.
* **`CORE_IMPLOSION_DEFENSE`**
  * *Data Payload:* `{ event_type, warp_frigate_id, sector_id, timestamp }`
  * *Log String Template:* `[FATAL_COLLAPSE] Warp Frigate core imploded in Sector {Sector}! Local wormholes sealed.`
  * *Reactive Trigger:* Instantly closes all active enemy transit corridors and applies spatial distortion shockwaves.
