package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// RotateTowards smoothly accelerates and decelerates a unit toward targetAngle
// using TurnRate as max angular speed (rad/s) and AngularVelocity as torque (rad/s^2).
func RotateTowards(unit *models.FleetUnit, targetAngle float64) {
	const dt = 1.0 / 60.0

	maxTurnSpeed := unit.TurnRate
	if maxTurnSpeed <= 0 {
		maxTurnSpeed = 4.0
	}

	angAccel := unit.AngularVelocity
	if angAccel <= 0 {
		angAccel = maxTurnSpeed * 2.5
	}

	// Shortest angular distance in [-Pi, Pi] to prevent wrap-around snapping
	angleDiff := math.Mod(targetAngle-unit.Angle+math.Pi*3, math.Pi*2) - math.Pi

	// Clean settle deadzone to prevent micro-jitter on cursor lock
	if math.Abs(angleDiff) < 0.002 && math.Abs(unit.CurrentAngularVel) < 0.05 {
		unit.Angle = math.Mod(targetAngle+math.Pi*2, math.Pi*2)
		unit.CurrentAngularVel = 0
		return
	}

	// Kinematic braking curve: smoothly decelerates into targetAngle without overshoot
	desiredVel := math.Sqrt(2.0 * angAccel * math.Abs(angleDiff))
	if desiredVel > maxTurnSpeed {
		desiredVel = maxTurnSpeed
	}
	if angleDiff < 0 {
		desiredVel = -desiredVel
	}

	// Step CurrentAngularVel toward desiredVel clamped by angular torque
	maxVelDelta := angAccel * dt
	velDiff := desiredVel - unit.CurrentAngularVel
	if math.Abs(velDiff) <= maxVelDelta {
		unit.CurrentAngularVel = desiredVel
	} else if velDiff > 0 {
		unit.CurrentAngularVel += maxVelDelta
	} else {
		unit.CurrentAngularVel -= maxVelDelta
	}

	unit.Angle = math.Mod(unit.Angle+unit.CurrentAngularVel*dt+math.Pi*2, math.Pi*2)
}

// HandlePlayerMovement processes user throttle, strafing, rotational inertia, and velocity clamping
func HandlePlayerMovement(unit *models.FleetUnit, input SandboxClientInput, roomWidth, roomHeight float64) {
	unit.IsFiring = input.IsFiring
	RotateTowards(unit, float64(input.Angle))

	accelCurve := unit.AccelerationCurve
	if accelCurve <= 0 {
		accelCurve = 1.0
	}

	// Scaled so ships visibly build momentum (~0.1s for interceptors, ~0.4s+ for capitals)
	accel := unit.Speed * 0.75 * accelCurve
	maxSpeed := unit.Speed * 6.0

	latPower := unit.LateralThrustPower
	if latPower <= 0 {
		latPower = 0.75
	}
	strafeAccel := accel * latPower
	if unit.StrafingSpeed > 0 {
		strafeAccel = unit.StrafingSpeed * 0.75 * accelCurve * latPower
	}

	revPower := unit.ReverseThrustPower
	if revPower <= 0 {
		revPower = 0.5
	}

	// Build local forward/lateral thrust vector and normalize diagonal input
	forwardInput := 0.0
	if input.W {
		forwardInput += 1.0
	}
	if input.S {
		forwardInput -= revPower
	}

	strafeInput := 0.0
	if input.A {
		strafeInput -= 1.0
	}
	if input.D {
		strafeInput += 1.0
	}

	if forwardInput != 0 && strafeInput != 0 {
		const invSqrt2 = 0.7071067811865476
		forwardInput *= invSqrt2
		strafeInput *= invSqrt2
	}

	cosA := math.Cos(unit.Angle)
	sinA := math.Sin(unit.Angle)

	if forwardInput != 0 {
		unit.Vel.X += cosA * (accel * forwardInput)
		unit.Vel.Y += sinA * (accel * forwardInput)
	}
	if strafeInput != 0 {
		// Perpendicular to heading: (-sinA, cosA) is starboard (+Pi/2)
		unit.Vel.X += -sinA * (strafeAccel * strafeInput)
		unit.Vel.Y += cosA * (strafeAccel * strafeInput)
	}

	currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	if currentSpeed > maxSpeed {
		unit.Vel.X = (unit.Vel.X / currentSpeed) * maxSpeed
		unit.Vel.Y = (unit.Vel.Y / currentSpeed) * maxSpeed
	}
}

// ApplyUnitPhysics handles positional displacement, drift-aware braking curves, and map boundary clamping
func ApplyUnitPhysics(unit *models.FleetUnit, roomWidth, roomHeight float64) {
	unit.Pos.X += unit.Vel.X
	unit.Pos.Y += unit.Vel.Y

	// Clamp drift to [0.0, 1.0]; higher drift_coefficient = more glide, less linear drag
	drift := unit.DriftCoefficient
	if drift <= 0 {
		drift = 0.35
	}
	if drift > 1.0 {
		drift = 1.0
	}

	currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	if currentSpeed > 0.005 {
		// 0.93 (crisp stop) up to 0.985 (heavy space drift)
		linearDamp := 0.93 + (drift * 0.055)
		quadraticDragFactor := 0.0005 * (1.0 - (drift * 0.6))

		effectiveDamp := linearDamp - (currentSpeed * quadraticDragFactor)

		// Anti-skid: extra braking grip when nose opposes velocity vector (scaled down on high-drift ships)
		velAngle := math.Atan2(unit.Vel.Y, unit.Vel.X)
		headingDiff := math.Abs(math.Mod(unit.Angle-velAngle+math.Pi*3, math.Pi*2) - math.Pi)
		if headingDiff > (math.Pi * 0.6) {
			effectiveDamp -= 0.015 * (1.0 - (drift * 0.5))
		}

		if effectiveDamp < 0.80 {
			effectiveDamp = 0.80
		}
		if effectiveDamp > 0.992 {
			effectiveDamp = 0.992
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
