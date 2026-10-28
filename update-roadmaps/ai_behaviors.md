# Space Tactics - Comprehensive AI Behaviors Catalog

## 1. Offensive & Strike Doctrines
* **`SEEK` (Engage / Search & Destroy)**
  * *Tactical Origin:* General Search-and-Destroy doctrine.
  * *Behavior:* Units break formation or vector away from anchors to actively hunt down detected enemy signatures within optimal weapon range. If no targets are visible, they execute a localized sector sweep.
* **`FLANK` (Asymmetric Pincer / Hit-and-Run)**
  * *Tactical Origin:* Cavalry and armored warfare pincer maneuvers.
  * *Behavior:* Units calculate a vector to strike the enemy's side or rear quadrants where hull and shield mitigation are typically lower.
* **`SWARM` (Concentrated Concentration of Force)**
  * *Tactical Origin:* Wolfpack naval tactics and saturation attacks.
  * *Behavior:* Multiple small-craft units override individual target selection to focus all firepower on a single high-priority target designated by a battalion command ship.

## 2. Defensive & Screening Doctrines
* **`GUARD` (Stationary Territorial Hold)**
  * *Tactical Origin:* Static defense and perimeter fortification.
  * *Behavior:* Units anchor themselves to a specific coordinate grid, map landmark, or capital ship, refusing to chase stray targets beyond a strict leash range.
* **`BODYGUARD` (Close-Quarters Escort)**
  * *Tactical Origin:* VIP protection details and capital ship screening.
  * *Behavior:* Units maintain a tight orbit (100m–150m) around a designated high-value target like a flagship or battalion command ship, instantly intercepting and engaging any attacker breaching their inner threat radius.
* **`SCREEN` (Interception Vector)**
  * *Tactical Origin:* Naval destroyer screening lines protecting aircraft carriers.
  * *Behavior:* Units deploy outward in an arc between friendly capital assets and incoming hostile vectors, intercepting fast-moving raiders or torpedoes.

## 3. Support, Logistics & Recon Doctrines
* **`COMMAND_RELAY` (Logistics, Repair & Sensor Anchor)**
  * *Tactical Origin:* Mobile command posts and logistics hubs.
  * *Behavior:* Capital command ships and support tenders maintain position to extend radar/sensor horizons, process cargo transfers, and project field repair beams to nearby damaged allies.
* **`RECON_PATROL` (Autonomous Sweep & Evasion)**
  * *Tactical Origin:* Reconnaissance aviation and long-range scouting patrols.
  * *Behavior:* Fast units maintain high-speed orbits around environmental hazards or open space grids while actively avoiding hostile engagement thresholds, prioritizing data collection.

## 4. Survival & Withdrawal Doctrines
* **`RETREAT` (Tactical Fallback & Regroup)**
  * *Tactical Origin:* Strategic withdrawal and tactical regrouping.
  * *Behavior:* Triggered dynamically when a unit's structural integrity or quadrant shields collapse past a critical threshold. Units break engagement, calculate a vector back toward the nearest friendly capital anchor or fallback zone, and attempt to re-arm or repair.

.
.
.

# Space Tactics - Freely Configurable AI Behaviors Tab Catalog

Based on the distinct operational parameters and combat doctrines of all fleet units, the advanced **AI Behaviors Tab** can be broken down into modular, toggleable, and slider-adjustable parameters. Players can mix and match these behaviors to customize unit automation in the sandbox.

---

## 1. Primary Combat & Engagement Doctrines
*Configures how a unit approaches, engages, and repositions relative to enemy combatants.*

* **`CUT_THE_PIE_DOGFIGHT` (Viper Interceptor Doctrine)**
  * *Behavior:* Accelerates to maximum velocity (2.8+) into weapons range, then initiates aggressive semi-circular strafing loops across enemy approach vectors to box them in and restrict forward mobility.
* **`HIT_AND_RUN_STRAFE` (Assault Gunship Doctrine)**
  * *Behavior:* Relies on high-acceleration vector thrusters to execute high-velocity strafing passes, firing rotary kinetic arrays before sweeping wide to reset the engagement vector.
* **`STANDOFF_SNIPER` (Lancer Railgun Doctrine)**
  * *Behavior:* Actively maintains maximum range away from hostiles, refusing to close distance. Tethers targeting arrays exclusively to long-range telemetry to pick off high-value assets.
* **`SIEGE_VOLLEY_CYCLE` (Heavy Torpedo Bomber Doctrine)**
  * *Behavior:* Executes structured combat loops—rapid approach, burst-fire salvo (with strict cooldown windows), and loop-away—focusing entirely on armored capital targets.
* **`RECON_HUNTER` (Phantom Transport Doctrine)**
  * *Behavior:* Bypasses standard frontline skirmishes to actively hunt down and neutralize enemy Recon Probes while maintaining stealth protocols.
* **`AREA_DENIAL_SOW` (Vortex / Cryo-Flak Doctrine)**
  * *Behavior:* Patrols designated corridors between recon sensors and enemy lines to lay down staggered spatial minefields or cryogenic gas barriers.

---

## 2. Survival, Retreat & Fallback Triggers
*Configures the exact threshold and destination when a unit decides disengagement or survival overrides combat orders.*

* **`SHIELD_BREAK_EMERGENCY_RETREAT` (Assault Gunship / Wall / Heavy Units)**
  * *Trigger Condition:* Unit primary shields drop to 0%.
  * *Action:* Instantly aborts current attack vector, engages emergency thrusters, and retreats directly to the nearest active repair port or flagship drydock.
* **`CACHE_DEPLETION_FALLBACK` (Aegis Repair / Logistics Units)**
  * *Trigger Condition:* Internal resource cache or repair nanite supply hits empty.
  * *Action:* Temporarily breaks anchor/support triage duties to pathfind to the nearest Supply Tender or port for restocking before resuming combat station.
* **`FIGHT_TO_THE_DEATH` (Viper / Recon / Ion / Defensive Emplacement)**
  * *Trigger Condition:* Structural compromise, zero shields, or critical damage.
  * *Action:* Disables all retreat logic; unit continues to fight, scout, or support until absolute destruction.
* **`EVASION_PROXIMITY_FLEET` (Recon Probe Doctrine)**
  * *Trigger Condition:* Any hostile unit closes within the safety threshold (e.g., 1,000m).
  * *Action:* Instantly breaks observation orbit and flees directly away at maximum speed (3.5).

---

## 3. Tethering, Anchoring & Formation Rules
*Configures whom or what a unit attaches its movement and spatial awareness to.*

* **`BUDDY_SHADOW_MODE` (Ion Disabler / Support Triage)**
  * *Behavior:* Automatically detects and shadows the friendly fleet unit currently dealing the highest hull damage or requiring triage, matching pace in close orbit.
* **`CAPITAL_SHIELD_SCREEN` (Aegis Wall / Escort Doctrine)**
  * *Behavior:* Dynamic intercept AI that actively thrusts a heavy mass between moving allies and incoming hostile fire vectors, projecting directional barrier protection.
* **`CLOSED_LOOP_TENDER` (Aegis Repair Corvette)**
  * *Behavior:* Restricts support logic exclusively to a single designated unit, squad, battalion, or buddy anchor, remaining blind to wider fleet needs outside its direct tether.
* **`LANDMARK_ANCHOR` (Defensive Emplacement / Warp Frigate)**
  * *Behavior:* Requires a Recon Drone anchor to bolt permanently onto celestial landmarks or coordinate grids, transitioning from mobile transit to stationary strategic defense.
* **`INDEPENDENT_SECTOR_SWEEP` (Recon Probe / Patrol Units)**
  * *Behavior:* Operates without a direct capital tether, executing blind spatial sweeps or high-speed orbital patrols around environmental hazards.

---

## 4. Target Priority & Filtering Profiles
*Configures how a unit scores and selects its targets during active engagements.*

* **`HIGH_VALUE_ASSET_PRIORITY` (Lancer Railgun Doctrine)**
  * *Target Ranking:* Flagships > Command Ships > Harvesters > Supply Units > Recon Probes > Warp Units (ignoring standard small craft unless fired upon directly).
* **`SYNCED_FOCUS_FIRE` (Ion Disabler / Squad Swarm)**
  * *Behavior:* Bypasses local target evaluation to instantly lock onto and suppress the exact enemy unit currently targeted by the squad leader or highest-damage ally.
* **`VULNERABILITY_QUADRANT_SEEKER` (Heavy Siege / Flankers)**
  * *Behavior:* Calculates enemy orientation to prioritize striking rear/side quadrants where armor mitigation and shields are compromised or unshielded.
* **`INFRASTRUCTURE_INTERDICTION` (Industrial / Raider units)**
  * *Behavior:* Focuses combat pressure on enemy harvesters, supply lines, and logistics tenders to choke resource flow.

---

## 5. Logistics, Support & Electronic Warfare Routines
*Configures non-combat active abilities, field fabrication, and telemetry masking.*

* **`AUTOMATED_MUNITION_TETHER` (Supply Tender Routine)**
  * *Behavior:* Continuously monitors fleet ammunition telemetry via Fleet Array, pathfinding directly to depleted combat units to deliver synthesized ordnance on-the-fly.
* **`CLOAKING_BLANKET_SHIELD` (Specter Jammer Routine)**
  * *Behavior:* Matches pace behind squadmates to project an electronic invisibility field, conditional on maintaining shield integrity above 75%.
* **`FIELD_REPAIR_TRIAGE` (Command Ship / Repair Corvette Routine)**
  * *Behavior:* Manages automated drydock and repair beams, consuming Metal, Crystals, and Isotopes to patch hulls and reconstruct shattered 0 HP shields.

.
.
.

# Space Tactics - Event-Driven Conditional AI Behavior Matrix

Turning the live event log from a passive text feed into an active **Reactive Event Bus** allows the simulation to mimic realistic military command-and-control chains. In this architecture, specific telemetry events act as triggers that force units or entire squads to dynamically re-evaluate their Finite-State Machine (FSM) doctrine, subsequently logging their own state-transition events.

---

## 1. Capital Threat & Decapitation Triggers
*When high-value command assets are threatened or breached, surrounding defensive units break routine to react.*

* **Trigger Event:** `[SHIELD_COLLAPSE]` or `[CRITICAL_HIT]` on Flagship / Command Ship.
  * **Conditional AI Behavior Shift:** Nearby units configured with escort/guard doctrines immediately override current sector sweeps, switching from `GUARD` to `BODYGUARD` or `SCREEN`. They hard-vector to interpose their hulls between the flagship and the attacking threat vector.
  * **Resulting Log Event:** `[TACTICAL_SHIFT] Command Escort Squadron Alpha locked to Flagship defense vector due to quadrant shield failure.`
* **Trigger Event:** `[UNIT_DESTROYED]` of a Battalion Command Ship.
  * **Conditional AI Behavior Shift:** Attached subordinate squads lose their regional command anchor. Units default to an autonomous fallback state (`RETREAT`) or enter a localized, high-aggression `SEEK` revenge loop depending on their fleet configuration.
  * **Resulting Log Event:** `[COMMAND_DISRUPTION] Battalion 2 command anchor lost. Subordinate units shifting to autonomous fallback.`

---

## 2. Squad Integrity & Morale Triggers
*Simulates squad cohesion, psychological stress, and tactical adaptation when leadership or numbers dwindle.*

* **Trigger Event:** `[UNIT_DESTROYED]` of a Squad Leader.
  * **Conditional AI Behavior Shift:** Surviving squadmates execute an instant leadership election or fallback check. If no deputy leader is assigned, units either trigger `RETREAT` or shift to an uncoordinated `SWARM` berserk state.
  * **Resulting Log Event:** `[LEADERSHIP_TRANSFER] Squad Leader destroyed; Unit #3 assumed field command / units entering fragmented swarm execution.`
* **Trigger Event:** Squad casualty rate exceeds 50% threshold within a single tick window.
  * **Conditional AI Behavior Shift:** The surviving members abort aggressive engagement doctrines (`SEEK` / `FLANK`) and trigger an automated `RETREAT` protocol back toward the nearest active port or supply line.
  * **Resulting Log Event:** `[TACTICAL_RETREAT] Squad Delta sustaining heavy attrition (>50%); executing autonomous fallback vector.`

---

## 3. Tactical Opportunity & Vulnerability Triggers
*Allows offensive units to exploit enemy weaknesses dynamically the moment telemetry confirms a breach.*

* **Trigger Event:** `[SHIELD_COLLAPSE]` logged on an enemy capital ship or heavy unit.
  * **Conditional AI Behavior Shift:** Long-range and siege units (e.g., Lancer Railguns and Heavy Torpedo Bombers) automatically abort lower-priority targets and re-vector their targeting arrays to focus fire on the newly unshielded quadrant.
  * **Resulting Log Event:** `[OPPORTUNITY_FIRE] Enemy capital shield collapse detected; Siege units re-vectoring primary ordnance to breach target.`
* **Trigger Event:** `[STEALTH_BROKEN]` logged on an enemy Phantom Transport or cloaked unit.
  * **Conditional AI Behavior Shift:** Nearby patrol units and anti-stealth platforms switch from blind sector sweeps to high-priority `SEEK` hunt protocols, converging on the exact coordinates where the cloak failed.
  * **Resulting Log Event:** `[HUNT_PROTOCOL] Stealth signature compromised; Interceptors converging on breach coordinates.`

---

## 4. Logistics & Discovery Triggers
*Bridges economic resource collection and recon telemetry with industrial and support fleet automation.*

* **Trigger Event:** `[RESOURCE_DISCOVERED]` logged by a high-speed Recon Probe.
  * **Conditional AI Behavior Shift:** Idle industrial harvesters (Mining Barges, Plasma Skimmers, Grav Extractors) automatically drop holding patterns, re-routing from guard anchors to the newly cataloged resource node coordinates.
  * **Resulting Log Event:** `[LOGISTICS_ROUTING] Mining Barge #1 automatically redirected to newly discovered Resource Node at Sector [X, Y].`
* **Trigger Event:** `[CACHE_DEPLETION_WARNING]` logged by a frontline combat squad or heavy unit.
  * **Conditional AI Behavior Shift:** Mobile Supply Tenders dynamically calculate transit paths to vector directly toward the depleted unit, bypassing routine supply loops to deliver synthesized ordnance under fire.
  * **Resulting Log Event:** `[RESUPPLY_INTERVENTION] Supply Tender dispatching emergency ordnance delivery vector to depleted combat unit.`

.
.
.

# Space Tactics - Squad & Battalion Formations and Attack Patterns Catalog

## 1. Squad Formations (Micro-Tactics)
*Geometry and spatial arrangement for subordinate units tethered to a Squad Leader.*

* **Wedge (Arrowhead) Formation**
  * *Geometry:* Squad Leader leads the point, with subordinate units stepping backward and outward at symmetrical angles (e.g., 45-degree offsets).
  * *Application:* Optimal for aggressive advance vectors (`SEEK`). Maximizes forward firepower while the leader absorbs initial contact and distributes threat across wingmen.
* **Line Abreast (Broadside Wall)**
  * *Geometry:* Units spread out horizontally along an axis perpendicular to their heading.
  * *Application:* Optimal for corridor sweeps, area denial, or simultaneous broadside delivery (ideal for Cryo-Flak Frigates or Viper Interceptors blanketing a sector).
* **Echelon (Staggered Offset - Left/Right)**
  * *Geometry:* Units trail the leader diagonally in a single-file slanted line.
  * *Application:* Prevents friendly ships from masking each other's weapon arcs and provides built-in flank security during hit-and-run passes.
* **Box / Perimeter Guard**
  * *Geometry:* Units distribute themselves in a protective ring (cardinal directions) around a high-value anchor or command target.
  * *Application:* Standard spatial arrangement for `BODYGUARD` and `GUARD` doctrines, ensuring 360-degree interdiction coverage against incoming raiders.

---

## 2. Battalion Attack Patterns (Macro-Tactics)
*Synchronized multi-squad maneuvers operating under a regional command anchor.*

* **The Hammer and Anvil (Vanguard Pin + Flank Strike)**
  * *Execution:* Heavy 5W vanguard units (Aegis Walls and Command Escorts) advance directly down the primary vector to lock enemy forces into a frontal engagement (the Anvil). Simultaneously, high-speed strike squads (Assault Gunships and Viper Interceptors) break off via a wide flanking route to strike vulnerable rear hull quadrants (the Hammer).
* **The Pincer Envelopment (Dual-Wing Convergence)**
  * *Execution:* The battalion splits its squads into two parallel flanking arms that sweep wide around an objective or enemy group, gradually closing the net to crossfire from both sides.
  * *Application:* Used to neutralize mobile enemy lines or surround stationary targets (like Defensive Gun Emplacements or resource nodes).
* **The Saturated Focus Blitz (Concentric Fire)**
  * *Execution:* Utilizing telemetry relays, multiple independent squads temporarily override their local target selection to converge all weapon fire onto a single high-priority target designated by the battalion command ship.
  * *Application:* Rapidly vaporizing enemy capital ships or priority support tenders before they can cycle field repairs.

---

## 3. Hierarchical Command & Signal Flow
* **Battalion Command Node:** Acts as the regional processing node, aggregating sensor data from Recon Probes and broadcasting tactical target priorities to subordinate squad leaders.
* **Squad Leaders:** Evaluate these priorities against their local leash constraints, issuing micro-offsets to their wingmen.
* **Subordinate Units:** Maintain formation offsets while continuously evaluating reactive survival triggers (such as shield-break retreats or incoming torpedo vectors).

.
.
.

# Space Tactics - Configuration-Dependent AI, Synergies & Command Protocols

Expanding the simulation's depth means making squad behavior **emergent**—arriving naturally from who leads, what units are grouped together, and how many class types are present. Furthermore, giving 5W Command Units intelligent macro-protocols transforms them from static spawners into strategic commanders.

---

## 1. Unit Class Synergies & Composition Behaviors
*Emergent tactical routines triggered when specific combinations of unit classes are assigned to the same squad.*

* **The "Disabler-Annihilator" Synergy (Ion Disabler + Heavy Torpedo Bomber)**
  * *Behavior:* When an Ion Disabler locks down an enemy's shields and freezes secondary systems, paired Heavy Torpedo Bombers automatically receive a signal override, bypassing standard anti-shield sizing to instantly fire heavy ordnance directly into the exposed structural hull.
* **The "Cloak-and-Dagger" Matrix (Specter Jammer + Phantom Transport / Viper Interceptors)**
  * *Behavior:* The Specter Jammer projects an electronic masking field over the squad. Stealth-capable units remain cloaked indefinitely, while fast strike units use the hidden approach vector to launch surprise point-blank ambushes before breaking cloak.
* **The "Shield-Wall Vanguard" (Aegis Wall + Lancer Railguns or Siege Units)**
  * *Behavior:* Long-range or fragile units automatically position themselves directly behind the Aegis Wall's 180-degree directional shield arc, using the mobile barrier as a firing bunker while the Wall absorbs incoming fire.

---

## 2. Leader-Dependent Squad Behaviors
*The class of the designated `IsSquadLeader` completely alters the behavioral doctrine of the entire squad.*

* **Assault-Led Squads (e.g., Assault Gunship or Viper Interceptor as Leader)**
  * *Doctrine:* Aggressive Shock & Awe. The squad abandons static formations for high-speed echelons, closing distance rapidly, executing hit-and-run strafing runs, and diving deep into enemy formations based on the leader's line of sight.
* **Support/Defensive-Led Squads (e.g., Aegis Repair or Command Escort as Leader)**
  * *Doctrine:* Triage & Shielding. Subordinate units lock into a tight box formation around the leader, treating the leader's position as a mobile safe zone and intercepting threats that approach within inner perimeter thresholds.
* **Sniper/Siege-Led Squads (e.g., Lancer Railgun as Leader)**
  * *Doctrine:* Standoff Precision. The squad refuses to close distance, establishing stable firing lines at maximum sensor range while the leader designates high-priority targets (Flagships, Command Ships) for synchronized execution.

---

## 3. Count-Dependent Thresholds & Mass Dynamics
*Behaviors that scale dynamically based on the exact quantity or ratio of specific unit classes within a squad or sector.*

* **The Wolfpack Threshold (3+ Viper Interceptors or Light Units)**
  * *Behavior:* When small craft reach a critical mass of 3 or more in a squad, they abandon linear formations and switch to an autonomous `SWARM` state, orbiting targets in overlapping circles to saturate tracking turrets and overwhelm point-defense systems.
* **Industrial Convoy Mode (Mining Barges / Plasma Skimmers + Supply Tender)**
  * *Behavior:* When industrial harvesters are grouped with a Supply Tender, they automatically transition from individual wandering nodes into an escorted convoy line, with armed combat units forming a protective perimeter around the Tender's transit vector.

---

## 4. Command Unit Protocols (Flagships & Battalion Command Ships)
*Macro-level operational logic governing how 5W command assets position themselves and manage field assets.*

* **Positional Doctrine (The Strategic Rear / Command Anchor)**
  * *Positioning Logic:* Command units actively calculate a weighted centroid position—staying safely behind heavy vanguard walls (`Aegis Wall`) and within sensor relay range of forward Recon Probes, refusing to push into the frontlines unless forced by total sector collapse.
* **Reactive Deployment Timing (Dynamic Reinforcement)**
  * *Deployment Logic:* Rather than dumping units on a static timer, command units monitor regional telemetry. If a squad's casualty rate exceeds 40% or a critical quadrant shield collapses, the command ship automatically queues and launches specialized counter-units (e.g., dispatching Cryo-Flak Frigates if enemy swarm craft are detected).
* **Emergency Warp & Evacuation Routing**
  * *Protocol:* If the command ship's core hull drops below a critical threshold, it triggers a sector-wide `RETREAT` signal, ordering all surviving squads and logistics tenders to vector back toward its position for emergency dock or wormhole evacuation.

.
.
.

# Space Tactics - Advanced Binding Additions & Tactical Enhancements

To tightly bind our individual behaviors, event triggers, and macro-protocols into a unified, breathing simulation, we can introduce **Inter-Battalion Coordination**, **Environmental Spatial Tactics**, **Cascading Event-Chain Reactions**, and **Strategic Command Auras**. 

These additions eliminate isolated logic loops and ensure that every layer—from a single Recon Probe to a Command Flagship—reacts fluidly to the state of the entire sector.

---

## 1. Inter-Battalion & Cross-Squad Coordination Protocols
*Bind separate squads and battalions into a cohesive, mutually supporting fleet network rather than isolated clusters.*

* **`CROSS_SQUAD_ESCORT_HANDOFF` (Logistics Relay)**
  * *Behavior:* When a Mining Barge or Supply Tender crosses sector boundaries between two distinct battalion zones, the outgoing battalion's escort squad automatically passes its `GUARD` tether to an incoming combat squad from the destination battalion, ensuring zero unescorted transit windows.
* **`STAGGERED_SIEGE_POOLING` (Synchronized Artillery Matrix)**
  * *Behavior:* Multiple Lancer Railgun or Heavy Torpedo squads tethered to the same Battalion Command Ship pool their weapon cooldown states. Instead of firing simultaneously (creating a mutual reload gap), the command anchor sequences their salvoes into continuous, uninterrupted rolling bombardment.
* **`MUTUAL_SCREENING_INTERLOCK` (Vanguard Grid Exchange)**
  * *Behavior:* When two adjacent battalions encounter opposing forces, their respective Vanguard units (`Aegis Walls`) dynamically overlap their directional shield arcs to create a unified, multi-directional fortification barrier for the combined fleet.

---

## 2. Environmental Hazard & Spatial Tactician Behaviors
*Leverage map structures (asteroids, gas giants, gravity wells, anomalies) to give physical terrain a direct impact on AI decision-making.*

* **`NEBULA_OCCULTATION_AMBUSH` (Line-of-Sight Masking)**
  * *Behavior:* Units with low hull integrity or stealth capabilities (`Phantom Transports`, damaged squads) automatically calculate vectors behind high-mass celestial structures, asteroid fields, or spatial nebulae to break enemy line-of-sight and force target reacquisition delays.
* **`GRAVITATIONAL_SLINGSHOT_VECTOR` (Inertial Boost Maneuver)**
  * *Behavior:* Light, high-speed craft (`Viper Interceptors`, `Recon Probes`) execute orbital assists around massive environmental gravity wells during `RETREAT` or `FLANK` vectors, utilizing local gravitational pull to spike movement velocity beyond standard thruster limits.
* **`CHOKEPOINT_MINING_GRID` (Terrain-Locked Area Denial)**
  * *Behavior:* `Vortex Minelayers` and `Cryo-Flak Frigates` scan the procedural map layout for narrow stellar corridors or bridge structures between hazards, prioritizing those bottlenecks for automated minefield deployment.

---

## 3. Cascading Event-Chain Reactions (Advanced Event Bus)
*Turn single telemetry events into multi-stage tactical domino effects across the live event log.*

* **Trigger Event:** `[SUPPLY_TENDER_DESTROYED]`
  * **Cascading Shift:** Dependent frontline combat squads and heavy siege units instantly receive an ammunition telemetry fault. They automatically transition from high-rate-of-fire doctrines to `CONSERVE_AMMO` mode (switching to auxiliary energy weapons or initiating an autonomous fallback toward port).
  * **Resulting Log Event:** `[LOGISTICS_COLLAPSE] Supply Tender destroyed; dependent squads shifting to ammunition conservation and fallback routing.`
* **Trigger Event:** `[LEADERSHIP_TRANSFER]` (Squad Leader casualty) followed instantly by a second casualty within the same tick.
  * **Cascading Shift:** The entire squad suffers a psychological routing check, forcing an uncoordinated, panicked `RETREAT` state that temporarily ignores individual unit doctrines in favor of absolute flight.
  * **Resulting Log Event:** `[ROUT_TRIGGER] Squad Alpha command structure completely collapsed; panic cascade initiating full squad withdrawal.`

---

## 4. Strategic Command Auras & Doctrine Profiles
*Macro-level configuration settings tied to 5W Command Ships that globally bias the behavior weights of all subordinate units.*

* **`AGGRESSIVE_BLITZ_DOCTRINE` (Offensive Stance)**
  * *Bias Adjustment:* Globally increases subordinate squad `SEEK` and `FLANK` attraction weights by 35% while reducing individual retreat morale thresholds, prioritizing unyielding offensive pressure at the cost of higher attrition rates.
* **`CONSOLIDATED_DEFENSE_AURA` (Fortress Stance)**
  * *Bias Adjustment:* Command ships project an active coordination radius that accelerates shield recharge delay reduction by 20% and locks all subordinate squads into tight perimeter box formations around the command asset.
* **`SCORCHED_EARTH_RETREAT` (Desperation Protocol)**
  * *Bias Adjustment:* Triggered automatically when the Command Flagship's core hull drops below 25%. Subordinate industrial harvesters immediately jettison cargo caches to maximize speed, while combat units shift to a bitter, high-aggression `SWARM` revenge loop before final destruction.

.
.
.

# Space Tactics - Advanced Unit Class Synergies & Interlocking Behaviors

To elevate our tactical simulation, we can define deep, multi-class synergies where specific units running distinct internal doctrines lock together into emergent tactical engines. These combinations leverage complementary stats—such as shielding versus range, or status suppression versus structural damage—to create powerful compound behaviors.

---

## 1. The "Iron Anvil" Line (Aegis Wall + Lancer Railgun Corvette)
* **Combined Units:** Aegis Wall (5W Super-Heavy Vanguard)[cite: 2] + Lancer Railgun Corvette (4W Long-Range Sniper)[cite: 2].
* **Core Synergy:** The Aegis Wall projects a massive 180-degree front energy shield with high passive regeneration[cite: 2], while Lancer Railguns operate as long-range anti-armor snipers requiring unobstructed high-value firing lines[cite: 2].
* **Emergent AI Behavior Loop:** 
  * The Aegis Wall automatically positions itself as a moving physical bunker, locking its orientation toward the primary hostile vector[cite: 2].
  * Subordinate Lancer Railguns override standard spread maneuvers to lock their positioning coordinates *directly behind* the Wall's projection zone. 
  * They use the Wall's physical mass and shield barrier as stationary cover, safely cycling their heavy sub-atomic railguns without needing to break position or fear return fire.

---

## 2. The "Ghost Strike" Matrix (Specter Radar Jammer + Phantom Transport + Viper Interceptors)
* **Combined Units:** Specter Radar Jammer (3W Electronic Warfare)[cite: 2] + Phantom Transport (1W Stealth Infiltrator)[cite: 2] + Viper Interceptor (1W Dogfighter)[cite: 2].
* **Core Synergy:** The Specter Jammer projects an electronic cloaking field over nearby squadmates[cite: 2], neutralizing standard radar visibility for units like the Phantom[cite: 2] and Viper[cite: 2].
* **Emergent AI Behavior Loop:**
  * The Specter Jammer matches pace at the rear of the squad, maintaining a strict distance threshold to keep its shielding above 75%[cite: 2].
  * Cloaked units (`Phantom Transport` and `Viper Interceptors`) form a silent assault wedge, utilizing complete radar immunity to navigate blind spots in enemy sensor grids[cite: 2].
  * Upon closing to point-blank range, the moment the lead Phantom fires its sabotage charge or the Vipers initiate their dogfight strafe, the entire squad breaks cloak simultaneously, converting a stealth approach into a catastrophic point-blank ambush.

---

## 3. The "Freezing Disablement" Loop (Ion Disabler + Cryo-Flak Frigate + Heavy Torpedo Bomber)
* **Combined Units:** Ion Disabler (1W Suppressor)[cite: 2] + Cryo-Flak Frigate (3W Anti-Swarm)[cite: 2] + Heavy Torpedo Bomber (4W Siege Platform)[cite: 2].
* **Core Synergy:** Ion Disablers freeze enemy shield regeneration and disable secondary turrets with continuous ion beams[cite: 2], Cryo-Flak zones slow targets and bypass shields for hull damage[cite: 2], and Torpedo Bombers deliver devastating structural payloads[cite: 2].
* **Emergent AI Behavior Loop:**
  * The Ion Disabler locks onto the highest-threat enemy unit, freezing its active shield regeneration and locking its turrets[cite: 2].
  * Instantly upon receiving the "Shield Frozen" telemetry flag, the Cryo-Flak Frigate blankets the target coordinate with cryogenic gas, slowing enemy evasive velocity and stripping away mitigation[cite: 2].
  * With shields neutralized and movement frozen, Heavy Torpedo Bombers receive an automated signal override, bypassing standard anti-shield sizing rules to unleash a synchronized burst-fire volley directly into the exposed structural hull[cite: 2].

---

## 4. The "Sustained Logistics Core" (Aegis Repair Corvette + Supply Tender + Battalion Command Ship)
* **Combined Units:** Aegis Repair Corvette (2W Field Maintenance)[cite: 2] + Supply Tender (2W Munitions Synthesizer)[cite: 2] + Battalion Command Ship (5W Regional Hub)[cite: 2].
* **Core Synergy:** Repair Corvettes consume Metal and Crystals to restore shattered shields and hulls[cite: 2], Supply Tenders fabricate ordnance and raw resources on-the-fly[cite: 2], and Command Ships anchor regional sensor and repair zones[cite: 2].
* **Emergent AI Behavior Loop:**
  * The Battalion Command Ship acts as the central anchor, broadcasting sensor data and managing dock repair queues[cite: 2].
  * The Supply Tender orbits the Command Ship within its resource cache radius, continuously synthesizing raw materials and distributing them via wireless fabrication tethers[cite: 2].
  * The Aegis Repair Corvette tethers itself directly to the Supply Tender's material output while trailing the frontlines; when its nanite supply or metal cache runs low, it automatically routes a micro-fallback to the Tender for instantaneous replenishment before returning to its triage post[cite: 2].

---

## 5. The "Industrial Escort Convoy" (Mining Barge / Plasma Skimmer + Command Escort Ship + Recon Probe)
* **Combined Units:** Mining Barge / Plasma Skimmer (2W Harvesters)[cite: 2] + Command Escort Ship (3W Bodyguard)[cite: 2] + Recon Probe (1W Forward Observer)[cite: 2].
* **Core Synergy:** Harvesters are slow, heavy units vulnerable to attack[cite: 2], Recon Probes possess a 2,500m scouting radius to detect threats early[cite: 2], and Command Escorts provide unyielding point-defense screening[cite: 2].
* **Emergent AI Behavior Loop:**
  * The Recon Probe scours open space far ahead of the industrial group, mapping resource nodes and highlighting enemy approach vectors on the HUD[cite: 2].
  * Upon node discovery, Mining Barges and Plasma Skimmers automatically drop holding patterns and vector toward the coordinates[cite: 2].
  * Concurrently, Command Escorts lock into a tight perimeter "Box Guard" formation around the harvesters' transit lanes, interposing their hulls between the industrial units and any hostile signatures detected by the Recon probe[cite: 2].

.
.
.

# Space Tactics - Advanced Modular AI Behaviors: Counter-Classes, Logistics, Terrain, Attrition & Warp Protocols

To finalize our exhaustive behavioral framework, we must look at the microscopic and macroscopic conditions that govern battlefield reality: how units react to specific enemy types, manage complex supply chains, interact with spatial terrain, respond to unit casualty thresholds, and weaponize quantum warp architecture.

---

## 1. Counter-Class Reactive Behaviors (Encounter-Dependent AI)
*Tactical adjustments triggered when a unit's targeting array identifies a specific enemy class or weight class on the grid.*

* **`ANTI_SWARM_FLAK_CONVERGENCE` (Cryo-Flak Frigate Doctrine)**
  * *Trigger Condition:* 1W/2W fast small-craft (Viper Interceptors, Recon Probes) enter weapons range[cite: 2].
  * *Behavior:* The Cryo-Flak Frigate instantly overrides standard target filtering, pivoting its batteries to blanket the incoming swarm path with cryogenic gas to slow velocity and strip shields[cite: 2].
* **`SNIPER_EVASION_SLIP` (Medium/Heavy Unit Doctrine)**
  * *Trigger Condition:* Targeted by a hostile Lancer Railgun Corvette (4W sniper)[cite: 2].
  * *Behavior:* Units break predictable linear movement loops, executing sudden lateral vector slips and erratic acceleration bursts to disrupt the sniper's high-speed sub-atomic projectile trajectory[cite: 2].
* **`CAPITAL_BLIND_SPOT_DIVE` (Torpedo Bomber / Heavy Assault Doctrine)**
  * *Trigger Condition:* Enemy capital ship (Flagship or Battalion Command Ship) quadrant shields drop to 0%.
  * *Behavior:* Torpedo bombers ignore intervening screening escorts, driving directly into the capital ship's dead-zones (e.g., exposed rear hulls where propulsion and lateral strafing are managed) to deliver point-blank ordnance[cite: 2].
* **`COUNTER_STEALTH_HUNT_LOCK` (Phantom Transport / Recon Doctrine)**
  * *Trigger Condition:* Enemy stealth signature or radar anomaly detected within sensor range.
  * *Behavior:* Units lock sensor arrays directly onto the anomaly coordinates, closing distance to strip the enemy's cloaking immunity via close-range pulse charges.

---

## 2. In-Depth Logistical Supply Chain & Repair System Protocols
*Behavioral loops governing resource management, fabrication priorities, and field triage.*

* **`CRITICAL_SUBSYSTEM_RESTOCK` (Supply Tender Protocol)**
  * *Trigger Condition:* A friendly heavy capital unit or siege platform reports crippled thrusters or depleted specialized ammunition (Graviton Cores, Torpedoes, Railgun Slugs)[cite: 2].
  * *Behavior:* The Supply Tender bypasses standard front-line munitions loops, pathfinding directly to the distressed unit to deliver specialized components via wireless fabrication tethers[cite: 2].
* **`TRIAGE_PRIORITY_HIERARCHY` (Aegis Repair Corvette Routine)**
  * *Trigger Condition:* Multiple allies damaged simultaneously in the local sector[cite: 2].
  * *Behavior:* Repair beams evaluate targets in strict sequence: 
    1. *Capital / Port Shields* (reconstructing permanently shattered 0 HP shields)[cite: 2].
    2. *Critical Hull Breaches* (<25% unified pool)[cite: 2].
    3. *Routine Maintenance*[cite: 2]. 
    Refuses to waste nanites on full-health units[cite: 2].
* **`EMERGENCY_CARGO_JETTISON` (Industrial Harvester Protocol)**
  * *Trigger Condition:* Mining Barge or Plasma Skimmer takes damage from a hostile raider while holding a full cargo cache.
  * *Behavior:* Automatically jettisons raw ore or plasma gas to drop weight, spiking engine acceleration (`Rank D Speed`) to maximize escape velocity toward the nearest active port or Supply Tender[cite: 2].

---

## 3. Nearby Map Object & Terrain-Dependent Behaviors
*Behaviors driven by proximity to celestial structures, gravity wells, asteroid fields, and static map objects.*

* **`LANDMARK_BOLT_ANCHOR` (Defensive Emplacement & Warp Frigate Protocol)**
  * *Trigger Condition:* Unit approaches a procedural celestial structure (asteroid, moon, planet) accompanied by a Recon Drone anchor[cite: 2].
  * *Behavior:* The unit transitions from mobile transit mode to stationary strategic defense, permanently bolting its physical frame onto the landmark's coordinates to leverage structural cover[cite: 2].
* **`GRAVITATIONAL_OBSTACLE_ROUTING` (Heavy Capital Navigation)**
  * *Trigger Condition:* Pathfinding vector intersects high-mass gravity wells or dense asteroid clusters.
  * *Behavior:* Command ships and heavy vanguard units calculate wide orbital arcs around the hazard, protecting vulnerable aft propulsion quadrants from environmental ambushes.
* **`ANOMALY_STANDOFF_ORBIT` (Recon Probe Exploration)**
  * *Trigger Condition:* Recon Probe enters proximity of an uncharted resource node or spatial anomaly[cite: 1, 2].
  * *Behavior:* Stabilizes into a high-speed ~1,800m orbital standoff around the structure, maintaining continuous radar telemetry sweeps while avoiding direct collision vectors[cite: 1, 2].

---

## 4. Kill-Streak & Enemy Attrition Momentum (Enemy Destroyed Triggers)
*Behavioral shifts triggered by accumulated enemy casualties across the sector.*

* **`VANGUARD_BREAK_THROUGH` (Offensive Shift)**
  * *Trigger Condition:* 3+ enemy screening units or defensive emplacements are destroyed in the local sector[cite: 2].
  * *Behavior:* Surviving frontline vanguard units (`Aegis Walls`, `Command Escorts`) transition from a static defensive `GUARD` hold to an aggressive forward `SEEK` push, exploiting the created gap in the enemy line.
* **`DECAPITATION_MORALE_DISRUPTION` (Command Shock)**
  * *Trigger Condition:* Enemy Battalion Command Ship or Flagship is destroyed[cite: 2].
  * *Behavior:* Subordinate enemy units in the surrounding zone suffer a tactical command breakdown, temporarily pausing their attack vectors or entering a fragmented, uncoordinated panic retreat.

---

## 5. Friendly Attrition, Deployment & Repair Count Triggers
*Behaviors dependent on the current operational state, casualty rates, and active repair loads of friendly forces.*

* **`REPAIR_QUEUE_SATURATION_DISTRESS` (Logistics Escalation)**
  * *Trigger Condition:* An Aegis Repair Corvette's active triage queue exceeds 3 damaged units simultaneously[cite: 2].
  * *Behavior:* Automatically broadcasts an automated distress ping to the nearest Supply Tender or Battalion Command Ship, requesting secondary repair support or logistics redeployment.
* **`DEPLOYMENT_SURGE_FABRICATION` (Command Anchor Protocol)**
  * *Trigger Condition:* Regional squad operational capacity drops below 50% due to combat attrition[cite: 2].
  * *Behavior:* Battalion command ships monitor active friendly unit counts and automatically accelerate production and launch queues for replacement light/medium defense units.
* **`CASUALTY_THRESHOLD_FALLBACK` (Squad Morale Gate)**
  * *Trigger Condition:* Squad casualty rate hits or exceeds 50% within a single tick window.
  * *Behavior:* Surviving squad members override aggressive combat doctrines (`SEEK`, `FLANK`) to execute an automated `RETREAT` vector back toward the nearest active port or repair tender[cite: 2].

---

## 6. Distinct Warp Drive & Wormhole Protocols
*Strategic spatial folding, jump anchoring, and wormhole manipulation unique to 5W Relay Warp Frigates and Flagships[cite: 2].*

* **`QUANTUM_TOW_EVACUATION` (Emergency Warp Protocol)**
  * *Trigger Condition:* Sector-wide retreat order issued by the Flagship or triggered by critical command hull damage[cite: 2].
  * *Behavior:* The Relay Warp Frigate anchors to a forward Recon Probe and opens a massive quantum wormhole, pulling all attached squad and battalion units through a folded spatial transit simultaneously to safety[cite: 2].
* **`STABILIZED_JUMP_CORRIDOR` (Reinforcement Transit)**
  * *Trigger Condition:* Manual command input or automated reinforcement trigger[cite: 2].
  * *Behavior:* The Warp Frigate consumes 1 of its maximum 10 Warp Canisters to maintain an open wormhole bridge, enabling instant reinforcement deployment directly from the Flagship drydock to the frontline Recon anchor[cite: 2].
* **`COLLAPSE_INWARD_DEFENSE` (Final Collapse Protocol)**
  * *Trigger Condition:* Relay Warp Frigate shields fail and core hull is critically compromised[cite: 2].
  * *Behavior:* Aborts all transit operations and implodes its quantum core permanently, instantly closing active enemy wormhole pathways in the sector and dealing heavy localized spatial distortion damage[cite: 2].

.
.
.


