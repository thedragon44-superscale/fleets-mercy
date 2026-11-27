package game

import (
	"math"

	"space-tactics-server/internal/game/envphysics"
	"space-tactics-server/internal/models"
)

const (
	VisibilityShrouded = 0
	VisibilityPinged   = 1
	VisibilityClear    = 2
)

// GetUnitVisibilityState checks a target unit's visibility state for a given player using database-backed vision & sensor ranges
// plus universal envphysics stealth zones (Nebula / Gas Giant Deep Atmosphere).
func (r *GameRoom) GetUnitVisibilityState(playerID string, target *models.FleetUnit) int {
	maxState := VisibilityShrouded
	targetStealthed := r.envWorld != nil && envphysics.IsStealthedAt(envphysics.Vec2{X: target.Pos.X, Y: target.Pos.Y}, r.envWorld)

	for _, unit := range r.units {
		if unit.OwnerID != playerID || unit.IsDestroyed {
			continue
		}

		visionRange := float64(unit.VisionRange)
		if visionRange <= 0 {
			visionRange = 600.0
		}
		if targetStealthed {
			visionRange *= 0.5
		}

		sensorRange := unit.SensorRange
		if sensorRange <= 0 {
			sensorRange = 600.0
		}

		dist := math.Hypot(target.Pos.X-unit.Pos.X, target.Pos.Y-unit.Pos.Y)

		// 1. Visually Clear range (halved if target is inside a Nebula or Gas Giant Deep zone)
		if dist <= visionRange {
			return VisibilityClear
		}

		// 2. Extended sensor range (blocked by radar immunity OR environmental stealth zone)
		if !target.RadarImmunityActive && !targetStealthed && dist <= sensorRange {
			maxState = VisibilityPinged
		}
	}

	return maxState
}

// IsUnitVisible maintains backward compatibility, returning true if pinged or clear
func (r *GameRoom) IsUnitVisible(playerID string, target *models.FleetUnit) bool {
	return r.GetUnitVisibilityState(playerID, target) > VisibilityShrouded
}
