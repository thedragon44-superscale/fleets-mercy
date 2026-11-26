package game

import (
	"math"
	"space-tactics-server/internal/models"
)

// ProcessLogisticsLoops handles harvesting tethers, supply cache generation, and field logistics support loops
func ProcessLogisticsLoops(r *GameRoom) {
	for _, unit := range r.units {
		if unit.IsDestroyed {
			continue
		}

		// 1. Resource Harvesting & Cache Generation Loop
		if unit.ResourceHarvestingType > 0 {
			if unit.MaxResourceCapacity > 0 && unit.ResourceCache < unit.MaxResourceCapacity {
				harvestRate := 0.5
				unit.ResourceCache = math.Min(unit.MaxResourceCapacity, unit.ResourceCache+harvestRate)
			}
		}

		// 2. Field Support & Maintenance Logistics (Aegis Repair & Command Support)
		if unit.ResourceCache > 0 && (unit.Type == "aegis_repair" || unit.Type == "battalion_command_ship") {
			processFieldRepairTether(unit, r)
		}

		// 3. Strategic Warp Canister / Spatial Jump Logistics
		if unit.WarpCanisterCapacity > 0 {
			processWarpCanisterStatus(unit)
		}
	}
}

// processFieldRepairTether repairs the most damaged hull quadrant on nearby allies
func processFieldRepairTether(provider *models.FleetUnit, r *GameRoom) {
	repairRange := 200.0
	repairRate := 0.5
	resourceCost := 0.1

	for _, ally := range r.units {
		if ally.OwnerID != provider.OwnerID || ally.ID == provider.ID || ally.IsDestroyed {
			continue
		}

		dist := math.Hypot(ally.Pos.X-provider.Pos.X, ally.Pos.Y-provider.Pos.Y)
		if dist > repairRange {
			continue
		}

		maxHull := ally.HullBase
		if maxHull <= 0 {
			maxHull = 100.0
		}

		// Pick the most damaged quadrant among Front, Rear, Port, Starboard
		quadrants := []*float64{
			&ally.Hull.Front,
			&ally.Hull.Rear,
			&ally.Hull.Port,
			&ally.Hull.Starboard,
		}
		var lowest *float64
		for _, q := range quadrants {
			if *q < maxHull && (lowest == nil || *q < *lowest) {
				lowest = q
			}
		}

		if lowest != nil {
			if provider.ResourceCache >= resourceCost {
				provider.ResourceCache -= resourceCost
				*lowest = math.Min(maxHull, *lowest+repairRate)
			} else {
				break
			}
		}
	}
}

// processWarpCanisterStatus updates spatial warp canister integrity and readiness state
func processWarpCanisterStatus(unit *models.FleetUnit) {
	if unit.WarpCanisterCapacity <= 0 {
		return
	}
}
