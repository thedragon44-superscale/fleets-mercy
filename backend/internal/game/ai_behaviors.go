package game

import (
	"math"
	"math/rand"
	"space-tactics-server/internal/models"
)

// RunUnitAI manages specialized autonomous state machines (GUARD, SEEK, COMMAND_RELAY, BODYGUARD, RETREAT)
func RunUnitAI(unit *models.FleetUnit, r *GameRoom, flagship *models.FleetUnit) {
	if unit.IsDestroyed {
		return
	}

	// 1. Shield-Break Retreat Protocol for Squad Leaders & Units
	if unit.AIState == "RETREAT" {
		var portTarget *models.FleetUnit
		minDistToPort := math.MaxFloat64

		for _, ally := range r.units {
			if ally.OwnerID == unit.OwnerID && (ally.Type == "flagship" || ally.Type == "battalion_command_ship") && !ally.IsDestroyed {
				d := math.Hypot(ally.Pos.X-unit.Pos.X, ally.Pos.Y-unit.Pos.Y)
				if d < minDistToPort {
					minDistToPort = d
					portTarget = ally
				}
			}
		}

		if portTarget != nil {
			dx := portTarget.Pos.X - unit.Pos.X
			dy := portTarget.Pos.Y - unit.Pos.Y
			RotateTowards(unit, math.Atan2(dy, dx))
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 1.2
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 1.2
			unit.IsFiring = false

			if minDistToPort < 150.0 {
				unit.AIState = "GUARD"
			}
		} else {
			unit.IsFiring = false
		}
		return
	}

	// 2. Recon Probe Landmark Orbital Patrol, Sector Sweep & Emergency Evasion Protocol
	if unit.Type == "recon_probe" {
		var closestEnemy *models.FleetUnit
		minEnemyDist := math.MaxFloat64

		for _, other := range r.units {
			if other.OwnerID != unit.OwnerID && !other.IsDestroyed {
				d := math.Hypot(other.Pos.X-unit.Pos.X, other.Pos.Y-unit.Pos.Y)
				if d < minEnemyDist {
					minEnemyDist = d
					closestEnemy = other
				}
			}
		}

		if closestEnemy != nil && minEnemyDist < 1000.0 {
			dx := unit.Pos.X - closestEnemy.Pos.X
			dy := unit.Pos.Y - closestEnemy.Pos.Y
			fleeAngle := math.Atan2(dy, dx)
			RotateTowards(unit, fleeAngle)

			fleeSpeed := unit.Speed * 1.5
			if fleeSpeed <= 0 {
				fleeSpeed = 3.5
			}
			unit.Vel.X = math.Cos(unit.Angle) * fleeSpeed
			unit.Vel.Y = math.Sin(unit.Angle) * fleeSpeed
			unit.IsFiring = false
			return
		}

		// Calculate repulsion from other friendly recon probes to enforce 2,300m spacing
		var repelX, repelY float64
		minAllowedDist := 2300.0

		for _, sibling := range r.units {
			if sibling.OwnerID == unit.OwnerID && sibling.Type == "recon_probe" && sibling.ID != unit.ID && !sibling.IsDestroyed {
				dx := unit.Pos.X - sibling.Pos.X
				dy := unit.Pos.Y - sibling.Pos.Y
				dist := math.Hypot(dx, dy)
				if dist < minAllowedDist && dist > 0 {
					repelFactor := (minAllowedDist - dist) / minAllowedDist
					repelX += (dx / dist) * repelFactor * unit.Speed * 2.0
					repelY += (dy / dist) * repelFactor * unit.Speed * 2.0
				}
			}
		}

		var nearestStruct *models.MapStructure
		minDist := math.MaxFloat64

		for i := range r.structures {
			s := &r.structures[i]
			dist := math.Hypot(s.PosX-unit.Pos.X, s.PosY-unit.Pos.Y)
			if dist < minDist {
				minDist = dist
				nearestStruct = s
			}
		}

		if nearestStruct != nil {
			targetOrbitDist := math.Max(1800.0, nearestStruct.Radius+200.0)
			dx := nearestStruct.PosX - unit.Pos.X
			dy := nearestStruct.PosY - unit.Pos.Y
			distToStruct := math.Hypot(dx, dy)
			angleToStruct := math.Atan2(dy, dx)

			orbitAngle := angleToStruct + (math.Pi / 2)
			if math.Abs(distToStruct-targetOrbitDist) > 150.0 {
				if distToStruct < targetOrbitDist {
					orbitAngle = angleToStruct + math.Pi
				} else {
					orbitAngle = angleToStruct
				}
			}

			RotateTowards(unit, orbitAngle)
			unit.Vel.X = math.Cos(orbitAngle)*unit.Speed*1.1 + repelX
			unit.Vel.Y = math.Sin(orbitAngle)*unit.Speed*1.1 + repelY
		} else {
			centerX := 6000.0
			centerY := 6000.0
			centerDX := unit.Pos.X - centerX
			centerDY := unit.Pos.Y - centerY
			sweepAngle := math.Atan2(centerDY, centerDX)
			if math.Hypot(centerDX, centerDY) < 500.0 {
				sweepAngle = rand.Float64() * 2 * math.Pi
			}

			RotateTowards(unit, sweepAngle)
			unit.Vel.X = math.Cos(unit.Angle)*unit.Speed*0.9 + repelX
			unit.Vel.Y = math.Sin(unit.Angle)*unit.Speed*0.9 + repelY
		}

		speed := math.Hypot(unit.Vel.X, unit.Vel.Y)
		maxSpeed := unit.Speed * 1.8
		if maxSpeed > 0 && speed > maxSpeed {
			unit.Vel.X = (unit.Vel.X / speed) * maxSpeed
			unit.Vel.Y = (unit.Vel.Y / speed) * maxSpeed
		}

		unit.IsFiring = false
		return
	}

	// 3. Squad Member & Leader Formation Leash Logic
	if unit.SquadID > 0 && !unit.IsSquadLeader {
		leader := r.findSquadLeader(unit.OwnerID, unit.BattalionID, unit.SquadID)
		if leader != nil && !leader.IsDestroyed {
			target := r.findBestTarget(leader)
			if target == nil {
				target = r.findBestTarget(unit)
			}

			if target != nil && !target.IsDestroyed {
				dx := target.Pos.X - unit.Pos.X
				dy := target.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)
				RotateTowards(unit, math.Atan2(dy, dx))

				if dist > 300 {
					unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
					unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
					unit.IsFiring = false
				} else {
					unit.IsFiring = true
				}
			} else {
				targetX := leader.Pos.X + 100.0
				targetY := leader.Pos.Y + 100.0
				dx := targetX - unit.Pos.X
				dy := targetY - unit.Pos.Y
				distToAnchor := math.Hypot(dx, dy)

				if distToAnchor > 40.0 {
					RotateTowards(unit, math.Atan2(dy, dx))
					unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.9
					unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.9
				} else {
					RotateTowards(unit, leader.Angle)
				}
				unit.IsFiring = false
			}
		} else {
			target := r.findBestTarget(unit)
			if target != nil && !target.IsDestroyed {
				dx := target.Pos.X - unit.Pos.X
				dy := target.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)
				RotateTowards(unit, math.Atan2(dy, dx))
				if dist > 250 {
					unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
					unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
					unit.IsFiring = false
				} else {
					unit.IsFiring = true
				}
			} else {
				unit.IsFiring = false
			}
		}
		return
	}

	// 4. Support & Buddy Protocols (e.g., Aegis Repair Corvette — repairs handled by logistics.go)
	if unit.BuddyID != "" || unit.Type == "aegis_repair" {
		var buddyTarget *models.FleetUnit
		if unit.BuddyID != "" {
			buddyTarget = r.units[unit.BuddyID]
		} else if unit.Type == "aegis_repair" {
			minDist := math.MaxFloat64
			for _, ally := range r.units {
				if ally.OwnerID == unit.OwnerID && ally.ID != unit.ID && ally.Type != "flagship" && !ally.IsDestroyed {
					d := math.Hypot(ally.Pos.X-unit.Pos.X, ally.Pos.Y-unit.Pos.Y)
					if d < minDist {
						minDist = d
						buddyTarget = ally
					}
				}
			}
		}

		if buddyTarget != nil && !buddyTarget.IsDestroyed {
			dx := buddyTarget.Pos.X - unit.Pos.X
			dy := buddyTarget.Pos.Y - unit.Pos.Y
			distToBuddy := math.Hypot(dx, dy)

			targetOrbitDist := 150.0
			angleToBuddy := math.Atan2(dy, dx)

			orbitAngle := angleToBuddy + (math.Pi / 2)
			if distToBuddy > targetOrbitDist+50 {
				orbitAngle = angleToBuddy
			}

			RotateTowards(unit, angleToBuddy)
			unit.Vel.X += math.Cos(orbitAngle) * unit.Speed
			unit.Vel.Y += math.Sin(orbitAngle) * unit.Speed
		}
		unit.IsFiring = false
		return
	}

	// 5. Battalion Command Ship Combat Relay Loop (field repair handled by logistics.go)
	if unit.Type == "battalion_command_ship" {
		var bestTarget *models.FleetUnit
		minDist := math.MaxFloat64

		for _, other := range r.units {
			if other.OwnerID != unit.OwnerID && !other.IsDestroyed {
				if r.IsUnitVisible(unit.OwnerID, other) {
					dist := math.Hypot(other.Pos.X-unit.Pos.X, other.Pos.Y-unit.Pos.Y)
					if dist < minDist {
						minDist = dist
						bestTarget = other
					}
				}
			}
		}

		if bestTarget != nil {
			dx := bestTarget.Pos.X - unit.Pos.X
			dy := bestTarget.Pos.Y - unit.Pos.Y
			RotateTowards(unit, math.Atan2(dy, dx))

			if minDist > 800.0 {
				unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.8
				unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.8
				unit.IsFiring = false
			} else {
				unit.IsFiring = true
			}
		} else {
			unit.IsFiring = false
		}
		return
	}

	// 6. Standard SEEK and GUARD Combat State Loops (Battalion-Aware & Telemetry Gated)
	target := r.findBestTarget(unit)

	localAnchor := flagship
	if unit.BattalionID > 0 && unit.OwnerID == "player" {
		for _, u := range r.units {
			if u.OwnerID == "player" && u.Type == "battalion_command_ship" && u.BattalionID == unit.BattalionID && !u.IsDestroyed {
				localAnchor = u
				break
			}
		}
	}

	if target != nil && !target.IsDestroyed {
		dx := target.Pos.X - unit.Pos.X
		dy := target.Pos.Y - unit.Pos.Y
		dist := math.Hypot(dx, dy)
		RotateTowards(unit, math.Atan2(dy, dx))

		engagementDist := unit.OptimalRange
		if engagementDist <= 0 {
			engagementDist = 250.0
		}

		if dist > engagementDist {
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
			unit.IsFiring = false
		} else {
			unit.IsFiring = true
		}
	} else if (unit.AIState == "BODYGUARD" || unit.Type == "command_escort") && localAnchor != nil && !localAnchor.IsDestroyed {
		dx := localAnchor.Pos.X - unit.Pos.X
		dy := localAnchor.Pos.Y - unit.Pos.Y
		distToCapital := math.Hypot(dx, dy)

		if distToCapital > 130 {
			RotateTowards(unit, math.Atan2(dy, dx))
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 1.1
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 1.1
		} else {
			RotateTowards(unit, localAnchor.Angle)
		}
		unit.IsFiring = false
	} else if unit.AIState == "GUARD" && localAnchor != nil && !localAnchor.IsDestroyed {
		dx := localAnchor.Pos.X - unit.Pos.X
		dy := localAnchor.Pos.Y - unit.Pos.Y
		if math.Hypot(dx, dy) > 200 {
			RotateTowards(unit, math.Atan2(dy, dx))
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.8
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.8
		} else {
			RotateTowards(unit, localAnchor.Angle)
		}
		unit.IsFiring = false
	} else {
		// Blind local patrol fallback when no telemetry target is visible
		unit.IsFiring = false

		driftAngle := unit.Angle + 0.02
		unit.Angle = math.Mod(driftAngle+math.Pi*2, math.Pi*2)
		unit.Vel.X += math.Cos(unit.Angle) * (unit.Speed * 0.25)
		unit.Vel.Y += math.Sin(unit.Angle) * (unit.Speed * 0.25)

		unit.Vel.X *= 0.92
		unit.Vel.Y *= 0.92
	}
}
