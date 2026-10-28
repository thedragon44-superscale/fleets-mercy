package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// HandlePlayerMovement processes user throttle, strafing, and velocity vector clamping using database template fields
func HandlePlayerMovement(unit *models.FleetUnit, input SandboxClientInput, roomWidth, roomHeight float64) {
	unit.Angle = float64(input.Angle)
	unit.IsFiring = input.IsFiring
	
	accel := unit.Speed * 3.5
	maxSpeed := unit.Speed * 6.0

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
		latPower := unit.LateralThrustPower
		if latPower <= 0 {
			latPower = 0.75
		}
		unit.Vel.X += math.Cos(strafeAngle) * (accel * latPower) 
		unit.Vel.Y += math.Sin(strafeAngle) * (accel * latPower) 
	}
	if input.D { 
		strafeAngle := unit.Angle + (math.Pi / 2) 
		latPower := unit.LateralThrustPower
		if latPower <= 0 {
			latPower = 0.75
		}
		unit.Vel.X += math.Cos(strafeAngle) * (accel * latPower) 
		unit.Vel.Y += math.Sin(strafeAngle) * (accel * latPower) 
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
	
	// Derive natural braking resistance from database drift_coefficient
	// Lower drift coefficient = tighter braking response; higher drift = smooth glide
	drift := unit.DriftCoefficient
	if drift <= 0 {
		drift = 0.5
	}

	currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	if currentSpeed > 0.001 {
		// Combine linear baseline damping with a velocity-squared (quadratic) braking curve
		linearDamp := 0.96 - (drift * 0.04)
		quadraticDragFactor := 0.0008 * (1.0 - (drift * 0.5))
		
		// Apply velocity reduction factoring in speed squared resistance
		effectiveDamp := linearDamp - (currentSpeed * quadraticDragFactor)
		if effectiveDamp < 0.80 {
			effectiveDamp = 0.80 // Safety floor to prevent over-braking distortion
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

	// Dynamic map boundary clamping using actual room dimensions with a 50 unit buffer
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
