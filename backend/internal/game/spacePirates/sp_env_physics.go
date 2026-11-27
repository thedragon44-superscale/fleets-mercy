package spacePirates

import (
	"math"
)

func isSolidBlockingComponent(kind string) bool {
	switch kind {
	case "solid_rock", "resource_node", "solid_core", "cave_mouth", "crater_node":
		return true
	default:
		return false
	}
}

func isUnitImmune(immuneList []string, unitType string) bool {
	for _, cls := range immuneList {
		if cls == unitType {
			return true
		}
	}
	return false
}

// StepUnitEnvPhysics evaluates broad-phase culled 60Hz environmental forces, stealth zones,
// Gas Giant 3-layer hazards, Dense Belt passability, solid cover push-out, and Comet impacts.
// Returns true if this unit was destroyed by an environmental hazard (Gas Giant Core / Deep DoT / Comet).
func StepUnitEnvPhysics(u *Unit, world *WorldState) bool {
	if u == nil || u.IsDestroyed || world == nil {
		return false
	}

	u.IsStealthed = false
	u.EnvDragScale = 1.0
	u.EnvAccel = Vec2{}

	shipR := shipCollisionRadius(u.WeightClass)

	for _, obj := range world.EnvObjects {
		// Broad-phase culling using bounding_radius + physics field reach
		fieldR := math.Max(obj.Physics.GravityRadius, obj.Physics.RepulsionRadius)
		broadR := math.Max(obj.BoundingRadius, fieldR) + shipR + 40.0
		dxObj := obj.Center.X - u.Pos.X
		dyObj := obj.Center.Y - u.Pos.Y
		distObjSq := dxObj*dxObj + dyObj*dyObj
		if distObjSq > broadR*broadR {
			continue
		}

		distObj := math.Sqrt(distObjSq)
		immune := isUnitImmune(obj.Physics.ImmuneUnitClasses, u.UnitType)

		// 1. Gravity Well Pull (Major Worlds, Mineral Planetoids, Gas Giants)
		if !immune && obj.Physics.GravityStrength > 0 && obj.Physics.GravityRadius > 0 && distObj > 1.0 && distObj < obj.Physics.GravityRadius {
			falloff := 1.0 - (distObj / obj.Physics.GravityRadius)
			// Lighter ships feel stronger gravitational pull
			weightScale := 1.4 - 0.15*float64(u.WeightClass)
			if weightScale < 0.5 {
				weightScale = 0.5
			}
			pull := obj.Physics.GravityStrength * falloff * weightScale
			u.EnvAccel.X += (dxObj / distObj) * pull
			u.EnvAccel.Y += (dyObj / distObj) * pull
		}

		// 2. Singularity Rift Repulsion Field (pushes 1W-3W outward, resists 4W-5W; grav_extractor immune)
		if !immune && obj.Physics.RepulsionStrength > 0 && obj.Physics.RepulsionRadius > 0 && distObj > 1.0 && distObj < obj.Physics.RepulsionRadius {
			falloff := 1.0 - (distObj / obj.Physics.RepulsionRadius)
			weightScale := 1.35
			if u.WeightClass >= 4 {
				weightScale = 0.45
			}
			push := obj.Physics.RepulsionStrength * falloff * weightScale
			u.EnvAccel.X -= (dxObj / distObj) * push
			u.EnvAccel.Y -= (dyObj / distObj) * push
		}

		// 3. Per-Component Zones, Stealth, Belt Filter, Solid Collisions & Comet Impacts
		for _, c := range obj.Components {
			dx := u.Pos.X - c.Pos.X
			dy := u.Pos.Y - c.Pos.Y
			dist := math.Hypot(dx, dy)

			switch c.Kind {
			case "gas_core":
				if dist < c.Radius+shipR*0.5 {
					// Instant kill in Gas Giant Core
					u.IsDestroyed = true
					return true
				}

			case "gas_deep":
				if dist < c.Radius && dist >= c.InnerRadius {
					if obj.Physics.RadarOpaque {
						u.IsStealthed = true
					}
					if !immune {
						if obj.Physics.DeepPullWeightMax > 0 && u.WeightClass <= obj.Physics.DeepPullWeightMax && dist > 1.0 {
							// Pull 1W ships relentlessly toward the lethal core
							u.EnvAccel.X -= (dx / dist) * 0.28
							u.EnvAccel.Y -= (dy / dist) * 0.28
						} else {
							// Slow & DoT 2W+ ships
							u.EnvDragScale = math.Min(u.EnvDragScale, 1.0-math.Max(0.25, obj.Physics.DragFactor))
							if obj.Physics.DeepDotDPS > 0 {
								if applyDirectionalDamage(u, c.Pos, obj.Physics.DeepDotDPS/float64(TickRateHz)) {
									return true
								}
							}
						}
					}
				}

			case "gas_outer":
				if dist < c.Radius && dist >= c.InnerRadius && !immune {
					if obj.Physics.OuterDragFactor > 0 && u.WeightClass >= obj.Physics.OuterDragMinWeight {
						u.EnvDragScale = math.Min(u.EnvDragScale, 1.0-obj.Physics.OuterDragFactor)
					}
				}

			case "nebula_blob":
				if dist < c.Radius {
					if obj.Physics.RadarOpaque {
						u.IsStealthed = true
					}
					if !immune && obj.Physics.DragFactor > 0 && (obj.Physics.DragMaxWeight == 0 || u.WeightClass <= obj.Physics.DragMaxWeight) {
						u.EnvDragScale = math.Min(u.EnvDragScale, 1.0-obj.Physics.DragFactor)
					}
				}

			case "comet_core":
				if dist < c.Radius+shipR {
					if applyCometImpact(u, obj) {
						return true
					}
				}

			case "solid_rock", "solid_core", "resource_node", "crater_node", "cave_mouth", "rift_core":
				// Resource nodes on Gas Giants/Nebulas sit inside soft zones; don't solid-block ships skimming them
				if obj.ObjectType == "gas_giant" || obj.ObjectType == "nebula_field" {
					continue
				}
				// Dense Asteroid Belt weight filter: 3W+ ships get pushed out of a wider corridor buffer
				extraMargin := 0.0
				if obj.ObjectType == "asteroid_belt" && obj.Physics.MaxPassableWeight > 0 && u.WeightClass > obj.Physics.MaxPassableWeight {
					extraMargin = 26.0
				}
				minDist := c.Radius + shipR + extraMargin
				if dist < minDist && dist > 0.01 {
					nx := dx / dist
					ny := dy / dist
					overlap := minDist - dist
					u.Pos.X += nx * overlap
					u.Pos.Y += ny * overlap
				}
			}
		}
	}

	if u.EnvDragScale < 0.25 {
		u.EnvDragScale = 0.25
	}
	return false
}

func applyCometImpact(u *Unit, comet *ActiveEnvObject) bool {
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

	// Push ship laterally out of comet core so it doesn't get double-hit on consecutive ticks
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

	// 1W/2W: Instant melt
	if u.WeightClass <= meltMax {
		u.IsDestroyed = true
		return true
	}

	// 5W: Shield absorb (drains shields first without breaching hull unless shields already zero)
	if u.WeightClass >= shieldAbsorbMin {
		u.Shields.Front = math.Max(0, u.Shields.Front-heavyDmg*0.5)
		u.Shields.Rear = math.Max(0, u.Shields.Rear-heavyDmg*0.25)
		u.Shields.Port = math.Max(0, u.Shields.Port-heavyDmg*0.25)
		u.Shields.Starboard = math.Max(0, u.Shields.Starboard-heavyDmg*0.25)
		return false
	}

	// 3W/4W: Heavy directional damage
	return applyDirectionalDamage(u, comet.Center, heavyDmg)
}

// ApplyProjectileEnvPhysics handles solid cover blocking AND Singularity Rift refraction.
// Returns true if the projectile was blocked and should be destroyed.
func ApplyProjectileEnvPhysics(p *Projectile, world *WorldState) bool {
	if p == nil || world == nil {
		return false
	}

	for _, obj := range world.EnvObjects {
		broadR := math.Max(obj.BoundingRadius, obj.Physics.RepulsionRadius) + 12.0
		dxObj := p.Pos.X - obj.Center.X
		dyObj := p.Pos.Y - obj.Center.Y
		if dxObj*dxObj+dyObj*dyObj > broadR*broadR {
			continue
		}

		switch obj.Physics.ProjectileBehavior {
		case "refract":
			if obj.Physics.RefractAngleRad == 0 {
				continue
			}
			if p.RefractedBy != nil && p.RefractedBy[obj.ID] {
				continue
			}
			// Check entry into rift_field (or repulsion_radius fallback)
			refractR := obj.Physics.RepulsionRadius
			fx, fy := obj.Center.X, obj.Center.Y
			for _, c := range obj.Components {
				if c.Kind == "rift_field" {
					refractR = c.Radius
					fx, fy = c.Pos.X, c.Pos.Y
					break
				}
			}
			if refractR > 0 && math.Hypot(p.Pos.X-fx, p.Pos.Y-fy) <= refractR {
				// Predictable refraction angle determined by which side of the Rift center the shot passes
				cross := (p.Pos.X-fx)*p.Vel.Y - (p.Pos.Y-fy)*p.Vel.X
				sign := 1.0
				if cross < 0 {
					sign = -1.0
				}
				ang := math.Atan2(p.Vel.Y, p.Vel.X) + sign*obj.Physics.RefractAngleRad
				spd := math.Hypot(p.Vel.X, p.Vel.Y)
				p.Vel.X = math.Cos(ang) * spd
				p.Vel.Y = math.Sin(ang) * spd
				if p.RefractedBy == nil {
					p.RefractedBy = make(map[uint32]bool, 2)
				}
				p.RefractedBy[obj.ID] = true
			}

		case "block":
			for _, c := range obj.Components {
				if !isSolidBlockingComponent(c.Kind) {
					continue
				}
				if math.Hypot(p.Pos.X-c.Pos.X, p.Pos.Y-c.Pos.Y) < c.Radius {
					return true
				}
			}
		}
	}
	return false
}

// IsUnitStealthed returns true if a unit is currently inside any radar_opaque stealth zone.
func IsUnitStealthed(u *Unit, world *WorldState) bool {
	if u == nil {
		return false
	}
	if u.IsStealthed {
		return true
	}
	if world == nil {
		return false
	}
	for _, obj := range world.EnvObjects {
		if !obj.Physics.RadarOpaque {
			continue
		}
		if math.Hypot(u.Pos.X-obj.Center.X, u.Pos.Y-obj.Center.Y) > obj.BoundingRadius+20 {
			continue
		}
		for _, c := range obj.Components {
			if (c.Kind == "nebula_blob" || c.Kind == "gas_deep") &&
				math.Hypot(u.Pos.X-c.Pos.X, u.Pos.Y-c.Pos.Y) < c.Radius {
				return true
			}
		}
	}
	return false
}

// CanAcquireTarget enforces Space Pirates stealth lock-on rules:
// Units inside a Deep Nebula or Gas Giant Deep Atmosphere break long-range AI lock-on
// and can only be spotted/engaged within 50% of the seeker's visual/weapon acquisition range.
func CanAcquireTarget(seeker, target *Unit, world *WorldState) bool {
	if seeker == nil || target == nil || target.IsDestroyed {
		return false
	}
	if !IsUnitStealthed(target, world) {
		return true
	}
	baseRange := seeker.ProjectileRange
	if baseRange < 420.0 {
		baseRange = 420.0
	}
	stealthDetectRange := baseRange * 0.5
	return math.Hypot(target.Pos.X-seeker.Pos.X, target.Pos.Y-seeker.Pos.Y) <= stealthDetectRange
}

// ComputeHazardAvoidanceVector returns an urgent steering vector for AI ships to:
// 1. Evade approaching Comets laterally,
// 2. Avoid Gas Giant lethal Core & Deep Atmosphere zones,
// 3. Route around Dense Asteroid Belts when WeightClass > max_passable_weight.
func ComputeHazardAvoidanceVector(u *Unit, world *WorldState) (Vec2, bool) {
	if u == nil || world == nil {
		return Vec2{}, false
	}

	var steer Vec2
	urgent := false

	for _, obj := range world.EnvObjects {
		// 1. Comet Lateral Evasion
		if obj.ObjectType == "comet" {
			spd := math.Hypot(obj.Vel.X, obj.Vel.Y)
			if spd > 0.5 {
				relX := u.Pos.X - obj.Center.X
				relY := u.Pos.Y - obj.Center.Y
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

		// 2. Gas Giant Core / Deep Avoidance
		if obj.ObjectType == "gas_giant" {
			dx := u.Pos.X - obj.Center.X
			dy := u.Pos.Y - obj.Center.Y
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

		// 3. Dense Asteroid Belt Routing for heavy ships (WeightClass > max_passable_weight)
		if obj.ObjectType == "asteroid_belt" && obj.Physics.MaxPassableWeight > 0 && u.WeightClass > obj.Physics.MaxPassableWeight {
			dx := u.Pos.X - obj.Center.X
			dy := u.Pos.Y - obj.Center.Y
			dist := math.Hypot(dx, dy)
			if dist < obj.BoundingRadius+50 && dist > 0.01 {
				// Blend outward push + tangential slide so heavy ships route cleanly around the belt
				steer.X += (dx/dist)*1.1 + (-dy/dist)*0.8
				steer.Y += (dy/dist)*1.1 + (dx/dist)*0.8
				urgent = true
			}
		}
	}

	return steer, urgent
}
