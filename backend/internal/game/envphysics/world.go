package envphysics

import (
	"log"
	"math"
	"math/rand"

	"space-tactics-server/internal/db"
	"space-tactics-server/internal/models"
)

// World manages live ActiveEnvObjects for either a dynamic spawner mode (Space Pirates)
// or an authored Universal Map Builder layout (Unit Testing Sandbox & 20v20 TDM).
type World struct {
	ArenaWidth         float64
	ArenaHeight        float64
	Objects            []*ActiveEnvObject
	nextObjectID       uint32
	nextComponentID    uint32
	cometCooldownTicks int
}

// NewDynamicWorld creates a dynamic Space Pirates arena hydrated from sp_env_pool (with graceful fallbacks).
func NewDynamicWorld(arenaW, arenaH float64) *World {
	if arenaW <= 0 {
		arenaW = 2400.0
	}
	if arenaH <= 0 {
		arenaH = 1600.0
	}
	w := &World{
		ArenaWidth:         arenaW,
		ArenaHeight:        arenaH,
		Objects:            make([]*ActiveEnvObject, 0, 12),
		cometCooldownTicks: 12 * TickRateHz,
	}
	w.SeedFromSPPool()
	return w
}

// NewAuthoredWorld creates a World hydrated from PostgreSQL maps + map_env_placements + env_blueprints.
func NewAuthoredWorld(mapID int) *World {
	w := &World{
		ArenaWidth:  12000.0,
		ArenaHeight: 12000.0,
		Objects:     make([]*ActiveEnvObject, 0, 16),
	}
	w.LoadAuthoredMap(mapID)
	return w
}

// LoadAuthoredMap reloads map dimensions and all placed env_blueprints for mapID from PostgreSQL.
func (w *World) LoadAuthoredMap(mapID int) {
	w.Objects = w.Objects[:0]
	w.nextObjectID = 0
	w.nextComponentID = 0

	if mapID <= 0 {
		return
	}

	detail, err := db.GetUniversalMapDetail(mapID)
	if err != nil {
		log.Printf("⚠️ envphysics: failed to load universal map %d: %v", mapID, err)
		return
	}
	if detail.Width > 0 {
		w.ArenaWidth = detail.Width
	}
	if detail.Height > 0 {
		w.ArenaHeight = detail.Height
	}

	db.EnvCache.Mu.RLock()
	bpMap := db.EnvCache.Blueprints
	db.EnvCache.Mu.RUnlock()

	db.SPCache.Mu.RLock()
	resources := db.SPCache.Resources
	db.SPCache.Mu.RUnlock()

	placementIDToObj := make(map[int]*ActiveEnvObject, len(detail.Placements))

	// Pass 1: Instantiate every placed blueprint
	for _, hp := range detail.Placements {
		var bp models.EnvBlueprint
		if hp.Blueprint != nil {
			bp = *hp.Blueprint
		} else if cached, ok := bpMap[hp.BlueprintID]; ok {
			bp = cached
		} else {
			continue
		}

		scale := hp.Scale
		if scale <= 0 {
			scale = 1.0
		}
		br := bp.BoundingRadius * scale
		if br < 40 {
			br = 40
		}
		scaledPhys := bp.PhysicsProfile
		scaledPhys.GravityRadius *= scale
		scaledPhys.RepulsionRadius *= scale

		w.nextObjectID++
		obj := &ActiveEnvObject{
			ID:             w.nextObjectID,
			BlueprintID:    bp.BlueprintID,
			ObjectType:     bp.ObjectType,
			ObjectTypeCode: ParseObjectType(bp.ObjectType),
			Center:         Vec2{X: hp.PosX, Y: hp.PosY},
			Vel:            Vec2{X: hp.VelX, Y: hp.VelY},
			Angle:          hp.Angle,
			SpinRate:       bp.MotionProfile.SpinRate,
			Scale:          scale,
			BoundingRadius: br,
			WrapsRemaining: 999999, // Authored drifting objects wrap persistently across the battlefield
			OrbitRadius:    hp.OrbitRadius,
			OrbitSpeed:     hp.OrbitSpeed,
			OrbitAngle:     hp.Angle,
			Physics:        scaledPhys,
			Motion:         bp.MotionProfile,
			Components:     make([]*EnvComponent, 0, len(bp.Components)),
		}
		w.populateComponents(obj, bp.Components, scale, resources)
		w.updateComponentPositions(obj)
		w.Objects = append(w.Objects, obj)
		placementIDToObj[hp.PlacementID] = obj
	}

	// Pass 2: Wire parent_placement_id orbital links
	for _, hp := range detail.Placements {
		if hp.ParentPlacementID != nil {
			childObj := placementIDToObj[hp.PlacementID]
			parentObj := placementIDToObj[*hp.ParentPlacementID]
			if childObj != nil && parentObj != nil && childObj.ID != parentObj.ID {
				childObj.ParentObjectID = parentObj.ID
				if childObj.OrbitRadius <= 0 {
					childObj.OrbitRadius = math.Hypot(childObj.Center.X-parentObj.Center.X, childObj.Center.Y-parentObj.Center.Y)
				}
				childObj.OrbitAngle = math.Atan2(childObj.Center.Y-parentObj.Center.Y, childObj.Center.X-parentObj.Center.X)
			}
		}
	}

	log.Printf("🌌 envphysics: loaded %d universal env objects for map #%d (%.0fx%.0f)",
		len(w.Objects), mapID, w.ArenaWidth, w.ArenaHeight)
}

// StepAuthored advances authored map objects (static, drifting+wrapping, and parent-child orbital moons).
func (w *World) StepAuthored() {
	parentByID := make(map[uint32]*ActiveEnvObject, len(w.Objects))

	for _, obj := range w.Objects {
		if obj.ParentObjectID != 0 {
			continue
		}
		obj.Center.X += obj.Vel.X
		obj.Center.Y += obj.Vel.Y
		obj.Angle += obj.SpinRate

		if obj.Vel.X != 0 || obj.Vel.Y != 0 {
			br := obj.BoundingRadius
			if obj.Center.X < -br && obj.Vel.X < 0 {
				obj.Center.X = w.ArenaWidth + br
			} else if obj.Center.X > w.ArenaWidth+br && obj.Vel.X > 0 {
				obj.Center.X = -br
			}
			if obj.Center.Y < -br && obj.Vel.Y < 0 {
				obj.Center.Y = w.ArenaHeight + br
			} else if obj.Center.Y > w.ArenaHeight+br && obj.Vel.Y > 0 {
				obj.Center.Y = -br
			}
		}
		w.updateComponentPositions(obj)
		parentByID[obj.ID] = obj
	}

	for _, obj := range w.Objects {
		if obj.ParentObjectID == 0 {
			continue
		}
		parent, ok := parentByID[obj.ParentObjectID]
		if !ok {
			continue
		}
		prevX, prevY := obj.Center.X, obj.Center.Y
		obj.OrbitAngle += obj.OrbitSpeed
		obj.Angle += obj.SpinRate
		obj.Center.X = parent.Center.X + math.Cos(obj.OrbitAngle)*obj.OrbitRadius
		obj.Center.Y = parent.Center.Y + math.Sin(obj.OrbitAngle)*obj.OrbitRadius
		obj.Vel.X = obj.Center.X - prevX
		obj.Vel.Y = obj.Center.Y - prevY
		w.updateComponentPositions(obj)
	}
}

// --- DYNAMIC SPAWNER MODE (SPACE PIRATES) ---

func (w *World) SeedFromSPPool() {
	db.SPCache.Mu.RLock()
	targetCount := db.SPCache.Ruleset.TargetClusterCount
	db.SPCache.Mu.RUnlock()
	if targetCount <= 0 {
		targetCount = 5
	}
	for i := 0; i < targetCount; i++ {
		if !w.spawnDynamicFromPool(true) {
			break
		}
	}
}

// StepDynamic advances dynamic drift/wrap objects, orbital moons, and periodic Comet transits.
// Returns IDs of objects that wrapped or expired this tick so harvesters detach cleanly.
func (w *World) StepDynamic() map[uint32]bool {
	detached := make(map[uint32]bool)

	db.SPCache.Mu.RLock()
	targetCount := db.SPCache.Ruleset.TargetClusterCount
	db.SPCache.Mu.RUnlock()
	if targetCount <= 0 {
		targetCount = 5
	}

	expiredParents := make(map[uint32]bool)
	parentByID := make(map[uint32]*ActiveEnvObject, len(w.Objects))

	for _, obj := range w.Objects {
		if obj.ParentObjectID != 0 {
			continue
		}
		obj.Center.X += obj.Vel.X
		obj.Center.Y += obj.Vel.Y
		obj.Angle += obj.SpinRate

		wrapped, expired := w.checkWrap(obj)
		if wrapped || expired {
			detached[obj.ID] = true
		}
		if expired {
			expiredParents[obj.ID] = true
			continue
		}
		parentByID[obj.ID] = obj
		w.updateComponentPositions(obj)
	}

	alive := w.Objects[:0]
	for _, obj := range w.Objects {
		if obj.ParentObjectID == 0 {
			if expiredParents[obj.ID] {
				continue
			}
			alive = append(alive, obj)
			continue
		}
		parent, ok := parentByID[obj.ParentObjectID]
		if !ok || expiredParents[obj.ParentObjectID] {
			detached[obj.ID] = true
			continue
		}
		if detached[obj.ParentObjectID] {
			detached[obj.ID] = true
		}
		prevX, prevY := obj.Center.X, obj.Center.Y
		obj.OrbitAngle += obj.OrbitSpeed
		obj.Angle += obj.SpinRate
		obj.Center.X = parent.Center.X + math.Cos(obj.OrbitAngle)*obj.OrbitRadius
		obj.Center.Y = parent.Center.Y + math.Sin(obj.OrbitAngle)*obj.OrbitRadius
		obj.Vel.X = obj.Center.X - prevX
		obj.Vel.Y = obj.Center.Y - prevY
		w.updateComponentPositions(obj)
		alive = append(alive, obj)
	}
	w.Objects = alive

	driftCount := 0
	for _, obj := range w.Objects {
		if obj.ParentObjectID == 0 && obj.Motion.Mode != "transient_transit" && obj.ObjectType != "comet" {
			driftCount++
		}
	}
	for driftCount < targetCount {
		if !w.spawnDynamicFromPool(false) {
			break
		}
		driftCount++
	}

	w.stepCometSpawner()
	return detached
}

type poolCandidate struct {
	poolID        int
	blueprint     models.EnvBlueprint
	spawnWeight   int
	maxConcurrent int
	scaleOverride *float64
	speedMin      *float64
	speedMax      *float64
	minWraps      *int
	maxWraps      *int
}

func collectActiveSPPoolCandidates(transientOnly bool) ([]poolCandidate, map[int]models.EnvBlueprint) {
	db.EnvCache.Mu.RLock()
	spPool := db.EnvCache.SPPool
	modePools := db.EnvCache.PoolsByMode["space_pirates"]
	bpMap := db.EnvCache.Blueprints
	db.EnvCache.Mu.RUnlock()

	out := make([]poolCandidate, 0, len(spPool)+len(modePools))

	if len(spPool) > 0 {
		for _, e := range spPool {
			if !e.IsEnabled {
				continue
			}
			bp, ok := bpMap[e.BlueprintID]
			if !ok || !bp.IsEnabled || len(bp.Components) == 0 {
				continue
			}
			isTransient := bp.MotionProfile.Mode == "transient_transit" || bp.ObjectType == "comet"
			if isTransient != transientOnly {
				continue
			}
			out = append(out, poolCandidate{
				poolID:        e.PoolID,
				blueprint:     bp,
				spawnWeight:   e.SpawnWeight,
				maxConcurrent: e.MaxConcurrent,
				scaleOverride: e.ScaleOverride,
				speedMin:      e.SpeedMin,
				speedMax:      e.SpeedMax,
				minWraps:      e.MinWraps,
				maxWraps:      e.MaxWraps,
			})
		}
		return out, bpMap
	}

	// Fallback to migration 002 mode_env_pools if migration 003 hasn't been applied yet
	for _, p := range modePools {
		if !p.IsEnabled {
			continue
		}
		bp, ok := bpMap[p.BlueprintID]
		if !ok || !bp.IsEnabled || len(bp.Components) == 0 {
			continue
		}
		isTransient := bp.MotionProfile.Mode == "transient_transit" || bp.ObjectType == "comet"
		if isTransient != transientOnly {
			continue
		}
		out = append(out, poolCandidate{
			poolID:        p.PoolID,
			blueprint:     bp,
			spawnWeight:   p.SpawnWeight,
			maxConcurrent: p.MaxConcurrent,
			scaleOverride: p.ScaleOverride,
		})
	}
	return out, bpMap
}

func (w *World) spawnDynamicFromPool(placeInside bool) bool {
	cands, bpMap := collectActiveSPPoolCandidates(false)
	if len(cands) == 0 {
		return w.spawnLegacyClusterFallback(placeInside)
	}

	activeByPool := make(map[int]int)
	for _, obj := range w.Objects {
		if obj.ParentObjectID == 0 {
			activeByPool[obj.PoolID]++
		}
	}

	eligible := make([]poolCandidate, 0, len(cands))
	totalWeight := 0
	for _, c := range cands {
		if c.maxConcurrent > 0 && activeByPool[c.poolID] >= c.maxConcurrent {
			continue
		}
		eligible = append(eligible, c)
		totalWeight += c.spawnWeight
	}
	if len(eligible) == 0 || totalWeight <= 0 {
		return false
	}

	roll := rand.Intn(totalWeight)
	chosen := eligible[0]
	for _, c := range eligible {
		roll -= c.spawnWeight
		if roll < 0 {
			chosen = c
			break
		}
	}

	w.instantiateDynamicObject(chosen, placeInside, bpMap)
	return true
}

func (w *World) stepCometSpawner() {
	if w.cometCooldownTicks > 0 {
		w.cometCooldownTicks--
		return
	}

	cands, bpMap := collectActiveSPPoolCandidates(true)
	if len(cands) == 0 {
		w.cometCooldownTicks = 20 * TickRateHz
		return
	}

	activeByPool := make(map[int]int)
	for _, obj := range w.Objects {
		activeByPool[obj.PoolID]++
	}

	eligible := make([]poolCandidate, 0, len(cands))
	totalW := 0
	for _, c := range cands {
		if c.maxConcurrent > 0 && activeByPool[c.poolID] >= c.maxConcurrent {
			continue
		}
		eligible = append(eligible, c)
		totalW += c.spawnWeight
	}
	if len(eligible) == 0 || totalW <= 0 {
		w.cometCooldownTicks = 12 * TickRateHz
		return
	}

	roll := rand.Intn(totalW)
	chosen := eligible[0]
	for _, c := range eligible {
		roll -= c.spawnWeight
		if roll < 0 {
			chosen = c
			break
		}
	}

	w.instantiateDynamicObject(chosen, false, bpMap)
	cd := chosen.blueprint.MotionProfile.TransitCooldownSeconds
	if cd <= 0 {
		cd = 28
	}
	w.cometCooldownTicks = cd * TickRateHz
}

func (w *World) instantiateDynamicObject(cand poolCandidate, placeInside bool, bpMap map[int]models.EnvBlueprint) *ActiveEnvObject {
	db.SPCache.Mu.RLock()
	resources := db.SPCache.Resources
	db.SPCache.Mu.RUnlock()

	bp := cand.blueprint
	mot := bp.MotionProfile

	// Apply per-entry sp_env_pool overrides if present
	speedMin, speedMax := mot.SpeedMin, mot.SpeedMax
	if cand.speedMin != nil {
		speedMin = *cand.speedMin
	}
	if cand.speedMax != nil {
		speedMax = *cand.speedMax
	}
	if speedMax < speedMin {
		speedMax = speedMin
	}

	minWraps, maxWraps := mot.MinWraps, mot.MaxWraps
	if cand.minWraps != nil {
		minWraps = *cand.minWraps
	}
	if cand.maxWraps != nil {
		maxWraps = *cand.maxWraps
	}
	if maxWraps < minWraps {
		maxWraps = minWraps
	}

	scale := mot.ScaleMin
	if scale <= 0 {
		scale = 1.0
	}
	if mot.ScaleMax > scale {
		scale += rand.Float64() * (mot.ScaleMax - scale)
	}
	if cand.scaleOverride != nil && *cand.scaleOverride > 0 {
		scale *= *cand.scaleOverride
	}

	speed := speedMin
	if speedMax > speedMin {
		speed += rand.Float64() * (speedMax - speedMin)
	}
	wraps := minWraps
	if maxWraps > minWraps {
		wraps += rand.Intn(maxWraps - minWraps + 1)
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

	scaledPhys := bp.PhysicsProfile
	scaledPhys.GravityRadius *= scale
	scaledPhys.RepulsionRadius *= scale

	w.nextObjectID++
	obj := &ActiveEnvObject{
		ID:             w.nextObjectID,
		BlueprintID:    bp.BlueprintID,
		PoolID:         cand.poolID,
		ObjectType:     bp.ObjectType,
		ObjectTypeCode: ParseObjectType(bp.ObjectType),
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

	w.populateComponents(obj, bp.Components, scale, resources)
	w.updateComponentPositions(obj)
	w.Objects = append(w.Objects, obj)

	// Spawn attached Orbiting Children (e.g., orbiting moons)
	for _, chSpec := range bp.OrbitingChildren {
		childBp, ok := bpMap[chSpec.ChildBlueprintID]
		if !ok || len(childBp.Components) == 0 {
			continue
		}
		cScale := chSpec.Scale
		if cScale <= 0 {
			cScale = 1.0
		}
		effScale := cScale * scale
		orbitR := chSpec.OrbitRadius * scale
		startAng := chSpec.StartAngle

		w.nextObjectID++
		childObj := &ActiveEnvObject{
			ID:             w.nextObjectID,
			BlueprintID:    childBp.BlueprintID,
			ObjectType:     childBp.ObjectType,
			ObjectTypeCode: ParseObjectType(childBp.ObjectType),
			Center: Vec2{
				X: obj.Center.X + math.Cos(startAng)*orbitR,
				Y: obj.Center.Y + math.Sin(startAng)*orbitR,
			},
			Vel:            obj.Vel,
			Angle:          rand.Float64() * 2 * math.Pi,
			SpinRate:       childBp.MotionProfile.SpinRate,
			Scale:          effScale,
			BoundingRadius: childBp.BoundingRadius * effScale,
			ParentObjectID: obj.ID,
			OrbitRadius:    orbitR,
			OrbitSpeed:     chSpec.OrbitSpeed,
			OrbitAngle:     startAng,
			Physics:        childBp.PhysicsProfile,
			Motion:         childBp.MotionProfile,
			Components:     make([]*EnvComponent, 0, len(childBp.Components)),
		}
		childObj.Physics.GravityRadius *= effScale
		childObj.Physics.RepulsionRadius *= effScale
		w.populateComponents(childObj, childBp.Components, effScale, resources)
		w.updateComponentPositions(childObj)
		w.Objects = append(w.Objects, childObj)
	}

	return obj
}

func (w *World) spawnLegacyClusterFallback(placeInside bool) bool {
	db.SPCache.Mu.RLock()
	variants := db.SPCache.Clusters
	db.SPCache.Mu.RUnlock()
	if len(variants) == 0 {
		return false
	}
	activeByBP := make(map[int]int)
	for _, obj := range w.Objects {
		activeByBP[obj.BlueprintID]++
	}
	eligible := make([]models.SPClusterVariant, 0, len(variants))
	totalW := 0
	for _, v := range variants {
		if !v.IsEnabled || len(v.NodesLayout) == 0 {
			continue
		}
		if v.MaxConcurrent > 0 && activeByBP[v.VariantID] >= v.MaxConcurrent {
			continue
		}
		eligible = append(eligible, v)
		totalW += v.SpawnWeight
	}
	if len(eligible) == 0 || totalW <= 0 {
		return false
	}
	roll := rand.Intn(totalW)
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
		k := "solid_rock"
		if n.IsNode {
			k = "resource_node"
		}
		comps = append(comps, models.EnvComponentSpec{
			Kind:           k,
			DX:             n.DX,
			DY:             n.DY,
			Radius:         n.Radius,
			IsNode:         n.IsNode,
			SlotTier:       n.SlotTier,
			PinnedResource: n.PinnedResource,
		})
	}
	w.instantiateDynamicObject(poolCandidate{
		poolID: chosen.VariantID,
		blueprint: models.EnvBlueprint{
			BlueprintID:    chosen.VariantID,
			Name:           chosen.Name,
			ObjectType:     "asteroid_cluster",
			Components:     comps,
			BoundingRadius: chosen.BoundingRadius,
			IsEnabled:      chosen.IsEnabled,
			PhysicsProfile: models.EnvPhysicsProfile{ProjectileBehavior: "block", VisualRangeMult: 1.0},
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
		},
		spawnWeight:   chosen.SpawnWeight,
		maxConcurrent: chosen.MaxConcurrent,
	}, placeInside, nil)
	return true
}

func (w *World) populateComponents(
	obj *ActiveEnvObject,
	specs []models.EnvComponentSpec,
	scale float64,
	resources map[string]models.SPResource,
) {
	for _, spec := range specs {
		w.nextComponentID++
		resKey := ""
		var resEnum uint8
		colorHex := ""
		if spec.ColorHex != nil {
			colorHex = *spec.ColorHex
		}
		if spec.IsNode {
			if rolled, ok := rollResourceForSlot(spec.SlotTier, spec.PinnedResource, resources); ok {
				resKey = rolled.ResourceKey
				resEnum = rolled.EnumCode
				if colorHex == "" {
					colorHex = rolled.ColorHex
				}
			}
		}
		obj.Components = append(obj.Components, &EnvComponent{
			ID:               w.nextComponentID,
			ObjectID:         obj.ID,
			Kind:             spec.Kind,
			KindCode:         ParseComponentKind(spec.Kind),
			LocalDX:          spec.DX * scale,
			LocalDY:          spec.DY * scale,
			Radius:           spec.Radius * scale,
			InnerRadius:      spec.InnerRadius * scale,
			IsNode:           spec.IsNode,
			ResourceKey:      resKey,
			ResourceEnumCode: resEnum,
			ColorHex:         colorHex,
		})
	}
}

func rollResourceForSlot(slotTier *string, pinned *string, resources map[string]models.SPResource) (models.SPResource, bool) {
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

func (w *World) checkWrap(obj *ActiveEnvObject) (wrapped bool, expired bool) {
	br := obj.BoundingRadius
	outLeft := obj.Center.X < -br && obj.Vel.X < 0
	outRight := obj.Center.X > w.ArenaWidth+br && obj.Vel.X > 0
	outTop := obj.Center.Y < -br && obj.Vel.Y < 0
	outBottom := obj.Center.Y > w.ArenaHeight+br && obj.Vel.Y > 0
	if !outLeft && !outRight && !outTop && !outBottom {
		return false, false
	}
	if obj.Motion.Mode == "transient_transit" || obj.ObjectType == "comet" || obj.WrapsRemaining <= 0 {
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

func (w *World) updateComponentPositions(obj *ActiveEnvObject) {
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

func (w *World) randomOffscreenEntry(br float64) (Vec2, float64) {
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

// --- SHARED QUERIES: RESOURCE NODES & LINE OF SIGHT ---

func (w *World) FindComponentByID(compID uint32) (*EnvComponent, bool) {
	for _, obj := range w.Objects {
		for _, c := range obj.Components {
			if c.ID == compID {
				inBounds := c.Pos.X >= 40 && c.Pos.X <= w.ArenaWidth-40 &&
					c.Pos.Y >= 40 && c.Pos.Y <= w.ArenaHeight-40
				return c, inBounds
			}
		}
	}
	return nil, false
}

func (w *World) FindNearestResourceNode(pos Vec2, harvesterClass string) (*EnvComponent, bool) {
	db.SPCache.Mu.RLock()
	resources := db.SPCache.Resources
	db.SPCache.Mu.RUnlock()

	var best *EnvComponent
	bestDist := math.MaxFloat64

	for _, obj := range w.Objects {
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
				best = c
			}
		}
	}
	return best, best != nil
}

func (w *World) HasLineOfSight(a, b Vec2) bool {
	dx := b.X - a.X
	dy := b.Y - a.Y
	lenSq := dx*dx + dy*dy
	if lenSq <= 1.0 {
		return true
	}
	for _, obj := range w.Objects {
		if obj.Physics.ProjectileBehavior != "block" {
			continue
		}
		if !segmentIntersectsCircle(a, dx, dy, lenSq, obj.Center, obj.BoundingRadius) {
			continue
		}
		for _, c := range obj.Components {
			if !IsSolidBlockingComponent(c.Kind) {
				continue
			}
			if segmentIntersectsCircle(a, dx, dy, lenSq, c.Pos, c.Radius) {
				return false
			}
		}
	}
	return true
}

func segmentIntersectsCircle(a Vec2, dx, dy, lenSq float64, center Vec2, radius float64) bool {
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
