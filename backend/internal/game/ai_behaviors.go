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

	// 2. Recon Probe Landmark Orbital Patrol, Sector Sweep & Emergency Evasion Protocol
	if unit.Type == "recon_probe" {
		// Emergency Evasion: Check if any enemy unit breaches the 1,000m safety threshold[cite: 7]
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
			// Flee directly away from the threat at maximum speed (3.5)[cite: 7]
			dx := unit.Pos.X - closestEnemy.Pos.X
			dy := unit.Pos.Y - closestEnemy.Pos.Y
			angle := math.Atan2(dy, dx)
			unit.Angle = angle

			unit.Vel.X = math.Cos(angle) * 3.5
			unit.Vel.Y = math.Sin(angle) * 3.5
			unit.IsFiring = false
			return
		}

		// Calculate repulsion from other friendly recon probes to enforce 2,300m - 2,400m spacing[cite: 7]
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

		// Scan all environmental structures loaded in the map
		for i := range r.structures {
			s := &r.structures[i]
			dx := s.PosX - unit.Pos.X
			dy := s.PosY - unit.Pos.Y
			dist := math.Hypot(dx, dy)
			if dist < minDist {
				minDist = dist
				nearestStruct = s
			}
		}

		if nearestStruct != nil {
			// Target an optimal orbital standoff (~1,800m or structure radius + buffer)[cite: 7]
			targetOrbitDist := math.Max(1800.0, nearestStruct.Radius + 200.0)
			dx := nearestStruct.PosX - unit.Pos.X
			dy := nearestStruct.PosY - unit.Pos.Y
			distToStruct := math.Hypot(dx, dy)
			angleToStruct := math.Atan2(dy, dx)

			// Compute orbital tangent vector for smooth high-speed patrol rotation around landmark
			orbitAngle := angleToStruct + (math.Pi / 2)
			if math.Abs(distToStruct - targetOrbitDist) > 150.0 {
				if distToStruct < targetOrbitDist {
					orbitAngle = angleToStruct + math.Pi // Move outward
				} else {
					orbitAngle = angleToStruct // Move inward
				}
			}

			unit.Angle = angleToStruct
			unit.Vel.X = math.Cos(orbitAngle) * unit.Speed * 1.1 + repelX
			unit.Vel.Y = math.Sin(orbitAngle) * unit.Speed * 1.1 + repelY
		} else {
			// Autonomous Blind Sweep / Sector Grid Distribution into open space[cite: 7]
			centerDX := unit.Pos.X - 6000.0
			centerDY := unit.Pos.Y - 6000.0
			sweepAngle := math.Atan2(centerDY, centerDX)
			if math.Hypot(centerDX, centerDY) < 500.0 {
				sweepAngle = rand.Float64() * 2 * math.Pi
			}

			unit.Angle = sweepAngle
			unit.Vel.X = math.Cos(sweepAngle) * unit.Speed * 0.9 + repelX
			unit.Vel.Y = math.Sin(sweepAngle) * unit.Speed * 0.9 + repelY
		}

		// Clamp velocity
		speed := math.Hypot(unit.Vel.X, unit.Vel.Y)
		maxSpeed := unit.Speed * 1.8
		if speed > maxSpeed {
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
				maxBuddyHull := buddyTarget.HullBase
				if maxBuddyHull <= 0 { maxBuddyHull = 100.0 }
				buddyTarget.Hull.Front = math.Min(maxBuddyHull, buddyTarget.Hull.Front + 0.2)
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
					maxAllyHull := ally.HullBase
					if maxAllyHull <= 0 { maxAllyHull = 100.0 }
					ally.Hull.Front = math.Min(maxAllyHull, ally.Hull.Front + 0.5)
				}
			}
		}
		return
	}

	// 6. Standard SEEK and GUARD Combat State Loops (Battalion-Aware & Telemetry Gated)
	target := r.findBestTarget(unit)

	// Resolve local anchor: if assigned to a battalion, look for that battalion's command ship
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
		unit.Angle = math.Atan2(dy, dx)

		// Use database-driven optimal range, falling back to 250 if unconfigured
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
			unit.Angle = localAnchor.Angle
			unit.IsFiring = false
		}
	} else if unit.AIState == "GUARD" && localAnchor != nil && !localAnchor.IsDestroyed {
		dx := localAnchor.Pos.X - unit.Pos.X
		dy := localAnchor.Pos.Y - unit.Pos.Y
		if math.Hypot(dx, dy) > 200 {
			unit.Angle = math.Atan2(dy, dx)
			unit.Vel.X += math.Cos(unit.Angle) * unit.Speed * 0.8
			unit.Vel.Y += math.Sin(unit.Angle) * unit.Speed * 0.8
		} else {
			unit.Angle = localAnchor.Angle
		}
		unit.IsFiring = false
	} else {
		// 🔴 BLIND LOCAL PATROL FALLBACK: When no telemetry target is visible, mill about locally instead of marching blindly
		unit.IsFiring = false
		
		// Apply a gentle sinusoidal/orbital drift rotation so they look active in their local sector
		driftAngle := unit.Angle + 0.02
		unit.Angle = driftAngle
		unit.Vel.X += math.Cos(driftAngle) * (unit.Speed * 0.25)
		unit.Vel.Y += math.Sin(driftAngle) * (unit.Speed * 0.25)

		// Damp velocity so they stay localized
		unit.Vel.X *= 0.92
		unit.Vel.Y *= 0.92
	}
}
