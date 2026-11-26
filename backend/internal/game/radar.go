package game

import (
	"math"
	"space-tactics-server/internal/models"
)

const (
	VisibilityShrouded = 0
	VisibilityPinged   = 1
	VisibilityClear    = 2
)

// GetUnitVisibilityState checks a target unit's visibility state for a given player using database-backed vision & sensor ranges.
// Returns: 0 (Shrouded), 1 (Radar Contact / Pinged), 2 (Visually Clear)
func (r *GameRoom) GetUnitVisibilityState(playerID string, target *models.FleetUnit) int {
	maxState := VisibilityShrouded

	for _, unit := range r.units {
		if unit.OwnerID != playerID || unit.IsDestroyed {
			continue
		}

		visionRange := float64(unit.VisionRange)
		if visionRange <= 0 {
			visionRange = 600.0
		}

		sensorRange := unit.SensorRange
		if sensorRange <= 0 {
			sensorRange = 600.0
		}

		dist := math.Hypot(target.Pos.X-unit.Pos.X, target.Pos.Y-unit.Pos.Y)

		// 1. Visually Clear range (always penetrates radar stealth)
		if dist <= visionRange {
			return VisibilityClear
		}

		// 2. Extended sensor range (blocked if target has active radar immunity)
		if !target.RadarImmunityActive && dist <= sensorRange {
			maxState = VisibilityPinged
		}
	}

	return maxState
}

// IsUnitVisible maintains backward compatibility, returning true if pinged or clear
func (r *GameRoom) IsUnitVisible(playerID string, target *models.FleetUnit) bool {
	return r.GetUnitVisibilityState(playerID, target) > VisibilityShrouded
}
