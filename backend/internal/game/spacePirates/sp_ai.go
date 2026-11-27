package spacePirates

import (
	"math"
	"sort"

	"space-tactics-server/internal/db"
)

// UnitCurrentBountyCents computes the live 1x bounty (in cents) for any House unit.
func UnitCurrentBountyCents(u *Unit) int64 {
	if !u.IsHarvester || u.FillDurationTicks <= 0 {
		return u.BaseBountyCents
	}
	ratio := math.Min(1.0, float64(u.HarvestTicks)/float64(u.FillDurationTicks))
	if u.MaxCargoCents <= u.BaseBountyCents {
		return u.BaseBountyCents
	}
	return u.BaseBountyCents + int64(math.Round(float64(u.MaxCargoCents-u.BaseBountyCents)*ratio))
}

func unitEnvSpeedScale(u *Unit, world *WorldState) float64 {
	drag := u.EnvDragScale
	if drag <= 0 {
		drag = 1.0
	}
	cryo := 1.0
	if u.IsHouse && world != nil {
		cryo = world.CryoSpeedMultiplier(u.Pos)
	}
	scale := drag * cryo
	if scale < 0.2 {
		scale = 0.2
	}
	return scale
}

// StepAI advances movement, targeting, hazard evasion, and firing intent for all House and Player units.
func StepAI(units map[string]*Unit, world *WorldState, detachedObjects map[uint32]bool, bossEscapeTicks uint32) {
	// 1. Update House units
	for _, u := range units {
		if u.IsDestroyed || !u.IsHouse {
			continue
		}
		switch {
		case u.IsHarvester:
			stepHarvesterAI(u, world, detachedObjects)
		case u.IsBoss:
			stepBossAI(u, units, world, bossEscapeTicks)
		default:
			stepEscortAI(u, units, world)
		}
	}

	// 2. Update Player fleets independently per seat
	for seatIdx := int8(0); seatIdx < MaxSeats; seatIdx++ {
		stepPlayerSeatAI(seatIdx, units, world)
	}
}

// ============================================================================
// 1. HOUSE HARVESTER AI (APPROACH -> HARVEST -> ESCAPE + WRAP DETACH + EVASION)
// ============================================================================

func stepHarvesterAI(u *Unit, world *WorldState, detachedObjects map[uint32]bool) {
	u.IsFiring = false
	speedScale := unitEnvSpeedScale(u, world)
	effSpeed := u.Speed * speedScale

	// Urgent hazard evasion (Comets, Gas Giant Deep/Core, Dense Belts for 3W+)
	if evade, urgent := ComputeHazardAvoidanceVector(u, world); urgent && u.AIState != "ESCAPE" {
		u.AIState = "EVADE"
		desired := math.Atan2(evade.Y, evade.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate*1.4)
		u.Vel.X = math.Cos(u.Angle)*effSpeed*1.1 + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed*1.1 + u.EnvAccel.Y
		u.Pos.X = clampFloat(u.Pos.X+u.Vel.X, 25, world.ArenaWidth-25)
		u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y, 25, world.ArenaHeight-25)
		return
	}

	// Already escaping: sprint to nearest arena edge and despawn off-screen
	if u.AIState == "ESCAPE" {
		edgeTarget := nearestArenaEdge(u.Pos, world.ArenaWidth, world.ArenaHeight)
		desired := math.Atan2(edgeTarget.Y-u.Pos.Y, edgeTarget.X-u.Pos.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate)
		u.Vel.X = math.Cos(u.Angle)*effSpeed*1.15 + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed*1.15 + u.EnvAccel.Y
		u.Pos.X += u.Vel.X
		u.Pos.Y += u.Vel.Y

		if u.Pos.X < -55 || u.Pos.X > world.ArenaWidth+55 || u.Pos.Y < -55 || u.Pos.Y > world.ArenaHeight+55 {
			u.IsDestroyed = true
		}
		return
	}

	// Check if current target object wrapped/expired or drifted out of bounds
	var targetNode *AsteroidNode
	if u.TargetNodeID != 0 {
		if detachedObjects[u.TargetClusterID] {
			u.TargetClusterID = 0
			u.TargetNodeID = 0
		} else if node, inBounds := world.FindNodeByID(u.TargetNodeID); inBounds {
			targetNode = node
		} else {
			u.TargetClusterID = 0
			u.TargetNodeID = 0
		}
	}

	if targetNode == nil {
		if u.FillDurationTicks > 0 && u.HarvestTicks >= u.FillDurationTicks {
			u.AIState = "ESCAPE"
			return
		}
		if node, ok := world.FindNearestResourceNode(u.Pos, u.UnitType); ok {
			targetNode = node
			u.TargetClusterID = node.ClusterID
			u.TargetNodeID = node.ID
			u.ResourceKey = node.ResourceKey
			u.ResourceType = node.ResourceType

			db.SPCache.Mu.RLock()
			if res, exists := db.SPCache.Resources[node.ResourceKey]; exists {
				u.MaxCargoCents = res.MaxCargoBountyCents
			}
			db.SPCache.Mu.RUnlock()
		}
	}

	if targetNode == nil {
		u.AIState = "APPROACH"
		cx, cy := world.ArenaWidth/2, world.ArenaHeight/2
		desired := math.Atan2(cy-u.Pos.Y, cx-u.Pos.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate)
		u.Vel.X = math.Cos(u.Angle)*effSpeed + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed + u.EnvAccel.Y
		u.Pos.X = clampFloat(u.Pos.X+u.Vel.X, 25, world.ArenaWidth-25)
		u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y, 25, world.ArenaHeight-25)
		return
	}

	dx := targetNode.Pos.X - u.Pos.X
	dy := targetNode.Pos.Y - u.Pos.Y
	dist := math.Hypot(dx, dy)
	harvestDist := targetNode.Radius + 75.0

	if dist > harvestDist {
		u.AIState = "APPROACH"
		desired := math.Atan2(dy, dx)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate)
		u.Vel.X = math.Cos(u.Angle)*effSpeed + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed + u.EnvAccel.Y
	} else {
		u.AIState = "HARVEST"
		desired := math.Atan2(dy, dx)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate)

		standoff := targetNode.Radius + 52.0
		pull := (dist - standoff) * 0.08
		nx, ny := 0.0, 0.0
		if dist > 0.01 {
			nx, ny = dx/dist, dy/dist
		}
		u.Vel.X = targetNode.Vel.X + nx*pull*speedScale + u.EnvAccel.X
		u.Vel.Y = targetNode.Vel.Y + ny*pull*speedScale + u.EnvAccel.Y

		u.HarvestTicks++
		if u.FillDurationTicks > 0 && u.HarvestTicks >= u.FillDurationTicks {
			u.AIState = "ESCAPE"
			u.TargetClusterID = 0
			u.TargetNodeID = 0
		}
	}

	u.Pos.X += u.Vel.X
	u.Pos.Y += u.Vel.Y
}

// ============================================================================
// 2. HOUSE COMBATANTS: ESCORTS ("CUTTING THE PIE") & JACKPOT BOSS
// ============================================================================

func stepEscortAI(u *Unit, units map[string]*Unit, world *WorldState) {
	u.IsFiring = false
	effSpeed := u.Speed * unitEnvSpeedScale(u, world)

	if evade, urgent := ComputeHazardAvoidanceVector(u, world); urgent {
		u.AIState = "EVADE"
		desired := math.Atan2(evade.Y, evade.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate*1.4)
		u.Vel.X = math.Cos(u.Angle)*effSpeed*1.1 + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed*1.1 + u.EnvAccel.Y
		u.Pos.X = clampFloat(u.Pos.X+u.Vel.X, 25, world.ArenaWidth-25)
		u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y, 25, world.ArenaHeight-25)
		return
	}

	var vip *Unit
	if u.BuddyID != "" {
		if cand, ok := units[u.BuddyID]; ok && !cand.IsDestroyed {
			vip = cand
		} else {
			u.BuddyID = ""
		}
	}

	anchor := u.Pos
	if vip != nil {
		anchor = vip.Pos
	}
	threat, threatDist := findNearestVisiblePlayerUnit(u, anchor, units, world)

	if vip != nil {
		u.AIState = "ESCORT"
		u.SweepPhase += 0.045

		standoff := 110.0
		if vip.IsBoss {
			standoff = 155.0
		}

		baseAngle := vip.Angle
		if threat != nil {
			baseAngle = math.Atan2(threat.Pos.Y-vip.Pos.Y, threat.Pos.X-vip.Pos.X)
		}
		sweepAngle := baseAngle + math.Sin(u.SweepPhase)*0.65

		slotX := vip.Pos.X + math.Cos(sweepAngle)*standoff
		slotY := vip.Pos.Y + math.Sin(sweepAngle)*standoff
		moveTowardsPoint(u, Vec2{X: slotX, Y: slotY}, effSpeed, 18.0)

		if threat != nil && CanAcquireTarget(u, threat, world) {
			dSelf := math.Hypot(threat.Pos.X-u.Pos.X, threat.Pos.Y-u.Pos.Y)
			if dSelf <= u.ProjectileRange {
				aimAngle := math.Atan2(threat.Pos.Y-u.Pos.Y, threat.Pos.X-u.Pos.X)
				u.Angle = rotateTowards(u.Angle, aimAngle, u.TurnRate*1.2)
				if angleDiffAbs(u.Angle, aimAngle) < 0.35 && world.HasLineOfSight(u.Pos, threat.Pos) {
					u.IsFiring = true
				}
			}
		}
	} else {
		u.AIState = "SEEK"
		if threat != nil {
			engageTargetWithLOS(u, threat, threatDist, effSpeed, world)
		} else {
			moveTowardsPoint(u, Vec2{X: world.ArenaWidth / 2, Y: world.ArenaHeight / 2}, effSpeed*0.7, 120.0)
		}
	}

	u.Pos.X = clampFloat(u.Pos.X+u.Vel.X+u.EnvAccel.X, 25, world.ArenaWidth-25)
	u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y+u.EnvAccel.Y, 25, world.ArenaHeight-25)
}

func stepBossAI(u *Unit, units map[string]*Unit, world *WorldState, bossEscapeTicks uint32) {
	u.IsFiring = false
	effSpeed := u.Speed * unitEnvSpeedScale(u, world)

	if bossEscapeTicks == 0 {
		u.AIState = "ESCAPE"
		edgeTarget := nearestArenaEdge(u.Pos, world.ArenaWidth, world.ArenaHeight)
		desired := math.Atan2(edgeTarget.Y-u.Pos.Y, edgeTarget.X-u.Pos.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate)
		u.Vel.X = math.Cos(u.Angle)*effSpeed*1.35 + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed*1.35 + u.EnvAccel.Y
		u.Pos.X += u.Vel.X
		u.Pos.Y += u.Vel.Y

		if u.Pos.X < -80 || u.Pos.X > world.ArenaWidth+80 || u.Pos.Y < -80 || u.Pos.Y > world.ArenaHeight+80 {
			u.IsDestroyed = true
		}
		return
	}

	if evade, urgent := ComputeHazardAvoidanceVector(u, world); urgent {
		u.AIState = "EVADE"
		desired := math.Atan2(evade.Y, evade.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate*1.4)
		u.Vel.X = math.Cos(u.Angle)*effSpeed + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed + u.EnvAccel.Y
		u.Pos.X = clampFloat(u.Pos.X+u.Vel.X, 60, world.ArenaWidth-60)
		u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y, 60, world.ArenaHeight-60)
		return
	}

	u.AIState = "BOSS_PATROL"
	u.SweepPhase += 0.008
	patrolX := world.ArenaWidth*0.5 + math.Cos(u.SweepPhase)*(world.ArenaWidth*0.26)
	patrolY := world.ArenaHeight*0.5 + math.Sin(u.SweepPhase*1.5)*(world.ArenaHeight*0.22)
	moveTowardsPoint(u, Vec2{X: patrolX, Y: patrolY}, effSpeed, 40.0)

	u.Pos.X = clampFloat(u.Pos.X+u.Vel.X+u.EnvAccel.X, 60, world.ArenaWidth-60)
	u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y+u.EnvAccel.Y, 60, world.ArenaHeight-60)

	nearestPlayer, dist := findNearestVisiblePlayerUnit(u, u.Pos, units, world)
	if nearestPlayer != nil && dist <= u.ProjectileRange && CanAcquireTarget(u, nearestPlayer, world) {
		aimAngle := math.Atan2(nearestPlayer.Pos.Y-u.Pos.Y, nearestPlayer.Pos.X-u.Pos.X)
		u.Angle = rotateTowards(u.Angle, aimAngle, u.TurnRate*1.5)
		if angleDiffAbs(u.Angle, aimAngle) < 0.45 && world.HasLineOfSight(u.Pos, nearestPlayer.Pos) {
			u.IsFiring = true
		}
	}
}

// ============================================================================
// 3. PER-SEAT PLAYER FLEET AI (DYNAMIC SQUADS + STEALTH + EVASION + LOS)
// ============================================================================

func stepPlayerSeatAI(seatIdx int8, units map[string]*Unit, world *WorldState) {
	seatUnits := make([]*Unit, 0, 16)
	for _, u := range units {
		if !u.IsDestroyed && !u.IsHouse && u.SeatIndex == seatIdx {
			seatUnits = append(seatUnits, u)
		}
	}
	if len(seatUnits) == 0 {
		return
	}

	sort.Slice(seatUnits, func(i, j int) bool {
		if seatUnits[i].WeightClass != seatUnits[j].WeightClass {
			return seatUnits[i].WeightClass > seatUnits[j].WeightClass
		}
		return seatUnits[i].ID < seatUnits[j].ID
	})

	flagships := make([]*Unit, 0, 4)
	for _, u := range seatUnits {
		if u.WeightClass >= 5 {
			flagships = append(flagships, u)
		}
	}

	leaders := make([]*Unit, 0, 4)
	followers := make([]*Unit, 0, len(seatUnits))

	if len(flagships) >= 2 {
		for i, fs := range flagships {
			fs.IsSquadLeader = true
			fs.SquadID = int32(i + 1)
			fs.BuddyID = ""
			leaders = append(leaders, fs)
		}
		rr := 0
		for _, u := range seatUnits {
			if u.WeightClass >= 5 {
				continue
			}
			leader := leaders[rr%len(leaders)]
			u.IsSquadLeader = false
			u.SquadID = leader.SquadID
			u.BuddyID = leader.ID
			followers = append(followers, u)
			rr++
		}
	} else {
		leader := seatUnits[0]
		leader.IsSquadLeader = true
		leader.SquadID = 1
		leader.BuddyID = ""
		leaders = append(leaders, leader)

		for i := 1; i < len(seatUnits); i++ {
			u := seatUnits[i]
			u.IsSquadLeader = false
			u.SquadID = 1
			u.BuddyID = leader.ID
			followers = append(followers, u)
		}
	}

	claimedTargets := make(map[string]bool)
	leaderTargets := make(map[int32]*Unit)

	for _, leader := range leaders {
		target := pickLeaderTarget(leader, units, claimedTargets, world)
		if target != nil {
			claimedTargets[target.ID] = true
			leaderTargets[leader.SquadID] = target
		}
		stepPlayerLeader(leader, target, world)
	}

	for _, f := range followers {
		leader := units[f.BuddyID]
		leaderTarget := leaderTargets[f.SquadID]
		stepPlayerFollower(f, leader, leaderTarget, units, world)
	}
}

func pickLeaderTarget(leader *Unit, units map[string]*Unit, claimed map[string]bool, world *WorldState) *Unit {
	var bestUnclaimed, bestFallback *Unit
	bestUnclaimedScore := -1e18
	bestFallbackScore := -1e18

	for _, cand := range units {
		if cand.IsDestroyed || !cand.IsHouse {
			continue
		}
		// Space Pirates Stealth Rule: units inside Nebula / Gas Giant Deep break long-range lock-on
		if !CanAcquireTarget(leader, cand, world) {
			continue
		}
		dist := math.Hypot(cand.Pos.X-leader.Pos.X, cand.Pos.Y-leader.Pos.Y)
		bounty := float64(UnitCurrentBountyCents(cand))
		score := 0.0

		switch leader.UnitType {
		case "flagship":
			score = bounty*100.0 - dist*0.15
		case "torpedo_bomber":
			tierBonus := 0.0
			if cand.IsBoss {
				tierBonus = 50000
			} else if cand.UnitType == "grav_extractor" {
				tierBonus = 30000
			} else if cand.UnitType == "plasma_skimmer" {
				tierBonus = 15000
			} else if cand.IsHarvester {
				tierBonus = 5000
			}
			score = tierBonus + bounty*40.0 - dist*0.2
		case "cryo_flak":
			nearbyCount := 0.0
			for _, other := range units {
				if !other.IsDestroyed && other.IsHouse && math.Hypot(other.Pos.X-cand.Pos.X, other.Pos.Y-cand.Pos.Y) < 160 {
					nearbyCount++
				}
			}
			harvBonus := 0.0
			if cand.IsHarvester || cand.IsBoss {
				harvBonus = 400
			}
			score = nearbyCount*350.0 + harvBonus + bounty*5.0 - dist*0.35
		case "assault_gunship":
			escortBonus := 0.0
			if !cand.IsHarvester && !cand.IsBoss {
				escortBonus = 180
			}
			score = escortBonus + bounty*2.0 - dist
		default:
			harvBonus := 0.0
			if cand.IsHarvester {
				harvBonus = 250
			}
			minHull := math.Min(math.Min(cand.Hull.Front, cand.Hull.Rear), math.Min(cand.Hull.Port, cand.Hull.Starboard))
			score = harvBonus - dist - minHull*0.05
		}

		if score > bestFallbackScore {
			bestFallbackScore = score
			bestFallback = cand
		}
		if !claimed[cand.ID] && score > bestUnclaimedScore {
			bestUnclaimedScore = score
			bestUnclaimed = cand
		}
	}

	if bestUnclaimed != nil {
		return bestUnclaimed
	}
	return bestFallback
}

func stepPlayerLeader(u *Unit, target *Unit, world *WorldState) {
	u.IsFiring = false
	effSpeed := u.Speed * unitEnvSpeedScale(u, world)

	if evade, urgent := ComputeHazardAvoidanceVector(u, world); urgent {
		u.AIState = "EVADE"
		desired := math.Atan2(evade.Y, evade.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate*1.4)
		u.Vel.X = math.Cos(u.Angle)*effSpeed*1.1 + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed*1.1 + u.EnvAccel.Y
		u.Pos.X = clampFloat(u.Pos.X+u.Vel.X, 30, world.ArenaWidth-30)
		u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y, 30, world.ArenaHeight-30)
		return
	}

	if target == nil {
		// Patrol inward so ships close within 50% visual range if all remaining targets are stealthed
		u.AIState = "PATROL"
		moveTowardsPoint(u, Vec2{X: world.ArenaWidth / 2, Y: world.ArenaHeight / 2}, effSpeed*0.75, 160.0)
		u.Pos.X = clampFloat(u.Pos.X+u.Vel.X+u.EnvAccel.X, 30, world.ArenaWidth-30)
		u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y+u.EnvAccel.Y, 30, world.ArenaHeight-30)
		return
	}

	u.AIState = "ENGAGE"
	dist := math.Hypot(target.Pos.X-u.Pos.X, target.Pos.Y-u.Pos.Y)
	engageTargetWithLOS(u, target, dist, effSpeed, world)

	u.Pos.X = clampFloat(u.Pos.X+u.Vel.X+u.EnvAccel.X, 30, world.ArenaWidth-30)
	u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y+u.EnvAccel.Y, 30, world.ArenaHeight-30)
}

func stepPlayerFollower(u *Unit, leader *Unit, leaderTarget *Unit, units map[string]*Unit, world *WorldState) {
	u.IsFiring = false
	effSpeed := u.Speed * unitEnvSpeedScale(u, world)

	if evade, urgent := ComputeHazardAvoidanceVector(u, world); urgent {
		u.AIState = "EVADE"
		desired := math.Atan2(evade.Y, evade.X)
		u.Angle = rotateTowards(u.Angle, desired, u.TurnRate*1.4)
		u.Vel.X = math.Cos(u.Angle)*effSpeed*1.1 + u.EnvAccel.X
		u.Vel.Y = math.Sin(u.Angle)*effSpeed*1.1 + u.EnvAccel.Y
		u.Pos.X = clampFloat(u.Pos.X+u.Vel.X, 30, world.ArenaWidth-30)
		u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y, 30, world.ArenaHeight-30)
		return
	}

	if leader == nil || leader.IsDestroyed {
		stepPlayerLeader(u, leaderTarget, world)
		return
	}

	switch u.UnitType {
	case "viper_interceptor":
		u.AIState = "ESCORT"
		u.SweepPhase += 0.06
		orbitAngle := leader.Angle + math.Sin(u.SweepPhase)*1.2
		slot := Vec2{
			X: leader.Pos.X + math.Cos(orbitAngle)*85.0,
			Y: leader.Pos.Y + math.Sin(orbitAngle)*85.0,
		}
		moveTowardsPoint(u, slot, effSpeed, 20.0)

		target := findNearestHouseEscort(u, leader.Pos, 320.0, units, world)
		if target == nil && CanAcquireTarget(u, leaderTarget, world) {
			target = leaderTarget
		}
		aimAndFireIfClear(u, target, world)

	case "assault_gunship":
		u.AIState = "FORMATION"
		behind := Vec2{
			X: leader.Pos.X - math.Cos(leader.Angle)*78.0,
			Y: leader.Pos.Y - math.Sin(leader.Angle)*78.0,
		}
		moveTowardsPoint(u, behind, effSpeed, 20.0)

		target := leaderTarget
		if escort := findNearestHouseEscort(u, leader.Pos, 360.0, units, world); escort != nil {
			target = escort
		}
		if CanAcquireTarget(u, target, world) {
			aimAndFireIfClear(u, target, world)
		}

	case "cryo_flak":
		u.AIState = "CRYO_SUPPORT"
		if leaderTarget != nil && CanAcquireTarget(u, leaderTarget, world) {
			dist := math.Hypot(leaderTarget.Pos.X-u.Pos.X, leaderTarget.Pos.Y-u.Pos.Y)
			engageTargetWithLOS(u, leaderTarget, dist, effSpeed, world)
		} else {
			moveTowardsPoint(u, leader.Pos, effSpeed, 95.0)
		}

	default:
		u.AIState = "FOCUS_FIRE"
		if leaderTarget != nil && CanAcquireTarget(u, leaderTarget, world) {
			dist := math.Hypot(leaderTarget.Pos.X-u.Pos.X, leaderTarget.Pos.Y-u.Pos.Y)
			engageTargetWithLOS(u, leaderTarget, dist, effSpeed, world)
		} else {
			moveTowardsPoint(u, leader.Pos, effSpeed, 110.0)
		}
	}

	u.Pos.X = clampFloat(u.Pos.X+u.Vel.X+u.EnvAccel.X, 30, world.ArenaWidth-30)
	u.Pos.Y = clampFloat(u.Pos.Y+u.Vel.Y+u.EnvAccel.Y, 30, world.ArenaHeight-30)
}

// ============================================================================
// 4. SHARED STEERING, LOS FLANKING & TARGET HELPERS
// ============================================================================

func engageTargetWithLOS(u *Unit, target *Unit, dist float64, effSpeed float64, world *WorldState) {
	optRange := u.OptimalRange
	if optRange <= 0 {
		optRange = 360.0
	}
	fireRange := u.ProjectileRange
	if fireRange <= 0 {
		fireRange = optRange * 1.25
	}
	if IsUnitStealthed(target, world) {
		// Must close inside 50% visual/weapon acquisition range to fire on a stealthed target
		fireRange *= 0.5
		optRange = math.Min(optRange, fireRange*0.85)
	}

	hasLOS := world.HasLineOfSight(u.Pos, target.Pos)
	toTarget := math.Atan2(target.Pos.Y-u.Pos.Y, target.Pos.X-u.Pos.X)

	if !hasLOS && dist <= fireRange*1.25 {
		u.AIState = "FLANK"
		u.IsFiring = false
		side := 1.0
		if len(u.ID) > 0 && u.ID[len(u.ID)-1]%2 == 1 {
			side = -1.0
		}
		flankAngle := toTarget + side*(math.Pi*0.42)
		u.Angle = rotateTowards(u.Angle, flankAngle, u.TurnRate*1.25)
		u.Vel.X = math.Cos(u.Angle) * effSpeed
		u.Vel.Y = math.Sin(u.Angle) * effSpeed
		return
	}

	u.Angle = rotateTowards(u.Angle, toTarget, u.TurnRate)
	if dist > optRange {
		u.Vel.X = math.Cos(u.Angle) * effSpeed
		u.Vel.Y = math.Sin(u.Angle) * effSpeed
	} else {
		u.Vel.X *= 0.84
		u.Vel.Y *= 0.84
	}

	if u.CanFire && dist <= fireRange && hasLOS && angleDiffAbs(u.Angle, toTarget) < 0.35 {
		u.IsFiring = true
	}
}

func aimAndFireIfClear(u *Unit, target *Unit, world *WorldState) {
	if target == nil || target.IsDestroyed || !u.CanFire {
		return
	}
	if !CanAcquireTarget(u, target, world) {
		return
	}
	dist := math.Hypot(target.Pos.X-u.Pos.X, target.Pos.Y-u.Pos.Y)
	maxRange := u.ProjectileRange
	if IsUnitStealthed(target, world) {
		maxRange *= 0.5
	}
	if dist > maxRange {
		return
	}
	aimAngle := math.Atan2(target.Pos.Y-u.Pos.Y, target.Pos.X-u.Pos.X)
	u.Angle = rotateTowards(u.Angle, aimAngle, u.TurnRate*1.2)
	if angleDiffAbs(u.Angle, aimAngle) < 0.35 && world.HasLineOfSight(u.Pos, target.Pos) {
		u.IsFiring = true
	}
}

func moveTowardsPoint(u *Unit, dst Vec2, speed float64, arriveRadius float64) {
	dx := dst.X - u.Pos.X
	dy := dst.Y - u.Pos.Y
	dist := math.Hypot(dx, dy)
	if dist <= arriveRadius {
		u.Vel.X *= 0.8
		u.Vel.Y *= 0.8
		return
	}
	desired := math.Atan2(dy, dx)
	u.Angle = rotateTowards(u.Angle, desired, u.TurnRate)
	u.Vel.X = math.Cos(u.Angle) * speed
	u.Vel.Y = math.Sin(u.Angle) * speed
}

func findNearestVisiblePlayerUnit(seeker *Unit, origin Vec2, units map[string]*Unit, world *WorldState) (*Unit, float64) {
	var best *Unit
	bestDist := math.MaxFloat64
	for _, cand := range units {
		if cand.IsDestroyed || cand.IsHouse {
			continue
		}
		if !CanAcquireTarget(seeker, cand, world) {
			continue
		}
		d := math.Hypot(cand.Pos.X-origin.X, cand.Pos.Y-origin.Y)
		if d < bestDist {
			bestDist = d
			best = cand
		}
	}
	return best, bestDist
}

func findNearestHouseEscort(seeker *Unit, origin Vec2, maxRange float64, units map[string]*Unit, world *WorldState) *Unit {
	var best *Unit
	bestDist := maxRange
	for _, cand := range units {
		if cand.IsDestroyed || !cand.IsHouse || cand.IsHarvester {
			continue
		}
		if !CanAcquireTarget(seeker, cand, world) {
			continue
		}
		d := math.Hypot(cand.Pos.X-origin.X, cand.Pos.Y-origin.Y)
		if d < bestDist {
			bestDist = d
			best = cand
		}
	}
	return best
}

func nearestArenaEdge(pos Vec2, arenaW, arenaH float64) Vec2 {
	dLeft := pos.X
	dRight := arenaW - pos.X
	dTop := pos.Y
	dBottom := arenaH - pos.Y

	minD := dLeft
	target := Vec2{X: -90, Y: pos.Y}
	if dRight < minD {
		minD = dRight
		target = Vec2{X: arenaW + 90, Y: pos.Y}
	}
	if dTop < minD {
		minD = dTop
		target = Vec2{X: pos.X, Y: -90}
	}
	if dBottom < minD {
		target = Vec2{X: pos.X, Y: arenaH + 90}
	}
	return target
}

func rotateTowards(current, target, maxStep float64) float64 {
	diff := math.Mod(target-current+math.Pi*3, math.Pi*2) - math.Pi
	if math.Abs(diff) <= maxStep {
		return target
	}
	if diff > 0 {
		return current + maxStep
	}
	return current - maxStep
}

func angleDiffAbs(a, b float64) float64 {
	return math.Abs(math.Mod(b-a+math.Pi*3, math.Pi*2) - math.Pi)
}
