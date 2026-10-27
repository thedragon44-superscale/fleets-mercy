# Comprehensive Unit Configuration & Tuning Manual

This document provides a detailed breakdown of every configurable variable in `UnitConfigConfigPayload`. Use this reference to effectively balance and tune unit classes across your fleet.

---

## 1. Core Identification & Spatial Awareness
Variables governing unit mass classification, target acquisition range, and squad formation bounds.

* **`weightClass`** *(number: 1–5)*
  * **Effect**: Sets the tactical footprint and fleet allocation weight of the unit (1W = Light, 2W = Support/Harvester, 3W = Medium, 4W = Heavy, 5W = Capital).
  * **In-Game Manifestation**: Determines how many slots a unit consumes in a loadout/squad and dictates its geometric icon representation on the tactical radar.
* **`visionRange`** *(number: pixels)*
  * **Effect**: Baseline visual detection radius for direct line-of-sight tracking.
  * **In-Game Manifestation**: Controls the physical distance at which a unit can independently see and identify enemy targets without external radar telemetry.
* **`sensorRange`** *(number: pixels)*
  * **Effect**: Data-driven circular radar broadcast bubble radius.
  * **In-Game Manifestation**: Renders an illuminated sensor bubble on the tactical radar (especially prominent on units like Recon Probes), exposing enemy signatures and environmental structures through the Fog of War for the entire fleet.
* **`aggroRange`** *(number: pixels)*
  * **Effect**: Autonomous threat engagement threshold distance.
  * **In-Game Manifestation**: Dictates how far away an unassigned or patrolling unit will scan before auto-acquiring an approaching enemy as an active combat target.
* **`aggroThreatWeight`** *(number: multiplier)*
  * **Effect**: Priority multiplier used by the target selection algorithm.
  * **In-Game Manifestation**: Higher values cause the unit to prioritize high-dps or capital threats over the nearest target; lower values cause it to focus strictly on proximity.
* **`retreatMoraleThreshold`** *(number: 0.0 – 1.0)*
  * **Effect**: Integrity percentage circuit-breaker trigger (e.g., `0.25` = 25% health).
  * **In-Game Manifestation**: When total hull/shield health drops below this ratio, the unit immediately breaks combat routines, disables weapons, and boosts back toward the nearest active port or command ship.
* **`squadCohesionLeashRange`** *(number: pixels)*
  * **Effect**: Maximum allowable distance from the designated Squad Leader.
  * **In-Game Manifestation**: Subordinates that drift beyond this radius abort independent target chasing and vector directly back toward the squad anchor to reform ranks.

---

## 2. Vitals, Health & Directional Shield Systems
Variables managing hit points, directional quadrant damage, and mitigation mechanics.

* **`shieldBase`** *(number: HP)*
  * **Effect**: Baseline hit-point pool for shield generators.
  * **In-Game Manifestation**: Sets maximum capacity for energy shield protection (applied per quadrant if quadrant shielding is active).
* **`hullBase`** *(number: HP)*
  * **Effect**: Physical structural integrity pool.
  * **In-Game Manifestation**: Baseline armor health before destruction; taking hull damage triggers critical subsystem failures or destruction.
* **`quadrantShieldingEnabled`** *(boolean)*
  * **Effect**: Enables 4-way directional energy shielding (Front, Rear, Port, Starboard).
  * **In-Game Manifestation**: Forces incoming fire to hit specific directional shield faces based on impact angle rather than a single unified pool.
* **`quadrantShieldPoolsEnabled`** *(boolean)*
  * **Effect**: Toggles independent HP pools for each shield quadrant.
  * **In-Game Manifestation**: When enabled, depleting the Front shield leaves Port/Starboard/Rear shields intact, requiring tactical angling of the ship.
* **`quadrantHullPoolsEnabled`** *(boolean)*
  * **Effect**: Toggles independent HP pools for physical hull quadrants.
  * **In-Game Manifestation**: Allows targeted structural damage (e.g., rear hull damage compromising main thrusters).
* **`shieldRegenRate`** *(number: HP / tick)*
  * **Effect**: Passive energy shield recovery speed.
  * **In-Game Manifestation**: Dictates how quickly depleted shield pools recharge once out of combat.
* **`shieldRechargeDelayTicks`** *(number: server ticks)*
  * **Effect**: Cooldown delay following shield damage.
  * **In-Game Manifestation**: The exact number of ticks (1 tick = 16ms) a ship must refrain from taking damage before shield regeneration activates.
* **`directionalShieldArc`** *(number: degrees, e.g., 180.0)*
  * **Effect**: Firing arc coverage for specialized projected shields (e.g., Aegis Wall).
  * **In-Game Manifestation**: Defines the total angle protected by a forward-projected directional shield barrier.
* **`armorMitigation`** *(number: flat value or percentage)*
  * **Effect**: Flat damage reduction applied to incoming hits against raw hull.
  * **In-Game Manifestation**: High values allow armored brawlers to completely shrug off light rapid-fire laser hits once shields are down.
* **`armorHardnessRating`** *(number: armor tier)*
  * **Effect**: Determines resistance against shield-penetrating or high-caliber armor-piercing rounds.
  * **In-Game Manifestation**: Mitigates heavy kinetic or railgun impacts based on weapon penetration factors.
* **`ablativePlatingDurability`** *(number: HP pool)*
  * **Effect**: Single-use ablative outer layer health.
  * **In-Game Manifestation**: Absorbs initial explosive or thermal shock damage before standard hull mitigation calculations apply.

---

## 3. Movement, Speed & Flight Dynamics
Variables shaping handling, acceleration curves, thruster output, and space-inertia drift.

* **`speed`** *(number: velocity units)*
  * **Effect**: Maximum forward cruising velocity.
  * **In-Game Manifestation**: Controls top speed when traversing open space.
* **`strafingSpeed`** *(number: velocity units)*
  * **Effect**: Maximum lateral (sideways) thruster speed.
  * **In-Game Manifestation**: Allows agile fighters to execute circular strafing runs while keeping weapons locked on target.
* **`turnRate`** *(number: radians/sec)*
  * **Effect**: Angular hull rotation speed.
  * **In-Game Manifestation**: Low values make capital ships turn slowly; high values give light interceptors instant pivot capability.
* **`angularVelocity`** *(number: acceleration rate)*
  * **Effect**: Rotational acceleration speed.
  * **In-Game Manifestation**: Smooths out rotational starting and stopping, giving heavy ships visible rotational mass.
* **`lateralThrustPower`** *(number: force multiplier)*
  * **Effect**: Responsiveness of side dodges and evasive maneuvers.
  * **In-Game Manifestation**: Dictates how quickly a unit can sidestep incoming slow-moving projectiles (like plasma torpedoes).
* **`reverseThrustPower`** *(number: force multiplier)*
  * **Effect**: Rear braking and reverse flight speed.
  * **In-Game Manifestation**: Used by standoff snipers (like Lancer Corvettes) to backpedal away from approaching enemies while firing.
* **`driftCoefficient`** *(number: 0.0 – 1.0)*
  * **Effect**: Newtonian spatial momentum retention.
  * **In-Game Manifestation**: Higher values cause ships to slide and drift when cutting thrusters; lower values result in immediate, tight braking.
* **`accelerationCurve`** *(number: exponent/modifier)*
  * **Effect**: Ramping function from dead stop to max speed.
  * **In-Game Manifestation**: Dictates whether a ship has instant burst acceleration or slow, heavy momentum buildup.

---

## 4. Combat Output, Ordnance & Ballistics
Variables governing offensive damage, fire rates, weapon ranges, dispersion, and thermal limits.

* **`dps`** *(number: damage value)*
  * **Effect**: Baseline damage output applied per weapon cycle or beam raycast tick.
  * **In-Game Manifestation**: Primary calculation factor for shield and hull subtraction.
* **`maxCooldown`** *(number: server ticks)*
  * **Effect**: Mandatory delay between firing cycles.
  * **In-Game Manifestation**: Controls fire rate (e.g., 5 ticks = rapid Gatling fire; 60 ticks = slow heavy artillery cannon).
* **`projectileRange`** *(number: pixels)*
  * **Effect**: Maximum travel distance of emitted ordnance before expiration.
  * **In-Game Manifestation**: Defines bullet/missile despawn boundaries.
* **`projectileSpeed`** *(number: velocity units)*
  * **Effect**: Forward speed of fired projectiles.
  * **In-Game Manifestation**: Dictates required target leading; fast projectiles hit instantly, while slow projectiles can be dodged.
* **`optimalRange`** *(number: pixels)*
  * **Effect**: Ideal engagement standoff distance for combat AI logic.
  * **In-Game Manifestation**: AI state machines endeavor to maintain this exact distance from their target while attacking.
* **`maxRange`** *(number: pixels)*
  * **Effect**: Absolute maximum weapon reach before damage falloff or weapon disengagement.
  * **In-Game Manifestation**: The outer boundary of target firing eligibility.
* **`engagementRangeCap`** *(number: pixels)*
  * **Effect**: Hard limit on target acquisition for auto-turrets and subordinate units.
  * **In-Game Manifestation**: Prevents ships from pursuing targets beyond their assigned operational zone.
* **`ammoCapacity`** *(number: round count)*
  * **Effect**: Maximum internal reserve for ballistic or missile weapons.
  * **In-Game Manifestation**: Limits continuous combat duration; once depleted, ships must break off to seek a Supply Tender.
* **`initialOrdnanceCapacity`** *(number: starting load)*
  * **Effect**: Starting ammunition pool upon initial spawn/deployment.
  * **In-Game Manifestation**: Controls initial deployment readiness for heavy torpedo or mine assets.
* **`turretTraverseSpeed`** *(number: tracking rate)*
  * **Effect**: Rotation speed of independent weapon turrets relative to hull facing.
  * **In-Game Manifestation**: Controls how quickly turrets track fast-moving interceptors crossing their firing arc.
* **`weaponDispersionBloom`** *(number: angle spread in degrees)*
  * **Effect**: Inaccuracy cone for continuous or rapid fire.
  * **In-Game Manifestation**: Spreads projectiles randomly within a cone, reducing effective accuracy at long range.
* **`projectileTrackingCapability`** *(number: homing turn rate)*
  * **Effect**: Homing capability for guided missiles and smart torpedoes.
  * **In-Game Manifestation**: Higher values allow missiles to track agile targets through evasive maneuvers.
* **`shieldPenetrationFactor`** *(number: 0.0 – 1.0)*
  * **Effect**: Percentage of damage that bypasses active energy shields directly to the hull.
  * **In-Game Manifestation**: Allows specialized weapons (like phase railguns or cryo-flak) to deal direct structural damage through intact shields.
* **`sustainedFireLimitSeconds`** *(number: seconds)*
  * **Effect**: Continuous firing duration before weapon overheating occurs.
  * **In-Game Manifestation**: Forces weapons into temporary cooldown after prolonged continuous fire.
* **`barrelCoolingDurationSeconds`** *(number: seconds)*
  * **Effect**: Recovery time required after weapon thermal lock.
  * **In-Game Manifestation**: The exact duration weapons remain offline after overheating.
* **`burstSalvoCooldown`** *(number: server ticks)*
  * **Effect**: Inter-salvo pause for burst-fire weapons.
  * **In-Game Manifestation**: Pause duration between multi-shot volleys (e.g., 3-round burst -> pause -> 3-round burst).
* **`beamRaycastDuration`** *(number: seconds)*
  * **Effect**: Active beam sweep duration for continuous laser weapons (e.g., Flagship Piercing Core Beam).
  * **In-Game Manifestation**: Controls how long a continuous beam raycast remains active while cutting across targets.
* **`maxThermalCapacity`** *(number: heat units)*
  * **Effect**: Total thermal threshold before heat-seeking penalty or auto-shutdown.
  * **In-Game Manifestation**: Heat budget for high-energy weapons or thruster boosts.
* **`thermalDissipationRate`** *(number: heat units / sec)*
  * **Effect**: Passive heat venting speed.
  * **In-Game Manifestation**: Dictates how quickly thermal buildup cools when weapons/boosters are idle.
* **`powerGridAllocationWeight`** *(number: priority ratio)*
  * **Effect**: Energy routing distribution between Systems, Shields, and Engines.
  * **In-Game Manifestation**: Modifies subsystem performance based on power distribution settings.

---

## 5. Stealth, Radar & Electronic Warfare
Variables controlling radar visibility, cloaking mechanics, lock-on delays, and target suppression.

* **`radarCrossSection`** *(number: RCS size)*
  * **Effect**: Physical signature profile exposed to enemy radar sensors.
  * **In-Game Manifestation**: Large capital ships are visible from farther away; small stealth craft remain hidden until close.
* **`sensorResolutionTier`** *(number: Tier 1–5)*
  * **Effect**: Sensor quality level for cutting through jamming or detecting stealth signatures.
  * **In-Game Manifestation**: Determines whether a unit can detect cloaked Phantom Transports or penetrate Specter Jammer fields.
* **`jammingSusceptibility`** *(number: multiplier)*
  * **Effect**: Vulnerability to Electronic Warfare (EW) interference.
  * **In-Game Manifestation**: Higher values increase target lock-on times and dispersion when operating inside active jamming zones.
* **`targetLockTime`** *(number: seconds)*
  * **Effect**: Required tracking duration before firing guided ordnance or heavy weapons.
  * **In-Game Manifestation**: Delay before missile lock or heavy railgun firing clearance is granted.
* **`radarImmunityActive`** *(boolean)*
  * **Effect**: Complete active radar cloaking (e.g., Phantom Transport).
  * **In-Game Manifestation**: Removes unit signature entirely from enemy tactical radar, making it visible only via direct visual range.
* **`shieldGatedStealthThreshold`** *(boolean / number)*
  * **Effect**: Shield level requirement for maintaining active cloaking.
  * **In-Game Manifestation**: Cloaking breaks automatically if shields drop below this threshold.
* **`decloakOnActionFlag`** *(boolean)*
  * **Effect**: Automatic decloak upon taking offensive action.
  * **In-Game Manifestation**: Firing weapons or dropping mines instantly breaks stealth cover.
* **`stealthRecoveryDelaySeconds`** *(number: seconds)*
  * **Effect**: Silence duration required before re-entering stealth cover.
  * **In-Game Manifestation**: The time a unit must refrain from firing or taking damage before cloaking reactivates.

---

## 6. Logistics, Special Systems & Environmental Operations
Variables managing resource collection, specialized deployment bays, cryo/vortex duration, and warp logistics.

* **`resourceHarvestingType`** *(number: 1–6)*
  * **Effect**: Identifies resource collection capability (1=Ore, 2=Metal, 3=Gas, 4=Volatile, 5=Crystals, 6=Isotopes).
  * **In-Game Manifestation**: Dictates which celestial nodes or nebulas an industrial harvester can extract.
* **`requiresReconTelemetry`** *(boolean)*
  * **Effect**: Mandatory requirement for external radar telemetry.
  * **In-Game Manifestation**: Units with this flag cannot target enemies or locate resource nodes in the Fog of War without an active Recon Probe or Fleet Array broadcast.
* **`requiresAnchorDrone`** *(boolean)*
  * **Effect**: Requirement for a physical Recon anchor to initiate deployment.
  * **In-Game Manifestation**: Used by static assets (like Defensive Gun Emplacements or Relay Warp Frigates) that must latch onto a Recon Probe position.
* **`requiresReconAnchor`** *(boolean)*
  * **Effect**: Secondary validation flag for stationary asset placement.
  * **In-Game Manifestation**: Restricts deployment unless anchored near designated landmarks or scout telemetry nodes.
* **`portDockingBayStatus`** *(boolean)*
  * **Effect**: Active status of Port repair/resupply hangar bays.
  * **In-Game Manifestation**: Allows damaged or depleted light craft to physically dock for repairs and reloading.
* **`starboardDeploymentBayStatus`** *(boolean)*
  * **Effect**: Active status of Starboard drone/interceptor deployment bays.
  * **In-Game Manifestation**: Enables continuous automated launching of reserve strike craft or defense drones.
* **`salvageableUponDestruction`** *(boolean)*
  * **Effect**: Debris field creation flag upon ship destruction.
  * **In-Game Manifestation**: Destroying this ship leaves behind a harvestable wreck field for resource collection.
* **`cryoGasRadius`** *(number: pixels)*
  * **Effect**: Area-of-Effect (AOE) footprint for cryogenic flak detonations.
  * **In-Game Manifestation**: Defines the explosion radius laced with slowing, shield-bypassing cryo gas.
* **`cryoEffectDuration`** *(number: seconds)*
  * **Effect**: Linger duration of deployed cryogenic gas clouds.
  * **In-Game Manifestation**: Time the cloud remains active on the map, slowing thrusters and increasing weapon cooldowns for units inside.
* **`gravitonVortexDuration`** *(number: seconds)*
  * **Effect**: Duration of graviton mine implosion vortices.
  * **In-Game Manifestation**: Time a spatial vortex pulls nearby ships inward and forces cloaked units onto radar.
* **`warpCanisterCapacity`** *(number: canister count)*
  * **Effect**: Reserve capacity for tactical warp folds (e.g., Relay Warp Frigate).
  * **In-Game Manifestation**: Limits total tactical warp jumps or reserve deployments before requiring resupply.
* **`emergencyWarpEvacuationTarget`** *(boolean)*
  * **Effect**: Designates unit as a valid target for emergency squad warp recalls.
  * **In-Game Manifestation**: Allows fleeing squadmates to warp directly to this vessel's coordinates when executing emergency retreats.
