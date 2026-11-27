package envphysics

import "space-tactics-server/internal/models"

const TickRateHz = 60

// Vec2 is a mode-agnostic 2D vector for shared environmental simulation.
type Vec2 struct {
	X float64
	Y float64
}

// EnvObjectTypeCode matches the uint8 wire enum in schemas/space_pirates.fbs and schemas/game_state.fbs.
const (
	ObjectTypeUnknown          uint8 = 0
	ObjectTypeMajorWorld       uint8 = 1
	ObjectTypeMineralPlanetoid uint8 = 2
	ObjectTypeGasGiant         uint8 = 3
	ObjectTypeNebulaField      uint8 = 4
	ObjectTypeSingularityRift  uint8 = 5
	ObjectTypeMoon             uint8 = 6
	ObjectTypeAsteroidBelt     uint8 = 7
	ObjectTypeAsteroidCluster  uint8 = 8
	ObjectTypeComet            uint8 = 9
)

// EnvComponentKindCode matches the uint8 wire enum in schemas/space_pirates.fbs and schemas/game_state.fbs.
const (
	KindSolidRock    uint8 = 0
	KindResourceNode uint8 = 1
	KindSolidCore    uint8 = 2
	KindCaveMouth    uint8 = 3
	KindCraterNode   uint8 = 4
	KindGasCore      uint8 = 5
	KindGasDeep      uint8 = 6
	KindGasOuter     uint8 = 7
	KindNebulaBlob   uint8 = 8
	KindRiftCore     uint8 = 9
	KindRiftField    uint8 = 10
	KindCometCore    uint8 = 11
)

func ParseObjectType(s string) uint8 {
	switch s {
	case "major_world":
		return ObjectTypeMajorWorld
	case "mineral_planetoid":
		return ObjectTypeMineralPlanetoid
	case "gas_giant":
		return ObjectTypeGasGiant
	case "nebula_field":
		return ObjectTypeNebulaField
	case "singularity_rift":
		return ObjectTypeSingularityRift
	case "moon":
		return ObjectTypeMoon
	case "asteroid_belt":
		return ObjectTypeAsteroidBelt
	case "asteroid_cluster":
		return ObjectTypeAsteroidCluster
	case "comet":
		return ObjectTypeComet
	default:
		return ObjectTypeUnknown
	}
}

func ParseComponentKind(s string) uint8 {
	switch s {
	case "solid_rock":
		return KindSolidRock
	case "resource_node":
		return KindResourceNode
	case "solid_core":
		return KindSolidCore
	case "cave_mouth":
		return KindCaveMouth
	case "crater_node":
		return KindCraterNode
	case "gas_core":
		return KindGasCore
	case "gas_deep":
		return KindGasDeep
	case "gas_outer":
		return KindGasOuter
	case "nebula_blob":
		return KindNebulaBlob
	case "rift_core":
		return KindRiftCore
	case "rift_field":
		return KindRiftField
	case "comet_core":
		return KindCometCore
	default:
		return KindSolidRock
	}
}

// EnvComponent is one live world-space primitive belonging to an ActiveEnvObject.
type EnvComponent struct {
	ID               uint32
	ObjectID         uint32
	Kind             string
	KindCode         uint8
	LocalDX          float64
	LocalDY          float64
	Pos              Vec2
	Vel              Vec2
	Radius           float64
	InnerRadius      float64
	IsNode           bool
	ResourceKey      string
	ResourceEnumCode uint8
	ColorHex         string
}

// ActiveEnvObject is a live celestial body / tactical hazard shared across all game modes.
type ActiveEnvObject struct {
	ID             uint32
	BlueprintID    int
	PoolID         int // Non-zero for Space Pirates sp_env_pool entries
	ObjectType     string
	ObjectTypeCode uint8
	Center         Vec2
	Vel            Vec2
	Angle          float64
	SpinRate       float64
	Scale          float64
	BoundingRadius float64
	WrapsRemaining int
	ParentObjectID uint32
	OrbitRadius    float64
	OrbitSpeed     float64
	OrbitAngle     float64
	Physics        models.EnvPhysicsProfile
	Motion         models.EnvMotionProfile
	Components     []*EnvComponent
}

// UnitState is a mode-agnostic physics adapter so Space Pirates, Sandbox, and TDM
// all run the exact same environmental physics with zero circular dependencies.
type UnitState struct {
	// Inputs (Pos and Vel are updated in place on solid hitbox contact)
	UnitType    string
	WeightClass int
	Pos         Vec2
	Vel         Vec2
	Radius      float64

	// Outputs populated by StepUnit
	IsStealthed  bool
	DragScale    float64
	Accel        Vec2
	InstantKill  bool
	DamageAmount float64
	DamageSource Vec2
	ShieldDrain  float64
}

// ShipHitboxRadius returns the canonical circular hull hitbox radius shared across
// Sandbox, TDM, and Space Pirates. Aligned 1:1 with the visible 80% hull footprint
// inside the 10%-padded unit PNG sprites (matching src/renderer/spriteRegistry.ts).
func ShipHitboxRadius(unitType string, weightClass int) float64 {
	switch unitType {
	case "flagship", "battalion_command_ship":
		return 37.0
	case "aegis_wall", "warp_frigate":
		return 29.0
	case "torpedo_bomber":
		return 28.0
	case "gun_emplacement":
		return 26.5
	case "lancer_corvette":
		return 25.5
	case "cryo_flak", "specter_jammer":
		return 25.0
	case "assault_gunship", "command_escort", "aegis_repair", "vortex_minelayer":
		return 22.5
	case "mining_barge", "supply_tender", "grav_extractor":
		return 21.0
	case "plasma_skimmer":
		return 20.0
	case "viper_interceptor", "phantom_transport", "ion_interceptor":
		return 18.0
	case "recon_probe":
		return 16.5
	default:
		return ShipRadiusForWeight(weightClass)
	}
}

func ShipRadiusForWeight(weightClass int) float64 {
	if weightClass < 1 {
		weightClass = 1
	}
	return 15.0 + 3.0*float64(weightClass)
}
