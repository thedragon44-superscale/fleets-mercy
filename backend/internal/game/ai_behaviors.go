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
			unit.Angle = math.Atan2(dy, dx)
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

	// 2. Recon Probe Advanced Evasion & Orbital Scouting
	if unit.Type == "recon_probe" {
		var nearestTarget *models.FleetUnit
		minDist := math.MaxFloat64
		for _, other := range r.units {
			if other.OwnerID != unit.OwnerID && !other.IsDestroyed {
				d := math.Hypot(other.Pos.X-unit.Pos.X, other.Pos.Y-unit.Pos.Y)
				if d <= 2500.0 && d < minDist {
					minDist = d
					nearestTarget = other
				}
			}
		}

		if nearestTarget != nil {
			dx := nearestTarget.Pos.X - unit.Pos.X
			dy := nearestTarget.Pos.Y - unit.Pos.Y
			currentDist := math.Hypot(dx, dy)

			if currentDist < 1000.0 {
				fleeAngle := math.Atan2(-dy, -dx)
				unit.Angle = fleeAngle
				unit.Vel.X = math.Cos(fleeAngle) * 3.5
				unit.Vel.Y = math.Sin(fleeAngle) * 3.5
			} else {
				targetOrbitDist := 1800.0
				angleToTarget := math.Atan2(dy, dx)
				
				orbitAngle := angleToTarget + (math.Pi / 2)
				if currentDist > targetOrbitDist + 100 {
					orbitAngle = angleToTarget
				}

				unit.Angle = angleToTarget
				unit.Vel.X = math.Cos(orbitAngle) * 3.5
				unit.Vel.Y = math.Sin(orbitAngle) * 3.5
			}
		} else {
			unit.Vel.X = math.Cos(unit.Angle) * 3.5
			unit.Vel.Y = math.Sin(unit.Angle) * 3.5
		}
		unit.IsFiring = false
		return
	}

	// 3. Squad Member & Leader Formation Leash Logic
	if unit.SquadID > 0 && !unit.IsSquadLeader {
		leader := r.findSquadLeader(unit.OwnerID, unit.SquadID)
		if leader != nil && !leader.IsDestroyed {
			target := r.findBestTarget(leader)
			if target == nil {
				target = r.findBestTarget(unit)
			}

			if target != nil && !target.IsDestroyed {
				dx := target.Pos.X - unit.Pos.X
				dy := target.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)
				unit.Angle = math.Atan2(dy, dx)

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
					unit.Angle = math.Atan2(dy, dx)
					unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.9
					unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.9
				} else {
					unit.Angle = leader.Angle
				}
				unit.IsFiring = false
			}
		} else {
			target := r.findBestTarget(unit)
			if target != nil && !target.IsDestroyed {
				dx := target.Pos.X - unit.Pos.X
				dy := target.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)
				unit.Angle = math.Atan2(dy, dx)
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

	// 4. Support & Buddy Protocols (e.g., Aegis Repair Corvette)
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
			if distToBuddy > targetOrbitDist + 50 {
				orbitAngle = angleToBuddy
			}

			unit.Angle = angleToBuddy
			unit.Vel.X += math.Cos(orbitAngle) * unit.Speed
			unit.Vel.Y += math.Sin(orbitAngle) * unit.Speed

			if unit.Type == "aegis_repair" && distToBuddy <= 200.0 {
				buddyTarget.Hull.Front = math.Min(100.0, buddyTarget.Hull.Front + 0.2)
			}
			unit.IsFiring = false
		} else {
			unit.IsFiring = false
		}
		return
	}

	// 5. Battalion Command Ship Logistics & Regional Relay Loop
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
			unit.Angle = math.Atan2(dy, dx)

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

		// Field repair for nearby damaged units
		for _, ally := range r.units {
			if ally.OwnerID == unit.OwnerID && ally.ID != unit.ID && !ally.IsDestroyed {
				distToDock := math.Hypot(ally.Pos.X-unit.Pos.X, ally.Pos.Y-unit.Pos.Y)
				if distToDock < 150.0 && unit.ResourceCache >= 1.0 {
					unit.ResourceCache -= 0.1
					ally.Hull.Front = math.Min(100.0, ally.Hull.Front + 0.5)
				}
			}
		}
		return
	}

	// 6. Standard SEEK and GUARD Combat State Loops
	target := r.findBestTarget(unit)
	if unit.OwnerID == "enemy" && target == nil {
		target = flagship
	}

	if target != nil && !target.IsDestroyed {
		dx := target.Pos.X - unit.Pos.X
		dy := target.Pos.Y - unit.Pos.Y
		dist := math.Hypot(dx, dy)
		unit.Angle = math.Atan2(dy, dx)

		if dist > 250 {
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
			unit.IsFiring = false
		} else {
			unit.IsFiring = true
		}
	} else if (unit.AIState == "BODYGUARD" || unit.Type == "command_escort") && flagship != nil && !flagship.IsDestroyed {
		dx := flagship.Pos.X - unit.Pos.X
		dy := flagship.Pos.Y - unit.Pos.Y
		distToCapital := math.Hypot(dx, dy)
		
		guardTarget := r.findBestTarget(unit)
		if guardTarget != nil {
			tdx := guardTarget.Pos.X - unit.Pos.X
			tdy := guardTarget.Pos.Y - unit.Pos.Y
			tdist := math.Hypot(tdx, tdy)
			unit.Angle = math.Atan2(tdy, tdx)
			if tdist > 300 {
				unit.Vel.X += math.Cos(unit.Angle) * unit.Speed
				unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed
				unit.IsFiring = false
			} else {
				unit.IsFiring = true
			}
		} else if distToCapital > 130 {
			unit.Angle = math.Atan2(dy, dx)
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 1.1
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 1.1
			unit.IsFiring = false
		} else {
			unit.Angle = flagship.Angle
			unit.IsFiring = false
		}
	} else if unit.AIState == "GUARD" && flagship != nil && !flagship.IsDestroyed {
		dx := flagship.Pos.X - unit.Pos.X
		dy := flagship.Pos.Y - unit.Pos.Y
		if math.Hypot(dx, dy) > 200 {
			unit.Angle = math.Atan2(dy, dx)
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.8
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.8
		} else {
			unit.Angle = flagship.Angle
		}
		unit.IsFiring = false
	} else {
		unit.IsFiring = false
	}
}
