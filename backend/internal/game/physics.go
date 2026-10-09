package game

import (
	"math"
	"space-tactics-server/internal/models"
)

func applyDamage(target *models.FleetUnit, damage float64, impactAngle float64) {
	if target.IsDestroyed { return }

	// 95% Damage Reduction for Capital Dreadnought & Command Ship Armor[cite: 5, 16]
	if target.Type == "flagship" || target.Type == "battalion_command_ship" {
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
		if s.StructureType == "asteroid_belt" {
			// Cluster-aware collision check across individual nodes with precise tactical gap tolerances[cite: 16]
			for i := 0; i < 12; i++ {
				angle := float64(i) / 12.0 * 2 * math.Pi
				nodeDist := s.Radius * (0.6 + math.Sin(float64(i))*0.3)
				nodeX := s.PosX + math.Cos(angle)*nodeDist
				nodeY := s.PosY + math.Sin(angle)*nodeDist
				
				// Tighter collision radius to allow gap navigation between nodes[cite: 16]
				nodeRadius := (15.0 + float64(i%3)*8.0) + 5.0

				dx := unit.Pos.X - nodeX
				dy := unit.Pos.Y - nodeY
				dist := math.Hypot(dx, dy)

				if dist < nodeRadius {
					if dist > 0.1 {
						nx := dx / dist
						ny := dy / dist
						overlap := nodeRadius - dist
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
			continue
		}

		dx := unit.Pos.X - s.PosX
		dy := unit.Pos.Y - s.PosY
		dist := math.Hypot(dx, dy)

		collisionRadius := s.Radius + 30.0

		if dist < collisionRadius {
			if s.StructureType == "gas_giant" && dist < s.Radius * 0.6 {
				// Core Death Zone: Instant destruction[cite: 16]
				targetDestroyed := true
				if targetDestroyed {
					unit.IsDestroyed = true
					unit.Shields = models.QuadrantStats{}
					return
				}
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

func ApplyMajorWorldGravity(unit *models.FleetUnit, structures []models.MapStructure) {
	if unit.IsDestroyed { return }

	for _, s := range structures {
		if s.StructureType != "major_world" && s.StructureType != "terrestrial" { continue }

		dx := s.PosX - unit.Pos.X
		dy := s.PosY - unit.Pos.Y
		dist := math.Hypot(dx, dy)

		gravityRadius := s.Radius * 2.5

		if dist < gravityRadius && dist > s.Radius {
			pullFactor := (1.0 - (dist / gravityRadius)) * 0.15
			nx := dx / dist
			ny := dy / dist

			unit.Vel.X += nx * pullFactor
			unit.Vel.Y += ny * pullFactor
		}
	}
}
