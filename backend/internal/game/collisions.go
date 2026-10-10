package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// ResolveUnitCollisions checks and resolves physics-based overlapping collisions between individual fleet units
func ResolveUnitCollisions(units map[string]*models.FleetUnit, isSandbox bool) {
	for _, unit := range units {
		if unit.IsDestroyed {
			continue
		}

		for _, other := range units {
			if unit.ID == other.ID || other.IsDestroyed {
				continue
			}

			dx := other.Pos.X - unit.Pos.X
			dy := other.Pos.Y - unit.Pos.Y
			dist := math.Hypot(dx, dy)

			if dist < 45.0 && dist > 0.1 {
				overlap := 45.0 - dist
				nx := dx / dist
				ny := dy / dist
				
				unit.Pos.X -= nx * overlap * 0.5
				unit.Pos.Y -= ny * overlap * 0.5
				other.Pos.X += nx * overlap * 0.5
				other.Pos.Y += ny * overlap * 0.5

				if !(isSandbox && unit.OwnerID == "player" && other.OwnerID == "player") {
					impactVel := math.Hypot(unit.Vel.X, unit.Vel.Y)
					if impactVel > 2.0 {
						applyDamage(other, impactVel*0.05, math.Atan2(dy, dx))
					}
				}
			}
		}
	}
}
