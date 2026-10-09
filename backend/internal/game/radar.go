package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// IsUnitVisible checks if a target unit is visible to a player via direct vision or the shared Fleet Array telemetry grid.
func (r *GameRoom) IsUnitVisible(playerID string, target *models.FleetUnit) bool {
	for _, unit := range r.units {
		if unit.OwnerID != playerID || unit.IsDestroyed {
			continue
		}

		// Determine the sensor range of the observing unit
		var sensorRange float64 = 600.0 // Standard visual default
		if unit.Type == "recon_probe" {
			sensorRange = 2500.0 // Extended Recon Probe network bubble
		} else if unit.WeightClass >= 3 {
			sensorRange = 1200.0 // Tactical Frigate Relay
		}

		// Calculate distance from observer to the target
		dist := math.Hypot(target.Pos.X-unit.Pos.X, target.Pos.Y-unit.Pos.Y)

		// If the target falls within this unit's sensor range, the shared Fleet Array lights it up
		if dist <= sensorRange {
			return true
		}
	}

	return false
}
