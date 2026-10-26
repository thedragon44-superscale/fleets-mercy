package game

import (
	"fmt"
	"math"
	"space-tactics-server/internal/models"
)

// HandleWeaponFiring processes weapon cooldowns, projectile calculations, and ballistic velocity updates
func HandleWeaponFiring(unit *models.FleetUnit, r *GameRoom) {
	if unit.IsDestroyed {
		return
	}

	if unit.Cooldown > 0 {
		unit.Cooldown--
	}

	// Strict data-driven rule: if projectile speed or DPS is zero/negative, unit does not fire
	if unit.ProjectileSpeed <= 0 || unit.DPS <= 0 {
		return
	}

	if unit.IsFiring && unit.Cooldown <= 0 {
		r.idCounter++
		
		projSpeed := unit.ProjectileSpeed
		projDmg := unit.DPS
		
		// Determine visual projectile type dynamically based on stats/weight class
		projColor := "laser"
		if unit.WeightClass >= 3 || projSpeed > 20.0 {
			projColor = "railgun"
		} else if projSpeed <= 15.0 && projDmg > 200.0 {
			projColor = "torpedo"
		}

		// Pure data-driven calculation: lifetime derived strictly from database range and speed parameters
		life := int(unit.ProjectileRange / projSpeed)
		if life < 1 {
			life = 1
		}

		r.projectiles = append(r.projectiles, models.Projectile{
			ID: fmt.Sprintf("proj-%d", r.idCounter), 
			OwnerID: unit.OwnerID, 
			Type: projColor,
			Pos: models.Vector2D{
				X: unit.Pos.X + math.Cos(unit.Angle)*30, 
				Y: unit.Pos.Y + math.Sin(unit.Angle)*30,
			},
			Vel: models.Vector2D{
				X: unit.Vel.X + math.Cos(unit.Angle)*projSpeed, 
				Y: unit.Vel.Y + math.Sin(unit.Angle)*projSpeed,
			},
			Life: life, 
			Damage: projDmg,
		})
		unit.Cooldown = unit.MaxCooldown
	}
}

// UpdateProjectiles advances active projectiles and resolves target collisions
func UpdateProjectiles(r *GameRoom) {
	activeProjectiles := []models.Projectile{}
	
	for _, p := range r.projectiles {
		p.Pos.X += p.Vel.X
		p.Pos.Y += p.Vel.Y
		p.Life--
		hit := false

		for _, unit := range r.units {
			if unit.IsDestroyed || p.OwnerID == unit.OwnerID { 
				continue 
			}
			if math.Hypot(p.Pos.X-unit.Pos.X, p.Pos.Y-unit.Pos.Y) < 40 {
				applyDamage(unit, p.Damage, math.Atan2(p.Vel.Y, p.Vel.X)+math.Pi)
				hit = true
				break
			}
		}

		if !hit && p.Life > 0 {
			activeProjectiles = append(activeProjectiles, p)
		}
	}
	r.projectiles = activeProjectiles
}
