package spacePirates

import (
	"space-tactics-server/internal/db"
	SpacePirates "space-tactics-server/internal/generated/SpacePirates"
	"space-tactics-server/internal/models"

	"github.com/gorilla/websocket"
)

const (
	TickRateHz = 60
	MaxSeats   = 4
)

type Vec2 struct {
	X float64
	Y float64
}

type QuadrantVitals struct {
	Front     float64
	Rear      float64
	Port      float64
	Starboard float64
}

func NewUniformVitals(base float64) QuadrantVitals {
	return QuadrantVitals{Front: base, Rear: base, Port: base, Starboard: base}
}

type Seat struct {
	SeatIndex        int8
	Occupied         bool
	Conn             *websocket.Conn
	PlayerID         int
	SessionID        int64
	Username         string
	BalanceCents     int64
	ActiveMultiplier uint8
	TotalWagered     int64
	TotalWon         int64
	UnitsDeployed    int
	UnitsForfeited   int
}

type Unit struct {
	ID            string
	UnitType      string
	FactionRole   string // "player", "house_harvester", "house_escort", "house_boss"
	OwnerID       string
	SeatIndex     int8 // -1 = House, 0..3 = Player seat
	IsHouse       bool
	WeightClass   int
	Pos           Vec2
	Vel           Vec2
	Angle         float64
	Shields       QuadrantVitals
	Hull          QuadrantVitals
	Speed         float64
	TurnRate      float64
	IsFiring      bool
	IsDestroyed   bool
	IsSquadLeader bool
	SquadID       int32
	AIState       string
	BuddyID       string // Links House escorts to their Harvester/Boss VIP

	// Combat & Ammo
	Cooldown        int
	MaxCooldown     int
	CurrentAmmo     int
	MaxAmmo         int
	DamagePerShot   float64
	ProjectileSpeed float64
	ProjectileRange float64
	OptimalRange    float64
	ProjType        string
	CanFire         bool
	BetMultiplier   uint8

	// Cryo Flak payload specs
	CryoRadius   float64
	CryoDuration int
	CryoSlow     float64

	// Universal Environment Physics Runtime State (recomputed each tick)
	IsStealthed  bool
	EnvDragScale float64
	EnvAccel     Vec2

	// House Harvester / Boss fields
	IsHarvester       bool
	IsBoss            bool
	ResourceKey       string
	ResourceType      SpacePirates.ResourceType
	TargetClusterID   uint32
	TargetNodeID      uint32
	HarvestTicks      int
	FillDurationTicks int
	BaseBountyCents   int64
	MaxCargoCents     int64

	// Escort "cutting the pie" sweep state
	SweepPhase float64
}

type Projectile struct {
	ID            string
	OwnerID       string
	SeatIndex     int8
	IsHouse       bool
	ProjType      string
	Pos           Vec2
	Vel           Vec2
	Life          int
	Damage        float64
	BetMultiplier uint8
	CryoRadius    float64
	CryoDuration  int
	CryoSlow      float64
	RefractedBy   map[uint32]bool // Tracks Singularity Rifts that already refracted this shot
}

type PayoutEvent struct {
	EventID     uint64
	SeatIndex   int8
	UnitType    string
	Pos         Vec2
	PayoutCents int64
	Multiplier  uint8
	WasBoss     bool
}

// AsteroidNode is kept as a lightweight resource-node projection for harvester AI compatibility.
type AsteroidNode struct {
	ID           uint32
	ClusterID    uint32
	LocalDX      float64
	LocalDY      float64
	Pos          Vec2
	Vel          Vec2
	Radius       float64
	IsNode       bool
	ResourceKey  string
	ResourceType SpacePirates.ResourceType
}

type ActiveCluster struct {
	ID             uint32
	VariantID      int
	Center         Vec2
	Vel            Vec2
	Angle          float64
	SpinRate       float64
	Scale          float64
	BoundingRadius float64
	WrapsRemaining int
	Nodes          []*AsteroidNode
}

// EnvComponent is a runtime component inside an ActiveEnvObject.
type EnvComponent struct {
	ID           uint32
	ObjectID     uint32
	Kind         string
	KindEnum     SpacePirates.EnvComponentKind
	LocalDX      float64
	LocalDY      float64
	Pos          Vec2
	Vel          Vec2
	Radius       float64
	InnerRadius  float64
	IsNode       bool
	ResourceKey  string
	ResourceType SpacePirates.ResourceType
	ColorHex     string
}

// ActiveEnvObject is a live celestial body / tactical hazard in the Space Pirates arena.
type ActiveEnvObject struct {
	ID             uint32
	BlueprintID    int
	ObjectType     string
	ObjectTypeEnum SpacePirates.EnvObjectType
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

type CryoCloud struct {
	ID             uint32
	OwnerID        string
	SeatIndex      int8
	Pos            Vec2
	Radius         float64
	RemainingTicks uint16
	MaxTicks       uint16
	SlowFactor     float64
	DamagePerTick  float64
	BetMultiplier  uint8
}

// SeatSpawnPoints returns the 4 corner spawn coordinates for the active arena dimensions.
func SeatSpawnPoints(arenaW, arenaH float64) [MaxSeats]Vec2 {
	const margin = 150.0
	return [MaxSeats]Vec2{
		{X: margin, Y: margin},                   // 0: NW
		{X: arenaW - margin, Y: margin},          // 1: NE
		{X: margin, Y: arenaH - margin},          // 2: SW
		{X: arenaW - margin, Y: arenaH - margin}, // 3: SE
	}
}

// GetUnitConfig fetches a Space Pirates unit config from the live PostgreSQL cache.
func GetUnitConfig(factionRole, unitClass string) (models.SPUnitConfig, bool) {
	db.SPCache.Mu.RLock()
	defer db.SPCache.Mu.RUnlock()
	cfg, ok := db.SPCache.Units[factionRole+":"+unitClass]
	return cfg, ok
}

func ParseEnvObjectType(s string) SpacePirates.EnvObjectType {
	switch s {
	case "major_world":
		return SpacePirates.EnvObjectTypeMajorWorld
	case "mineral_planetoid":
		return SpacePirates.EnvObjectTypeMineralPlanetoid
	case "gas_giant":
		return SpacePirates.EnvObjectTypeGasGiant
	case "nebula_field":
		return SpacePirates.EnvObjectTypeNebulaField
	case "singularity_rift":
		return SpacePirates.EnvObjectTypeSingularityRift
	case "moon":
		return SpacePirates.EnvObjectTypeMoon
	case "asteroid_belt":
		return SpacePirates.EnvObjectTypeAsteroidBelt
	case "asteroid_cluster":
		return SpacePirates.EnvObjectTypeAsteroidCluster
	case "comet":
		return SpacePirates.EnvObjectTypeComet
	default:
		return SpacePirates.EnvObjectTypeUnknown
	}
}

func ParseEnvComponentKind(s string) SpacePirates.EnvComponentKind {
	switch s {
	case "solid_rock":
		return SpacePirates.EnvComponentKindSolidRock
	case "resource_node":
		return SpacePirates.EnvComponentKindResourceNode
	case "solid_core":
		return SpacePirates.EnvComponentKindSolidCore
	case "cave_mouth":
		return SpacePirates.EnvComponentKindCaveMouth
	case "crater_node":
		return SpacePirates.EnvComponentKindCraterNode
	case "gas_core":
		return SpacePirates.EnvComponentKindGasCore
	case "gas_deep":
		return SpacePirates.EnvComponentKindGasDeep
	case "gas_outer":
		return SpacePirates.EnvComponentKindGasOuter
	case "nebula_blob":
		return SpacePirates.EnvComponentKindNebulaBlob
	case "rift_core":
		return SpacePirates.EnvComponentKindRiftCore
	case "rift_field":
		return SpacePirates.EnvComponentKindRiftField
	case "comet_core":
		return SpacePirates.EnvComponentKindCometCore
	default:
		return SpacePirates.EnvComponentKindSolidRock
	}
}
