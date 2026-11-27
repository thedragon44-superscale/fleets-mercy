package game

import (
	"math"

	"space-tactics-server/internal/game/envphysics"
	"space-tactics-server/internal/models"
)

// getUnitRadius returns the canonical hull hitbox radius shared across all game modes.
func getUnitRadius(unit *models.FleetUnit) float64 {
	return envphysics.ShipHitboxRadius(unit.Type, unit.WeightClass)
}

// ResolveUnitCollisions checks and resolves physics-based overlapping collisions between individual fleet units
func ResolveUnitCollisions(units map[string]*models.FleetUnit, isSandbox bool) {
	active := make([]*models.FleetUnit, 0, len(units))
	for _, u := range units {
		if !u.IsDestroyed {
			active = append(active, u)
		}
	}

	n := len(active)
	if n < 2 {
		return
	}

	// Run 2 iterative passes per tick for stable multi-body cluster separation
	for iteration := 0; iteration < 2; iteration++ {
		for i := 0; i < n; i++ {
			unit := active[i]
			if unit.IsDestroyed {
				continue
			}
			radiusA := getUnitRadius(unit)

			for j := i + 1; j < n; j++ {
				other := active[j]
				if other.IsDestroyed {
					continue
				}

				radiusB := getUnitRadius(other)
				minDist := radiusA + radiusB

				dx := other.Pos.X - unit.Pos.X
				dy := other.Pos.Y - unit.Pos.Y
				dist := math.Hypot(dx, dy)

				if dist >= minDist {
					continue
				}

				var nx, ny, overlap float64
				if dist <= 0.1 {
					// Deterministic separation vector for stacked spawns at identical coordinates
					angle := float64((i+j)%8) * (math.Pi / 4.0)
					nx = math.Cos(angle)
					ny = math.Sin(angle)
					overlap = minDist
				} else {
					nx = dx / dist
					ny = dy / dist
					overlap = minDist - dist
				}

				// Asymmetric mass dominance: Lighter units absorb 100% of displacement against heavier hulls
				weightA := float64(unit.WeightClass)
				if weightA < 1 {
					weightA = 1
				}
				weightB := float64(other.WeightClass)
				if weightB < 1 {
					weightB = 1
				}

				var ratioA, ratioB float64
				if weightA > weightB {
					ratioA = 0.0
					ratioB = 1.0
				} else if weightB > weightA {
					ratioA = 1.0
					ratioB = 0.0
				} else {
					ratioA = 0.5
					ratioB = 0.5
				}

				unit.Pos.X -= nx * overlap * ratioA
				unit.Pos.Y -= ny * overlap * ratioA
				other.Pos.X += nx * overlap * ratioB
				other.Pos.Y += ny * overlap * ratioB

				// Cancel inward relative normal velocity on hitbox touch so ships do not bounce or grind
				relVx := other.Vel.X - unit.Vel.X
				relVy := other.Vel.Y - unit.Vel.Y
				relNormal := relVx*nx + relVy*ny
				if relNormal < 0 {
					unit.Vel.X += nx * relNormal * ratioA
					unit.Vel.Y += ny * relNormal * ratioA
					other.Vel.X -= nx * relNormal * ratioB
					other.Vel.Y -= ny * relNormal * ratioB
				}

				if !(isSandbox && unit.OwnerID == "player" && other.OwnerID == "player") {
					impactVel := math.Hypot(unit.Vel.X-other.Vel.X, unit.Vel.Y-other.Vel.Y)
					if impactVel > 2.0 {
						impactAngle := math.Atan2(ny, nx)
						applyDamage(other, impactVel*0.03, impactAngle)
						applyDamage(unit, impactVel*0.03, impactAngle+math.Pi)
					}
				}
			}
		}
	}
}
