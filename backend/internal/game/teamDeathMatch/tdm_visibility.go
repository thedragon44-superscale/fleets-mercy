package teamDeathMatch

import (
	"math"

	"space-tactics-server/internal/models"
)

// CanAISeeUnit enforces strict fog-of-war constraints for AI-controlled units.
// AI units cannot "cheat"—they must be within the observer's database-backed sensor/vision range
// to detect, lock onto, or engage a hostile target. Friendly units are always visible.
func CanAISeeUnit(observer *models.FleetUnit, target *models.FleetUnit) bool {
	if observer == nil || target == nil {
		return false
	}

	// Cannot target destroyed units
	if target.IsDestroyed {
		return false
	}

	// Units always have awareness of friendly squadmates and teammates
	if observer.OwnerID == target.OwnerID {
		return true
	}

	// Calculate Euclidean distance between observer and potential target
	dx := target.Pos.X - observer.Pos.X
	dy := target.Pos.Y - observer.Pos.Y
	dist := math.Hypot(dx, dy)

	// Determine effective sensor range
	effectiveRange := observer.SensorRange
	if effectiveRange <= 0 {
		effectiveRange = float64(observer.VisionRange)
	}
	if effectiveRange <= 0 {
		effectiveRange = 2500.0 // Default fallback telemetry range
	}

	return dist <= effectiveRange
}

// IsMinimapVisibleToPlayer determines if a unit should appear on the human player's mini-radar.
// Per TDM rules, the human player's minimap is fully intelligible and un-shrouded,
// displaying all active units across the map interface regardless of line of sight.
func IsMinimapVisibleToPlayer(unit *models.FleetUnit) bool {
	if unit == nil || unit.IsDestroyed {
		return false
	}
	// Fully intelligible to player radar
	return true
}
