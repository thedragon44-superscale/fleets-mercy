package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// normalizeAngle wraps an angle cleanly into [0, 2*Pi).
func normalizeAngle(a float64) float64 {
	a = math.Mod(a, math.Pi*2)
	if a < 0 {
		a += math.Pi * 2
	}
	return a
}

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

	// Shortest signed angular distance in [-Pi, Pi] for any finite angles
	angleDiff := math.Remainder(targetAngle-unit.Angle, math.Pi*2)
	absDiff := math.Abs(angleDiff)

	// Clean settle deadzone to prevent micro-jitter on cursor lock
	if absDiff < 0.002 && math.Abs(unit.CurrentAngularVel) < 0.05 {
		unit.Angle = normalizeAngle(targetAngle)
		unit.CurrentAngularVel = 0
		return
	}

	// Kinematic braking curve, clamped by 1-tick arrival speed (absDiff/dt)
	// so discrete 60Hz stepping never oscillates past targetAngle.
	desiredMag := math.Sqrt(2.0 * angAccel * absDiff)
	if oneTickSpeed := absDiff / dt; desiredMag > oneTickSpeed {
		desiredMag = oneTickSpeed
	}
	if desiredMag > maxTurnSpeed {
		desiredMag = maxTurnSpeed
	}
	desiredVel := desiredMag
	if angleDiff < 0 {
		desiredVel = -desiredMag
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

	unit.Angle = normalizeAngle(unit.Angle + unit.CurrentAngularVel*dt)
}

// HandlePlayerMovement processes ship-relative WASD thrust, rotational inertia,
// and directional elliptical velocity limits driven by PostgreSQL unit templates.
func HandlePlayerMovement(unit *models.FleetUnit, input SandboxClientInput, roomWidth, roomHeight float64) {
	unit.IsFiring = input.IsFiring
	RotateTowards(unit, float64(input.Angle))

	// Stationary units (e.g. gun_emplacement with Speed <= 0) can aim & fire but never translate.
	if unit.Speed <= 0 {
		unit.Vel.X = 0
		unit.Vel.Y = 0
		return
	}

	accelCurve := unit.AccelerationCurve
	if accelCurve <= 0 {
		accelCurve = 1.0
	}

	maxFwdSpeed := unit.Speed * 6.0

	strafeBase := unit.StrafingSpeed
	if strafeBase <= 0 {
		strafeBase = unit.Speed * 0.75
	}
	maxStrafeSpeed := strafeBase * 6.0

	revPower := unit.ReverseThrustPower
	if revPower <= 0 {
		revPower = 0.6
	}
	maxRevSpeed := maxFwdSpeed * math.Min(revPower, 1.0)
	if maxRevSpeed < 0.5 {
		maxRevSpeed = 0.5
	}

	latPower := unit.LateralThrustPower
	if latPower <= 0 {
		latPower = 0.85
	}

	// Per-tick thruster accelerations:
	// - Speed * AccelerationCurve sets forward thrust
	// - ReverseThrustPower scales reverse thrust
	// - LateralThrustPower scales strafe responsiveness (StrafingSpeed governs max lateral speed)
	fwdAccel := unit.Speed * 0.75 * accelCurve
	revAccel := fwdAccel * revPower
	strafeAccel := fwdAccel * latPower

	// Ship-relative axes where opposing keys (W+S or A+D) cancel cleanly to 0
	fwdAxis := 0.0
	if input.W {
		fwdAxis += 1.0
	}
	if input.S {
		fwdAxis -= 1.0
	}

	latAxis := 0.0
	if input.A {
		latAxis -= 1.0
	}
	if input.D {
		latAxis += 1.0
	}

	if fwdAxis == 0 && latAxis == 0 {
		return
	}

	if fwdAxis != 0 && latAxis != 0 {
		const invSqrt2 = 0.7071067811865476
		fwdAxis *= invSqrt2
		latAxis *= invSqrt2
	}

	prevSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	cosA := math.Cos(unit.Angle)
	sinA := math.Sin(unit.Angle)

	if fwdAxis > 0 {
		unit.Vel.X += cosA * (fwdAccel * fwdAxis)
		unit.Vel.Y += sinA * (fwdAccel * fwdAxis)
	} else if fwdAxis < 0 {
		unit.Vel.X += cosA * (revAccel * fwdAxis)
		unit.Vel.Y += sinA * (revAccel * fwdAxis)
	}

	if latAxis != 0 {
		// Perpendicular to heading: (-sinA, cosA) is starboard (+Pi/2)
		unit.Vel.X += -sinA * (strafeAccel * latAxis)
		unit.Vel.Y += cosA * (strafeAccel * latAxis)
	}

	// Enforce directional elliptical speed envelope (forward / reverse / strafe caps)
	// without abruptly chopping pre-existing drift momentum during sharp turns.
	vFwd := unit.Vel.X*cosA + unit.Vel.Y*sinA
	vLat := -unit.Vel.X*sinA + unit.Vel.Y*cosA

	capFwd := maxFwdSpeed
	if vFwd < 0 {
		capFwd = maxRevSpeed
	}
	capLat := maxStrafeSpeed
	if capLat < 0.5 {
		capLat = 0.5
	}

	ellip := math.Hypot(vFwd/capFwd, vLat/capLat)
	if ellip > 1.0 {
		newSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
		envelopeSpeed := newSpeed / ellip
		maxHullSpeed := math.Max(maxFwdSpeed, maxStrafeSpeed)
		allowedSpeed := math.Max(envelopeSpeed, math.Min(prevSpeed, maxHullSpeed))
		if newSpeed > allowedSpeed && newSpeed > 0 {
			scale := allowedSpeed / newSpeed
			unit.Vel.X *= scale
			unit.Vel.Y *= scale
		}
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
	if currentSpeed > 0.03 {
		// Preserve drift_coefficient glide curve: 0.93 (crisp) up to 0.985 (heavy space drift)
		linearDamp := 0.93 + (drift * 0.055)
		quadraticDragFactor := 0.0005 * (1.0 - (drift * 0.6))

		effectiveDamp := linearDamp - (currentSpeed * quadraticDragFactor)

		// Anti-skid: extra braking grip when nose opposes velocity vector (scaled down on high-drift ships)
		velAngle := math.Atan2(unit.Vel.Y, unit.Vel.X)
		headingDiff := math.Abs(math.Remainder(unit.Angle-velAngle, math.Pi*2))
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

		// Eliminate the endless sub-pixel exponential tail only once the ship has already
		// drifted down to a near-stop, so drift glide stays intact and units reach exact (0, 0).
		postSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
		if postSpeed < 0.35 {
			settleDecel := 0.015 * (1.0 - drift*0.4)
			if postSpeed <= settleDecel || postSpeed <= 0.03 {
				unit.Vel.X = 0
				unit.Vel.Y = 0
			} else {
				scale := (postSpeed - settleDecel) / postSpeed
				unit.Vel.X *= scale
				unit.Vel.Y *= scale
			}
		}
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
