package spacePirates

import (
	"math"
	"math/rand"

	"space-tactics-server/internal/game/envphysics"
	SpacePirates "space-tactics-server/internal/generated/SpacePirates"
)

// WorldState wraps the shared envphysics.World for Space Pirates alongside Cryo Flak clouds.
type WorldState struct {
	ArenaWidth  float64
	ArenaHeight float64
	Env         *envphysics.World
	CryoClouds  []*CryoCloud
	nextCloudID uint32
}

func NewWorldState(arenaW, arenaH float64) *WorldState {
	envWorld := envphysics.NewDynamicWorld(arenaW, arenaH)
	return &WorldState{
		ArenaWidth:  envWorld.ArenaWidth,
		ArenaHeight: envWorld.ArenaHeight,
		Env:         envWorld,
		CryoClouds:  make([]*CryoCloud, 0, 16),
	}
}

// Step advances shared dynamic environment objects (sp_env_pool, wraps, orbits, Comets) and decays Cryo clouds.
func (w *WorldState) Step() map[uint32]bool {
	detached := w.Env.StepDynamic()

	activeClouds := w.CryoClouds[:0]
	for _, cloud := range w.CryoClouds {
		if cloud.RemainingTicks > 1 {
			cloud.RemainingTicks--
			activeClouds = append(activeClouds, cloud)
		}
	}
	w.CryoClouds = activeClouds

	return detached
}

func (w *WorldState) FindNodeByID(nodeID uint32) (*AsteroidNode, bool) {
	c, inBounds := w.Env.FindComponentByID(nodeID)
	if c == nil {
		return nil, false
	}
	return &AsteroidNode{
		ID:           c.ID,
		ClusterID:    c.ObjectID,
		Pos:          Vec2{X: c.Pos.X, Y: c.Pos.Y},
		Vel:          Vec2{X: c.Vel.X, Y: c.Vel.Y},
		Radius:       c.Radius,
		IsNode:       c.IsNode,
		ResourceKey:  c.ResourceKey,
		ResourceType: SpacePirates.ResourceType(c.ResourceEnumCode),
	}, inBounds
}

func (w *WorldState) FindNearestResourceNode(pos Vec2, harvesterClass string) (*AsteroidNode, bool) {
	c, ok := w.Env.FindNearestResourceNode(envphysics.Vec2{X: pos.X, Y: pos.Y}, harvesterClass)
	if !ok || c == nil {
		return nil, false
	}
	return &AsteroidNode{
		ID:           c.ID,
		ClusterID:    c.ObjectID,
		Pos:          Vec2{X: c.Pos.X, Y: c.Pos.Y},
		Vel:          Vec2{X: c.Vel.X, Y: c.Vel.Y},
		Radius:       c.Radius,
		IsNode:       c.IsNode,
		ResourceKey:  c.ResourceKey,
		ResourceType: SpacePirates.ResourceType(c.ResourceEnumCode),
	}, true
}

func (w *WorldState) HasLineOfSight(a, b Vec2) bool {
	return w.Env.HasLineOfSight(envphysics.Vec2{X: a.X, Y: a.Y}, envphysics.Vec2{X: b.X, Y: b.Y})
}

// --- CRYO FLAK CLOUDS ---

func (w *WorldState) SpawnCryoCloud(ownerID string, seatIdx int8, pos Vec2, radius float64, durationTicks int, slowFactor float64, totalDamage float64, mult uint8) {
	if durationTicks <= 0 {
		durationTicks = 360
	}
	if radius <= 0 {
		radius = 85.0
	}
	w.nextCloudID++
	w.CryoClouds = append(w.CryoClouds, &CryoCloud{
		ID:             w.nextCloudID,
		OwnerID:        ownerID,
		SeatIndex:      seatIdx,
		Pos:            pos,
		Radius:         radius,
		RemainingTicks: uint16(durationTicks),
		MaxTicks:       uint16(durationTicks),
		SlowFactor:     slowFactor,
		DamagePerTick:  totalDamage / float64(durationTicks),
		BetMultiplier:  mult,
	})
}

func (w *WorldState) CryoSpeedMultiplier(pos Vec2) float64 {
	scale := 1.0
	for _, cloud := range w.CryoClouds {
		if math.Hypot(pos.X-cloud.Pos.X, pos.Y-cloud.Pos.Y) <= cloud.Radius {
			s := 1.0 - cloud.SlowFactor
			if s < scale {
				scale = s
			}
		}
	}
	if scale < 0.25 {
		scale = 0.25
	}
	return scale
}

// RandomEdgeSpawn returns a random perimeter entry point and inward heading for House ships.
func (w *WorldState) RandomEdgeSpawn() (Vec2, float64) {
	edge := rand.Intn(4)
	var pos Vec2
	switch edge {
	case 0:
		pos = Vec2{X: 220 + rand.Float64()*(w.ArenaWidth-440), Y: 20}
	case 1:
		pos = Vec2{X: 220 + rand.Float64()*(w.ArenaWidth-440), Y: w.ArenaHeight - 20}
	case 2:
		pos = Vec2{X: 20, Y: 220 + rand.Float64()*(w.ArenaHeight-440)}
	default:
		pos = Vec2{X: w.ArenaWidth - 20, Y: 220 + rand.Float64()*(w.ArenaHeight-440)}
	}
	tx := w.ArenaWidth*0.25 + rand.Float64()*(w.ArenaWidth*0.5)
	ty := w.ArenaHeight*0.25 + rand.Float64()*(w.ArenaHeight*0.5)
	return pos, math.Atan2(ty-pos.Y, tx-pos.X)
}
