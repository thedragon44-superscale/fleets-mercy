package game

import (
	"math"
	"testing"

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
