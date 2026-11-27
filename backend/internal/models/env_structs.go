package models

import "encoding/json"

// EnvComponentSpec defines one local-space primitive inside an EnvBlueprint.
type EnvComponentSpec struct {
	ID             string  `json:"id"`
	Kind           string  `json:"kind"` // solid_rock, resource_node, solid_core, cave_mouth, crater_node, gas_core, gas_deep, gas_outer, nebula_blob, rift_core, rift_field, comet_core
	DX             float64 `json:"dx"`
	DY             float64 `json:"dy"`
	Radius         float64 `json:"radius"`
	InnerRadius    float64 `json:"inner_radius"`
	IsNode         bool    `json:"is_node"`
	SlotTier       *string `json:"slot_tier"`       // "common", "mid", "rare", "any", or null
	PinnedResource *string `json:"pinned_resource"` // Optional resource_key override
	ColorHex       *string `json:"color_hex"`
	IsDestructible bool    `json:"is_destructible"` // Reserved inert metadata for future Destructibility Update
}

// OrbitingChildSpec links another EnvBlueprint (typically a moon) in orbit around a parent blueprint.
type OrbitingChildSpec struct {
	ChildBlueprintID int     `json:"child_blueprint_id"`
	OrbitRadius      float64 `json:"orbit_radius"`
	OrbitSpeed       float64 `json:"orbit_speed"`
	StartAngle       float64 `json:"start_angle"`
	Scale            float64 `json:"scale"`
}

// EnvImpactProfile configures weight-scaled high-speed impact damage (e.g., Comets).
type EnvImpactProfile struct {
	MeltMaxWeight         int     `json:"melt_max_weight,omitempty"`
	HeavyDamage           float64 `json:"heavy_damage,omitempty"`
	ShieldAbsorbMinWeight int     `json:"shield_absorb_min_weight,omitempty"`
}

// EnvPhysicsProfile defines data-driven gravity, repulsion, stealth, drag, cover, and impact rules.
type EnvPhysicsProfile struct {
	GravityStrength    float64           `json:"gravity_strength"`
	GravityRadius      float64           `json:"gravity_radius"`
	RepulsionStrength  float64           `json:"repulsion_strength"`
	RepulsionRadius    float64           `json:"repulsion_radius"`
	DragFactor         float64           `json:"drag_factor"`
	DragMaxWeight      int               `json:"drag_max_weight"`
	MaxPassableWeight  int               `json:"max_passable_weight"`
	ProjectileBehavior string            `json:"projectile_behavior"` // "block", "pass", "refract"
	RefractAngleRad    float64           `json:"refract_angle_rad"`
	RadarOpaque        bool              `json:"radar_opaque"`
	VisualRangeMult    float64           `json:"visual_range_mult"`
	ImmuneUnitClasses  []string          `json:"immune_unit_classes"`
	DeepDotDPS         float64           `json:"deep_dot_dps,omitempty"`
	DeepPullWeightMax  int               `json:"deep_pull_weight_max,omitempty"`
	OuterDragFactor    float64           `json:"outer_drag_factor,omitempty"`
	OuterDragMinWeight int               `json:"outer_drag_min_weight,omitempty"`
	ImpactProfile      *EnvImpactProfile `json:"impact_profile,omitempty"`
}

// EnvMotionProfile defines proportional scale and movement behavior.
type EnvMotionProfile struct {
	Mode                   string  `json:"mode"` // "static", "drift_wrap", "orbital", "transient_transit"
	ScaleMin               float64 `json:"scale_min"`
	ScaleMax               float64 `json:"scale_max"`
	SpeedMin               float64 `json:"speed_min"`
	SpeedMax               float64 `json:"speed_max"`
	SpinRate               float64 `json:"spin_rate"`
	MinWraps               int     `json:"min_wraps"`
	MaxWraps               int     `json:"max_wraps"`
	TransitCooldownSeconds int     `json:"transit_cooldown_seconds"`
}

// EnvBlueprint represents a row in PostgreSQL env_blueprints.
type EnvBlueprint struct {
	BlueprintID      int                 `json:"blueprintId"`
	Name             string              `json:"name"`
	ObjectType       string              `json:"objectType"`
	Components       []EnvComponentSpec  `json:"components"`
	OrbitingChildren []OrbitingChildSpec `json:"orbitingChildren"`
	PhysicsProfile   EnvPhysicsProfile   `json:"physicsProfile"`
	MotionProfile    EnvMotionProfile    `json:"motionProfile"`
	BoundingRadius   float64             `json:"boundingRadius"`
	IsEnabled        bool                `json:"isEnabled"`
}

// ModeEnvPoolEntry represents a row in PostgreSQL mode_env_pools.
type ModeEnvPoolEntry struct {
	PoolID        int      `json:"poolId"`
	GameMode      string   `json:"gameMode"`
	RulesetID     int      `json:"rulesetId"`
	BlueprintID   int      `json:"blueprintId"`
	SpawnWeight   int      `json:"spawnWeight"`
	MaxConcurrent int      `json:"maxConcurrent"`
	ScaleOverride *float64 `json:"scaleOverride"`
	IsEnabled     bool     `json:"isEnabled"`
}

// MapEnvPlacement represents a placed blueprint instance in PostgreSQL map_env_placements.
type MapEnvPlacement struct {
	PlacementID       int             `json:"placementId"`
	MapID             int             `json:"mapId"`
	BlueprintID       int             `json:"blueprintId"`
	PosX              float64         `json:"posX"`
	PosY              float64         `json:"posY"`
	Scale             float64         `json:"scale"`
	Angle             float64         `json:"angle"`
	VelX              float64         `json:"velX"`
	VelY              float64         `json:"velY"`
	ParentPlacementID *int            `json:"parentPlacementId"`
	ParentIndex       *int            `json:"parentIndex,omitempty"` // Used during batch map save to resolve newly inserted parents
	OrbitRadius       float64         `json:"orbitRadius"`
	OrbitSpeed        float64         `json:"orbitSpeed"`
	Overrides         json.RawMessage `json:"overrides,omitempty"`
}

// SaveMapPlacementsRequest is the payload for POST /api/env/placements.
type SaveMapPlacementsRequest struct {
	MapID      int               `json:"mapId"`
	Placements []MapEnvPlacement `json:"placements"`
}
