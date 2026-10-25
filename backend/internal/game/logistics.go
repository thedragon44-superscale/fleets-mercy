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
		// Driven by unit.ResourceHarvestingType (> 0 means active harvesting capability)
		if unit.ResourceHarvestingType > 0 {
			// Increment cache up to unit's maximum capacity if not full
			if unit.MaxResourceCapacity > 0 && unit.ResourceCache < unit.MaxResourceCapacity {
				// Base harvesting replenishment rate; scalable via database templates in future updates
				harvestRate := 0.5
				unit.ResourceCache = math.Min(unit.MaxResourceCapacity, unit.ResourceCache+harvestRate)
			}
		}

		// 2. Field Support & Maintenance Logistics (Aegis Repair & Command Support)
		// Field repairs consume internal resource cache to repair nearby friendly units
		if unit.ResourceCache > 0 && (unit.Type == "aegis_repair" || unit.Type == "battalion_command_ship") {
			processFieldRepairTether(unit, r)
		}

		// 3. Strategic Warp Canister / Spatial Jump Logistics
		// Manages warp-capable assets without hardcoding specific vessel names
		if unit.WarpCanisterCapacity > 0 {
			processWarpCanisterStatus(unit)
		}
	}
}

// processFieldRepairTether handles local structural maintenance tethers to nearby damaged allies
func processFieldRepairTether(provider *models.FleetUnit, r *GameRoom) {
	repairRange := 200.0
	repairRate := 0.5
	resourceCost := 0.1

	for _, ally := range r.units {
		if ally.OwnerID != provider.OwnerID || ally.ID == provider.ID || ally.IsDestroyed {
			continue
		}

		// Calculate distance to potential repair target
		dist := math.Hypot(ally.Pos.X-provider.Pos.X, ally.Pos.Y-provider.Pos.Y)
		if dist <= repairRange {
			// Check if target unit is damaged relative to its database HullBase blueprint
			maxHull := ally.HullBase
			if maxHull <= 0 {
				maxHull = 100.0 // Default fallback standard
			}

			if ally.Hull.Front < maxHull {
				// Deduct from provider's supply cache to execute repair
				if provider.ResourceCache >= resourceCost {
					provider.ResourceCache -= resourceCost
					ally.Hull.Front = math.Min(maxHull, ally.Hull.Front+repairRate)
				} else {
					// Cache depleted: unit must pause repairs until resupplied
					break
				}
			}
		}
	}
}

// processWarpCanisterStatus updates spatial warp canister integrity and readiness state
func processWarpCanisterStatus(unit *models.FleetUnit) {
	// Strategic placeholder for warp canister consumption/reload checks
	// Ensures unit state reflects current canister capacity
	if unit.WarpCanisterCapacity <= 0 {
		// Canister cache empty: mark unit as pending supply tender resupply
		return
	}
}
