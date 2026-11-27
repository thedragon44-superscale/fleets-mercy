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
// smooth curved counter-thrust direction bending, and speed clamping driven strictly
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
	drift := math.Max(0, math.Min(1.0, unit.DriftCoefficient))

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

	accel := unit.Speed * 0.75 * accelCurve
	strafeAccel := math.Max(0, unit.StrafingSpeed) * 0.75 * accelCurve * latPower

	localFwd := 0.0
	if fwdAxis > 0 {
		localFwd = accel
	} else if fwdAxis < 0 {
		localFwd = -accel * revPower
	}
	localLat := latAxis * strafeAccel

	if fwdAxis != 0 && latAxis != 0 {
		const invSqrt2 = 0.7071067811865476
		localFwd *= invSqrt2
		localLat *= invSqrt2
	}

	cosA := math.Cos(unit.Angle)
	sinA := math.Sin(unit.Angle)
	thrustX := localFwd*cosA - localLat*sinA
	thrustY := localFwd*sinA + localLat*cosA
	thrustMag := math.Hypot(thrustX, thrustY)

	// Smooth curved counter-thrust when active thrust opposes or cuts across current velocity
	// (e.g. W->S reversal or W->A/D lateral switch), driven strictly by BrakingThrustPower & DriftCoefficient.
	if thrustMag > 1e-6 && brakingPower > 0 {
		curSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
		if curSpeed > 0.05 {
			tDirX := thrustX / thrustMag
			tDirY := thrustY / thrustMag

			vAlong := unit.Vel.X*tDirX + unit.Vel.Y*tDirY
			vPerpX := unit.Vel.X - vAlong*tDirX
			vPerpY := unit.Vel.Y - vAlong*tDirY

			grip := 1.0 - (drift * 0.45)

			// Smooth exponential counter-thrust on opposing momentum (W->S)
			if vAlong < 0 {
				retroDamp := math.Exp(-0.10 * brakingPower * grip)
				vAlong *= retroDamp
			}

			// Smooth exponential velocity bending on perpendicular slip (W->D or turning under thrust)
			perpDamp := math.Exp(-0.08 * brakingPower * grip)
			vPerpX *= perpDamp
			vPerpY *= perpDamp

			unit.Vel.X = vAlong*tDirX + vPerpX
			unit.Vel.Y = vAlong*tDirY + vPerpY
		}
	}

	unit.Vel.X += thrustX
	unit.Vel.Y += thrustY

	// Clean circular speed cap matching the smooth pre-regression handling model
	maxSpeed := unit.Speed * 6.0
	currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	if currentSpeed > maxSpeed {
		scale := maxSpeed / currentSpeed
		unit.Vel.X *= scale
		unit.Vel.Y *= scale
	}
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

// ApplyUnitPhysics handles positional displacement, curved exponential + quadratic inertial
// damping (modulated by DriftCoefficient and InertialDamping from PostgreSQL unit_templates),
// anti-skid heading grip, and arena boundary clamping for both piloted and AI units.
func ApplyUnitPhysics(unit *models.FleetUnit, roomWidth, roomHeight float64) {
	unit.Pos.X += unit.Vel.X
	unit.Pos.Y += unit.Vel.Y

	drift := math.Max(0, math.Min(1.0, unit.DriftCoefficient))
	inertialDamp := math.Max(0, unit.InertialDamping)

	// Pure data-driven zero-damping mode: InertialDamping == 0 coasts freely without drag
	if inertialDamp > 0 {
		currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
		if currentSpeed > 0.03 {
			// Smooth curved exponential + quadratic drag matching natural space glide
			linearDamp := 0.93 + (drift * 0.055)
			quadraticDragFactor := 0.0005 * (1.0 - (drift * 0.6))
			baseLoss := (1.0 - linearDamp) + (currentSpeed * quadraticDragFactor)

			// Anti-skid: extra braking grip when nose opposes velocity vector (scaled down on high-drift ships)
			velAngle := math.Atan2(unit.Vel.Y, unit.Vel.X)
			headingDiff := math.Abs(math.Remainder(unit.Angle-velAngle, math.Pi*2))
			if headingDiff > (math.Pi * 0.6) {
				baseLoss += 0.015 * (1.0 - (drift * 0.5))
			}

			effectiveDamp := math.Exp(-baseLoss * inertialDamp)
			if effectiveDamp < 0.50 {
				effectiveDamp = 0.50
			}
			if effectiveDamp > 0.995 {
				effectiveDamp = 0.995
			}

			unit.Vel.X *= effectiveDamp
			unit.Vel.Y *= effectiveDamp

			// Eliminate endless sub-pixel exponential tail only once the ship has drifted
			// down to a near-stop, preserving smooth natural glide and exact (0, 0) settle.
			postSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
			if postSpeed < 0.35 {
				settleDecel := 0.015 * inertialDamp * (1.0 - drift*0.4)
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
	}

	clampUnitToArena(unit, roomWidth, roomHeight)
}
