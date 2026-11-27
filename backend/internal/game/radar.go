package game

import (
	"space-tactics-server/internal/game/envphysics"
	"space-tactics-server/internal/models"
)

const (
	VisibilityShrouded = 0
	VisibilityPinged   = 1
	VisibilityClear    = 2
)

// RefreshVisibilityCache precomputes per-faction visibility for all live units once per tick.
// This reduces 60Hz AI target acquisition from O(N^3) to O(N^2) with zero per-tick map allocations.
func (r *GameRoom) RefreshVisibilityCache() {
	if r.visStealth == nil {
		r.visStealth = make(map[string]bool, len(r.units))
	} else {
		clear(r.visStealth)
	}
	if r.visByFaction == nil {
		r.visByFaction = make(map[string]map[string]int, 2)
	} else {
		for _, m := range r.visByFaction {
			clear(m)
		}
	}

	r.visUnits = r.visUnits[:0]
	for _, u := range r.units {
		if u == nil || u.IsDestroyed {
			continue
		}
		r.visUnits = append(r.visUnits, u)
		if r.envWorld != nil {
			r.visStealth[u.ID] = envphysics.IsStealthedAt(envphysics.Vec2{X: u.Pos.X, Y: u.Pos.Y}, r.envWorld)
		} else {
			r.visStealth[u.ID] = false
		}
	}

	for _, observer := range r.visUnits {
		factionMap, ok := r.visByFaction[observer.OwnerID]
		if !ok {
			factionMap = make(map[string]int, len(r.visUnits))
			r.visByFaction[observer.OwnerID] = factionMap
		}

		baseVision := float64(observer.VisionRange)
		if baseVision <= 0 {
			baseVision = 600.0
		}
		sensorRange := observer.SensorRange
		if sensorRange <= 0 {
			sensorRange = 600.0
		}
		sensorRangeSq := sensorRange * sensorRange

		for _, target := range r.visUnits {
			if target.OwnerID == observer.OwnerID {
				continue
			}
			if factionMap[target.ID] == VisibilityClear {
				continue
			}

			targetStealthed := r.visStealth[target.ID]
			visionRange := baseVision
			if targetStealthed {
				visionRange *= 0.5
			}

			dx := target.Pos.X - observer.Pos.X
			dy := target.Pos.Y - observer.Pos.Y
			distSq := dx*dx + dy*dy

			// 1. Visually Clear range (halved if target is inside a Nebula or Gas Giant Deep zone)
			if distSq <= visionRange*visionRange {
				factionMap[target.ID] = VisibilityClear
				continue
			}

			// 2. Extended sensor range (blocked by radar immunity OR environmental stealth zone)
			if !target.RadarImmunityActive && !targetStealthed && distSq <= sensorRangeSq {
				factionMap[target.ID] = VisibilityPinged
			}
		}
	}

	r.visCacheTick = r.tick
	r.visCacheValid = true
}

// GetUnitVisibilityState checks a target unit's visibility state for a given player using database-backed vision & sensor ranges
// plus universal envphysics stealth zones (Nebula / Gas Giant Deep Atmosphere).
func (r *GameRoom) GetUnitVisibilityState(playerID string, target *models.FleetUnit) int {
	if target == nil || target.IsDestroyed {
		return VisibilityShrouded
	}

	if r.visCacheValid && r.visCacheTick == r.tick && target.OwnerID != playerID {
		if factionMap, ok := r.visByFaction[playerID]; ok {
			return factionMap[target.ID]
		}
		return VisibilityShrouded
	}

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

		dx := target.Pos.X - unit.Pos.X
		dy := target.Pos.Y - unit.Pos.Y
		distSq := dx*dx + dy*dy

		// 1. Visually Clear range (halved if target is inside a Nebula or Gas Giant Deep zone)
		if distSq <= visionRange*visionRange {
			return VisibilityClear
		}

		// 2. Extended sensor range (blocked by radar immunity OR environmental stealth zone)
		if !target.RadarImmunityActive && !targetStealthed && distSq <= sensorRange*sensorRange {
			maxState = VisibilityPinged
		}
	}

	return maxState
}

// IsUnitVisible maintains backward compatibility, returning true if pinged or clear
func (r *GameRoom) IsUnitVisible(playerID string, target *models.FleetUnit) bool {
	return r.GetUnitVisibilityState(playerID, target) > VisibilityShrouded
}
