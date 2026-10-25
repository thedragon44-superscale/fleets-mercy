package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// getUnitRadius calculates the physical footprint radius dynamically from database weight class
func getUnitRadius(unit *models.FleetUnit) float64 {
	wc := unit.WeightClass
	if wc < 1 {
		wc = 1
	}
	
	// Scale physical radius proportionally based on database weight class (e.g., Weight 1 = 25m, Weight 3 = 75m)
	return float64(wc) * 25.0
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
					
					// Weight-based displacement (lighter units get pushed more)
					weightA := float64(unit.WeightClass)
					if weightA < 1 { weightA = 1 }
					weightB := float64(other.WeightClass)
					if weightB < 1 { weightB = 1 }
					
					totalWeight := weightA + weightB
					ratioA := weightB / totalWeight
					ratioB := weightA / totalWeight

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
