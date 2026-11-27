package spacePirates

import (
	"math"

	"space-tactics-server/internal/game/envphysics"
)

// StepUnitEnvPhysics delegates environmental simulation to the shared envphysics package
// and applies any resulting instant kills, directional damage, or shield drain to a Space Pirates unit.
func StepUnitEnvPhysics(u *Unit, world *WorldState) bool {
	if u == nil || u.IsDestroyed || world == nil || world.Env == nil {
		return false
	}

	st := envphysics.UnitState{
		UnitType:    u.UnitType,
		WeightClass: u.WeightClass,
		Pos:         envphysics.Vec2{X: u.Pos.X, Y: u.Pos.Y},
		Vel:         envphysics.Vec2{X: u.Vel.X, Y: u.Vel.Y},
		Radius:      envphysics.ShipHitboxRadius(u.UnitType, u.WeightClass),
	}
	envphysics.StepUnit(&st, world.Env)

	u.Pos.X = st.Pos.X
	u.Pos.Y = st.Pos.Y
	u.Vel.X = st.Vel.X
	u.Vel.Y = st.Vel.Y
	u.IsStealthed = st.IsStealthed
	u.EnvDragScale = st.DragScale
	u.EnvAccel = Vec2{X: st.Accel.X, Y: st.Accel.Y}

	if st.InstantKill {
		u.IsDestroyed = true
		return true
	}
	if st.ShieldDrain > 0 {
		u.Shields.Front = math.Max(0, u.Shields.Front-st.ShieldDrain)
		u.Shields.Rear = math.Max(0, u.Shields.Rear-st.ShieldDrain*0.5)
		u.Shields.Port = math.Max(0, u.Shields.Port-st.ShieldDrain*0.5)
		u.Shields.Starboard = math.Max(0, u.Shields.Starboard-st.ShieldDrain*0.5)
	}
	if st.DamageAmount > 0 {
		if applyDirectionalDamage(u, Vec2{X: st.DamageSource.X, Y: st.DamageSource.Y}, st.DamageAmount) {
			return true
		}
	}
	return false
}

// ApplyProjectileEnvPhysics delegates solid cover blocking and Singularity Rift refraction to envphysics.
func ApplyProjectileEnvPhysics(p *Projectile, world *WorldState) bool {
	if p == nil || world == nil || world.Env == nil {
		return false
	}
	vel := envphysics.Vec2{X: p.Vel.X, Y: p.Vel.Y}
	blocked := envphysics.StepProjectile(
		envphysics.Vec2{X: p.Pos.X, Y: p.Pos.Y},
		&vel,
		&p.RefractedBy,
		world.Env,
	)
	p.Vel.X = vel.X
	p.Vel.Y = vel.Y
	return blocked
}

func IsUnitStealthed(u *Unit, world *WorldState) bool {
	if u == nil {
		return false
	}
	if u.IsStealthed {
		return true
	}
	if world == nil || world.Env == nil {
		return false
	}
	return envphysics.IsStealthedAt(envphysics.Vec2{X: u.Pos.X, Y: u.Pos.Y}, world.Env)
}

func CanAcquireTarget(seeker, target *Unit, world *WorldState) bool {
	if seeker == nil || target == nil || target.IsDestroyed {
		return false
	}
	return envphysics.CanAcquireTarget(
		envphysics.Vec2{X: seeker.Pos.X, Y: seeker.Pos.Y},
		envphysics.Vec2{X: target.Pos.X, Y: target.Pos.Y},
		IsUnitStealthed(target, world),
		seeker.ProjectileRange,
	)
}

func ComputeHazardAvoidanceVector(u *Unit, world *WorldState) (Vec2, bool) {
	if u == nil || world == nil || world.Env == nil {
		return Vec2{}, false
	}
	s, urgent := envphysics.ComputeHazardAvoidance(
		envphysics.Vec2{X: u.Pos.X, Y: u.Pos.Y},
		u.WeightClass,
		world.Env,
	)
	return Vec2{X: s.X, Y: s.Y}, urgent
}
