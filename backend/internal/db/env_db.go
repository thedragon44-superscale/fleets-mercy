package db

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sync"

	"space-tactics-server/internal/models"
)

// EnvConfigCache holds thread-safe in-memory blueprints and mode spawn pools for 60Hz rooms.
type EnvConfigCache struct {
	Mu            sync.RWMutex
	Blueprints    map[int]models.EnvBlueprint
	BlueprintList []models.EnvBlueprint
	PoolsByMode   map[string][]models.ModeEnvPoolEntry // key: game_mode (e.g. "space_pirates")
}

var EnvCache = &EnvConfigCache{
	Blueprints:    make(map[int]models.EnvBlueprint),
	BlueprintList: make([]models.EnvBlueprint, 0),
	PoolsByMode:   make(map[string][]models.ModeEnvPoolEntry),
}

// ComputeEnvBoundingRadius computes the enclosing local radius including all geometry components
// and any attached orbiting child blueprints (e.g., orbital moons).
func ComputeEnvBoundingRadius(bp *models.EnvBlueprint, bpByID map[int]models.EnvBlueprint) float64 {
	maxR := 60.0
	for _, c := range bp.Components {
		edge := math.Hypot(c.DX, c.DY) + c.Radius
		if edge > maxR {
			maxR = edge
		}
	}
	for _, child := range bp.OrbitingChildren {
		childScale := child.Scale
		if childScale <= 0 {
			childScale = 1.0
		}
		childRadius := 45.0
		if bpByID != nil {
			if target, ok := bpByID[child.ChildBlueprintID]; ok && target.BoundingRadius > 0 {
				childRadius = target.BoundingRadius
			}
		}
		edge := math.Abs(child.OrbitRadius) + childRadius*childScale
		if edge > maxR {
			maxR = edge
		}
	}
	return math.Ceil(maxR)
}

// LoadEnvCache loads all env_blueprints and mode_env_pools from PostgreSQL into db.EnvCache.
func LoadEnvCache() error {
	blueprints, err := GetAllEnvBlueprints(true)
	if err != nil {
		return fmt.Errorf("load env_blueprints: %w", err)
	}

	bpMap := make(map[int]models.EnvBlueprint, len(blueprints))
	for _, bp := range blueprints {
		bpMap[bp.BlueprintID] = bp
	}

	rows, err := Conn.Query(
		`SELECT pool_id, game_mode, ruleset_id, blueprint_id, spawn_weight,
		        max_concurrent, scale_override, is_enabled
		 FROM mode_env_pools
		 ORDER BY pool_id ASC`,
	)
	if err != nil {
		return fmt.Errorf("load mode_env_pools: %w", err)
	}
	defer rows.Close()

	poolsByMode := make(map[string][]models.ModeEnvPoolEntry)
	poolCount := 0
	for rows.Next() {
		var p models.ModeEnvPoolEntry
		if err := rows.Scan(
			&p.PoolID, &p.GameMode, &p.RulesetID, &p.BlueprintID,
			&p.SpawnWeight, &p.MaxConcurrent, &p.ScaleOverride, &p.IsEnabled,
		); err != nil {
			return err
		}
		poolsByMode[p.GameMode] = append(poolsByMode[p.GameMode], p)
		poolCount++
	}

	EnvCache.Mu.Lock()
	EnvCache.Blueprints = bpMap
	EnvCache.BlueprintList = blueprints
	EnvCache.PoolsByMode = poolsByMode
	EnvCache.Mu.Unlock()

	log.Printf("🌌 Loaded Universal EnvCache: %d blueprints, %d mode pool entries", len(blueprints), poolCount)
	return nil
}

// GetAllEnvBlueprints fetches all blueprints from PostgreSQL.
func GetAllEnvBlueprints(includeDisabled bool) ([]models.EnvBlueprint, error) {
	query := `SELECT blueprint_id, name, object_type, components, orbiting_children,
	                 physics_profile, motion_profile, bounding_radius, is_enabled
	          FROM env_blueprints`
	if !includeDisabled {
		query += ` WHERE is_enabled = TRUE`
	}
	query += ` ORDER BY blueprint_id ASC`

	rows, err := Conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.EnvBlueprint, 0)
	for rows.Next() {
		var bp models.EnvBlueprint
		var compRaw, childRaw, physRaw, motRaw []byte
		if err := rows.Scan(
			&bp.BlueprintID, &bp.Name, &bp.ObjectType,
			&compRaw, &childRaw, &physRaw, &motRaw,
			&bp.BoundingRadius, &bp.IsEnabled,
		); err != nil {
			return nil, err
		}
		bp.Components = make([]models.EnvComponentSpec, 0)
		bp.OrbitingChildren = make([]models.OrbitingChildSpec, 0)
		_ = json.Unmarshal(compRaw, &bp.Components)
		_ = json.Unmarshal(childRaw, &bp.OrbitingChildren)
		_ = json.Unmarshal(physRaw, &bp.PhysicsProfile)
		_ = json.Unmarshal(motRaw, &bp.MotionProfile)
		if bp.PhysicsProfile.ImmuneUnitClasses == nil {
			bp.PhysicsProfile.ImmuneUnitClasses = make([]string, 0)
		}
		if bp.PhysicsProfile.VisualRangeMult <= 0 {
			bp.PhysicsProfile.VisualRangeMult = 1.0
		}
		if bp.PhysicsProfile.ProjectileBehavior == "" {
			bp.PhysicsProfile.ProjectileBehavior = "block"
		}
		if bp.MotionProfile.Mode == "" {
			bp.MotionProfile.Mode = "drift_wrap"
		}
		list = append(list, bp)
	}
	return list, nil
}

// UpsertEnvBlueprint inserts or updates a blueprint in env_blueprints and refreshes EnvCache.
func UpsertEnvBlueprint(bp *models.EnvBlueprint) (int, error) {
	if bp.Components == nil {
		bp.Components = make([]models.EnvComponentSpec, 0)
	}
	if bp.OrbitingChildren == nil {
		bp.OrbitingChildren = make([]models.OrbitingChildSpec, 0)
	}
	if bp.PhysicsProfile.ImmuneUnitClasses == nil {
		bp.PhysicsProfile.ImmuneUnitClasses = make([]string, 0)
	}
	if bp.PhysicsProfile.VisualRangeMult <= 0 {
		bp.PhysicsProfile.VisualRangeMult = 1.0
	}
	if bp.PhysicsProfile.ProjectileBehavior == "" {
		bp.PhysicsProfile.ProjectileBehavior = "block"
	}
	if bp.MotionProfile.Mode == "" {
		bp.MotionProfile.Mode = "drift_wrap"
	}

	EnvCache.Mu.RLock()
	bp.BoundingRadius = ComputeEnvBoundingRadius(bp, EnvCache.Blueprints)
	EnvCache.Mu.RUnlock()

	compBytes, err := json.Marshal(bp.Components)
	if err != nil {
		return 0, err
	}
	childBytes, err := json.Marshal(bp.OrbitingChildren)
	if err != nil {
		return 0, err
	}
	physBytes, err := json.Marshal(bp.PhysicsProfile)
	if err != nil {
		return 0, err
	}
	motBytes, err := json.Marshal(bp.MotionProfile)
	if err != nil {
		return 0, err
	}

	var id int
	if bp.BlueprintID > 0 {
		err = Conn.QueryRow(
			`UPDATE env_blueprints
			 SET name = $1, object_type = $2, components = $3, orbiting_children = $4,
			     physics_profile = $5, motion_profile = $6, bounding_radius = $7,
			     is_enabled = $8, updated_at = NOW()
			 WHERE blueprint_id = $9
			 RETURNING blueprint_id`,
			bp.Name, bp.ObjectType, compBytes, childBytes,
			physBytes, motBytes, bp.BoundingRadius, bp.IsEnabled, bp.BlueprintID,
		).Scan(&id)
	} else {
		err = Conn.QueryRow(
			`INSERT INTO env_blueprints (
				name, object_type, components, orbiting_children,
				physics_profile, motion_profile, bounding_radius, is_enabled
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING blueprint_id`,
			bp.Name, bp.ObjectType, compBytes, childBytes,
			physBytes, motBytes, bp.BoundingRadius, bp.IsEnabled,
		).Scan(&id)
	}
	if err != nil {
		return 0, err
	}

	_ = LoadEnvCache()
	return id, nil
}

// DeleteEnvBlueprint removes a blueprint by ID and refreshes EnvCache.
func DeleteEnvBlueprint(blueprintID int) error {
	_, err := Conn.Exec(`DELETE FROM env_blueprints WHERE blueprint_id = $1`, blueprintID)
	if err != nil {
		return err
	}
	_ = LoadEnvCache()
	return nil
}

// GetModeEnvPools fetches pool entries for a game mode (and optional rulesetID > 0).
func GetModeEnvPools(gameMode string, rulesetID int) ([]models.ModeEnvPoolEntry, error) {
	query := `SELECT pool_id, game_mode, ruleset_id, blueprint_id, spawn_weight,
	                 max_concurrent, scale_override, is_enabled
	          FROM mode_env_pools
	          WHERE game_mode = $1`
	args := []interface{}{gameMode}
	if rulesetID > 0 {
		query += ` AND ruleset_id = $2`
		args = append(args, rulesetID)
	}
	query += ` ORDER BY pool_id ASC`

	rows, err := Conn.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.ModeEnvPoolEntry, 0)
	for rows.Next() {
		var p models.ModeEnvPoolEntry
		if err := rows.Scan(
			&p.PoolID, &p.GameMode, &p.RulesetID, &p.BlueprintID,
			&p.SpawnWeight, &p.MaxConcurrent, &p.ScaleOverride, &p.IsEnabled,
		); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

// UpsertModeEnvPool creates or updates a (game_mode, ruleset_id, blueprint_id) pool entry and refreshes EnvCache.
func UpsertModeEnvPool(entry *models.ModeEnvPoolEntry) (int, error) {
	if entry.GameMode == "" {
		entry.GameMode = "space_pirates"
	}
	if entry.RulesetID <= 0 {
		SPCache.Mu.RLock()
		entry.RulesetID = SPCache.Ruleset.RulesetID
		SPCache.Mu.RUnlock()
		if entry.RulesetID <= 0 {
			entry.RulesetID = 1
		}
	}
	if entry.SpawnWeight <= 0 {
		entry.SpawnWeight = 10
	}
	if entry.MaxConcurrent <= 0 {
		entry.MaxConcurrent = 1
	}

	var id int
	err := Conn.QueryRow(
		`INSERT INTO mode_env_pools (
			game_mode, ruleset_id, blueprint_id, spawn_weight, max_concurrent, scale_override, is_enabled
		) VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (game_mode, ruleset_id, blueprint_id)
		DO UPDATE SET
			spawn_weight = EXCLUDED.spawn_weight,
			max_concurrent = EXCLUDED.max_concurrent,
			scale_override = EXCLUDED.scale_override,
			is_enabled = EXCLUDED.is_enabled
		RETURNING pool_id`,
		entry.GameMode, entry.RulesetID, entry.BlueprintID,
		entry.SpawnWeight, entry.MaxConcurrent, entry.ScaleOverride, entry.IsEnabled,
	).Scan(&id)
	if err != nil {
		return 0, err
	}

	_ = LoadEnvCache()
	return id, nil
}

// DeleteModeEnvPool deletes a pool entry by pool_id and refreshes EnvCache.
func DeleteModeEnvPool(poolID int) error {
	_, err := Conn.Exec(`DELETE FROM mode_env_pools WHERE pool_id = $1`, poolID)
	if err != nil {
		return err
	}
	_ = LoadEnvCache()
	return nil
}

// GetMapEnvPlacements returns all universal environment placements for a map_id.
func GetMapEnvPlacements(mapID int) ([]models.MapEnvPlacement, error) {
	rows, err := Conn.Query(
		`SELECT placement_id, map_id, blueprint_id, pos_x, pos_y, scale, angle,
		        vel_x, vel_y, parent_placement_id, orbit_radius, orbit_speed, overrides
		 FROM map_env_placements
		 WHERE map_id = $1
		 ORDER BY placement_id ASC`,
		mapID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.MapEnvPlacement, 0)
	for rows.Next() {
		var p models.MapEnvPlacement
		var ov []byte
		if err := rows.Scan(
			&p.PlacementID, &p.MapID, &p.BlueprintID, &p.PosX, &p.PosY, &p.Scale, &p.Angle,
			&p.VelX, &p.VelY, &p.ParentPlacementID, &p.OrbitRadius, &p.OrbitSpeed, &ov,
		); err != nil {
			return nil, err
		}
		if len(ov) > 0 {
			p.Overrides = json.RawMessage(ov)
		}
		list = append(list, p)
	}
	return list, nil
}

// ReplaceMapEnvPlacements atomically replaces all map_env_placements for mapID,
// resolving parentIndex links for newly created orbital moons in two passes.
func ReplaceMapEnvPlacements(mapID int, placements []models.MapEnvPlacement) ([]models.MapEnvPlacement, error) {
	tx, err := Conn.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM map_env_placements WHERE map_id = $1`, mapID); err != nil {
		return nil, err
	}

	insertedIDs := make([]int, len(placements))
	for i := range placements {
		p := &placements[i]
		scale := p.Scale
		if scale <= 0 {
			scale = 1.0
		}
		ov := []byte("{}")
		if len(p.Overrides) > 0 {
			ov = p.Overrides
		}
		var newID int
		err := tx.QueryRow(
			`INSERT INTO map_env_placements (
				map_id, blueprint_id, pos_x, pos_y, scale, angle,
				vel_x, vel_y, parent_placement_id, orbit_radius, orbit_speed, overrides
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,$10,$11)
			RETURNING placement_id`,
			mapID, p.BlueprintID, p.PosX, p.PosY, scale, p.Angle,
			p.VelX, p.VelY, p.OrbitRadius, p.OrbitSpeed, ov,
		).Scan(&newID)
		if err != nil {
			return nil, err
		}
		insertedIDs[i] = newID
		p.PlacementID = newID
		p.MapID = mapID
		p.Scale = scale
	}

	// Second pass: wire parent_placement_id using ParentIndex
	for i := range placements {
		p := &placements[i]
		if p.ParentIndex != nil {
			idx := *p.ParentIndex
			if idx >= 0 && idx < len(insertedIDs) && idx != i {
				parentID := insertedIDs[idx]
				if _, err := tx.Exec(
					`UPDATE map_env_placements SET parent_placement_id = $1 WHERE placement_id = $2`,
					parentID, p.PlacementID,
				); err != nil {
					return nil, err
				}
				p.ParentPlacementID = &parentID
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return placements, nil
}
