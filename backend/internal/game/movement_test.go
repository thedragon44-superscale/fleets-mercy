package game

import (
	"math"
	"testing"

	"space-tactics-server/internal/game/envphysics"
	"space-tactics-server/internal/models"
)

func makeTestViper() *models.FleetUnit {
	return &models.FleetUnit{
		ID:                 "test-viper",
		Type:               "viper_interceptor",
		OwnerID:            "player",
		Pos:                models.Vector2D{X: 1000, Y: 1000},
		Speed:              2.0,
		StrafingSpeed:      1.75,
		TurnRate:           9.0,
		AngularVelocity:    15.0,
		LateralThrustPower: 1.0,
		ReverseThrustPower: 0.75,
		DriftCoefficient:   0.30,
		AccelerationCurve:  1.20,
	}
}

func TestRotateTowardsWrapAndSettle(t *testing.T) {
	u := makeTestViper()
	u.Angle = 0.1
	target := -0.2 // across 0 / 2*Pi wrap boundary

	for i := 0; i < 60; i++ {
		RotateTowards(u, target)
	}

	diff := math.Abs(math.Remainder(target-u.Angle, math.Pi*2))
	if diff > 0.005 {
		t.Fatalf("expected unit to settle at target %.4f, got %.4f (diff=%.4f)", target, u.Angle, diff)
	}
	if math.Abs(u.CurrentAngularVel) > 0.05 {
		t.Fatalf("expected angular velocity to settle near 0, got %.4f", u.CurrentAngularVel)
	}
}

func TestHandlePlayerMovementShipRelativeAxes(t *testing.T) {
	// W + S must cancel to zero even when ReverseThrustPower != 1.0
	u := makeTestViper()
	u.Angle = 0
	HandlePlayerMovement(u, SandboxClientInput{W: true, S: true, Angle: 0}, 12000, 12000)
	if u.Vel.X != 0 || u.Vel.Y != 0 {
		t.Fatalf("expected W+S to cancel cleanly, got vel=(%.4f, %.4f)", u.Vel.X, u.Vel.Y)
	}

	// A + D must cancel to zero
	HandlePlayerMovement(u, SandboxClientInput{A: true, D: true, Angle: 0}, 12000, 12000)
	if u.Vel.X != 0 || u.Vel.Y != 0 {
		t.Fatalf("expected A+D to cancel cleanly, got vel=(%.4f, %.4f)", u.Vel.X, u.Vel.Y)
	}

	// Facing UP (-Pi/2 in screen coords): W goes -Y, D goes +X, A goes -X
	u2 := makeTestViper()
	u2.Angle = -math.Pi / 2
	HandlePlayerMovement(u2, SandboxClientInput{W: true, Angle: float32(-math.Pi / 2)}, 12000, 12000)
	if u2.Vel.Y >= 0 || math.Abs(u2.Vel.X) > 1e-6 {
		t.Fatalf("expected W while facing up to thrust -Y, got vel=(%.4f, %.4f)", u2.Vel.X, u2.Vel.Y)
	}

	u3 := makeTestViper()
	u3.Angle = -math.Pi / 2
	HandlePlayerMovement(u3, SandboxClientInput{D: true, Angle: float32(-math.Pi / 2)}, 12000, 12000)
	if u3.Vel.X <= 0 || math.Abs(u3.Vel.Y) > 1e-6 {
		t.Fatalf("expected D while facing up to strafe +X (starboard), got vel=(%.4f, %.4f)", u3.Vel.X, u3.Vel.Y)
	}

	// Diagonal W+D should travel near 41-45 degrees, not sideways (>70 deg)
	u4 := makeTestViper()
	u4.Angle = 0
	for i := 0; i < 120; i++ {
		HandlePlayerMovement(u4, SandboxClientInput{W: true, D: true, Angle: 0}, 12000, 12000)
		ApplyUnitPhysics(u4, 12000, 12000)
	}
	deg := math.Atan2(u4.Vel.Y, u4.Vel.X) * 180 / math.Pi
	if deg < 30 || deg > 55 {
		t.Fatalf("expected W+D diagonal heading in [30, 55] deg, got %.2f deg", deg)
	}
}

func TestHandlePlayerMovementStationaryTurretCannotTranslate(t *testing.T) {
	turret := &models.FleetUnit{
		ID:                 "turret-1",
		Type:               "gun_emplacement",
		OwnerID:            "player",
		Speed:              0,
		StrafingSpeed:      1.0,
		TurnRate:           3.8,
		AngularVelocity:    11.0,
		LateralThrustPower: 1.0,
	}

	for i := 0; i < 30; i++ {
		HandlePlayerMovement(turret, SandboxClientInput{W: true, D: true, Angle: float32(math.Pi / 2)}, 12000, 12000)
	}
	if turret.Vel.X != 0 || turret.Vel.Y != 0 {
		t.Fatalf("expected stationary turret velocity to remain 0, got (%.4f, %.4f)", turret.Vel.X, turret.Vel.Y)
	}
	if turret.Angle <= 0.1 {
		t.Fatalf("expected stationary turret to still rotate toward aim angle, got %.4f", turret.Angle)
	}
}

func TestResolveUnitCollisionsOnlyOnHitboxTouch(t *testing.T) {
	// Two 1W vipers have hitbox radius 18.0 each -> touch distance is 36.0.
	// At distance 38.0 (closer than old 60.0), they must NOT push each other.
	a := makeTestViper()
	a.ID = "v1"
	a.Pos = models.Vector2D{X: 1000, Y: 1000}
	b := makeTestViper()
	b.ID = "v2"
	b.Pos = models.Vector2D{X: 1038, Y: 1000}

	units := map[string]*models.FleetUnit{a.ID: a, b.ID: b}
	ResolveUnitCollisions(units, true)
	if a.Pos.X != 1000 || b.Pos.X != 1038 {
		t.Fatalf("expected no push before hitboxes touch, got a.X=%.2f b.X=%.2f", a.Pos.X, b.Pos.X)
	}

	// Overlapping at distance 30.0 with inward velocity: separate to 36.0 and cancel inward velocity.
	b.Pos.X = 1030
	a.Vel = models.Vector2D{X: 4.0, Y: 0}
	b.Vel = models.Vector2D{X: 0, Y: 0}
	ResolveUnitCollisions(units, true)
	sep := math.Hypot(b.Pos.X-a.Pos.X, b.Pos.Y-a.Pos.Y)
	if math.Abs(sep-36.0) > 0.05 {
		t.Fatalf("expected hitbox separation of 36.0, got %.3f", sep)
	}
	if a.Vel.X > b.Vel.X+1e-6 {
		t.Fatalf("expected inward normal velocity cancelled on contact, got a.Vel.X=%.3f b.Vel.X=%.3f", a.Vel.X, b.Vel.X)
	}
}

func TestEnvPhysicsOnlyGravityAffectsMovementBeforeContact(t *testing.T) {
	world := &envphysics.World{
		ArenaWidth:  12000,
		ArenaHeight: 12000,
		Objects: []*envphysics.ActiveEnvObject{
			{
				ID:             1,
				ObjectType:     "asteroid_belt",
				Center:         envphysics.Vec2{X: 1000, Y: 1000},
				BoundingRadius: 150,
				Physics: models.EnvPhysicsProfile{
					GravityStrength:   0,
					GravityRadius:     0,
					MaxPassableWeight: 2, // Must NOT add invisible 26px forcefield for 3W+
				},
				Components: []*envphysics.EnvComponent{
					{ID: 1, Kind: "solid_rock", Pos: envphysics.Vec2{X: 1000, Y: 1000}, Radius: 30},
				},
			},
			{
				ID:             2,
				ObjectType:     "singularity_rift",
				Center:         envphysics.Vec2{X: 1500, Y: 1000},
				BoundingRadius: 165,
				Physics: models.EnvPhysicsProfile{
					GravityStrength:   0,
					RepulsionStrength: 0.14,
					RepulsionRadius:   165,
				},
				Components: []*envphysics.EnvComponent{
					{ID: 2, Kind: "rift_core", Pos: envphysics.Vec2{X: 1500, Y: 1000}, Radius: 42},
				},
			},
			{
				ID:             3,
				ObjectType:     "major_world",
				Center:         envphysics.Vec2{X: 2500, Y: 1000},
				BoundingRadius: 290,
				Physics: models.EnvPhysicsProfile{
					GravityStrength: 0.11,
					GravityRadius:   290,
				},
				Components: []*envphysics.EnvComponent{
					{ID: 3, Kind: "solid_core", Pos: envphysics.Vec2{X: 2500, Y: 1000}, Radius: 150},
				},
			},
		},
	}

	// 5W ship placed 1px outside asteroid_belt solid rock hitbox (30 + 29 + 1 = 60px): zero push!
	heavy := &models.FleetUnit{
		ID:          "wall-1",
		Type:        "aegis_wall",
		WeightClass: 5,
		Pos:         models.Vector2D{X: 1060, Y: 1000},
		Vel:         models.Vector2D{X: 0, Y: 0},
	}
	ApplyUniversalEnvPhysics(heavy, world)
	if heavy.Pos.X != 1060 || heavy.Vel.X != 0 || heavy.Vel.Y != 0 {
		t.Fatalf("expected zero pre-contact effect near non-gravity asteroid_belt, got pos=(%.2f,%.2f) vel=(%.4f,%.4f)",
			heavy.Pos.X, heavy.Pos.Y, heavy.Vel.X, heavy.Vel.Y)
	}

	// Ship inside Singularity Rift field (no GravityStrength, outside rift_core): zero velocity push!
	nearRift := makeTestViper()
	nearRift.Pos = models.Vector2D{X: 1580, Y: 1000}
	nearRift.Vel = models.Vector2D{X: 0, Y: 0}
	ApplyUniversalEnvPhysics(nearRift, world)
	if nearRift.Vel.X != 0 || nearRift.Vel.Y != 0 {
		t.Fatalf("expected zero movement effect near zero-gravity rift, got vel=(%.4f,%.4f)", nearRift.Vel.X, nearRift.Vel.Y)
	}

	// Ship inside Major World gravity well (GravityStrength > 0): pulled toward center (+X)!
	nearWorld := makeTestViper()
	nearWorld.Pos = models.Vector2D{X: 2300, Y: 1000}
	nearWorld.Vel = models.Vector2D{X: 0, Y: 0}
	ApplyUniversalEnvPhysics(nearWorld, world)
	if nearWorld.Vel.X <= 0 {
		t.Fatalf("expected positive gravity pull toward major_world, got vel.X=%.4f", nearWorld.Vel.X)
	}
}

func TestApplyUnitPhysicsPreservesDriftAndReachesCompleteStop(t *testing.T) {
	u := makeTestViper()
	u.DriftCoefficient = 0.50
	u.Vel = models.Vector2D{X: 8.0, Y: 0}

	// After 10 ticks (~0.16s), ship must still be gliding (not stopping on a dime)
	for i := 0; i < 10; i++ {
		ApplyUnitPhysics(u, 12000, 12000)
	}
	if u.Vel.X < 4.0 {
		t.Fatalf("expected ship to preserve drift glide after 10 ticks, got vel.X=%.3f", u.Vel.X)
	}

	// Within 150 ticks (2.5s), ship must settle to an exact (0, 0) complete stop
	for i := 0; i < 140; i++ {
		ApplyUnitPhysics(u, 12000, 12000)
	}
	if u.Vel.X != 0 || u.Vel.Y != 0 {
		t.Fatalf("expected complete stop (0,0), got vel=(%.5f, %.5f)", u.Vel.X, u.Vel.Y)
	}
}
