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

// GetUnitVisibilityState checks a target unit's visibility state for a given player.
// Returns: 0 (Shrouded), 1 (Radar Contact / Pinged), 2 (Visually Clear)[cite: 7]
func (r *GameRoom) GetUnitVisibilityState(playerID string, target *models.FleetUnit) int {
	maxState := VisibilityShrouded

	for _, unit := range r.units {
		if unit.OwnerID != playerID || unit.IsDestroyed {
			continue
		}

		// Determine the sensor range of the observing unit[cite: 12]
		var sensorRange float64 = 600.0 // Standard visual default[cite: 12]
		if unit.Type == "recon_probe" {
			sensorRange = 2500.0 // Extended Recon Probe network bubble[cite: 12]
		} else if unit.WeightClass >= 3 {
			sensorRange = 1200.0 // Tactical Frigate Relay[cite: 12]
		}

		// Calculate distance from observer to the target[cite: 12]
		dist := math.Hypot(target.Pos.X-unit.Pos.X, target.Pos.Y-unit.Pos.Y)

		// 1. Check for Visually Clear range (Standard 600m visual baseline)
		if dist <= 600.0 {
			return VisibilityClear
		}

		// 2. If within extended sensor range, it qualifies as a Radar Contact (Pinged)
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
