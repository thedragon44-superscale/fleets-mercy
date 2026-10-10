package game

import (
	"math"
)

// ProcessLogisticsLoops manages resource harvesting tethers, ammunition replenishment, and capital ship support loops
func ProcessLogisticsLoops(r *GameRoom) {
	for _, unit := range r.units {
		if unit.IsDestroyed {
			continue
		}

		// Resource extraction / supply tender cache generation
		if unit.Type == "supply_tender" || unit.Type == "grav_extractor" {
			if unit.ResourceCache < unit.MaxResourceCapacity {
				unit.ResourceCache = math.Min(unit.MaxResourceCapacity, unit.ResourceCache+0.5)
			}
		}
	}
}
