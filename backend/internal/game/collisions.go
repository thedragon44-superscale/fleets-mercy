package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// getUnitRadius returns a uniform, sprite-accurate physical footprint radius decoupled from weight class
func getUnitRadius(unit *models.FleetUnit) float64 {
	// Uniform base radius matching the visual asset boundaries for close formation packing
	return 30.0
}

// ResolveUnitCollisions checks and resolves physics-based overlapping collisions between individual fleet units
func ResolveUnitCollisions(units map[string]*models.FleetUnit, isSandbox bool) {
	// Run 2 iterative passes per tick for stable multi-body cluster separation
	for iteration := 0; iteration < 2; iteration++ {
		for _, unit := range units {
			if unit.IsDestroyed {
				continue
			}

			radiusA := getUnitRadius(unit)

			for _, other := range units {
				if unit.ID == other.ID || other.IsDestroyed {
					continue
				}

				radiusB := getUnitRadius(other)
				minDist := radiusA + radiusB

				dx := other.Pos.X - unit.Pos.X
				dy := other.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)

				if dist < minDist && dist > 0.1 {
					overlap := minDist - dist
					nx := dx / dist
					ny := dy / dist
					
					// Asymmetric mass dominance: Lighter units absorb 100% of displacement against heavier hulls
					weightA := float64(unit.WeightClass)
					if weightA < 1 { weightA = 1 }
					weightB := float64(other.WeightClass)
					if weightB < 1 { weightB = 1 }
					
					var ratioA, ratioB float64
					if weightA > weightB {
						// Unit is heavier than other: Unit is immovable, other absorbs full displacement
						ratioA = 0.0
						ratioB = 1.0
					} else if weightB > weightA {
						// Other is heavier than unit: Other is immovable, unit absorbs full displacement
						ratioA = 1.0
						ratioB = 0.0
					} else {
						// Equal weight classes: Split displacement 50/50
						ratioA = 0.5
						ratioB = 0.5
					}

					unit.Pos.X -= nx * overlap * ratioA
					unit.Pos.Y -= ny * overlap * ratioA
					other.Pos.X += nx * overlap * ratioB
					other.Pos.Y += ny * overlap * ratioB

					if !(isSandbox && unit.OwnerID == "player" && other.OwnerID == "player") {
						impactVel := math.Hypot(unit.Vel.X-other.Vel.X, unit.Vel.Y-other.Vel.Y)
						if impactVel > 2.0 {
							applyDamage(other, impactVel*0.03, math.Atan2(dy, dx))
						}
					}
				}
			}
		}
	}
}
