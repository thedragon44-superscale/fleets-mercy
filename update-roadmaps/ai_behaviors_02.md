# Space Tactics - Master AI Behaviors & Tactical FSM Catalog

This catalog compiles and consolidates all unit combat doctrines, formation geometries, logistics routines, event-driven reactive switches, class synergies, counter-class responses, and strategic command protocols into a unified hierarchy for the simulation engine.

---

## 1. Primary Combat & Engagement Doctrines
*Individual movement and targeting loops governing how units approach, reposition, and engage hostile signatures.*

* **`SEEK` (Search & Destroy / Aggressive Hunt)**
  * *Behavior:* Units break formation or vector away from anchors to actively track and engage hostile signatures within optimal weapon range. If no targets are illuminated in local telemetry, they execute localized sector sweeps.
* **`FLANK` (Asymmetric Pincer / Rear Quadrant Attack)**
  * *Behavior:* Units calculate curved approach vectors around the target's forward weapon arcs to strike side or rear quadrants where armor mitigation and shields are compromised.
* **`CUT_THE_PIE_DOGFIGHT` (Interception Strafing)**
  * *Behavior:* Light, high-speed craft (e.g., Viper Interceptors) accelerate to maximum velocity (2.8+) into weapons range, then execute semi-circular strafing loops across the enemy's trajectory to box them in and restrict forward advancement.
* **`HIT_AND_RUN_STRAFE` (Inertial Vector Pass)**
  * *Behavior:* Utilizes high-acceleration vector thrusters to execute high-velocity strafing runs through target clusters, discharging kinetic/energy salvos before breaking away to reset the engagement vector.
* **`STANDOFF_SNIPER` (Long-Range Precision Tracking)**
  * *Behavior:* Actively maintains maximum engagement distance, refusing to close range. Tethers targeting arrays exclusively to long-range Fleet Array/Recon telemetry to pick off high-value assets.
* **`SIEGE_VOLLEY_CYCLE` (Capital Siege Loop)**
  * *Behavior:* Heavy siege platforms (e.g., Heavy Torpedo Bombers) execute structured approach-salvo-loop runs, delivering high-damage ordnance bursts before cycling cooldowns out of weapon range.
* **`RECON_HUNTER` (Stealth Counter-Intel)**
  * *Behavior:* Bypasses standard combat formations while cloaked to actively hunt down and neutralize enemy forward Recon Probes.
* **`AREA_DENIAL_SOW` (Spatial Chokepoint Deposition)**
  * *Behavior:* Patrols high-traffic corridors or choke points between recon sensors and enemy approach vectors to lay down staggered spatial minefields or cryogenic gas barriers.

---

## 2. Defensive, Screening & Formation Doctrines
*Anchoring rules, protective screens, and squad geometry.*

### A. Defensive Routines
* **`GUARD` (Stationary / Sector Hold)**
  * *Behavior:* Anchors to a specific coordinate grid, landmark, or capital asset, refusing to pursue hostiles beyond a strict leash radius.
* **`BODYGUARD` / `CAPITAL_SHIELD_SCREEN` (Close Escort Interdiction)**
  * *Behavior:* Maintains a tight orbit (100m–150m) around a high-value asset (Flagship or Command Ship), dynamically thrusting its physical frame between the protected unit and incoming fire vectors.
* **`SCREEN` (Interception Line)**
  * *Behavior:* Deploys outward in an arc between friendly capital assets and hostile vectors to intercept fast-moving raiders or torpedo salvos.
* **`BUDDY_SHADOW_MODE` (Paired Shadowing)**
  * *Behavior:* Automatically detects and shadows a designated friendly unit (e.g., highest hull-damage dealer or support asset), matching pace in close orbit to provide dedicated coverage.

### B. Squad Formations (Micro-Geometry)
* **Wedge (Arrowhead):** Squad Leader leads point; wingmen fall back at 45-degree angles. Ideal for aggressive `SEEK` vectors.
* **Line Abreast (Broadside Wall):** Units line up horizontally perpendicular to heading. Maximizes simultaneous forward/broadside firepower.
* **Echelon (Staggered Diagonal):** Units trail the leader diagonally in single file, preventing weapon masking and securing flanks.
* **Box / Perimeter Guard:** Units form a 360-degree protective ring around a central anchor during `BODYGUARD` or `GUARD` orders.

---

## 3. Survival, Morale & Fallback Protocols
*Condition-based overrides where unit survival or supply needs supersede active offensive orders.*

* **`SHIELD_BREAK_EMERGENCY_RETREAT`**
  * *Trigger:* Primary shields collapse to 0%.
  * *Action:* Instantly aborts attack vectors, engages emergency thrusters, and retreats to the nearest active repair port, drydock, or command anchor.
* **`CACHE_DEPLETION_FALLBACK`**
  * *Trigger:* Internal nanite repair cache, metal supply, or ammunition runs empty.
  * *Action:* Disengages from active duty to pathfind to a Supply Tender or port for restocking before returning to post.
* **`EVASION_PROXIMITY_FLEET`**
  * *Trigger:* Hostile breaches a safety threshold (e.g., 1,000m for fragile Recon Probes).
  * *Action:* Breaks observation orbit and flees directly away at maximum speed (3.5+).
* **`FIGHT_TO_THE_DEATH`**
  * *Trigger:* Structural damage or zero-shield state on fanatical or automated units (Vipers, Recons, Ion Disablers, Defensive Emplacements).
  * *Action:* Disables retreat logic; unit fights, scouts, or suppresses until total destruction.
* **`EMERGENCY_CARGO_JETTISON`**
  * *Trigger:* Industrial harvester takes damage while carrying cargo.
  * *Action:* Jettisons raw ore/gas to drop mass and boost acceleration toward safety.

---

## 4. Logistics, Field Triage & Strategic Support
*Non-combat operational routines managing supply chains, field repairs, and electronic warfare.*

* **`AUTOMATED_MUNITION_TETHER` (Supply Tender)**
  * *Behavior:* Monitors fleet ammunition levels via Fleet Array, pathfinding to depleted units to synthesize and transfer ordnance on the fly via wireless tethers.
* **`CRITICAL_SUBSYSTEM_RESTOCK` (Logistics Escalation)**
  * *Behavior:* Bypasses standard resupply queues to prioritize units reporting crippled thrusters or depleted heavy ordnance (Torpedoes, Railgun Slugs, Graviton Cores).
* **`TRIAGE_PRIORITY_HIERARCHY` (Aegis Repair Corvette)**
  * *Behavior:* Evaluates repair targets in strict priority order: 
    1. Capital/Port shattered shield reconstruction (0 HP shields).
    2. Critical hull breaches (<25% health).
    3. Standard hull patching.
* **`CLOAKING_BLANKET_SHIELD` (Specter Jammer)**
  * *Behavior:* Matches pace behind squadmates to project a radar-invisibility bubble, provided Jammer shields remain above 75%.
* **`COMMAND_RELAY` (Logistics & Sensor Hub)**
  * *Behavior:* Capital command units anchor position to extend sensor horizons (1200m+), process cargo offloads, and manage drydock repair queues.

---

## 5. Multi-Class Synergies & Emergent Composition Loops
*Compound routines that activate naturally when specific unit classes are assigned to the same squad or sector.*

* **The "Iron Anvil" Line (Aegis Wall + Lancer Railgun Corvette)**
  * *Loop:* Aegis Wall projects its 180-degree front shield toward the enemy; Lancer Railguns lock coordinates directly behind the shield arc, using the Wall as a mobile bunker to fire heavy railguns safely.
* **The "Ghost Strike" Matrix (Specter Jammer + Phantom Transport + Viper Interceptors)**
  * *Loop:* Specter Jammer masks the squad; cloaked Phantoms and Vipers navigate undetected to point-blank range, launching a simultaneous surprise ambush the moment cloak breaks.
* **The "Freezing Disablement" Loop (Ion Disabler + Cryo-Flak Frigate + Heavy Torpedo Bomber)**
  * *Loop:* Ion Disabler freezes target shield regeneration; Cryo-Flak Frigate blankets the target in cryogenic gas to slow movement; Heavy Torpedo Bombers receive a signal override to fire heavy torpedoes directly into the exposed hull.
* **The "Sustained Logistics Core" (Aegis Repair + Supply Tender + Battalion Command Ship)**
  * *Loop:* Command Ship anchors the zone; Supply Tender synthesizes raw materials; Aegis Repair Corvette tethers to the Tender for endless nanite refills while continuously patching frontline units.
* **The "Industrial Escort Convoy" (Harvester + Command Escort + Recon Probe)**
  * *Loop:* Recon Probe scouts resources and threats 2,500m out; Harvesters route to identified nodes; Command Escorts maintain a tight perimeter box guard around transit lanes.

---

## 6. Event-Driven Reactive AI (Live Event Bus Triggers)
*Dynamic FSM shifts triggered by specific events logged on the real-time event bus.*

* **`[SHIELD_COLLAPSE]` / `[CRITICAL_HIT]` on Capital Ship**
  * *Shift:* Escort units automatically switch from `GUARD` to `BODYGUARD`/`SCREEN`, hard-vectoring to interpose their hulls along the threat line.
* **`[SHIELD_COLLAPSE]` on Enemy Target (`OPPORTUNITY_FIRE`)**
  * *Shift:* Long-range snipers and siege platforms abort lower-priority targets to focus fire on the exposed, unshielded quadrant.
* **`[UNIT_DESTROYED]` of Squad Leader (`LEADERSHIP_TRANSFER`)**
  * *Shift:* Squadmates execute an instant leadership election. If no deputy exists, units default to `RETREAT` or switch to an uncoordinated `SWARM` berserk state.
* **`[UNIT_DESTROYED]` of Battalion Command Ship (`COMMAND_DISRUPTION`)**
  * *Shift:* Subordinate squads lose regional command anchors, defaulting to autonomous fallback or localized aggressive search-and-destroy loops.
* **`[STEALTH_BROKEN]` on Hostile Signature (`HUNT_PROTOCOL`)**
  * *Shift:* Patrol and anti-stealth units drop routine sweeps and converge on the compromise coordinates.
* **`[RESOURCE_DISCOVERED]` by Recon Probe (`LOGISTICS_ROUTING`)**
  * *Shift:* Idle industrial harvesters automatically break holding patterns and plot navigation vectors to the new node.
* **`[CASUALTY_RATE_EXCEEDED]` (>50% Squad Loss)**
  * *Shift:* Surviving squad members abort offensive routines and execute an automated `RETREAT` back to port or supply anchors.

---

## 7. Leader-Dependent, Count-Threshold & Command Protocols

### A. Leader-Dependent Squad Doctrines
* **Assault-Led (Gunship / Interceptor Leader):** Squad adopts high-speed echelons, executing aggressive hit-and-run strafing passes based on the leader's line of sight.
* **Support-Led (Repair / Escort Leader):** Squad forms a tight protective box around the leader, treating its position as a mobile triage safe zone.
* **Siege-Led (Lancer Railgun Leader):** Squad maintains maximum standoff distance, establishing stable firing lines while the leader designates focus targets.

### B. Count-Dependent Mass Dynamics
* **The Wolfpack Threshold (3+ Light Interceptors):** Units abandon linear formations to execute overlapping circular orbits, saturating tracking turrets and overwhelming point defenses.
* **Industrial Convoy Mode (Harvesters + Supply Tender):** Group transitions into a structured convoy line with armed escorts forming a moving perimeter around the Tender.

### C. Macro Command Protocols (5W Command Assets)
* **Positional Rear Anchor:** Calculates a weighted centroid safely behind vanguard walls (`Aegis Wall`) and within sensor range of forward Recon Probes.
* **Reactive Deployment Surge:** Monitors squad attrition rates and automatically queues/launches counter-units (e.g., Cryo-Flak Frigates when enemy swarms are detected).
* **Emergency Warp / Sector Evacuation:** If core hull drops below 25%, commands a sector-wide retreat, ordering surviving forces to dock or converge for quantum wormhole evacuation.

---

## 8. Terrain-Dependent, Attrition & Quantum Warp Protocols

### A. Terrain & Environmental Spatial Tactics
* **`NEBULA_OCCULTATION_AMBUSH`:** Damaged or stealth units vector behind high-mass asteroids, planets, or nebulae to break enemy line-of-sight and force target reacquisition delays.
* **`GRAVITATIONAL_SLINGSHOT_VECTOR`:** Light craft execute orbital assist maneuvers around gravity wells during retreat or flank vectors to spike velocity beyond thruster caps.
* **`LANDMARK_BOLT_ANCHOR`:** Stationary units (Emplacements, Warp Frigates) require a Recon Drone anchor to physically bolt onto celestial landmarks, transitioning into fortified structures.

### B. Attrition Momentum
* **`VANGUARD_BREAK_THROUGH`:** Destroying 3+ enemy screening units causes surviving frontline forces to shift from defensive `GUARD` to an aggressive forward `SEEK` push.
* **`DECAPITATION_SHOCK`:** Destroying an enemy Command Ship induces temporary command disruption in surrounding hostiles, pausing their attack vectors.

### C. Quantum Warp & Wormhole Architecture
* **`QUANTUM_TOW_EVACUATION`:** Warp Frigate anchors to a forward Recon Probe and opens a quantum wormhole, pulling attached squads through folded space simultaneously.
* **`STABILIZED_JUMP_CORRIDOR`:** Consumes Warp Canisters to hold open a wormhole bridge, enabling instant reinforcement deployment from Flagship drydock to frontline Recon anchors.
* **`COLLAPSE_INWARD_DEFENSE`:** Upon critical hull failure, the Warp Frigate implodes its quantum core, closing active enemy wormhole corridors and dealing localized spatial distortion damage.
