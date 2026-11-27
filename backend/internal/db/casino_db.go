package db

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"sync"

	"space-tactics-server/internal/models"
)

var (
	ErrInsufficientFunds = errors.New("insufficient wallet balance")
	ErrPlayerNotFound    = errors.New("player not found")
	ErrUnauthorizedAdmin = errors.New("house_admin role required")
)

// Thread-safe in-memory cache for Space Pirates configs (refreshed on startup & editor save)
type SPConfigCache struct {
	Mu       sync.RWMutex
	Ruleset  models.SPRuleset
	Units    map[string]models.SPUnitConfig // key: factionRole + ":" + unitClass
	Resources map[string]models.SPResource  // key: resource_key
	Clusters []models.SPClusterVariant
}

var SPCache = &SPConfigCache{
	Units:     make(map[string]models.SPUnitConfig),
	Resources: make(map[string]models.SPResource),
	Clusters:  make([]models.SPClusterVariant, 0),
}

// CreatePlayerWithWallet registers a new player with role='player' and a $0.00 wallet atomically.
func CreatePlayerWithWallet(username string, passwordHash string) (int, int, error) {
	tx, err := Conn.Begin()
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback()

	var playerID int
	err = tx.QueryRow(
		`INSERT INTO players (username, password_hash, role, is_active)
		 VALUES ($1, $2, 'player', TRUE)
		 RETURNING id`,
		username, passwordHash,
	).Scan(&playerID)
	if err != nil {
		return 0, 0, err
	}

	var walletID int
	err = tx.QueryRow(
		`INSERT INTO wallets (player_id, balance_cents)
		 VALUES ($1, 0)
		 RETURNING wallet_id`,
		playerID,
	).Scan(&walletID)
	if err != nil {
		return 0, 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, 0, err
	}
	return playerID, walletID, nil
}

// GetWalletByPlayerID fetches a player's wallet summary.
func GetWalletByPlayerID(playerID int) (*models.WalletSummary, error) {
	var w models.WalletSummary
	err := Conn.QueryRow(
		`SELECT w.wallet_id, p.id, p.username, p.role, w.balance_cents, w.version, w.updated_at
		 FROM wallets w
		 JOIN players p ON p.id = w.player_id
		 WHERE p.id = $1`,
		playerID,
	).Scan(&w.WalletID, &w.PlayerID, &w.Username, &w.Role, &w.BalanceCents, &w.Version, &w.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrPlayerNotFound
	}
	if err != nil {
		return nil, err
	}
	return &w, nil
}

// AdjustWalletAtomic performs a row-locked balance update and appends an immutable wallet_ledger row.
func AdjustWalletAtomic(
	playerID int,
	deltaCents int64,
	entryType string,
	gameMode *string,
	sessionID *int64,
	issuedByPlayerID *int,
	note *string,
) (int64, error) {
	tx, err := Conn.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	var walletID int
	var currentBalance int64
	err = tx.QueryRow(
		`SELECT wallet_id, balance_cents FROM wallets WHERE player_id = $1 FOR UPDATE`,
		playerID,
	).Scan(&walletID, &currentBalance)
	if err == sql.ErrNoRows {
		return 0, ErrPlayerNotFound
	}
	if err != nil {
		return 0, err
	}

	newBalance := currentBalance + deltaCents
	if newBalance < 0 {
		return currentBalance, ErrInsufficientFunds
	}

	_, err = tx.Exec(
		`UPDATE wallets
		 SET balance_cents = $1, version = version + 1, updated_at = NOW()
		 WHERE wallet_id = $2`,
		newBalance, walletID,
	)
	if err != nil {
		return 0, err
	}

	_, err = tx.Exec(
		`INSERT INTO wallet_ledger (
			wallet_id, entry_type, delta_cents, balance_after_cents,
			game_mode, session_id, issued_by_player_id, note
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		walletID, entryType, deltaCents, newBalance,
		gameMode, sessionID, issuedByPlayerID, note,
	)
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	return newBalance, nil
}

// VerifyHouseAdmin checks that a player ID exists and holds role='house_admin'.
func VerifyHouseAdmin(playerID int) error {
	var role string
	err := Conn.QueryRow(`SELECT role FROM players WHERE id = $1 AND is_active = TRUE`, playerID).Scan(&role)
	if err != nil || role != "house_admin" {
		return ErrUnauthorizedAdmin
	}
	return nil
}

// GetPlayerIDByUsername resolves a username to its player ID.
func GetPlayerIDByUsername(username string) (int, error) {
	var id int
	err := Conn.QueryRow(`SELECT id FROM players WHERE username = $1`, username).Scan(&id)
	if err == sql.ErrNoRows {
		return 0, ErrPlayerNotFound
	}
	return id, err
}

// GetWalletLedger returns the most recent ledger rows for a player.
func GetWalletLedger(playerID int, limit int) ([]models.LedgerEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	rows, err := Conn.Query(
		`SELECT l.ledger_id, l.wallet_id, l.entry_type, l.delta_cents, l.balance_after_cents,
		        l.game_mode, l.session_id, l.issued_by_player_id, l.note, l.created_at
		 FROM wallet_ledger l
		 JOIN wallets w ON w.wallet_id = l.wallet_id
		 WHERE w.player_id = $1
		 ORDER BY l.created_at DESC
		 LIMIT $2`,
		playerID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]models.LedgerEntry, 0)
	for rows.Next() {
		var e models.LedgerEntry
		if err := rows.Scan(
			&e.LedgerID, &e.WalletID, &e.EntryType, &e.DeltaCents, &e.BalanceAfterCents,
			&e.GameMode, &e.SessionID, &e.IssuedByPlayerID, &e.Note, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// ListAllPlayerWallets returns all players and their balances for the house_admin panel.
func ListAllPlayerWallets() ([]models.WalletSummary, error) {
	rows, err := Conn.Query(
		`SELECT w.wallet_id, p.id, p.username, p.role, w.balance_cents, w.version, w.updated_at
		 FROM players p
		 JOIN wallets w ON w.player_id = p.id
		 ORDER BY p.id ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.WalletSummary, 0)
	for rows.Next() {
		var w models.WalletSummary
		if err := rows.Scan(&w.WalletID, &w.PlayerID, &w.Username, &w.Role, &w.BalanceCents, &w.Version, &w.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, w)
	}
	return list, nil
}

// LoadSPConfigCache loads all Space Pirates rulesets, unit configs, resources, and cluster variants from PostgreSQL.
func LoadSPConfigCache() error {
	// 1. Ruleset (load first/default ruleset)
	var rs models.SPRuleset
	var multJSON []byte
	err := Conn.QueryRow(
		`SELECT ruleset_id, name, arena_width, arena_height, array_to_json(allowed_multipliers),
		        boss_expended_threshold, boss_escape_seconds, max_active_harvesters, target_cluster_count
		 FROM sp_rulesets ORDER BY ruleset_id ASC LIMIT 1`,
	).Scan(
		&rs.RulesetID, &rs.Name, &rs.ArenaWidth, &rs.ArenaHeight, &multJSON,
		&rs.BossExpendedThreshold, &rs.BossEscapeSeconds, &rs.MaxActiveHarvesters, &rs.TargetClusterCount,
	)
	if err != nil {
		return fmt.Errorf("load sp_rulesets: %w", err)
	}
	if err := json.Unmarshal(multJSON, &rs.AllowedMultipliers); err != nil {
		return fmt.Errorf("parse allowed_multipliers: %w", err)
	}

	// 2. Unit Configs
	unitMap := make(map[string]models.SPUnitConfig)
	uRows, err := Conn.Query(
		`SELECT unit_class, faction_role, weight_class, base_cost_cents, base_bounty_cents,
		        max_ammo, damage_per_shot, max_cooldown, shield_base, hull_base,
		        speed, turn_rate, projectile_speed, projectile_range, optimal_range,
		        proj_type, can_fire, fill_duration_seconds, cryo_radius, cryo_duration_seconds,
		        cryo_slow_factor, is_enabled
		 FROM sp_unit_configs WHERE is_enabled = TRUE`,
	)
	if err != nil {
		return fmt.Errorf("load sp_unit_configs: %w", err)
	}
	defer uRows.Close()

	for uRows.Next() {
		var u models.SPUnitConfig
		if err := uRows.Scan(
			&u.UnitClass, &u.FactionRole, &u.WeightClass, &u.BaseCostCents, &u.BaseBountyCents,
			&u.MaxAmmo, &u.DamagePerShot, &u.MaxCooldown, &u.ShieldBase, &u.HullBase,
			&u.Speed, &u.TurnRate, &u.ProjectileSpeed, &u.ProjectileRange, &u.OptimalRange,
			&u.ProjType, &u.CanFire, &u.FillDurationSeconds, &u.CryoRadius, &u.CryoDurationSeconds,
			&u.CryoSlowFactor, &u.IsEnabled,
		); err != nil {
			return err
		}
		unitMap[u.FactionRole+":"+u.UnitClass] = u
	}

	// 3. Resources
	resMap := make(map[string]models.SPResource)
	rRows, err := Conn.Query(
		`SELECT resource_key, enum_code, display_name, tier, harvester_unit_class,
		        max_cargo_bounty_cents, spawn_weight, color_hex
		 FROM sp_resources`,
	)
	if err != nil {
		return fmt.Errorf("load sp_resources: %w", err)
	}
	defer rRows.Close()

	for rRows.Next() {
		var res models.SPResource
		if err := rRows.Scan(
			&res.ResourceKey, &res.EnumCode, &res.DisplayName, &res.Tier, &res.HarvesterUnitClass,
			&res.MaxCargoBountyCents, &res.SpawnWeight, &res.ColorHex,
		); err != nil {
			return err
		}
		resMap[res.ResourceKey] = res
	}

	// 4. Cluster Variants
	clusters, err := GetAllClusterVariants(false)
	if err != nil {
		return fmt.Errorf("load sp_cluster_variants: %w", err)
	}

	SPCache.Mu.Lock()
	SPCache.Ruleset = rs
	SPCache.Units = unitMap
	SPCache.Resources = resMap
	SPCache.Clusters = clusters
	SPCache.Mu.Unlock()

	log.Printf("🏴‍☠️ Loaded Space Pirates DB config: %d units, %d resources, %d cluster variants",
		len(unitMap), len(resMap), len(clusters))
	return nil
}

// GetAllClusterVariants fetches asteroid cluster blueprints from PostgreSQL.
func GetAllClusterVariants(includeDisabled bool) ([]models.SPClusterVariant, error) {
	query := `SELECT variant_id, name, nodes_layout, bounding_radius, scale_min, scale_max,
	                 speed_min, speed_max, spin_rate, min_wraps, max_wraps,
	                 spawn_weight, max_concurrent, is_enabled
	          FROM sp_cluster_variants`
	if !includeDisabled {
		query += ` WHERE is_enabled = TRUE`
	}
	query += ` ORDER BY variant_id ASC`

	rows, err := Conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]models.SPClusterVariant, 0)
	for rows.Next() {
		var c models.SPClusterVariant
		var raw []byte
		if err := rows.Scan(
			&c.VariantID, &c.Name, &raw, &c.BoundingRadius, &c.ScaleMin, &c.ScaleMax,
			&c.SpeedMin, &c.SpeedMax, &c.SpinRate, &c.MinWraps, &c.MaxWraps,
			&c.SpawnWeight, &c.MaxConcurrent, &c.IsEnabled,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(raw, &c.NodesLayout)
		list = append(list, c)
	}
	return list, nil
}

// ComputeBoundingRadius calculates the exact enclosing radius for whole-cluster screen wrapping.
func ComputeBoundingRadius(nodes []models.ClusterNodeSpec) float64 {
	maxR := 60.0
	for _, n := range nodes {
		edge := math.Hypot(n.DX, n.DY) + n.Radius
		if edge > maxR {
			maxR = edge
		}
	}
	return math.Ceil(maxR)
}

// UpsertClusterVariant inserts or updates a cluster variant and refreshes the live cache.
func UpsertClusterVariant(c *models.SPClusterVariant) (int, error) {
	c.BoundingRadius = ComputeBoundingRadius(c.NodesLayout)
	layoutBytes, err := json.Marshal(c.NodesLayout)
	if err != nil {
		return 0, err
	}

	var id int
	if c.VariantID > 0 {
		err = Conn.QueryRow(
			`UPDATE sp_cluster_variants
			 SET name = $1, nodes_layout = $2, bounding_radius = $3,
			     scale_min = $4, scale_max = $5, speed_min = $6, speed_max = $7,
			     spin_rate = $8, min_wraps = $9, max_wraps = $10,
			     spawn_weight = $11, max_concurrent = $12, is_enabled = $13, updated_at = NOW()
			 WHERE variant_id = $14
			 RETURNING variant_id`,
			c.Name, layoutBytes, c.BoundingRadius,
			c.ScaleMin, c.ScaleMax, c.SpeedMin, c.SpeedMax,
			c.SpinRate, c.MinWraps, c.MaxWraps,
			c.SpawnWeight, c.MaxConcurrent, c.IsEnabled, c.VariantID,
		).Scan(&id)
	} else {
		err = Conn.QueryRow(
			`INSERT INTO sp_cluster_variants (
				name, nodes_layout, bounding_radius, scale_min, scale_max,
				speed_min, speed_max, spin_rate, min_wraps, max_wraps,
				spawn_weight, max_concurrent, is_enabled
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			RETURNING variant_id`,
			c.Name, layoutBytes, c.BoundingRadius,
			c.ScaleMin, c.ScaleMax, c.SpeedMin, c.SpeedMax,
			c.SpinRate, c.MinWraps, c.MaxWraps,
			c.SpawnWeight, c.MaxConcurrent, c.IsEnabled,
		).Scan(&id)
	}
	if err != nil {
		return 0, err
	}

	_ = LoadSPConfigCache()
	return id, nil
}

// DeleteClusterVariant removes a cluster variant and refreshes the live cache.
func DeleteClusterVariant(variantID int) error {
	_, err := Conn.Exec(`DELETE FROM sp_cluster_variants WHERE variant_id = $1`, variantID)
	if err != nil {
		return err
	}
	_ = LoadSPConfigCache()
	return nil
}
