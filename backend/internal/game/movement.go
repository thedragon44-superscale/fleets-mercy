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

// moveToward smoothly steps current toward target by at most maxDelta without overshooting.
func moveToward(current, target, maxDelta float64) float64 {
	if maxDelta <= 0 {
		return current
	}
	diff := target - current
	if math.Abs(diff) <= maxDelta {
		return target
	}
	if diff > 0 {
		return current + maxDelta
	}
	return current - maxDelta
}

// stepThrusterAxis steps a single ship-local velocity axis (forward/reverse or lateral)
// smoothly toward its target velocity using PostgreSQL unit template thruster stats.
func stepThrusterAxis(cur, target, accelRate, brakeRate, stopRate float64, anyInputActive bool) float64 {
	if target == 0 {
		if cur == 0 {
			return 0
		}
		// Active axis stabilization when switching axes (e.g. W->D) or turning under thrust,
		// vs. hands-off inertial dampeners when all movement keys are released.
		rate := stopRate
		if anyInputActive && brakeRate > rate {
			rate = brakeRate
		}
		return moveToward(cur, 0, rate)
	}

	// Reversing direction across zero (e.g. W->S or A->D): fire active retro/counter-thrust
	if cur*target < 0 {
		rate := accelRate
		if brakeRate > rate {
			rate = brakeRate
		}
		next := moveToward(cur, 0, rate)
		if next == 0 {
			// Smoothly use any remaining thrust budget to begin accelerating in the new direction
			remaining := rate - math.Abs(cur)
			if remaining > 0 {
				next = moveToward(0, target, math.Min(remaining, accelRate))
			}
		}
		return next
	}

	// Same-direction velocity adjustment: accelerate up to target, or smoothly trim excess speed
	if math.Abs(cur) > math.Abs(target) {
		rate := accelRate
		if brakeRate > rate {
			rate = brakeRate
		}
		return moveToward(cur, target, rate)
	}
	return moveToward(cur, target, accelRate)
}

// HandlePlayerMovement processes ship-relative WASD thrust, rotational inertia,
// active counter-thrust direction switching, and inertial damping driven strictly
// by PostgreSQL unit_templates parameters.
func HandlePlayerMovement(unit *models.FleetUnit, input SandboxClientInput, roomWidth, roomHeight float64) {
	unit.IsFiring = input.IsFiring
	RotateTowards(unit, float64(input.Angle))

	// Stationary units (e.g. gun_emplacement with Speed <= 0) can aim & fire but never translate.
	if unit.Speed <= 0 {
		unit.Vel.X = 0
		unit.Vel.Y = 0
		return
	}

	accelCurve := math.Max(0, unit.AccelerationCurve)
	revPower := math.Max(0, unit.ReverseThrustPower)
	latPower := math.Max(0, unit.LateralThrustPower)
	brakingPower := math.Max(0, unit.BrakingThrustPower)
	inertialDamp := math.Max(0, unit.InertialDamping)
	drift := math.Max(0, math.Min(1.0, unit.DriftCoefficient))

	maxFwdSpeed := unit.Speed * 6.0
	maxStrafeSpeed := math.Max(0, unit.StrafingSpeed) * 6.0
	maxRevSpeed := maxFwdSpeed * math.Min(revPower, 1.0)

	// Per-tick thruster acceleration budgets derived strictly from unit_templates stats
	baseAccel := unit.Speed * 0.45 * accelCurve
	revAccel := baseAccel * revPower
	strafeAccel := baseAccel * latPower

	// Active counter-thrust / axis-switch stabilization rate
	driftGrip := 1.0 - (drift * 0.35)
	fwdBrakeRate := baseAccel * brakingPower * driftGrip
	latBrakeRate := math.Max(strafeAccel, baseAccel*0.75) * brakingPower * driftGrip

	// Hands-off inertial dampener stop rate when no movement keys are held
	stopRate := unit.Speed * 0.45 * inertialDamp * (1.0 - drift*0.55)

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

	anyInput := fwdAxis != 0 || latAxis != 0

	if fwdAxis != 0 && latAxis != 0 {
		const invSqrt2 = 0.7071067811865476
		fwdAxis *= invSqrt2
		latAxis *= invSqrt2
	}

	var targetFwd float64
	if fwdAxis > 0 {
		targetFwd = fwdAxis * maxFwdSpeed
	} else if fwdAxis < 0 {
		targetFwd = fwdAxis * maxRevSpeed
	}
	targetLat := latAxis * maxStrafeSpeed

	// Decompose current world velocity into ship-local (forward, starboard-lateral) components
	cosA := math.Cos(unit.Angle)
	sinA := math.Sin(unit.Angle)
	curFwd := unit.Vel.X*cosA + unit.Vel.Y*sinA
	curLat := -unit.Vel.X*sinA + unit.Vel.Y*cosA

	activeFwdAccel := baseAccel
	if fwdAxis < 0 {
		activeFwdAccel = revAccel
	}

	nextFwd := stepThrusterAxis(curFwd, targetFwd, activeFwdAccel, fwdBrakeRate, stopRate, anyInput)
	nextLat := stepThrusterAxis(curLat, targetLat, strafeAccel, latBrakeRate, stopRate, anyInput)

	// Reconstruct world-space velocity from updated ship-local axes
	unit.Vel.X = nextFwd*cosA - nextLat*sinA
	unit.Vel.Y = nextFwd*sinA + nextLat*cosA

	// Clean zero snap on sub-pixel residual when keys are released
	if !anyInput && math.Hypot(unit.Vel.X, unit.Vel.Y) < 0.02 {
		unit.Vel.X = 0
		unit.Vel.Y = 0
	}
}

// ApplyPilotedUnitPhysics integrates position and enforces arena bounds for player-piloted
// units without applying duplicate passive AI damping (piloted inertial damping is handled
// inside HandlePlayerMovement from PostgreSQL unit_templates stats).
func ApplyPilotedUnitPhysics(unit *models.FleetUnit, roomWidth, roomHeight float64) {
	unit.Pos.X += unit.Vel.X
	unit.Pos.Y += unit.Vel.Y
	clampUnitToArena(unit, roomWidth, roomHeight)
}

func clampUnitToArena(unit *models.FleetUnit, roomWidth, roomHeight float64) {
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

	clampUnitToArena(unit, roomWidth, roomHeight)
}
