package spacePirates

import (
	"math"
	"math/rand"

	"space-tactics-server/internal/db"
	SpacePirates "space-tactics-server/internal/generated/SpacePirates"
	"space-tactics-server/internal/models"
)

type WorldState struct {
	ArenaWidth          float64
	ArenaHeight         float64
	EnvObjects          []*ActiveEnvObject
	Clusters            []*ActiveCluster // Kept empty when EnvObjects runs; populated only for legacy callers
	CryoClouds          []*CryoCloud
	nextObjectID        uint32
	nextComponentID     uint32
	nextCloudID         uint32
	cometCooldownTicks  int
}

func NewWorldState(arenaW, arenaH float64) *WorldState {
	w := &WorldState{
		ArenaWidth:         arenaW,
		ArenaHeight:        arenaH,
		EnvObjects:         make([]*ActiveEnvObject, 0, 12),
		Clusters:           make([]*ActiveCluster, 0),
		CryoClouds:         make([]*CryoCloud, 0, 16),
		cometCooldownTicks: 12 * TickRateHz, // First comet pass after ~12s
	}
	w.SeedInitialEnvironment()
	return w
}

// SeedInitialEnvironment populates the arena from db.EnvCache (mode_env_pools),
// falling back seamlessly to db.SPCache.Clusters if migration 002 hasn't been applied yet.
func (w *WorldState) SeedInitialEnvironment() {
	db.SPCache.Mu.RLock()
	targetCount := db.SPCache.Ruleset.TargetClusterCount
	db.SPCache.Mu.RUnlock()
	if targetCount <= 0 {
		targetCount = 5
	}

	for i := 0; i < targetCount; i++ {
		if !w.spawnDriftObjectFromPool(true) {
			break
		}
	}
}

// Step advances all environmental objects (drift, spin, orbital moons, whole-object wrapping,
// transient Comet transits) and decays Cryo clouds.
// Returns IDs of objects that wrapped or expired this tick so harvesters detach cleanly.
func (w *WorldState) Step() map[uint32]bool {
	detachedObjects := make(map[uint32]bool)

	db.SPCache.Mu.RLock()
	targetCount := db.SPCache.Ruleset.TargetClusterCount
	db.SPCache.Mu.RUnlock()
	if targetCount <= 0 {
		targetCount = 5
	}

	// Pass 1: Move root (non-orbital) objects & check whole-object wraps / transient exits
	expiredParents := make(map[uint32]bool)
	parentByID := make(map[uint32]*ActiveEnvObject, len(w.EnvObjects))

	for _, obj := range w.EnvObjects {
		if obj.ParentObjectID != 0 {
			continue
		}
		obj.Center.X += obj.Vel.X
		obj.Center.Y += obj.Vel.Y
		obj.Angle += obj.SpinRate

		wrapped, expired := w.checkObjectWrap(obj)
		if wrapped || expired {
			detachedObjects[obj.ID] = true
		}
		if expired {
			expiredParents[obj.ID] = true
			continue
		}
		parentByID[obj.ID] = obj
		w.updateObjectComponentPositions(obj)
	}

	// Pass 2: Advance orbiting children (moons) relative to their live parents
	alive := w.EnvObjects[:0]
	for _, obj := range w.EnvObjects {
		if obj.ParentObjectID == 0 {
			if expiredParents[obj.ID] {
				continue
			}
			alive = append(alive, obj)
			continue
		}

		parent, ok := parentByID[obj.ParentObjectID]
		if !ok || expiredParents[obj.ParentObjectID] {
			detachedObjects[obj.ID] = true
			continue
		}
		if detachedObjects[obj.ParentObjectID] {
			detachedObjects[obj.ID] = true
		}

		prevX, prevY := obj.Center.X, obj.Center.Y
		obj.OrbitAngle += obj.OrbitSpeed
		obj.Angle += obj.SpinRate
		obj.Center.X = parent.Center.X + math.Cos(obj.OrbitAngle)*obj.OrbitRadius
		obj.Center.Y = parent.Center.Y + math.Sin(obj.OrbitAngle)*obj.OrbitRadius
		obj.Vel.X = obj.Center.X - prevX
		obj.Vel.Y = obj.Center.Y - prevY
		w.updateObjectComponentPositions(obj)
		alive = append(alive, obj)
	}
	w.EnvObjects = alive

	// Pass 3: Replace expired drift_wrap objects to keep arena populated
	driftCount := 0
	for _, obj := range w.EnvObjects {
		if obj.ParentObjectID == 0 && obj.Motion.Mode != "transient_transit" {
			driftCount++
		}
	}
	for driftCount < targetCount {
		if !w.spawnDriftObjectFromPool(false) {
			break
		}
		driftCount++
	}

	// Pass 4: Periodic transient Comet spawner
	w.stepCometSpawner()

	// Pass 5: Decay Cryo clouds
	activeClouds := w.CryoClouds[:0]
	for _, cloud := range w.CryoClouds {
		if cloud.RemainingTicks > 1 {
			cloud.RemainingTicks--
			activeClouds = append(activeClouds, cloud)
		}
	}
	w.CryoClouds = activeClouds

	return detachedObjects
}

func (w *WorldState) checkObjectWrap(obj *ActiveEnvObject) (wrapped bool, expired bool) {
	br := obj.BoundingRadius
	outLeft := obj.Center.X < -br && obj.Vel.X < 0
	outRight := obj.Center.X > w.ArenaWidth+br && obj.Vel.X > 0
	outTop := obj.Center.Y < -br && obj.Vel.Y < 0
	outBottom := obj.Center.Y > w.ArenaHeight+br && obj.Vel.Y > 0

	if !outLeft && !outRight && !outTop && !outBottom {
		return false, false
	}

	if obj.Motion.Mode == "transient_transit" || obj.WrapsRemaining <= 0 {
		return false, true
	}

	obj.WrapsRemaining--
	if outLeft {
		obj.Center.X = w.ArenaWidth + br
	} else if outRight {
		obj.Center.X = -br
	}
	if outTop {
		obj.Center.Y = w.ArenaHeight + br
	} else if outBottom {
		obj.Center.Y = -br
	}
	return true, false
}

func (w *WorldState) updateObjectComponentPositions(obj *ActiveEnvObject) {
	cosA := math.Cos(obj.Angle)
	sinA := math.Sin(obj.Angle)
	for _, c := range obj.Components {
		rx := c.LocalDX*cosA - c.LocalDY*sinA
		ry := c.LocalDX*sinA + c.LocalDY*cosA
		c.Pos.X = obj.Center.X + rx
		c.Pos.Y = obj.Center.Y + ry
		c.Vel = obj.Vel
	}
}

// spawnDriftObjectFromPool picks a weighted non-transient blueprint from db.EnvCache
// (or falls back to db.SPCache.Clusters if EnvCache is empty).
func (w *WorldState) spawnDriftObjectFromPool(placeInside bool) bool {
	db.EnvCache.Mu.RLock()
	pools := db.EnvCache.PoolsByMode["space_pirates"]
	bpMap := db.EnvCache.Blueprints
	db.EnvCache.Mu.RUnlock()

	if len(pools) == 0 || len(bpMap) == 0 {
		return w.spawnLegacyClusterFallback(placeInside)
	}

	activeByBP := make(map[int]int)
	for _, obj := range w.EnvObjects {
		if obj.ParentObjectID == 0 {
			activeByBP[obj.BlueprintID]++
		}
	}

	type candidate struct {
		pool models.ModeEnvPoolEntry
		bp   models.EnvBlueprint
	}
	eligible := make([]candidate, 0, len(pools))
	totalWeight := 0
	for _, p := range pools {
		if !p.IsEnabled {
			continue
		}
		bp, ok := bpMap[p.BlueprintID]
		if !ok || !bp.IsEnabled || len(bp.Components) == 0 {
			continue
		}
		if bp.MotionProfile.Mode == "transient_transit" || bp.ObjectType == "comet" {
			continue
		}
		if p.MaxConcurrent > 0 && activeByBP[bp.BlueprintID] >= p.MaxConcurrent {
			continue
		}
		eligible = append(eligible, candidate{pool: p, bp: bp})
		totalWeight += p.SpawnWeight
	}
	if len(eligible) == 0 || totalWeight <= 0 {
		return false
	}

	roll := rand.Intn(totalWeight)
	chosen := eligible[0]
	for _, cand := range eligible {
		roll -= cand.pool.SpawnWeight
		if roll < 0 {
			chosen = cand
			break
		}
	}

	w.instantiateEnvObject(chosen.bp, chosen.pool.ScaleOverride, placeInside, bpMap)
	return true
}

func (w *WorldState) stepCometSpawner() {
	if w.cometCooldownTicks > 0 {
		w.cometCooldownTicks--
		return
	}

	db.EnvCache.Mu.RLock()
	pools := db.EnvCache.PoolsByMode["space_pirates"]
	bpMap := db.EnvCache.Blueprints
	db.EnvCache.Mu.RUnlock()

	if len(pools) == 0 {
		w.cometCooldownTicks = 30 * TickRateHz
		return
	}

	activeByBP := make(map[int]int)
	for _, obj := range w.EnvObjects {
		activeByBP[obj.BlueprintID]++
	}

	type cometCand struct {
		pool models.ModeEnvPoolEntry
		bp   models.EnvBlueprint
	}
	var cands []cometCand
	totalW := 0
	for _, p := range pools {
		if !p.IsEnabled {
			continue
		}
		bp, ok := bpMap[p.BlueprintID]
		if !ok || !bp.IsEnabled || len(bp.Components) == 0 {
			continue
		}
		if bp.MotionProfile.Mode != "transient_transit" && bp.ObjectType != "comet" {
			continue
		}
		if p.MaxConcurrent > 0 && activeByBP[bp.BlueprintID] >= p.MaxConcurrent {
			continue
		}
		cands = append(cands, cometCand{pool: p, bp: bp})
		totalW += p.SpawnWeight
	}

	if len(cands) == 0 || totalW <= 0 {
		w.cometCooldownTicks = 15 * TickRateHz
		return
	}

	roll := rand.Intn(totalW)
	chosen := cands[0]
	for _, c := range cands {
		roll -= c.pool.SpawnWeight
		if roll < 0 {
			chosen = c
			break
		}
	}

	w.instantiateEnvObject(chosen.bp, chosen.pool.ScaleOverride, false, bpMap)
	cd := chosen.bp.MotionProfile.TransitCooldownSeconds
	if cd <= 0 {
		cd = 28
	}
	w.cometCooldownTicks = cd * TickRateHz
}

func (w *WorldState) instantiateEnvObject(
	bp models.EnvBlueprint,
	scaleOverride *float64,
	placeInside bool,
	bpMap map[int]models.EnvBlueprint,
) *ActiveEnvObject {
	db.SPCache.Mu.RLock()
	resources := db.SPCache.Resources
	db.SPCache.Mu.RUnlock()

	mot := bp.MotionProfile
	scale := mot.ScaleMin
	if scale <= 0 {
		scale = 1.0
	}
	if mot.ScaleMax > scale {
		scale += rand.Float64() * (mot.ScaleMax - scale)
	}
	if scaleOverride != nil && *scaleOverride > 0 {
		scale *= *scaleOverride
	}

	speed := mot.SpeedMin
	if mot.SpeedMax > mot.SpeedMin {
		speed += rand.Float64() * (mot.SpeedMax - mot.SpeedMin)
	}

	wraps := mot.MinWraps
	if mot.MaxWraps > mot.MinWraps {
		wraps += rand.Intn(mot.MaxWraps - mot.MinWraps + 1)
	}

	br := bp.BoundingRadius * scale
	if br < 40 {
		br = 40
	}

	var center Vec2
	var driftAngle float64
	if placeInside {
		padX := math.Min(360, w.ArenaWidth*0.2)
		padY := math.Min(280, w.ArenaHeight*0.2)
		center = Vec2{
			X: padX + rand.Float64()*(w.ArenaWidth-padX*2),
			Y: padY + rand.Float64()*(w.ArenaHeight-padY*2),
		}
		driftAngle = rand.Float64() * 2 * math.Pi
	} else {
		center, driftAngle = w.randomOffscreenEntry(br)
	}

	spin := mot.SpinRate
	if rand.Float64() < 0.5 {
		spin = -spin
	}

	// Scale physics radii proportionally with object scale
	scaledPhys := bp.PhysicsProfile
	scaledPhys.GravityRadius *= scale
	scaledPhys.RepulsionRadius *= scale

	w.nextObjectID++
	obj := &ActiveEnvObject{
		ID:             w.nextObjectID,
		BlueprintID:    bp.BlueprintID,
		ObjectType:     bp.ObjectType,
		ObjectTypeEnum: ParseEnvObjectType(bp.ObjectType),
		Center:         center,
		Vel:            Vec2{X: math.Cos(driftAngle) * speed, Y: math.Sin(driftAngle) * speed},
		Angle:          rand.Float64() * 2 * math.Pi,
		SpinRate:       spin,
		Scale:          scale,
		BoundingRadius: br,
		WrapsRemaining: wraps,
		Physics:        scaledPhys,
		Motion:         mot,
		Components:     make([]*EnvComponent, 0, len(bp.Components)),
	}

	for _, spec := range bp.Components {
		w.nextComponentID++
		resKey := ""
		resEnum := SpacePirates.ResourceTypeNone
		colorHex := ""
		if spec.ColorHex != nil {
			colorHex = *spec.ColorHex
		}

		if spec.IsNode {
			rolled, ok := rollResourceForEnvSlot(spec.SlotTier, spec.PinnedResource, resources)
			if ok {
				resKey = rolled.ResourceKey
				resEnum = SpacePirates.ResourceType(rolled.EnumCode)
				if colorHex == "" {
					colorHex = rolled.ColorHex
				}
			}
		}

		obj.Components = append(obj.Components, &EnvComponent{
			ID:           w.nextComponentID,
			ObjectID:     obj.ID,
			Kind:         spec.Kind,
			KindEnum:     ParseEnvComponentKind(spec.Kind),
			LocalDX:      spec.DX * scale,
			LocalDY:      spec.DY * scale,
			Radius:       spec.Radius * scale,
			InnerRadius:  spec.InnerRadius * scale,
			IsNode:       spec.IsNode,
			ResourceKey:  resKey,
			ResourceType: resEnum,
			ColorHex:     colorHex,
		})
	}

	w.updateObjectComponentPositions(obj)
	w.EnvObjects = append(w.EnvObjects, obj)

	// Spawn attached Orbiting Children (e.g., orbiting moons)
	for _, childSpec := range bp.OrbitingChildren {
		childBp, ok := bpMap[childSpec.ChildBlueprintID]
		if !ok || len(childBp.Components) == 0 {
			continue
		}
		childScale := childSpec.Scale
		if childScale <= 0 {
			childScale = 1.0
		}
		effChildScale := childScale * scale
		orbitR := childSpec.OrbitRadius * scale
		startAng := childSpec.StartAngle

		w.nextObjectID++
		childObj := &ActiveEnvObject{
			ID:             w.nextObjectID,
			BlueprintID:    childBp.BlueprintID,
			ObjectType:     childBp.ObjectType,
			ObjectTypeEnum: ParseEnvObjectType(childBp.ObjectType),
			Center: Vec2{
				X: obj.Center.X + math.Cos(startAng)*orbitR,
				Y: obj.Center.Y + math.Sin(startAng)*orbitR,
			},
			Vel:            obj.Vel,
			Angle:          rand.Float64() * 2 * math.Pi,
			SpinRate:       childBp.MotionProfile.SpinRate,
			Scale:          effChildScale,
			BoundingRadius: childBp.BoundingRadius * effChildScale,
			ParentObjectID: obj.ID,
			OrbitRadius:    orbitR,
			OrbitSpeed:     childSpec.OrbitSpeed,
			OrbitAngle:     startAng,
			Physics:        childBp.PhysicsProfile,
			Motion:         childBp.MotionProfile,
			Components:     make([]*EnvComponent, 0, len(childBp.Components)),
		}
		childObj.Physics.GravityRadius *= effChildScale
		childObj.Physics.RepulsionRadius *= effChildScale

		for _, spec := range childBp.Components {
			w.nextComponentID++
			resKey := ""
			resEnum := SpacePirates.ResourceTypeNone
			colorHex := ""
			if spec.ColorHex != nil {
				colorHex = *spec.ColorHex
			}
			if spec.IsNode {
				if rolled, ok := rollResourceForEnvSlot(spec.SlotTier, spec.PinnedResource, resources); ok {
					resKey = rolled.ResourceKey
					resEnum = SpacePirates.ResourceType(rolled.EnumCode)
					if colorHex == "" {
						colorHex = rolled.ColorHex
					}
				}
			}
			childObj.Components = append(childObj.Components, &EnvComponent{
				ID:           w.nextComponentID,
				ObjectID:     childObj.ID,
				Kind:         spec.Kind,
				KindEnum:     ParseEnvComponentKind(spec.Kind),
				LocalDX:      spec.DX * effChildScale,
				LocalDY:      spec.DY * effChildScale,
				Radius:       spec.Radius * effChildScale,
				InnerRadius:  spec.InnerRadius * effChildScale,
				IsNode:       spec.IsNode,
				ResourceKey:  resKey,
				ResourceType: resEnum,
				ColorHex:     colorHex,
			})
		}
		w.updateObjectComponentPositions(childObj)
		w.EnvObjects = append(w.EnvObjects, childObj)
	}

	return obj
}

// spawnLegacyClusterFallback adapts legacy sp_cluster_variants into ActiveEnvObjects
// if migration 002 hasn't been applied to PostgreSQL yet.
func (w *WorldState) spawnLegacyClusterFallback(placeInside bool) bool {
	db.SPCache.Mu.RLock()
	variants := db.SPCache.Clusters
	db.SPCache.Mu.RUnlock()
	if len(variants) == 0 {
		return false
	}

	activeByVariant := make(map[int]int)
	for _, obj := range w.EnvObjects {
		activeByVariant[obj.BlueprintID]++
	}

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
		return false
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

	comps := make([]models.EnvComponentSpec, 0, len(chosen.NodesLayout))
	for _, n := range chosen.NodesLayout {
		kind := "solid_rock"
		if n.IsNode {
			kind = "resource_node"
		}
		comps = append(comps, models.EnvComponentSpec{
			Kind:           kind,
			DX:             n.DX,
			DY:             n.DY,
			Radius:         n.Radius,
			IsNode:         n.IsNode,
			SlotTier:       n.SlotTier,
			PinnedResource: n.PinnedResource,
		})
	}
	bp := models.EnvBlueprint{
		BlueprintID:    chosen.VariantID,
		Name:           chosen.Name,
		ObjectType:     "asteroid_cluster",
		Components:     comps,
		BoundingRadius: chosen.BoundingRadius,
		IsEnabled:      chosen.IsEnabled,
		PhysicsProfile: models.EnvPhysicsProfile{
			ProjectileBehavior: "block",
			VisualRangeMult:    1.0,
		},
		MotionProfile: models.EnvMotionProfile{
			Mode:     "drift_wrap",
			ScaleMin: chosen.ScaleMin,
			ScaleMax: chosen.ScaleMax,
			SpeedMin: chosen.SpeedMin,
			SpeedMax: chosen.SpeedMax,
			SpinRate: chosen.SpinRate,
			MinWraps: chosen.MinWraps,
			MaxWraps: chosen.MaxWraps,
		},
	}
	w.instantiateEnvObject(bp, nil, placeInside, nil)
	return true
}

func rollResourceForEnvSlot(slotTier *string, pinned *string, resources map[string]models.SPResource) (models.SPResource, bool) {
	if pinned != nil && *pinned != "" {
		if r, ok := resources[*pinned]; ok {
			return r, true
		}
	}

	tierFilter := ""
	if slotTier != nil && *slotTier != "" && *slotTier != "any" {
		tierFilter = *slotTier
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
	case 0:
		pos = Vec2{X: 300 + rand.Float64()*(w.ArenaWidth-600), Y: -br}
	case 1:
		pos = Vec2{X: 300 + rand.Float64()*(w.ArenaWidth-600), Y: w.ArenaHeight + br}
	case 2:
		pos = Vec2{X: -br, Y: 250 + rand.Float64()*(w.ArenaHeight-500)}
	default:
		pos = Vec2{X: w.ArenaWidth + br, Y: 250 + rand.Float64()*(w.ArenaHeight-500)}
	}
	tx := w.ArenaWidth*0.25 + rand.Float64()*(w.ArenaWidth*0.5)
	ty := w.ArenaHeight*0.25 + rand.Float64()*(w.ArenaHeight*0.5)
	return pos, math.Atan2(ty-pos.Y, tx-pos.X)
}

// FindNodeByID looks up an active resource component across all EnvObjects if still inside arena bounds.
func (w *WorldState) FindNodeByID(nodeID uint32) (*AsteroidNode, bool) {
	for _, obj := range w.EnvObjects {
		for _, c := range obj.Components {
			if c.ID == nodeID {
				inBounds := c.Pos.X >= 40 && c.Pos.X <= w.ArenaWidth-40 &&
					c.Pos.Y >= 40 && c.Pos.Y <= w.ArenaHeight-40
				return &AsteroidNode{
					ID:           c.ID,
					ClusterID:    obj.ID,
					Pos:          c.Pos,
					Vel:          c.Vel,
					Radius:       c.Radius,
					IsNode:       c.IsNode,
					ResourceKey:  c.ResourceKey,
					ResourceType: c.ResourceType,
				}, inBounds
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

	for _, obj := range w.EnvObjects {
		for _, c := range obj.Components {
			if !c.IsNode || c.ResourceKey == "" {
				continue
			}
			if c.Pos.X < 60 || c.Pos.X > w.ArenaWidth-60 || c.Pos.Y < 60 || c.Pos.Y > w.ArenaHeight-60 {
				continue
			}
			res, ok := resources[c.ResourceKey]
			if !ok || res.HarvesterUnitClass != harvesterClass {
				continue
			}
			d := math.Hypot(c.Pos.X-pos.X, c.Pos.Y-pos.Y)
			if d < bestDist {
				bestDist = d
				best = &AsteroidNode{
					ID:           c.ID,
					ClusterID:    obj.ID,
					Pos:          c.Pos,
					Vel:          c.Vel,
					Radius:       c.Radius,
					IsNode:       c.IsNode,
					ResourceKey:  c.ResourceKey,
					ResourceType: c.ResourceType,
				}
			}
		}
	}
	return best, best != nil
}

// HasLineOfSight checks whether the firing line from A to B is clear of solid blocking cover.
func (w *WorldState) HasLineOfSight(a, b Vec2) bool {
	dx := b.X - a.X
	dy := b.Y - a.Y
	lenSq := dx*dx + dy*dy
	if lenSq <= 1.0 {
		return true
	}

	for _, obj := range w.EnvObjects {
		if obj.Physics.ProjectileBehavior != "block" {
			continue
		}
		if !segmentIntersectsCircle(a, b, dx, dy, lenSq, obj.Center, obj.BoundingRadius) {
			continue
		}
		for _, c := range obj.Components {
			if !isSolidBlockingComponent(c.Kind) {
				continue
			}
			if segmentIntersectsCircle(a, b, dx, dy, lenSq, c.Pos, c.Radius) {
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
