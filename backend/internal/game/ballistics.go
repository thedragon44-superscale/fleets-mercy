package game

import (
	"fmt"
	"math"
	"space-tactics-server/internal/models"
)

// HandleWeaponFiring processes weapon cooldowns, thermal cooling, ammo consumption, and ballistic launches
func HandleWeaponFiring(unit *models.FleetUnit, r *GameRoom) {
	if unit.IsDestroyed {
		return
	}

	if unit.Cooldown > 0 {
		unit.Cooldown--
	}

	// Passive thermal cooling each tick (60Hz)
	if unit.CurrentThermal > 0 {
		coolPerTick := 0.5
		if unit.MaxThermalCapacity > 0 {
			coolPerTick = math.Max(0.5, unit.MaxThermalCapacity*0.002)
		}
		unit.CurrentThermal = math.Max(0, unit.CurrentThermal-coolPerTick)
	}

	// Strict data-driven rule: if projectile speed or DPS is zero/negative, unit does not fire
	if unit.ProjectileSpeed <= 0 || unit.DPS <= 0 {
		return
	}

	if !unit.IsFiring || unit.Cooldown > 0 {
		return
	}

	// Enforce finite ammo when MaxAmmoCapacity >= 0 (-1 = infinite)
	if unit.MaxAmmoCapacity >= 0 && unit.CurrentAmmo <= 0 {
		return
	}

	// Enforce thermal ceiling when MaxThermalCapacity > 0
	if unit.MaxThermalCapacity > 0 && unit.CurrentThermal >= unit.MaxThermalCapacity {
		return
	}

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
		ID:      fmt.Sprintf("proj-%d", r.idCounter),
		OwnerID: unit.OwnerID,
		Type:    projColor,
		Pos: models.Vector2D{
			X: unit.Pos.X + math.Cos(unit.Angle)*30,
			Y: unit.Pos.Y + math.Sin(unit.Angle)*30,
		},
		Vel: models.Vector2D{
			X: unit.Vel.X + math.Cos(unit.Angle)*projSpeed,
			Y: unit.Vel.Y + math.Sin(unit.Angle)*projSpeed,
		},
		Life:   life,
		Damage: projDmg,
	})

	if unit.MaxAmmoCapacity >= 0 {
		unit.CurrentAmmo--
	}
	if unit.MaxThermalCapacity > 0 {
		heatGain := math.Max(5.0, unit.MaxThermalCapacity*0.05)
		unit.CurrentThermal = math.Min(unit.MaxThermalCapacity, unit.CurrentThermal+heatGain)
	}

	unit.Cooldown = unit.MaxCooldown
}

// UpdateProjectiles advances active projectiles and resolves target collisions
func UpdateProjectiles(r *GameRoom) {
	activeProjectiles := make([]models.Projectile, 0, len(r.projectiles))

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
