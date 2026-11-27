package envphysics

import "math"

func IsSolidBlockingComponent(kind string) bool {
	switch kind {
	case "solid_rock", "resource_node", "solid_core", "cave_mouth", "crater_node":
		return true
	default:
		return false
	}
}

func isImmune(immuneList []string, unitType string) bool {
	for _, cls := range immuneList {
		if cls == unitType {
			return true
		}
	}
	return false
}

// StepUnit evaluates broad-phase culled 60Hz environmental physics.
// Only objects with GravityStrength > 0 affect unit movement before solid hitbox contact.
// Non-gravity fields retain non-movement tactical effects (stealth, DoT, lethal core, comet impact).
func StepUnit(u *UnitState, world *World) {
	if u == nil || world == nil {
		return
	}

	u.IsStealthed = false
	u.DragScale = 1.0
	u.Accel = Vec2{}
	u.InstantKill = false
	u.DamageAmount = 0
	u.ShieldDrain = 0

	shipR := u.Radius
	if shipR <= 0 {
		shipR = ShipHitboxRadius(u.UnitType, u.WeightClass)
	}

	for _, obj := range world.Objects {
		broadR := math.Max(obj.BoundingRadius, obj.Physics.GravityRadius) + shipR + 40.0
		dxObj := obj.Center.X - u.Pos.X
		dyObj := obj.Center.Y - u.Pos.Y
		distObjSq := dxObj*dxObj + dyObj*dyObj
		if distObjSq > broadR*broadR {
			continue
		}

		distObj := math.Sqrt(distObjSq)
		immune := isImmune(obj.Physics.ImmuneUnitClasses, u.UnitType)

		// 1. Gravity Well Pull (the ONLY pre-contact movement force from env objects)
		if !immune && obj.Physics.GravityStrength > 0 && obj.Physics.GravityRadius > 0 && distObj > 1.0 && distObj < obj.Physics.GravityRadius {
			falloff := 1.0 - (distObj / obj.Physics.GravityRadius)
			weightScale := 1.4 - 0.15*float64(u.WeightClass)
			if weightScale < 0.5 {
				weightScale = 0.5
			}
			pull := obj.Physics.GravityStrength * falloff * weightScale
			u.Accel.X += (dxObj / distObj) * pull
			u.Accel.Y += (dyObj / distObj) * pull
		}

		// 2. Per-Component Zones (stealth/DoT/lethal core) & Strict Solid Hitbox Contact
		for _, c := range obj.Components {
			dx := u.Pos.X - c.Pos.X
			dy := u.Pos.Y - c.Pos.Y
			dist := math.Hypot(dx, dy)

			switch c.Kind {
			case "gas_core":
				if dist < c.Radius+shipR*0.5 {
					u.InstantKill = true
					return
				}

			case "gas_deep":
				if dist < c.Radius && dist >= c.InnerRadius {
					if obj.Physics.RadarOpaque {
						u.IsStealthed = true
					}
					if !immune && obj.Physics.DeepDotDPS > 0 {
						u.DamageAmount += obj.Physics.DeepDotDPS / float64(TickRateHz)
						u.DamageSource = c.Pos
					}
				}

			case "gas_outer":
				// No pre-contact movement drag; gravity is driven solely by GravityStrength > 0.

			case "nebula_blob":
				if dist < c.Radius && obj.Physics.RadarOpaque {
					u.IsStealthed = true
				}

			case "comet_core":
				if dist < c.Radius+shipR {
					applyCometImpact(u, obj)
					if u.InstantKill {
						return
					}
				}

			case "solid_rock", "solid_core", "resource_node", "crater_node", "cave_mouth", "rift_core":
				if obj.ObjectType == "gas_giant" || obj.ObjectType == "nebula_field" {
					continue
				}
				minDist := c.Radius + shipR
				if dist < minDist && dist > 0.01 {
					nx := dx / dist
					ny := dy / dist
					overlap := minDist - dist
					u.Pos.X += nx * overlap
					u.Pos.Y += ny * overlap

					// Cancel inward normal velocity on solid hitbox contact so ships slide or stop cleanly
					dot := u.Vel.X*nx + u.Vel.Y*ny
					if dot < 0 {
						u.Vel.X -= dot * nx
						u.Vel.Y -= dot * ny
					}
				}
			}
		}
	}
}

func applyCometImpact(u *UnitState, comet *ActiveEnvObject) {
	prof := comet.Physics.ImpactProfile
	meltMax := 2
	heavyDmg := 3200.0
	shieldAbsorbMin := 5
	if prof != nil {
		if prof.MeltMaxWeight > 0 {
			meltMax = prof.MeltMaxWeight
		}
		if prof.HeavyDamage > 0 {
			heavyDmg = prof.HeavyDamage
		}
		if prof.ShieldAbsorbMinWeight > 0 {
			shieldAbsorbMin = prof.ShieldAbsorbMinWeight
		}
	}

	dx := u.Pos.X - comet.Center.X
	dy := u.Pos.Y - comet.Center.Y
	d := math.Hypot(dx, dy)
	if d < 0.01 {
		dx, dy, d = -comet.Vel.Y, comet.Vel.X, math.Hypot(comet.Vel.X, comet.Vel.Y)
		if d < 0.01 {
			dx, dy, d = 1, 0, 1
		}
	}
	u.Pos.X += (dx / d) * 48.0
	u.Pos.Y += (dy / d) * 48.0

	if u.WeightClass <= meltMax {
		u.InstantKill = true
		return
	}
	if u.WeightClass >= shieldAbsorbMin {
		u.ShieldDrain += heavyDmg * 0.5
		return
	}
	u.DamageAmount += heavyDmg
	u.DamageSource = comet.Center
}

// StepProjectile evaluates solid cover blocking AND Singularity Rift projectile refraction.
// Returns true if the projectile was blocked by solid cover and should be removed.
func StepProjectile(pos Vec2, vel *Vec2, refractedBy *map[uint32]bool, world *World) bool {
	if world == nil {
		return false
	}
	for _, obj := range world.Objects {
		broadR := math.Max(obj.BoundingRadius, obj.Physics.RepulsionRadius) + 12.0
		dxObj := pos.X - obj.Center.X
		dyObj := pos.Y - obj.Center.Y
		if dxObj*dxObj+dyObj*dyObj > broadR*broadR {
			continue
		}

		switch obj.Physics.ProjectileBehavior {
		case "refract":
			if vel == nil || obj.Physics.RefractAngleRad == 0 {
				continue
			}
			if refractedBy != nil && *refractedBy != nil && (*refractedBy)[obj.ID] {
				continue
			}
			refractR := obj.Physics.RepulsionRadius
			fx, fy := obj.Center.X, obj.Center.Y
			for _, c := range obj.Components {
				if c.Kind == "rift_field" {
					refractR = c.Radius
					fx, fy = c.Pos.X, c.Pos.Y
					break
				}
			}
			if refractR > 0 && math.Hypot(pos.X-fx, pos.Y-fy) <= refractR {
				cross := (pos.X-fx)*vel.Y - (pos.Y-fy)*vel.X
				sign := 1.0
				if cross < 0 {
					sign = -1.0
				}
				ang := math.Atan2(vel.Y, vel.X) + sign*obj.Physics.RefractAngleRad
				spd := math.Hypot(vel.X, vel.Y)
				vel.X = math.Cos(ang) * spd
				vel.Y = math.Sin(ang) * spd
				if refractedBy != nil {
					if *refractedBy == nil {
						*refractedBy = make(map[uint32]bool, 2)
					}
					(*refractedBy)[obj.ID] = true
				}
			}

		case "block":
			for _, c := range obj.Components {
				if !IsSolidBlockingComponent(c.Kind) {
					continue
				}
				if math.Hypot(pos.X-c.Pos.X, pos.Y-c.Pos.Y) < c.Radius {
					return true
				}
			}
		}
	}
	return false
}

// IsStealthedAt returns true if pos lies inside any radar_opaque Nebula or Gas Giant Deep zone.
func IsStealthedAt(pos Vec2, world *World) bool {
	if world == nil {
		return false
	}
	for _, obj := range world.Objects {
		if !obj.Physics.RadarOpaque {
			continue
		}
		if math.Hypot(pos.X-obj.Center.X, pos.Y-obj.Center.Y) > obj.BoundingRadius+20 {
			continue
		}
		for _, c := range obj.Components {
			if (c.Kind == "nebula_blob" || c.Kind == "gas_deep") &&
				math.Hypot(pos.X-c.Pos.X, pos.Y-c.Pos.Y) < c.Radius {
				return true
			}
		}
	}
	return false
}

// CanAcquireTarget enforces 50% visual/weapon range lock-on when target is inside a stealth zone.
func CanAcquireTarget(seekerPos, targetPos Vec2, targetStealthed bool, baseRange float64) bool {
	if !targetStealthed {
		return true
	}
	if baseRange < 420.0 {
		baseRange = 420.0
	}
	return math.Hypot(targetPos.X-seekerPos.X, targetPos.Y-seekerPos.Y) <= baseRange*0.5
}

// ComputeHazardAvoidance returns an urgent steering vector for Comets, Gas Giant Deep/Core, and Dense Belts.
func ComputeHazardAvoidance(pos Vec2, weightClass int, world *World) (Vec2, bool) {
	if world == nil {
		return Vec2{}, false
	}
	var steer Vec2
	urgent := false

	for _, obj := range world.Objects {
		if obj.ObjectType == "comet" {
			spd := math.Hypot(obj.Vel.X, obj.Vel.Y)
			if spd > 0.5 {
				relX := pos.X - obj.Center.X
				relY := pos.Y - obj.Center.Y
				fwd := (relX*obj.Vel.X + relY*obj.Vel.Y) / spd
				if fwd > -30 && fwd < 440 {
					perp := (relX*(-obj.Vel.Y) + relY*obj.Vel.X) / spd
					if math.Abs(perp) < 105 {
						side := 1.0
						if perp < 0 {
							side = -1.0
						}
						steer.X += (-obj.Vel.Y / spd) * side * 2.5
						steer.Y += (obj.Vel.X / spd) * side * 2.5
						urgent = true
					}
				}
			}
			continue
		}

		if obj.ObjectType == "gas_giant" {
			dx := pos.X - obj.Center.X
			dy := pos.Y - obj.Center.Y
			dist := math.Hypot(dx, dy)
			for _, c := range obj.Components {
				if c.Kind == "gas_deep" && dist < c.Radius+55 && dist > 0.01 {
					steer.X += (dx / dist) * 2.0
					steer.Y += (dy / dist) * 2.0
					urgent = true
					break
				}
			}
			continue
		}
	}

	return steer, urgent
}
