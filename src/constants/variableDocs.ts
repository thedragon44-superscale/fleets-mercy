export interface VariableDoc {
  title: string;
  category: string;
  effect: string;
  manifestation: string;
}

export const VARIABLE_DOCS: Record<string, VariableDoc> = {
  // --- 1. Core Identification & Spatial Awareness ---
  weightClass: {
    title: "Weight Class",
    category: "Core Identification",
    effect: "Sets the tactical footprint and fleet allocation weight of the unit (1W = Light, 2W = Support/Harvester, 3W = Medium, 4W = Heavy, 5W = Capital).",
    manifestation: "Determines how many slots a unit consumes in a loadout/squad and dictates its geometric icon representation on the tactical radar."
  },
  visionRange: {
    title: "Vision Range",
    category: "Core Identification",
    effect: "Baseline visual detection radius for direct line-of-sight tracking.",
    manifestation: "Controls the physical distance at which a unit can independently see and identify enemy targets without external radar telemetry."
  },
  sensorRange: {
    title: "Sensor Range",
    category: "Core Identification",
    effect: "Data-driven circular radar broadcast bubble radius.",
    manifestation: "Renders an illuminated sensor bubble on the tactical radar, exposing enemy signatures and environmental structures through the Fog of War for the entire fleet."
  },
  aggroRange: {
    title: "Aggro Range",
    category: "Core Identification",
    effect: "Autonomous threat engagement threshold distance.",
    manifestation: "Dictates how far away an unassigned or patrolling unit will scan before auto-acquiring an approaching enemy as an active combat target."
  },
  aggroThreatWeight: {
    title: "Aggro Threat Weight",
    category: "Core Identification",
    effect: "Priority multiplier used by the target selection algorithm.",
    manifestation: "Higher values cause the unit to prioritize high-dps or capital threats over the nearest target; lower values cause it to focus strictly on proximity."
  },
  retreatMoraleThreshold: {
    title: "Retreat Morale Threshold",
    category: "Core Identification",
    effect: "Integrity percentage circuit-breaker trigger (e.g., 0.25 = 25% health).",
    manifestation: "When total hull/shield health drops below this ratio, the unit immediately breaks combat routines, disables weapons, and boosts back toward the nearest active port or command ship."
  },
  squadCohesionLeashRange: {
    title: "Squad Cohesion Leash Range",
    category: "Core Identification",
    effect: "Maximum allowable distance from the designated Squad Leader.",
    manifestation: "Subordinates that drift beyond this radius abort independent target chasing and vector directly back toward the squad anchor to reform ranks."
  },

  // --- 2. Vitals, Health & Directional Shield Systems ---
  shieldBase: {
    title: "Shield Base",
    category: "Vitals & Shields",
    effect: "Baseline hit-point pool for shield generators.",
    manifestation: "Sets maximum capacity for energy shield protection (applied per quadrant if quadrant shielding is active)."
  },
  hullBase: {
    title: "Hull Base",
    category: "Vitals & Shields",
    effect: "Physical structural integrity pool.",
    manifestation: "Baseline armor health before destruction; taking hull damage triggers critical subsystem failures or destruction."
  },
  quadrantShieldingEnabled: {
    title: "Quadrant Shielding Enabled",
    category: "Vitals & Shields",
    effect: "Enables 4-way directional energy shielding (Front, Rear, Port, Starboard).",
    manifestation: "Forces incoming fire to hit specific directional shield faces based on impact angle rather than a single unified pool."
  },
  quadrantShieldPoolsEnabled: {
    title: "Quadrant Shield Pools Enabled",
    category: "Vitals & Shields",
    effect: "Toggles independent HP pools for each shield quadrant.",
    manifestation: "When enabled, depleting the Front shield leaves Port/Starboard/Rear shields intact, requiring tactical angling of the ship."
  },
  quadrantHullPoolsEnabled: {
    title: "Quadrant Hull Pools Enabled",
    category: "Vitals & Shields",
    effect: "Toggles independent HP pools for physical hull quadrants.",
    manifestation: "Allows targeted structural damage (e.g., rear hull damage compromising main thrusters)."
  },
  shieldRegenRate: {
    title: "Shield Regen Rate",
    category: "Vitals & Shields",
    effect: "Passive energy shield recovery speed.",
    manifestation: "Dictates how quickly depleted shield pools recharge once out of combat."
  },
  shieldRechargeDelayTicks: {
    title: "Shield Recharge Delay Ticks",
    category: "Vitals & Shields",
    effect: "Cooldown delay following shield damage.",
    manifestation: "The exact number of ticks (1 tick = 16ms) a ship must refrain from taking damage before shield regeneration activates."
  },
  directionalShieldArc: {
    title: "Directional Shield Arc",
    category: "Vitals & Shields",
    effect: "Firing arc coverage for specialized projected shields (e.g., Aegis Wall).",
    manifestation: "Defines the total angle protected by a forward-projected directional shield barrier."
  },
  armorMitigation: {
    title: "Armor Mitigation",
    category: "Vitals & Shields",
    effect: "Flat damage reduction applied to incoming hits against raw hull.",
    manifestation: "High values allow armored brawlers to completely shrug off light rapid-fire laser hits once shields are down."
  },
  armorHardnessRating: {
    title: "Armor Hardness Rating",
    category: "Vitals & Shields",
    effect: "Determines resistance against shield-penetrating or high-caliber armor-piercing rounds.",
    manifestation: "Mitigates heavy kinetic or railgun impacts based on weapon penetration factors."
  },
  ablativePlatingDurability: {
    title: "Ablative Plating Durability",
    category: "Vitals & Shields",
    effect: "Single-use ablative outer layer health.",
    manifestation: "Absorbs initial explosive or thermal shock damage before standard hull mitigation calculations apply."
  },

  // --- 3. Movement, Speed & Flight Dynamics ---
  speed: {
    title: "Max Speed",
    category: "Movement & Physics",
    effect: "Maximum forward cruising velocity.",
    manifestation: "Controls top speed when traversing open space."
  },
  strafingSpeed: {
    title: "Strafing Speed",
    category: "Movement & Physics",
    effect: "Maximum lateral (sideways) thruster speed.",
    manifestation: "Allows agile fighters to execute circular strafing runs while keeping weapons locked on target."
  },
  turnRate: {
    title: "Turn Rate",
    category: "Movement & Physics",
    effect: "Angular hull rotation speed.",
    manifestation: "Low values make capital ships turn slowly; high values give light interceptors instant pivot capability."
  },
  angularVelocity: {
    title: "Angular Velocity",
    category: "Movement & Physics",
    effect: "Rotational acceleration speed.",
    manifestation: "Smooths out rotational starting and stopping, giving heavy ships visible rotational mass."
  },
  lateralThrustPower: {
    title: "Lateral Thrust Power",
    category: "Movement & Physics",
    effect: "Responsiveness of side dodges and evasive maneuvers.",
    manifestation: "Dictates how quickly a unit can sidestep incoming slow-moving projectiles (like plasma torpedoes)."
  },
  reverseThrustPower: {
    title: "Reverse Thrust Power",
    category: "Movement & Physics",
    effect: "Rear braking and reverse flight speed.",
    manifestation: "Used by standoff snipers (like Lancer Corvettes) to backpedal away from approaching enemies while firing."
  },
  driftCoefficient: {
    title: "Drift Coefficient",
    category: "Movement & Physics",
    effect: "Newtonian spatial momentum retention.",
    manifestation: "Higher values cause ships to slide and drift when cutting thrusters; lower values result in immediate, tight braking."
  },
  accelerationCurve: {
    title: "Acceleration Curve",
    category: "Movement & Physics",
    effect: "Ramping function from dead stop to max speed.",
    manifestation: "Dictates whether a ship has instant burst acceleration or slow, heavy momentum buildup."
  },

  // --- 4. Combat Output, Ordnance & Ballistics ---
  dps: {
    title: "Damage Per Second (DPS)",
    category: "Combat & Ballistics",
    effect: "Baseline damage output applied per weapon cycle or beam raycast tick.",
    manifestation: "Primary calculation factor for shield and hull subtraction."
  },
  maxCooldown: {
    title: "Max Cooldown",
    category: "Combat & Ballistics",
    effect: "Mandatory delay between firing cycles.",
    manifestation: "Controls fire rate (e.g., 5 ticks = rapid Gatling fire; 60 ticks = slow heavy artillery cannon)."
  },
  projectileRange: {
    title: "Projectile Range",
    category: "Combat & Ballistics",
    effect: "Maximum travel distance of emitted ordnance before expiration.",
    manifestation: "Defines bullet/missile despawn boundaries."
  },
  projectileSpeed: {
    title: "Projectile Speed",
    category: "Combat & Ballistics",
    effect: "Forward speed of fired projectiles.",
    manifestation: "Dictates required target leading; fast projectiles hit instantly, while slow projectiles can be dodged."
  },
  optimalRange: {
    title: "Optimal Range",
    category: "Combat & Ballistics",
    effect: "Ideal engagement standoff distance for combat AI logic.",
    manifestation: "AI state machines endeavor to maintain this exact distance from their target while attacking."
  },
  maxRange: {
    title: "Max Range",
    category: "Combat & Ballistics",
    effect: "Absolute maximum weapon reach before damage falloff or weapon disengagement.",
    manifestation: "The outer boundary of target firing eligibility."
  },
  engagementRangeCap: {
    title: "Engagement Range Cap",
    category: "Combat & Ballistics",
    effect: "Hard limit on target acquisition for auto-turrets and subordinate units.",
    manifestation: "Prevents ships from pursuing targets beyond their assigned operational zone."
  },
  ammoCapacity: {
    title: "Ammo Capacity",
    category: "Combat & Ballistics",
    effect: "Maximum internal reserve for ballistic or missile weapons.",
    manifestation: "Limits continuous combat duration; once depleted, ships must break off to seek a Supply Tender."
  },
  initialOrdnanceCapacity: {
    title: "Initial Ordnance Capacity",
    category: "Combat & Ballistics",
    effect: "Starting ammunition pool upon initial spawn/deployment.",
    manifestation: "Controls initial deployment readiness for heavy torpedo or mine assets."
  },
  turretTraverseSpeed: {
    title: "Turret Traverse Speed",
    category: "Combat & Ballistics",
    effect: "Rotation speed of independent weapon turrets relative to hull facing.",
    manifestation: "Controls how quickly turrets track fast-moving interceptors crossing their firing arc."
  },
  weaponDispersionBloom: {
    title: "Weapon Dispersion Bloom",
    category: "Combat & Ballistics",
    effect: "Inaccuracy cone for continuous or rapid fire.",
    manifestation: "Spreads projectiles randomly within a cone, reducing effective accuracy at long range."
  },
  projectileTrackingCapability: {
    title: "Projectile Tracking Capability",
    category: "Combat & Ballistics",
    effect: "Homing capability for guided missiles and smart torpedoes.",
    manifestation: "Higher values allow missiles to track agile targets through evasive maneuvers."
  },
  shieldPenetrationFactor: {
    title: "Shield Penetration Factor",
    category: "Combat & Ballistics",
    effect: "Percentage of damage that bypasses active energy shields directly to the hull.",
    manifestation: "Allows specialized weapons (like phase railguns or cryo-flak) to deal direct structural damage through intact shields."
  },
  sustainedFireLimitSeconds: {
    title: "Sustained Fire Limit (Seconds)",
    category: "Combat & Ballistics",
    effect: "Continuous firing duration before weapon overheating occurs.",
    manifestation: "Forces weapons into temporary cooldown after prolonged continuous fire."
  },
  barrelCoolingDurationSeconds: {
    title: "Barrel Cooling Duration (Seconds)",
    category: "Combat & Ballistics",
    effect: "Recovery time required after weapon thermal lock.",
    manifestation: "The exact duration weapons remain offline after overheating."
  },
  burstSalvoCooldown: {
    title: "Burst Salvo Cooldown",
    category: "Combat & Ballistics",
    effect: "Inter-salvo pause for burst-fire weapons.",
    manifestation: "Pause duration between multi-shot volleys (e.g., 3-round burst -> pause -> 3-round burst)."
  },
  beamRaycastDuration: {
    title: "Beam Raycast Duration",
    category: "Combat & Ballistics",
    effect: "Active beam sweep duration for continuous laser weapons (e.g., Flagship Piercing Core Beam).",
    manifestation: "Controls how long a continuous beam raycast remains active while cutting across targets."
  },
  maxThermalCapacity: {
    title: "Max Thermal Capacity",
    category: "Combat & Ballistics",
    effect: "Total thermal threshold before heat-seeking penalty or auto-shutdown.",
    manifestation: "Heat budget for high-energy weapons or thruster boosts."
  },
  thermalDissipationRate: {
    title: "Thermal Dissipation Rate",
    category: "Combat & Ballistics",
    effect: "Passive heat venting speed.",
    manifestation: "Dictates how quickly thermal buildup cools when weapons/boosters are idle."
  },
  powerGridAllocationWeight: {
    title: "Power Grid Allocation Weight",
    category: "Combat & Ballistics",
    effect: "Energy routing distribution between Systems, Shields, and Engines.",
    manifestation: "Modifies subsystem performance based on power distribution settings."
  },

  // --- 5. Stealth, Radar & Electronic Warfare ---
  radarCrossSection: {
    title: "Radar Cross Section (RCS)",
    category: "Stealth & Radar",
    effect: "Physical signature profile exposed to enemy radar sensors.",
    manifestation: "Large capital ships are visible from farther away; small stealth craft remain hidden until close."
  },
  sensorResolutionTier: {
    title: "Sensor Resolution Tier",
    category: "Stealth & Radar",
    effect: "Sensor quality level for cutting through jamming or detecting stealth signatures.",
    manifestation: "Determines whether a unit can detect cloaked Phantom Transports or penetrate Specter Jammer fields."
  },
  jammingSusceptibility: {
    title: "Jamming Susceptibility",
    category: "Stealth & Radar",
    effect: "Vulnerability to Electronic Warfare (EW) interference.",
    manifestation: "Higher values increase target lock-on times and dispersion when operating inside active jamming zones."
  },
  targetLockTime: {
    title: "Target Lock Time",
    category: "Stealth & Radar",
    effect: "Required tracking duration before firing guided ordnance or heavy weapons.",
    manifestation: "Delay before missile lock or heavy railgun firing clearance is granted."
  },
  radarImmunityActive: {
    title: "Radar Immunity Active",
    category: "Stealth & Radar",
    effect: "Complete active radar cloaking (e.g., Phantom Transport).",
    manifestation: "Removes unit signature entirely from enemy tactical radar, making it visible only via direct visual range."
  },
  shieldGatedStealthThreshold: {
    title: "Shield Gated Stealth Threshold",
    category: "Stealth & Radar",
    effect: "Shield level requirement for maintaining active cloaking.",
    manifestation: "Cloaking breaks automatically if shields drop below this threshold."
  },
  decloakOnActionFlag: {
    title: "Decloak On Action Flag",
    category: "Stealth & Radar",
    effect: "Automatic decloak upon taking offensive action.",
    manifestation: "Firing weapons or dropping mines instantly breaks stealth cover."
  },
  stealthRecoveryDelaySeconds: {
    title: "Stealth Recovery Delay (Seconds)",
    category: "Stealth & Radar",
    effect: "Silence duration required before re-entering stealth cover.",
    manifestation: "The time a unit must refrain from firing or taking damage before cloaking reactivates."
  },

  // --- 6. Logistics, Special Systems & Environmental Operations ---
  resourceHarvestingType: {
    title: "Resource Harvesting Type",
    category: "Logistics & Special",
    effect: "Identifies resource collection capability (1=Ore, 2=Metal, 3=Gas, 4=Volatile, 5=Crystals, 6=Isotopes).",
    manifestation: "Dictates which celestial nodes or nebulas an industrial harvester can extract."
  },
  requiresReconTelemetry: {
    title: "Requires Recon Telemetry",
    category: "Logistics & Special",
    effect: "Mandatory requirement for external radar telemetry.",
    manifestation: "Units with this flag cannot target enemies or locate resource nodes in the Fog of War without an active Recon Probe or Fleet Array broadcast."
  },
  requiresAnchorDrone: {
    title: "Requires Anchor Drone",
    category: "Logistics & Special",
    effect: "Requirement for a physical Recon anchor to initiate deployment.",
    manifestation: "Used by static assets (like Defensive Gun Emplacements or Relay Warp Frigates) that must latch onto a Recon Probe position."
  },
  requiresReconAnchor: {
    title: "Requires Recon Anchor",
    category: "Logistics & Special",
    effect: "Secondary validation flag for stationary asset placement.",
    manifestation: "Restricts deployment unless anchored near designated landmarks or scout telemetry nodes."
  },
  portDockingBayStatus: {
    title: "Port Docking Bay Status",
    category: "Logistics & Special",
    effect: "Active status of Port repair/resupply hangar bays.",
    manifestation: "Allows damaged or depleted light craft to physically dock for repairs and reloading."
  },
  starboardDeploymentBayStatus: {
    title: "Starboard Deployment Bay Status",
    category: "Logistics & Special",
    effect: "Active status of Starboard drone/interceptor deployment bays.",
    manifestation: "Enables continuous automated launching of reserve strike craft or defense drones."
  },
  salvageableUponDestruction: {
    title: "Salvageable Upon Destruction",
    category: "Logistics & Special",
    effect: "Debris field creation flag upon ship destruction.",
    manifestation: "Destroying this ship leaves behind a harvestable wreck field for resource collection."
  },
  cryoGasRadius: {
    title: "Cryo Gas Radius",
    category: "Logistics & Special",
    effect: "Area-of-Effect (AOE) footprint for cryogenic flak detonations.",
    manifestation: "Defines the explosion radius laced with slowing, shield-bypassing cryo gas."
  },
  cryoEffectDuration: {
    title: "Cryo Effect Duration",
    category: "Logistics & Special",
    effect: "Linger duration of deployed cryogenic gas clouds.",
    manifestation: "Time the cloud remains active on the map, slowing thrusters and increasing weapon cooldowns for units inside."
  },
  gravitonVortexDuration: {
    title: "Graviton Vortex Duration",
    category: "Logistics & Special",
    effect: "Duration of graviton mine implosion vortices.",
    manifestation: "Time a spatial vortex pulls nearby ships inward and forces cloaked units onto radar."
  },
  warpCanisterCapacity: {
    title: "Warp Canister Capacity",
    category: "Logistics & Special",
    effect: "Reserve capacity for tactical warp folds (e.g., Relay Warp Frigate).",
    manifestation: "Limits total tactical warp jumps or reserve deployments before requiring resupply."
  },
  emergencyWarpEvacuationTarget: {
    title: "Emergency Warp Evacuation Target",
    category: "Logistics & Special",
    effect: "Designates unit as a valid target for emergency squad warp recalls.",
    manifestation: "Allows fleeing squadmates to warp directly to this vessel's coordinates when executing emergency retreats."
  }
};
