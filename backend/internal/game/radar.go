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

// GetUnitVisibilityState checks a target unit's visibility state for a given player using database-backed vision ranges.
// Returns: 0 (Shrouded), 1 (Radar Contact / Pinged), 2 (Visually Clear)[cite: 7]
func (r *GameRoom) GetUnitVisibilityState(playerID string, target *models.FleetUnit) int {
	maxState := VisibilityShrouded

	for _, unit := range r.units {
		if unit.OwnerID != playerID || unit.IsDestroyed {
			continue
		}

		// Determine sensor range dynamically from the database-backed VisionRange property
		sensorRange := float64(unit.VisionRange)
		if sensorRange <= 0 {
			sensorRange = 600.0 // Standard visual baseline default
		}

		// Calculate distance from observer to the target
		dist := math.Hypot(target.Pos.X-unit.Pos.X, target.Pos.Y-unit.Pos.Y)

		// 1. Check for Visually Clear range (Standard 600m visual baseline)
		if dist <= 600.0 {
			return VisibilityClear
		}

		// 2. If within extended sensor/vision range, it qualifies as a Radar Contact (Pinged)
		if dist <= sensorRange {
			maxState = VisibilityPinged
		}
	}

	return maxState
}

// IsUnitVisible maintains backward compatibility, returning true if pinged or clear[cite: 7]
func (r *GameRoom) IsUnitVisible(playerID string, target *models.FleetUnit) bool {
	return r.GetUnitVisibilityState(playerID, target) > VisibilityShrouded
}
