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
	CryoRadius    float64
	CryoDuration  int
	CryoSlow      float64

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

type AsteroidNode struct {
	ID           uint32
	ClusterID    uint32
	LocalDX      float64 // Scaled local offset from cluster center
	LocalDY      float64
	Pos          Vec2    // World position (updated each tick)
	Vel          Vec2    // Mirrors parent cluster drift velocity
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
