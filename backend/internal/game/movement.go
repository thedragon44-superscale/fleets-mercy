package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// HandlePlayerMovement processes user throttle, strafing, and velocity vector clamping for the controlled unit
func HandlePlayerMovement(unit *models.FleetUnit, input SandboxClientInput) {
	unit.Angle = input.Angle
	unit.IsFiring = input.IsFiring
	accel := unit.Speed * 3.5
	maxSpeed := unit.Speed * 6.0

	if input.W { 
		unit.Vel.X += math.Cos(unit.Angle) * accel 
		unit.Vel.Y += math.Sin(unit.Angle) * accel 
	}
	if input.S { 
		unit.Vel.X -= math.Cos(unit.Angle) * (accel * 0.5) 
		unit.Vel.Y -= math.Sin(unit.Angle) * (accel * 0.5) 
	}
	if input.A { 
		strafeAngle := unit.Angle - (math.Pi / 2) 
		unit.Vel.X += math.Cos(strafeAngle) * (accel * 0.75) 
		unit.Vel.Y += math.Sin(strafeAngle) * (accel * 0.75) 
	}
	if input.D { 
		strafeAngle := unit.Angle + (math.Pi / 2) 
		unit.Vel.X += math.Cos(strafeAngle) * (accel * 0.75) 
		unit.Vel.Y += math.Sin(strafeAngle) * (accel * 0.75) 
	}

	currentSpeed := math.Hypot(unit.Vel.X, unit.Vel.Y)
	if currentSpeed > maxSpeed {
		unit.Vel.X = (unit.Vel.X / currentSpeed) * maxSpeed
		unit.Vel.Y = (unit.Vel.Y / currentSpeed) * maxSpeed
	}
}

// ApplyUnitPhysics handles positional displacement, damping, and map boundary clamping
func ApplyUnitPhysics(unit *models.FleetUnit) {
	unit.Pos.X += unit.Vel.X
	unit.Pos.Y += unit.Vel.Y
	unit.Vel.X *= 0.95
	unit.Vel.Y *= 0.95

	if unit.Pos.X < 50 { unit.Pos.X = 50; unit.Vel.X = 0 }
	if unit.Pos.X > 11950 { unit.Pos.X = 11950; unit.Vel.X = 0 }
	if unit.Pos.Y < 50 { unit.Pos.Y = 50; unit.Vel.Y = 0 }
	if unit.Pos.Y > 11950 { unit.Pos.Y = 11950; unit.Vel.Y = 0 }
}
