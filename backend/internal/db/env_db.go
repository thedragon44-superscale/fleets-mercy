package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strconv"
	"sync"
	"time"

	"space-tactics-server/internal/models"
)

// EnvConfigCache holds thread-safe in-memory blueprints and mode spawn pools for 60Hz rooms.
type EnvConfigCache struct {
	Mu            sync.RWMutex
	Blueprints    map[int]models.EnvBlueprint
	BlueprintList []models.EnvBlueprint
	PoolsByMode   map[string][]models.ModeEnvPoolEntry // key: game_mode (e.g. "space_pirates")
	SPPool        []models.SPEnvPoolEntry              // Dedicated customizable sp_env_pool entries
}

var EnvCache = &EnvConfigCache{
	Blueprints:    make(map[int]models.EnvBlueprint),
	BlueprintList: make([]models.EnvBlueprint, 0),
	PoolsByMode:   make(map[string][]models.ModeEnvPoolEntry),
	SPPool:        make([]models.SPEnvPoolEntry, 0),
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

	// Load dedicated sp_env_pool (gracefully tolerate if migration 003 not applied yet)
	spPool := make([]models.SPEnvPoolEntry, 0)
	spRows, spErr := Conn.Query(
		`SELECT pool_id, ruleset_id, blueprint_id, spawn_weight, max_concurrent,
		        scale_override, speed_min, speed_max, min_wraps, max_wraps, is_enabled
		 FROM sp_env_pool
		 ORDER BY pool_id ASC`,
	)
	if spErr == nil {
		defer spRows.Close()
		for spRows.Next() {
			var e models.SPEnvPoolEntry
			if scanErr := spRows.Scan(
				&e.PoolID, &e.RulesetID, &e.BlueprintID, &e.SpawnWeight, &e.MaxConcurrent,
				&e.ScaleOverride, &e.SpeedMin, &e.SpeedMax, &e.MinWraps, &e.MaxWraps, &e.IsEnabled,
			); scanErr == nil {
				if bp, ok := bpMap[e.BlueprintID]; ok {
					bpCopy := bp
					e.Blueprint = &bpCopy
				}
				spPool = append(spPool, e)
			}
		}
	}

	EnvCache.Mu.Lock()
	EnvCache.Blueprints = bpMap
	EnvCache.BlueprintList = blueprints
	EnvCache.PoolsByMode = poolsByMode
	EnvCache.SPPool = spPool
	EnvCache.Mu.Unlock()

	log.Printf("🌌 Loaded Universal EnvCache: %d blueprints, %d mode pool entries, %d sp_env_pool entries",
		len(blueprints), poolCount, len(spPool))
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

// --- SPACE PIRATES CUSTOMIZABLE SPAWN POOL (sp_env_pool) ---

func GetSPEnvPool(rulesetID int) ([]models.SPEnvPoolEntry, error) {
	query := `SELECT pool_id, ruleset_id, blueprint_id, spawn_weight, max_concurrent,
	                 scale_override, speed_min, speed_max, min_wraps, max_wraps, is_enabled
	          FROM sp_env_pool`
	args := make([]interface{}, 0, 1)
	if rulesetID > 0 {
		query += ` WHERE ruleset_id = $1`
		args = append(args, rulesetID)
	}
	query += ` ORDER BY pool_id ASC`

	rows, err := Conn.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	EnvCache.Mu.RLock()
	bpMap := EnvCache.Blueprints
	EnvCache.Mu.RUnlock()

	list := make([]models.SPEnvPoolEntry, 0)
	for rows.Next() {
		var e models.SPEnvPoolEntry
		if err := rows.Scan(
			&e.PoolID, &e.RulesetID, &e.BlueprintID, &e.SpawnWeight, &e.MaxConcurrent,
			&e.ScaleOverride, &e.SpeedMin, &e.SpeedMax, &e.MinWraps, &e.MaxWraps, &e.IsEnabled,
		); err != nil {
			return nil, err
		}
		if bp, ok := bpMap[e.BlueprintID]; ok {
			bpCopy := bp
			e.Blueprint = &bpCopy
		}
		list = append(list, e)
	}
	return list, nil
}

// UpsertSPEnvPoolEntry updates an existing sp_env_pool row (poolId > 0) or inserts a new one (unlimited entries).
func UpsertSPEnvPoolEntry(e *models.SPEnvPoolEntry) (int, error) {
	if e.RulesetID <= 0 {
		SPCache.Mu.RLock()
		e.RulesetID = SPCache.Ruleset.RulesetID
		SPCache.Mu.RUnlock()
		if e.RulesetID <= 0 {
			e.RulesetID = 1
		}
	}
	if e.SpawnWeight <= 0 {
		e.SpawnWeight = 10
	}
	if e.MaxConcurrent <= 0 {
		e.MaxConcurrent = 1
	}

	var id int
	var err error
	if e.PoolID > 0 {
		err = Conn.QueryRow(
			`UPDATE sp_env_pool
			 SET blueprint_id = $1, spawn_weight = $2, max_concurrent = $3,
			     scale_override = $4, speed_min = $5, speed_max = $6,
			     min_wraps = $7, max_wraps = $8, is_enabled = $9, updated_at = NOW()
			 WHERE pool_id = $10
			 RETURNING pool_id`,
			e.BlueprintID, e.SpawnWeight, e.MaxConcurrent,
			e.ScaleOverride, e.SpeedMin, e.SpeedMax,
			e.MinWraps, e.MaxWraps, e.IsEnabled, e.PoolID,
		).Scan(&id)
	} else {
		err = Conn.QueryRow(
			`INSERT INTO sp_env_pool (
				ruleset_id, blueprint_id, spawn_weight, max_concurrent,
				scale_override, speed_min, speed_max, min_wraps, max_wraps, is_enabled
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			RETURNING pool_id`,
			e.RulesetID, e.BlueprintID, e.SpawnWeight, e.MaxConcurrent,
			e.ScaleOverride, e.SpeedMin, e.SpeedMax, e.MinWraps, e.MaxWraps, e.IsEnabled,
		).Scan(&id)
	}
	if err != nil {
		return 0, err
	}

	_ = LoadEnvCache()
	return id, nil
}

func DeleteSPEnvPoolEntry(poolID int) error {
	_, err := Conn.Exec(`DELETE FROM sp_env_pool WHERE pool_id = $1`, poolID)
	if err != nil {
		return err
	}
	_ = LoadEnvCache()
	return nil
}

// --- UNIFIED MAPS & HYDRATED PLACEMENTS CRUD ---

func ListUniversalMaps() ([]models.UniversalMapSummary, error) {
	rows, err := Conn.Query(
		`SELECT m.map_id, m.map_key, m.map_name, COALESCE(m.description, ''), m.width, m.height,
		        COUNT(p.placement_id)::int AS placement_count,
		        COALESCE(m.updated_at, NOW())
		 FROM maps m
		 LEFT JOIN map_env_placements p ON p.map_id = m.map_id
		 GROUP BY m.map_id, m.map_key, m.map_name, m.description, m.width, m.height, m.updated_at
		 ORDER BY m.map_id ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.UniversalMapSummary, 0)
	for rows.Next() {
		var m models.UniversalMapSummary
		if err := rows.Scan(
			&m.ID, &m.MapKey, &m.Name, &m.Description, &m.Width, &m.Height,
			&m.PlacementCount, &m.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, nil
}

func GetUniversalMapDetail(mapID int) (*models.UniversalMapDetail, error) {
	var detail models.UniversalMapDetail
	err := Conn.QueryRow(
		`SELECT map_id, map_key, map_name, COALESCE(description, ''), width, height, COALESCE(updated_at, NOW())
		 FROM maps
		 WHERE map_id = $1`,
		mapID,
	).Scan(&detail.ID, &detail.MapKey, &detail.Name, &detail.Description, &detail.Width, &detail.Height, &detail.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}

	rawPlacements, err := GetMapEnvPlacements(mapID)
	if err != nil {
		return nil, err
	}

	EnvCache.Mu.RLock()
	bpMap := EnvCache.Blueprints
	EnvCache.Mu.RUnlock()

	hydrated := make([]models.HydratedMapPlacement, 0, len(rawPlacements))
	for _, p := range rawPlacements {
		hp := models.HydratedMapPlacement{MapEnvPlacement: p}
		if bp, ok := bpMap[p.BlueprintID]; ok {
			bpCopy := bp
			hp.Blueprint = &bpCopy
		}
		hydrated = append(hydrated, hp)
	}
	detail.Placements = hydrated
	detail.PlacementCount = len(hydrated)
	return &detail, nil
}

// SaveUniversalMap atomically creates/updates a map and replaces its map_env_placements with 2-pass parent resolution.
func SaveUniversalMap(req models.SaveUniversalMapRequest) (*models.UniversalMapDetail, error) {
	if req.Width <= 0 {
		req.Width = 12000
	}
	if req.Height <= 0 {
		req.Height = 12000
	}

	tx, err := Conn.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var mapID int
	if req.ID != nil && *req.ID > 0 {
		mapID = *req.ID
		_, err = tx.Exec(
			`UPDATE maps
			 SET map_name = $1, description = $2, width = $3, height = $4, updated_at = NOW()
			 WHERE map_id = $5`,
			req.Name, req.Description, req.Width, req.Height, mapID,
		)
		if err != nil {
			return nil, err
		}
		if _, err := tx.Exec(`DELETE FROM map_env_placements WHERE map_id = $1`, mapID); err != nil {
			return nil, err
		}
	} else {
		mapKey := "umap_" + strconv.FormatInt(time.Now().UnixNano(), 36)
		err = tx.QueryRow(
			`INSERT INTO maps (map_key, map_name, description, width, height, updated_at)
			 VALUES ($1, $2, $3, $4, $5, NOW())
			 RETURNING map_id`,
			mapKey, req.Name, req.Description, req.Width, req.Height,
		).Scan(&mapID)
		if err != nil {
			return nil, err
		}
	}

	insertedIDs := make([]int, len(req.Placements))
	for i := range req.Placements {
		p := &req.Placements[i]
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
	}

	for i := range req.Placements {
		p := &req.Placements[i]
		if p.ParentIndex != nil {
			idx := *p.ParentIndex
			if idx >= 0 && idx < len(insertedIDs) && idx != i {
				if _, err := tx.Exec(
					`UPDATE map_env_placements SET parent_placement_id = $1 WHERE placement_id = $2`,
					insertedIDs[idx], insertedIDs[i],
				); err != nil {
					return nil, err
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetUniversalMapDetail(mapID)
}

func DeleteUniversalMap(mapID int) error {
	_, err := Conn.Exec(`DELETE FROM maps WHERE map_id = $1`, mapID)
	return err
}
