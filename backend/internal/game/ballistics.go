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

	if unit.IsFiring && unit.Cooldown <= 0 {
		r.idCounter++
		projSpeed, projDmg, projColor := 18.0, 50.0, "laser"
		
		if unit.Type == "lancer_corvette" || unit.Type == "flagship" || unit.Type == "battalion_command_ship" {
			projSpeed = 25.0
			projDmg = 120.0
			projColor = "railgun"
		} else if unit.Type == "torpedo_bomber" {
			projSpeed = 12.0
			projDmg = 300.0
			projColor = "torpedo"
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
			Life: 100, 
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
