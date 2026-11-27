package spacePirates

import (
	"math"
	"math/rand"

	"space-tactics-server/internal/db"
	SpacePirates "space-tactics-server/internal/generated/SpacePirates"
	"space-tactics-server/internal/models"
)

type WorldState struct {
	ArenaWidth    float64
	ArenaHeight   float64
	Clusters      []*ActiveCluster
	CryoClouds    []*CryoCloud
	nextClusterID uint32
	nextNodeID    uint32
	nextCloudID   uint32
}

func NewWorldState(arenaW, arenaH float64) *WorldState {
	w := &WorldState{
		ArenaWidth:  arenaW,
		ArenaHeight: arenaH,
		Clusters:    make([]*ActiveCluster, 0, 8),
		CryoClouds:  make([]*CryoCloud, 0, 16),
	}
	w.SeedInitialClusters()
	return w
}

// SeedInitialClusters populates the arena with drifting clusters from PostgreSQL on room boot.
func (w *WorldState) SeedInitialClusters() {
	db.SPCache.Mu.RLock()
	targetCount := db.SPCache.Ruleset.TargetClusterCount
	db.SPCache.Mu.RUnlock()
	if targetCount <= 0 {
		targetCount = 5
	}

	for i := 0; i < targetCount; i++ {
		if c := w.spawnClusterFromCache(true); c != nil {
			w.Clusters = append(w.Clusters, c)
		}
	}
}

// Step advances all clusters (handling whole-cluster edge wraps & replacements) and decays Cryo clouds.
// Returns a set of cluster IDs that wrapped or expired this tick so harvesters detach cleanly.
func (w *WorldState) Step() map[uint32]bool {
	detachedClusters := make(map[uint32]bool)

	db.SPCache.Mu.RLock()
	targetCount := db.SPCache.Ruleset.TargetClusterCount
	db.SPCache.Mu.RUnlock()
	if targetCount <= 0 {
		targetCount = 5
	}

	alive := w.Clusters[:0]
	for _, c := range w.Clusters {
		c.Center.X += c.Vel.X
		c.Center.Y += c.Vel.Y
		c.Angle += c.SpinRate

		wrapped, expired := w.checkClusterWrap(c)
		if wrapped || expired {
			detachedClusters[c.ID] = true
		}
		if expired {
			continue
		}

		w.updateClusterNodePositions(c)
		alive = append(alive, c)
	}
	w.Clusters = alive

	// Replace expired clusters from the live DB variant pool
	for len(w.Clusters) < targetCount {
		c := w.spawnClusterFromCache(false)
		if c == nil {
			break
		}
		w.Clusters = append(w.Clusters, c)
	}

	// Decay Cryo clouds
	activeClouds := w.CryoClouds[:0]
	for _, cloud := range w.CryoClouds {
		if cloud.RemainingTicks > 1 {
			cloud.RemainingTicks--
			activeClouds = append(activeClouds, cloud)
		}
	}
	w.CryoClouds = activeClouds

	return detachedClusters
}

// checkClusterWrap wraps a cluster as a single rigid body only after its full bounding radius clears the frame.
func (w *WorldState) checkClusterWrap(c *ActiveCluster) (wrapped bool, expired bool) {
	br := c.BoundingRadius
	outLeft := c.Center.X < -br && c.Vel.X < 0
	outRight := c.Center.X > w.ArenaWidth+br && c.Vel.X > 0
	outTop := c.Center.Y < -br && c.Vel.Y < 0
	outBottom := c.Center.Y > w.ArenaHeight+br && c.Vel.Y > 0

	if !outLeft && !outRight && !outTop && !outBottom {
		return false, false
	}

	if c.WrapsRemaining <= 0 {
		return false, true
	}

	c.WrapsRemaining--
	if outLeft {
		c.Center.X = w.ArenaWidth + br
	} else if outRight {
		c.Center.X = -br
	}
	if outTop {
		c.Center.Y = w.ArenaHeight + br
	} else if outBottom {
		c.Center.Y = -br
	}
	return true, false
}

func (w *WorldState) updateClusterNodePositions(c *ActiveCluster) {
	cosA := math.Cos(c.Angle)
	sinA := math.Sin(c.Angle)
	for _, n := range c.Nodes {
		rx := n.LocalDX*cosA - n.LocalDY*sinA
		ry := n.LocalDX*sinA + n.LocalDY*cosA
		n.Pos.X = c.Center.X + rx
		n.Pos.Y = c.Center.Y + ry
		n.Vel = c.Vel
	}
}

// spawnClusterFromCache rolls a weighted variant from sp_cluster_variants respecting MaxConcurrent.
func (w *WorldState) spawnClusterFromCache(placeInside bool) *ActiveCluster {
	db.SPCache.Mu.RLock()
	variants := db.SPCache.Clusters
	resources := db.SPCache.Resources
	db.SPCache.Mu.RUnlock()

	if len(variants) == 0 {
		return nil
	}

	// Count active instances per variant
	activeByVariant := make(map[int]int)
	for _, c := range w.Clusters {
		activeByVariant[c.VariantID]++
	}

	// Filter eligible variants and sum spawn weights
	eligible := make([]models.SPClusterVariant, 0, len(variants))
	totalWeight := 0
	for _, v := range variants {
		if !v.IsEnabled || len(v.NodesLayout) == 0 {
			continue
		}
		if v.MaxConcurrent > 0 && activeByVariant[v.VariantID] >= v.MaxConcurrent {
			continue
		}
		eligible = append(eligible, v)
		totalWeight += v.SpawnWeight
	}
	if len(eligible) == 0 || totalWeight <= 0 {
		return nil
	}

	roll := rand.Intn(totalWeight)
	chosen := eligible[0]
	for _, v := range eligible {
		roll -= v.SpawnWeight
		if roll < 0 {
			chosen = v
			break
		}
	}

	scale := chosen.ScaleMin
	if chosen.ScaleMax > chosen.ScaleMin {
		scale += rand.Float64() * (chosen.ScaleMax - chosen.ScaleMin)
	}
	speed := chosen.SpeedMin
	if chosen.SpeedMax > chosen.SpeedMin {
		speed += rand.Float64() * (chosen.SpeedMax - chosen.SpeedMin)
	}
	wraps := chosen.MinWraps
	if chosen.MaxWraps > chosen.MinWraps {
		wraps += rand.Intn(chosen.MaxWraps - chosen.MinWraps + 1)
	}

	boundingRadius := chosen.BoundingRadius * scale
	var center Vec2
	var driftAngle float64

	if placeInside {
		center = Vec2{
			X: 320 + rand.Float64()*(w.ArenaWidth-640),
			Y: 260 + rand.Float64()*(w.ArenaHeight-520),
		}
		driftAngle = rand.Float64() * 2 * math.Pi
	} else {
		center, driftAngle = w.randomOffscreenEntry(boundingRadius)
	}

	spin := chosen.SpinRate
	if rand.Float64() < 0.5 {
		spin = -spin
	}

	w.nextClusterID++
	cluster := &ActiveCluster{
		ID:             w.nextClusterID,
		VariantID:      chosen.VariantID,
		Center:         center,
		Vel:            Vec2{X: math.Cos(driftAngle) * speed, Y: math.Sin(driftAngle) * speed},
		Angle:          rand.Float64() * 2 * math.Pi,
		SpinRate:       spin,
		Scale:          scale,
		BoundingRadius: boundingRadius,
		WrapsRemaining: wraps,
		Nodes:          make([]*AsteroidNode, 0, len(chosen.NodesLayout)),
	}

	// Build rocks and perform slot-based resource rolling
	for _, spec := range chosen.NodesLayout {
		w.nextNodeID++
		resKey := ""
		resEnum := SpacePirates.ResourceTypeNone

		if spec.IsNode {
			rolled, ok := rollResourceForSlot(spec, resources)
			if ok {
				resKey = rolled.ResourceKey
				resEnum = SpacePirates.ResourceType(rolled.EnumCode)
			}
		}

		cluster.Nodes = append(cluster.Nodes, &AsteroidNode{
			ID:           w.nextNodeID,
			ClusterID:    cluster.ID,
			LocalDX:      spec.DX * scale,
			LocalDY:      spec.DY * scale,
			Radius:       spec.Radius * scale,
			IsNode:       spec.IsNode,
			ResourceKey:  resKey,
			ResourceType: resEnum,
		})
	}

	w.updateClusterNodePositions(cluster)
	return cluster
}

// rollResourceForSlot picks a resource from sp_resources using PinnedResource or weighted SlotTier rolling.
func rollResourceForSlot(slot models.ClusterNodeSpec, resources map[string]models.SPResource) (models.SPResource, bool) {
	if slot.PinnedResource != nil && *slot.PinnedResource != "" {
		if r, ok := resources[*slot.PinnedResource]; ok {
			return r, true
		}
	}

	tierFilter := ""
	if slot.SlotTier != nil && *slot.SlotTier != "" && *slot.SlotTier != "any" {
		tierFilter = *slot.SlotTier
	}

	candidates := make([]models.SPResource, 0, len(resources))
	totalWeight := 0
	for _, r := range resources {
		if tierFilter != "" && r.Tier != tierFilter {
			continue
		}
		candidates = append(candidates, r)
		totalWeight += r.SpawnWeight
	}
	if len(candidates) == 0 || totalWeight <= 0 {
		return models.SPResource{}, false
	}

	pick := rand.Intn(totalWeight)
	for _, r := range candidates {
		pick -= r.SpawnWeight
		if pick < 0 {
			return r, true
		}
	}
	return candidates[0], true
}

func (w *WorldState) randomOffscreenEntry(br float64) (Vec2, float64) {
	edge := rand.Intn(4)
	var pos Vec2
	switch edge {
	case 0: // Top
		pos = Vec2{X: 300 + rand.Float64()*(w.ArenaWidth-600), Y: -br}
	case 1: // Bottom
		pos = Vec2{X: 300 + rand.Float64()*(w.ArenaWidth-600), Y: w.ArenaHeight + br}
	case 2: // Left
		pos = Vec2{X: -br, Y: 250 + rand.Float64()*(w.ArenaHeight-500)}
	default: // Right
		pos = Vec2{X: w.ArenaWidth + br, Y: 250 + rand.Float64()*(w.ArenaHeight-500)}
	}
	// Aim through the central play area
	tx := w.ArenaWidth*0.25 + rand.Float64()*(w.ArenaWidth*0.5)
	ty := w.ArenaHeight*0.25 + rand.Float64()*(w.ArenaHeight*0.5)
	return pos, math.Atan2(ty-pos.Y, tx-pos.X)
}

// FindNodeByID looks up an active asteroid node if it is still inside the arena bounds.
func (w *WorldState) FindNodeByID(nodeID uint32) (*AsteroidNode, bool) {
	for _, c := range w.Clusters {
		for _, n := range c.Nodes {
			if n.ID == nodeID {
				inBounds := n.Pos.X >= 40 && n.Pos.X <= w.ArenaWidth-40 &&
					n.Pos.Y >= 40 && n.Pos.Y <= w.ArenaHeight-40
				return n, inBounds
			}
		}
	}
	return nil, false
}

// FindNearestResourceNode returns the closest in-bounds unlimited resource node matching a harvester class.
func (w *WorldState) FindNearestResourceNode(pos Vec2, harvesterClass string) (*AsteroidNode, bool) {
	db.SPCache.Mu.RLock()
	resources := db.SPCache.Resources
	db.SPCache.Mu.RUnlock()

	var best *AsteroidNode
	bestDist := math.MaxFloat64

	for _, c := range w.Clusters {
		for _, n := range c.Nodes {
			if !n.IsNode || n.ResourceKey == "" {
				continue
			}
			// Only target nodes currently inside the playable frame
			if n.Pos.X < 60 || n.Pos.X > w.ArenaWidth-60 || n.Pos.Y < 60 || n.Pos.Y > w.ArenaHeight-60 {
				continue
			}
			res, ok := resources[n.ResourceKey]
			if !ok || res.HarvesterUnitClass != harvesterClass {
				continue
			}
			d := math.Hypot(n.Pos.X-pos.X, n.Pos.Y-pos.Y)
			if d < bestDist {
				bestDist = d
				best = n
			}
		}
	}
	return best, best != nil
}

// --- TACTICAL COVER: PROJECTILE BLOCKING, LOS RAYCAST & SHIP COLLISIONS ---

// CheckProjectileHit returns true if a projectile impacts any asteroid rock (cover or node).
func (w *WorldState) CheckProjectileHit(pos Vec2) bool {
	for _, c := range w.Clusters {
		// Quick broad-phase check against cluster bounding radius
		if math.Hypot(pos.X-c.Center.X, pos.Y-c.Center.Y) > c.BoundingRadius+10 {
			continue
		}
		for _, n := range c.Nodes {
			if math.Hypot(pos.X-n.Pos.X, pos.Y-n.Pos.Y) < n.Radius {
				return true
			}
		}
	}
	return false
}

// HasLineOfSight checks whether the firing line from A to B is clear of asteroid cover.
func (w *WorldState) HasLineOfSight(a, b Vec2) bool {
	dx := b.X - a.X
	dy := b.Y - a.Y
	lenSq := dx*dx + dy*dy
	if lenSq <= 1.0 {
		return true
	}

	for _, c := range w.Clusters {
		if !segmentIntersectsCircle(a, b, dx, dy, lenSq, c.Center, c.BoundingRadius) {
			continue
		}
		for _, n := range c.Nodes {
			if segmentIntersectsCircle(a, b, dx, dy, lenSq, n.Pos, n.Radius) {
				return false
			}
		}
	}
	return true
}

func segmentIntersectsCircle(a, b Vec2, dx, dy, lenSq float64, center Vec2, radius float64) bool {
	t := ((center.X-a.X)*dx + (center.Y-a.Y)*dy) / lenSq
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}
	cx := a.X + t*dx
	cy := a.Y + t*dy
	return math.Hypot(center.X-cx, center.Y-cy) < radius
}

// ResolveUnitAsteroidCollisions smoothly pushes ships out of solid asteroid rocks (no hull damage).
func (w *WorldState) ResolveUnitAsteroidCollisions(u *Unit) {
	const shipRadius = 26.0
	for _, c := range w.Clusters {
		if math.Hypot(u.Pos.X-c.Center.X, u.Pos.Y-c.Center.Y) > c.BoundingRadius+shipRadius {
			continue
		}
		for _, n := range c.Nodes {
			dx := u.Pos.X - n.Pos.X
			dy := u.Pos.Y - n.Pos.Y
			dist := math.Hypot(dx, dy)
			minDist := n.Radius + shipRadius
			if dist < minDist && dist > 0.01 {
				nx := dx / dist
				ny := dy / dist
				overlap := minDist - dist
				u.Pos.X += nx * overlap
				u.Pos.Y += ny * overlap
			}
		}
	}
}

// --- CRYO FLAK CLOUDS ---

func (w *WorldState) SpawnCryoCloud(ownerID string, seatIdx int8, pos Vec2, radius float64, durationTicks int, slowFactor float64, totalDamage float64, mult uint8) {
	if durationTicks <= 0 {
		durationTicks = 360 // 6s fallback
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

// CryoSpeedMultiplier returns the speed scale (e.g. 0.55) for a House unit inside any active Cryo cloud.
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
	case 0: // Top
		pos = Vec2{X: 220 + rand.Float64()*(w.ArenaWidth-440), Y: 20}
	case 1: // Bottom
		pos = Vec2{X: 220 + rand.Float64()*(w.ArenaWidth-440), Y: w.ArenaHeight - 20}
	case 2: // Left
		pos = Vec2{X: 20, Y: 220 + rand.Float64()*(w.ArenaHeight-440)}
	default: // Right
		pos = Vec2{X: w.ArenaWidth - 20, Y: 220 + rand.Float64()*(w.ArenaHeight-440)}
	}
	tx := w.ArenaWidth*0.25 + rand.Float64()*(w.ArenaWidth*0.5)
	ty := w.ArenaHeight*0.25 + rand.Float64()*(w.ArenaHeight*0.5)
	return pos, math.Atan2(ty-pos.Y, tx-pos.X)
}
