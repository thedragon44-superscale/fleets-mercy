package game

import (
	"math"
	"space-tactics-server/internal/models"
)

func applyDamage(target *models.FleetUnit, damage float64, impactAngle float64) {
	if target.IsDestroyed { return }

	// 95% Damage Reduction for Dreadnought Armor
	if target.Type == "flagship" {
		damage *= 0.05
	}

	relAngle := math.Mod(impactAngle-target.Angle+math.Pi*3, math.Pi*2) - math.Pi

	if relAngle >= -math.Pi/4 && relAngle <= math.Pi/4 {
		if target.Shields.Front > 0 { 
			target.Shields.Front = math.Max(0, target.Shields.Front-damage)
		} else { 
			target.Hull.Front = math.Max(0, target.Hull.Front-damage) 
		}
	} else if relAngle > math.Pi/4 && relAngle < 3*math.Pi/4 {
		if target.Shields.Starboard > 0 { 
			target.Shields.Starboard = math.Max(0, target.Shields.Starboard-damage)
		} else { 
			target.Hull.Starboard = math.Max(0, target.Hull.Starboard-damage) 
		}
	} else if relAngle < -math.Pi/4 && relAngle > -3*math.Pi/4 {
		if target.Shields.Port > 0 { 
			target.Shields.Port = math.Max(0, target.Shields.Port-damage)
		} else { 
			target.Hull.Port = math.Max(0, target.Hull.Port-damage) 
		}
	} else {
		if target.Shields.Rear > 0 { 
			target.Shields.Rear = math.Max(0, target.Shields.Rear-damage)
		} else { 
			target.Hull.Rear = math.Max(0, target.Hull.Rear-damage) 
		}
	}

	if target.Hull.Front <= 0 || target.Hull.Rear <= 0 || target.Hull.Port <= 0 || target.Hull.Starboard <= 0 {
		target.IsDestroyed = true
		target.Shields = models.QuadrantStats{}
	}
}

func ApplyEnvironmentalCollisions(unit *models.FleetUnit, structures []models.MapStructure) {
	if unit.IsDestroyed { return }

	for _, s := range structures {
		dx := unit.Pos.X - s.PosX
		dy := unit.Pos.Y - s.PosY
		dist := math.Hypot(dx, dy)

		collisionRadius := s.Radius + 30.0

		if dist < collisionRadius {
			if s.StructureType == "gas_giant" && dist < s.Radius * 0.6 {
				// Core Death Zone: Instant destruction
				unit.IsDestroyed = true
				unit.Shields = models.QuadrantStats{}
				return
			}

			if dist > 0.1 {
				nx := dx / dist
				ny := dy / dist
				overlap := collisionRadius - dist
				unit.Pos.X += nx * overlap
				unit.Pos.Y += ny * overlap

				dot := unit.Vel.X*nx + unit.Vel.Y*ny
				if dot < 0 {
					unit.Vel.X -= dot * nx
					unit.Vel.Y -= dot * ny
				}
			}
		}
	}
}
