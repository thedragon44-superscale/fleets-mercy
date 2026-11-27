package game

import (
	"math"

	"space-tactics-server/internal/game/envphysics"
	"space-tactics-server/internal/models"
)

func applyQuadrantDamage(shield *float64, hull *float64, damage float64) {
	if *shield > 0 {
		if damage <= *shield {
			*shield -= damage
			return
		}
		overflow := damage - *shield
		*shield = 0
		*hull = math.Max(0, *hull-overflow)
		return
	}
	*hull = math.Max(0, *hull-damage)
}

func applyDamage(target *models.FleetUnit, damage float64, impactAngle float64) {
	if target.IsDestroyed || damage <= 0 {
		return
	}

	// Database-driven Armor Mitigation
	if target.ArmorMitigation > 0 {
		damage *= (1.0 - target.ArmorMitigation)
	}

	relAngle := math.Mod(impactAngle-target.Angle+math.Pi*3, math.Pi*2) - math.Pi

	if relAngle >= -math.Pi/4 && relAngle <= math.Pi/4 {
		applyQuadrantDamage(&target.Shields.Front, &target.Hull.Front, damage)
	} else if relAngle > math.Pi/4 && relAngle < 3*math.Pi/4 {
		applyQuadrantDamage(&target.Shields.Starboard, &target.Hull.Starboard, damage)
	} else if relAngle < -math.Pi/4 && relAngle > -3*math.Pi/4 {
		applyQuadrantDamage(&target.Shields.Port, &target.Hull.Port, damage)
	} else {
		applyQuadrantDamage(&target.Shields.Rear, &target.Hull.Rear, damage)
	}

	if target.Hull.Front <= 0 || target.Hull.Rear <= 0 || target.Hull.Port <= 0 || target.Hull.Starboard <= 0 {
		target.IsDestroyed = true
		target.Shields = models.QuadrantStats{}
	}
}

// RegenerateShields restores shield quadrants each tick based on ShieldRegenRate (HP/s at 60Hz).
func RegenerateShields(unit *models.FleetUnit) {
	if unit.IsDestroyed || unit.ShieldRegenRate <= 0 || unit.ShieldBase <= 0 {
		return
	}

	regenPerTick := unit.ShieldRegenRate / 60.0
	maxShield := unit.ShieldBase

	if unit.Shields.Front < maxShield {
		unit.Shields.Front = math.Min(maxShield, unit.Shields.Front+regenPerTick)
	}
	if unit.Shields.Rear < maxShield {
		unit.Shields.Rear = math.Min(maxShield, unit.Shields.Rear+regenPerTick)
	}
	if unit.Shields.Port < maxShield {
		unit.Shields.Port = math.Min(maxShield, unit.Shields.Port+regenPerTick)
	}
	if unit.Shields.Starboard < maxShield {
		unit.Shields.Starboard = math.Min(maxShield, unit.Shields.Starboard+regenPerTick)
	}
}

func ApplyEnvironmentalCollisions(unit *models.FleetUnit, structures []models.MapStructure) {
	if unit.IsDestroyed {
		return
	}

	for _, s := range structures {
		if s.StructureType == "asteroid_belt" {
			// Cluster-aware collision check across individual nodes with precise tactical gap tolerances
			for i := 0; i < 12; i++ {
				angle := float64(i) / 12.0 * 2 * math.Pi
				nodeDist := s.Radius * (0.6 + math.Sin(float64(i))*0.3)
				nodeX := s.PosX + math.Cos(angle)*nodeDist
				nodeY := s.PosY + math.Sin(angle)*nodeDist

				nodeRadius := 28.0

				dx := unit.Pos.X - nodeX
				dy := unit.Pos.Y - nodeY
				dist := math.Hypot(dx, dy)

				if dist < nodeRadius && dist > 0.1 {
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
			continue
		}

		dx := unit.Pos.X - s.PosX
		dy := unit.Pos.Y - s.PosY
		dist := math.Hypot(dx, dy)

		collisionRadius := s.Radius + 35.0

		if dist < collisionRadius {
			if s.StructureType == "gas_giant" && dist < s.Radius*0.6 {
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

func ApplyMajorWorldGravity(unit *models.FleetUnit, structures []models.MapStructure) {
	if unit.IsDestroyed {
		return
	}

	for _, s := range structures {
		if s.StructureType != "major_world" && s.StructureType != "terrestrial" {
			continue
		}

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

// ApplyUniversalEnvPhysics runs the shared 60Hz envphysics simulation for Sandbox & TDM units.
func ApplyUniversalEnvPhysics(unit *models.FleetUnit, world *envphysics.World) {
	if unit == nil || unit.IsDestroyed {
		return
	}
	if world == nil {
		unit.StealthActive = false
		return
	}

	st := envphysics.UnitState{
		UnitType:    unit.Type,
		WeightClass: unit.WeightClass,
		Pos:         envphysics.Vec2{X: unit.Pos.X, Y: unit.Pos.Y},
		Radius:      envphysics.ShipRadiusForWeight(unit.WeightClass),
	}
	envphysics.StepUnit(&st, world)

	unit.StealthActive = st.IsStealthed
	unit.Pos.X = st.Pos.X
	unit.Pos.Y = st.Pos.Y
	unit.Vel.X = unit.Vel.X*st.DragScale + st.Accel.X
	unit.Vel.Y = unit.Vel.Y*st.DragScale + st.Accel.Y

	if st.InstantKill {
		unit.IsDestroyed = true
		unit.Shields = models.QuadrantStats{}
		return
	}
	if st.ShieldDrain > 0 {
		unit.Shields.Front = math.Max(0, unit.Shields.Front-st.ShieldDrain)
		unit.Shields.Rear = math.Max(0, unit.Shields.Rear-st.ShieldDrain*0.5)
		unit.Shields.Port = math.Max(0, unit.Shields.Port-st.ShieldDrain*0.5)
		unit.Shields.Starboard = math.Max(0, unit.Shields.Starboard-st.ShieldDrain*0.5)
	}
	if st.DamageAmount > 0 {
		impactAngle := math.Atan2(st.DamageSource.Y-unit.Pos.Y, st.DamageSource.X-unit.Pos.X)
		applyDamage(unit, st.DamageAmount, impactAngle)
	}
}
