package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// RotateTowards smoothly turns a unit toward targetAngle using its database-driven TurnRate (rad/s at 60Hz).
func RotateTowards(unit *models.FleetUnit, targetAngle float64) {
	turnRate := unit.TurnRate
	if turnRate <= 0 {
		turnRate = 4.0 // Fallback turn rate if unconfigured
	}
	maxDelta := turnRate * (1.0 / 60.0)

	// Shortest angular distance in [-Pi, Pi] to prevent wrap-around snapping
	angleDiff := math.Mod(targetAngle-unit.Angle+math.Pi*3, math.Pi*2) - math.Pi

	if math.Abs(angleDiff) <= maxDelta {
		unit.Angle = targetAngle
	} else if angleDiff > 0 {
		unit.Angle += maxDelta
	} else {
		unit.Angle -= maxDelta
	}

	// Normalize angle within [0, 2*Pi)
	unit.Angle = math.Mod(unit.Angle+math.Pi*2, math.Pi*2)
}

// HandlePlayerMovement processes user throttle, strafing, turn-rate clamping, and velocity vector updates
func HandlePlayerMovement(unit *models.FleetUnit, input SandboxClientInput, roomWidth, roomHeight float64) {
	unit.IsFiring = input.IsFiring
	RotateTowards(unit, float64(input.Angle))

	accelCurve := unit.AccelerationCurve
	if accelCurve <= 0 {
		accelCurve = 1.0
	}

	accel := unit.Speed * 3.5 * accelCurve
	maxSpeed := unit.Speed * 6.0

	latPower := unit.LateralThrustPower
	if latPower <= 0 {
		latPower = 0.75
	}
	strafeAccel := accel * latPower
	if unit.StrafingSpeed > 0 {
		strafeAccel = unit.StrafingSpeed * 3.5 * accelCurve * latPower
	}

	if input.W {
		unit.Vel.X += math.Cos(unit.Angle) * accel
		unit.Vel.Y += math.Sin(unit.Angle) * accel
	}
	if input.S {
		revPower := unit.ReverseThrustPower
		if revPower <= 0 {
			revPower = 0.5
		}
		unit.Vel.X -= math.Cos(unit.Angle) * (accel * revPower)
		unit.Vel.Y -= math.Sin(unit.Angle) * (accel * revPower)
	}
	if input.A {
		strafeAngle := unit.Angle - (math.Pi / 2)
		unit.Vel.X += math.Cos(strafeAngle) * strafeAccel
		unit.Vel.Y += math.Sin(strafeAngle) * strafeAccel
	}
	if input.D {
		strafeAngle := unit.Angle + (math.Pi / 2)
		unit.Vel.X += math.Cos(strafeAngle) * strafeAccel
		unit.Vel.Y += math.Sin(strafeAngle) * strafeAccel
	}

	currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	if currentSpeed > maxSpeed {
		unit.Vel.X = (unit.Vel.X / currentSpeed) * maxSpeed
		unit.Vel.Y = (unit.Vel.Y / currentSpeed) * maxSpeed
	}
}

// ApplyUnitPhysics handles positional displacement, enhanced quadratic braking curves, and dynamic map boundary clamping
func ApplyUnitPhysics(unit *models.FleetUnit, roomWidth, roomHeight float64) {
	unit.Pos.X += unit.Vel.X
	unit.Pos.Y += unit.Vel.Y

	drift := unit.DriftCoefficient
	if drift <= 0 {
		drift = 0.5
	}

	currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	if currentSpeed > 0.001 {
		linearDamp := 0.96 - (drift * 0.04)
		quadraticDragFactor := 0.0008 * (1.0 - (drift * 0.5))

		effectiveDamp := linearDamp - (currentSpeed * quadraticDragFactor)

		// Anti-skid: If the ship's heading opposes its velocity vector, apply extra turn-braking grip
		velAngle := math.Atan2(unit.Vel.Y, unit.Vel.X)
		headingDiff := math.Abs(math.Mod(unit.Angle-velAngle+math.Pi*3, math.Pi*2) - math.Pi)
		if headingDiff > (math.Pi * 0.6) {
			effectiveDamp -= 0.02 * (1.0 - (drift * 0.3))
		}

		if effectiveDamp < 0.75 {
			effectiveDamp = 0.75
		}
		if effectiveDamp > 0.99 {
			effectiveDamp = 0.99
		}

		unit.Vel.X *= effectiveDamp
		unit.Vel.Y *= effectiveDamp
	} else {
		unit.Vel.X = 0
		unit.Vel.Y = 0
	}

	minBound := 50.0
	maxW := roomWidth
	if maxW <= 0 {
		maxW = 12000.0
	}
	maxH := roomHeight
	if maxH <= 0 {
		maxH = 12000.0
	}

	if unit.Pos.X < minBound {
		unit.Pos.X = minBound
		unit.Vel.X = 0
	}
	if unit.Pos.X > (maxW - minBound) {
		unit.Pos.X = maxW - minBound
		unit.Vel.X = 0
	}
	if unit.Pos.Y < minBound {
		unit.Pos.Y = minBound
		unit.Vel.Y = 0
	}
	if unit.Pos.Y > (maxH - minBound) {
		unit.Pos.Y = maxH - minBound
		unit.Vel.Y = 0
	}
}
