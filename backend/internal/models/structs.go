package models

import "encoding/json"

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success  bool   `json:"success"`
	Message  string `json:"message,omitempty"`
	PlayerID int    `json:"playerId,omitempty"`
	Username string `json:"username,omitempty"`
}

type SaveLoadoutRequest struct {
	PlayerID         int             `json:"playerId"`
	LoadoutIndex     int             `json:"loadoutIndex"`
	Name             string          `json:"name"`
	FleetComposition json.RawMessage `json:"fleetComposition"`
	Squad1           json.RawMessage `json:"squad1"`
	Squad2           json.RawMessage `json:"squad2"`
	Squad3           json.RawMessage `json:"squad3"`
	Squad4           json.RawMessage `json:"squad4"`
}

type PlayerLoadout struct {
	ID               int             `json:"id"`
	PlayerID         int             `json:"playerId"`
	LoadoutIndex     int             `json:"loadoutIndex"`
	Name             string          `json:"name"`
	FleetComposition json.RawMessage `json:"fleetComposition"`
	Squad1           json.RawMessage `json:"squad1"`
	Squad2           json.RawMessage `json:"squad2"`
	Squad3           json.RawMessage `json:"squad3"`
	Squad4           json.RawMessage `json:"squad4"`
}

type Vector2D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type QuadrantStats struct {
	Front     float64 `json:"front"`
	Rear      float64 `json:"rear"`
	Port      float64 `json:"port"`
	Starboard float64 `json:"starboard"`
}

// UnitTemplate maps directly to the unit_templates PostgreSQL table blueprint[cite: 6].
type UnitTemplate struct {
	UnitClass                        string          `db:"unit_class" json:"unit_class"`
	Speed                            float64         `db:"speed" json:"speed"`
	MaxCooldown                      int             `db:"max_cooldown" json:"max_cooldown"`
	ShieldBase                       float64         `db:"shield_base" json:"shield_base"`
	HullBase                         float64         `db:"hull_base" json:"hull_base"`
	AIDefaultState                   string          `db:"ai_default_state" json:"ai_default_state"`
	AggroRange                       float64         `db:"aggro_range" json:"aggro_range"`
	WeightClass                      int             `db:"weight_class" json:"weight_class"`
	VisionRange                      int             `db:"vision_range" json:"vision_range"`
	DPS                              float64         `db:"dps" json:"dps"`
	StrafingSpeed                    float64         `db:"strafing_speed" json:"strafing_speed"`
	TurnRate                         float64         `db:"turn_rate" json:"turn_rate"`
	ShieldRegenRate                  float64         `db:"shield_regen_rate" json:"shield_regen_rate"`
	ArmorMitigation                  float64         `db:"armor_mitigation" json:"armor_mitigation"`
	ProjectileRange                  float64         `db:"projectile_range" json:"projectile_range"`
	ProjectileSpeed                  float64         `db:"projectile_speed" json:"projectile_speed"`
	AmmoCapacity                     int             `db:"ammo_capacity" json:"ammo_capacity"`
	AngularVelocity                  float64         `db:"angular_velocity" json:"angular_velocity"`
	LateralThrustPower               float64         `db:"lateral_thrust_power" json:"lateral_thrust_power"`
	ReverseThrustPower               float64         `db:"reverse_thrust_power" json:"reverse_thrust_power"`
	DriftCoefficient                 float64         `db:"drift_coefficient" json:"drift_coefficient"`
	AccelerationCurve                float64         `db:"acceleration_curve" json:"acceleration_curve"`
	QuadrantShieldingEnabled         bool            `db:"quadrant_shielding_enabled" json:"quadrant_shielding_enabled"`
	ShieldRechargeDelayTicks         int             `db:"shield_recharge_delay_ticks" json:"shield_recharge_delay_ticks"`
	ArmorHardnessRating              float64         `db:"armor_hardness_rating" json:"armor_hardness_rating"`
	AblativePlatingDurability        float64         `db:"ablative_plating_durability" json:"ablative_plating_durability"`
	SubsystemVulnerabilityMask       json.RawMessage `db:"subsystem_vulnerability_mask" json:"subsystem_vulnerability_mask"`
	TurretTraverseSpeed              float64         `db:"turret_traverse_speed" json:"turret_traverse_speed"`
	WeaponDispersionBloom            float64         `db:"weapon_dispersion_bloom" json:"weapon_dispersion_bloom"`
	ProjectileTrackingCapability     float64         `db:"projectile_tracking_capability" json:"projectile_tracking_capability"`
	OptimalRange                     float64         `db:"optimal_range" json:"optimal_range"`
	MaxRange                         float64         `db:"max_range" json:"max_range"`
	ShieldPenetrationFactor          float64         `db:"shield_penetration_factor" json:"shield_penetration_factor"`
	MaxThermalCapacity               float64         `db:"max_thermal_capacity" json:"max_thermal_capacity"`
	ThermalDissipationRate           float64         `db:"thermal_dissipation_rate" json:"thermal_dissipation_rate"`
	PowerGridAllocationWeight        float64         `db:"power_grid_allocation_weight" json:"power_grid_allocation_weight"`
	SustainedFireLimitSeconds        float64         `db:"sustained_fire_limit_seconds" json:"sustained_fire_limit_seconds"`
	BarrelCoolingDurationSeconds     float64         `db:"barrel_cooling_duration_seconds" json:"barrel_cooling_duration_seconds"`
	RadarCrossSection                float64         `db:"radar_cross_section" json:"radar_cross_section"`
	SensorResolutionTier             int             `db:"sensor_resolution_tier" json:"sensor_resolution_tier"`
	JammingSusceptibility            float64         `db:"jamming_susceptibility" json:"jamming_susceptibility"`
	TargetLockTime                   float64         `db:"target_lock_time" json:"target_lock_time"`
	RetreatMoraleThreshold           float64         `db:"retreat_morale_threshold" json:"retreat_morale_threshold"`
	AggroThreatWeight                float64         `db:"aggro_threat_weight" json:"aggro_threat_weight"`
	SquadCohesionLeashRange          float64         `db:"squad_cohesion_leash_range" json:"squad_cohesion_leash_range"`
	RequiresAnchorDrone              bool            `db:"requires_anchor_drone" json:"requires_anchor_drone"`
	IsStationaryAfterDeployment      bool            `db:"is_stationary_after_deployment" json:"is_stationary_after_deployment"`
	SalvageableUponDestruction       bool            `db:"salvageable_upon_destruction" json:"salvageable_upon_destruction"`
	EngagementRangeCap               float64         `db:"engagement_range_cap" json:"engagement_range_cap"`
	DirectionalShieldArc             float64         `db:"directional_shield_arc" json:"directional_shield_arc"`
	AsymmetricVulnerabilityEnabled   bool            `db:"asymmetric_vulnerability_enabled" json:"asymmetric_vulnerability_enabled"`
	QuadrantShieldPoolsEnabled       bool            `db:"quadrant_shield_pools_enabled" json:"quadrant_shield_pools_enabled"`
	RearHullBoostScalingEnabled      bool            `db:"rear_hull_boost_scaling_enabled" json:"rear_hull_boost_scaling_enabled"`
	FrontQuadrantWeaponInterlock     bool            `db:"front_quadrant_weapon_interlock" json:"front_quadrant_weapon_interlock"`
	AftQuadrantPropulsionPenalty     bool            `db:"aft_quadrant_propulsion_penalty" json:"aft_quadrant_propulsion_penalty"`
	PortDockingBayStatus             bool            `db:"port_docking_bay_status" json:"port_docking_bay_status"`
	StarboardDeploymentBayStatus     bool            `db:"starboard_deployment_bay_status" json:"starboard_deployment_bay_status"`
	SustainedFireDurationLimit       float64         `db:"sustained_fire_duration_limit" json:"sustained_fire_duration_limit"`
	BarrelCoolingDuration            float64         `db:"barrel_cooling_duration" json:"barrel_cooling_duration"`
	BurstSalvoCooldown               float64         `db:"burst_salvo_cooldown" json:"burst_salvo_cooldown"`
	BeamRaycastDuration              float64         `db:"beam_raycast_duration" json:"beam_raycast_duration"`
	RadarImmunityActive              bool            `db:"radar_immunity_active" json:"radar_immunity_active"`
	ShieldGatedStealthThreshold      float64         `db:"shield_gated_stealth_threshold" json:"shield_gated_stealth_threshold"`
	DecloakOnActionFlag              bool            `db:"decloak_on_action_flag" json:"decloak_on_action_flag"`
	StealthRecoveryDelaySeconds      float64         `db:"stealth_recovery_delay_seconds" json:"stealth_recovery_delay_seconds"`
	ResourceHarvestingType           int             `db:"resource_harvesting_type" json:"resource_harvesting_type"`
	RequiresReconTelemetry           bool            `db:"requires_recon_telemetry" json:"requires_recon_telemetry"`
	RepairResourceRequirementMask    json.RawMessage `db:"repair_resource_requirement_mask" json:"repair_resource_requirement_mask"`
	InitialOrdnanceCapacity          int             `db:"initial_ordnance_capacity" json:"initial_ordnance_capacity"`
	CryoGasRadius                    float64         `db:"cryo_gas_radius" json:"cryo_gas_radius"`
	CryoEffectDuration               float64         `db:"cryo_effect_duration" json:"cryo_effect_duration"`
	GravitonVortexDuration           float64         `db:"graviton_vortex_duration" json:"graviton_vortex_duration"`
	RequiresReconAnchor              bool            `db:"requires_recon_anchor" json:"requires_recon_anchor"`
	IsStationaryLandmarkBound        bool            `db:"is_stationary_landmark_bound" json:"is_stationary_landmark_bound"`
	WarpCanisterCapacity             int             `db:"warp_canister_capacity" json:"warp_canister_capacity"`
	EmergencyWarpEvacuationTarget    bool            `db:"emergency_warp_evacuation_target" json:"emergency_warp_evacuation_target"`
	QuadrantHullPoolsEnabled         bool            `db:"quadrant_hull_pools_enabled" json:"quadrant_hull_pools_enabled"`
}

type FleetUnit struct {
	ID          string        `json:"id"`
	Type        string        `json:"type"`
	OwnerID     string        `json:"ownerId"`
	Pos         Vector2D      `json:"pos"`
	Vel         Vector2D      `json:"vel"`
	Angle       float64       `json:"angle"`
	Shields     QuadrantStats `json:"shields"`
	Hull        QuadrantStats `json:"hull"`
	IsFiring    bool          `json:"isFiring"`
	IsDestroyed bool          `json:"isDestroyed"`
	Cooldown    int           `json:"cooldown"`
	MaxCooldown int           `json:"-"`
	Speed       float64       `json:"-"`
	AIState     string        `json:"aiState"`
	WeightClass int           `json:"weightClass"`
	VisionRange int           `json:"visionRange"`
	DPS         float64       `json:"dps"`

	// --- Tactical & Hierarchical Extensions[cite: 3] ---
	SquadID              int    `json:"squadId"`
	IsSquadLeader        bool   `json:"isSquadLeader"`
	IsBattalionCommander bool   `json:"isBattalionCommander"`
	BuddyID              string `json:"buddyId"`

	// --- Resource & Logistics Tracking (Flagships, Command Ships, Harvesters, Repair, Supply)[cite: 3] ---
	ResourceCache       float64 `json:"resourceCache"`
	MaxResourceCapacity float64 `json:"maxResourceCapacity"`

	// --- Advanced Combat, Thermal & Stealth State Tracking ---
	CurrentThermal      float64 `json:"currentThermal"`
	MaxThermalCapacity  float64 `json:"maxThermalCapacity"`
	CurrentAmmo         int     `json:"currentAmmo"`
	MaxAmmoCapacity     int     `json:"maxAmmoCapacity"`
	StealthActive       bool    `json:"stealthActive"`
	RadarImmunityActive bool    `json:"radarImmunityActive"`
	StealthTimer        float64 `json:"stealthTimer"`
}

type Projectile struct {
	ID      string   `json:"id"`
	Pos     Vector2D `json:"pos"`
	Vel     Vector2D `json:"vel"`
	OwnerID string   `json:"ownerId"`
	Type    string   `json:"type"`
	Life    int      `json:"life"`
	Damage  float64  `json:"-"`
}

type ClientInput struct {
	W        bool    `json:"w"`
	S        bool    `json:"s"`
	A        bool    `json:"a"`
	D        bool    `json:"d"`
	Angle    float64 `json:"angle"`
	IsFiring bool    `json:"isFiring"`
	Reset    bool    `json:"reset"`
	Deploy   string  `json:"deploy"`
}

type ServerState struct {
	Units       []*FleetUnit `json:"units"`
	Projectiles []Projectile `json:"projectiles"`
	MapBounds   struct { Width float64 `json:"width"`; Height float64 `json:"height"` } `json:"mapBounds"`
	Tick        uint64       `json:"tick"`
}

type EnvironmentalStructure struct {
	ID                int             `json:"id"`
	StructureKey      string          `json:"structureKey"`
	Name              string          `json:"name"`
	Category          string          `json:"category"`
	DefaultRadius     float64         `json:"defaultRadius"`
	MinRadius         float64         `json:"minRadius,omitempty"`
	MaxRadius         float64         `json:"maxRadius,omitempty"`
	IsResizable       bool            `json:"isResizable"`
	IsIndestructible  bool            `json:"isIndestructible"`
	ResourceYieldType *int            `json:"resourceYieldType,omitempty"`
	CustomMetadata    json.RawMessage `json:"customMetadata,omitempty"`
}

type MapDefinition struct {
	ID          int             `json:"id"`
	MapKey      string          `json:"mapKey"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Width       float64         `json:"width"`
	Height      float64         `json:"height"`
	Structures  []MapStructure  `json:"structures,omitempty"`
}

type MapStructure struct {
	ID                         int                      `json:"id"`
	MapID                      int                      `json:"mapId"`
	EnvironmentalStructureID   int                      `json:"environmentalStructureId"`
	StructureType              string                   `json:"structureType"`
	PosX                       float64                  `json:"posX"`
	PosY                       float64                  `json:"posY"`
	Radius                     float64                  `json:"radius"`
	CustomProps                json.RawMessage          `json:"customProps,omitempty"`
	Blueprint                  *EnvironmentalStructure  `json:"blueprint,omitempty"`
}
