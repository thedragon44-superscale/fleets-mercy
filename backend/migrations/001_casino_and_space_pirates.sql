-- ============================================================================
-- Migration 001: Shared Casino Infrastructure & Space Pirates Schema
-- Safe to run multiple times (idempotent DDL + ON CONFLICT seed guards)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SHARED ACCOUNTS & HOUSE-ISSUED CURRENCY
-- ----------------------------------------------------------------------------

-- Extend existing players table with role-based access & account metadata
ALTER TABLE players
    ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'player',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'players_role_check'
    ) THEN
        ALTER TABLE players
            ADD CONSTRAINT players_role_check CHECK (role IN ('player', 'house_admin'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_username ON players (username);

-- One wallet per player (integer cents strictly >= 0, optimistic lock version)
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id      SERIAL PRIMARY KEY,
    player_id      INT NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
    balance_cents  BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    version        INT NOT NULL DEFAULT 1,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill $0.00 wallets for any existing player accounts
INSERT INTO wallets (player_id, balance_cents)
SELECT id, 0 FROM players
ON CONFLICT (player_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. SHARED CASINO TABLES & SESSION TRACKING
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS casino_tables (
    table_id    VARCHAR(64) PRIMARY KEY,
    game_mode   VARCHAR(64) NOT NULL,
    table_name  VARCHAR(128) NOT NULL,
    max_seats   SMALLINT NOT NULL DEFAULT 4 CHECK (max_seats > 0),
    ruleset_id  INT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS table_sessions (
    session_id              BIGSERIAL PRIMARY KEY,
    table_id                VARCHAR(64) NOT NULL REFERENCES casino_tables(table_id) ON DELETE RESTRICT,
    player_id               INT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    seat_index              SMALLINT NOT NULL,
    joined_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at                 TIMESTAMPTZ,
    starting_balance_cents  BIGINT NOT NULL,
    ending_balance_cents    BIGINT,
    total_wagered_cents     BIGINT NOT NULL DEFAULT 0,
    total_won_cents         BIGINT NOT NULL DEFAULT 0,
    units_deployed          INT NOT NULL DEFAULT 0,
    units_forfeited         INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_player ON table_sessions (player_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table  ON table_sessions (table_id, joined_at DESC);

-- Immutable double-entry-style audit log for every balance change
CREATE TABLE IF NOT EXISTS wallet_ledger (
    ledger_id            BIGSERIAL PRIMARY KEY,
    wallet_id            INT NOT NULL REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
    entry_type           VARCHAR(32) NOT NULL CHECK (
                             entry_type IN (
                                 'HOUSE_MINT',
                                 'HOUSE_REVOKE',
                                 'UNIT_DEPLOY',
                                 'KILL_PAYOUT',
                                 'SESSION_FORFEIT'
                             )
                         ),
    delta_cents          BIGINT NOT NULL,
    balance_after_cents  BIGINT NOT NULL CHECK (balance_after_cents >= 0),
    game_mode            VARCHAR(64),
    session_id           BIGINT REFERENCES table_sessions(session_id) ON DELETE SET NULL,
    issued_by_player_id  INT REFERENCES players(id) ON DELETE SET NULL,
    note                 TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet  ON wallet_ledger (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_session ON wallet_ledger (session_id);

-- ----------------------------------------------------------------------------
-- 3. SPACE PIRATES DATA-DRIVEN CONFIG TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sp_rulesets (
    ruleset_id              SERIAL PRIMARY KEY,
    name                    VARCHAR(100) NOT NULL UNIQUE,
    arena_width             DOUBLE PRECISION NOT NULL DEFAULT 2400.0,
    arena_height            DOUBLE PRECISION NOT NULL DEFAULT 1600.0,
    allowed_multipliers     SMALLINT[] NOT NULL DEFAULT ARRAY[1, 2, 5, 10, 25]::SMALLINT[],
    boss_expended_threshold INT NOT NULL DEFAULT 40 CHECK (boss_expended_threshold > 0),
    boss_escape_seconds     INT NOT NULL DEFAULT 50 CHECK (boss_escape_seconds > 0),
    max_active_harvesters   INT NOT NULL DEFAULT 8 CHECK (max_active_harvesters > 0),
    target_cluster_count    INT NOT NULL DEFAULT 5 CHECK (target_cluster_count > 0),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sp_unit_configs (
    unit_class             VARCHAR(64) NOT NULL,
    faction_role           VARCHAR(32) NOT NULL CHECK (
                               faction_role IN ('player', 'house_harvester', 'house_escort', 'house_boss')
                           ),
    weight_class           SMALLINT NOT NULL DEFAULT 1 CHECK (weight_class BETWEEN 1 AND 5),
    base_cost_cents        BIGINT NOT NULL DEFAULT 0 CHECK (base_cost_cents >= 0),
    base_bounty_cents      BIGINT NOT NULL DEFAULT 0 CHECK (base_bounty_cents >= 0),
    max_ammo               INT NOT NULL DEFAULT -1,
    damage_per_shot        DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_cooldown           INT NOT NULL DEFAULT 15,
    shield_base            DOUBLE PRECISION NOT NULL DEFAULT 1000,
    hull_base              DOUBLE PRECISION NOT NULL DEFAULT 1000,
    speed                  DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    turn_rate              DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    projectile_speed       DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    projectile_range       DOUBLE PRECISION NOT NULL DEFAULT 600.0,
    optimal_range          DOUBLE PRECISION NOT NULL DEFAULT 400.0,
    proj_type              VARCHAR(32) NOT NULL DEFAULT 'laser',
    can_fire               BOOLEAN NOT NULL DEFAULT TRUE,
    fill_duration_seconds  INT NOT NULL DEFAULT 0,
    cryo_radius            DOUBLE PRECISION NOT NULL DEFAULT 0,
    cryo_duration_seconds  DOUBLE PRECISION NOT NULL DEFAULT 0,
    cryo_slow_factor       DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (unit_class, faction_role)
);

CREATE TABLE IF NOT EXISTS sp_resources (
    resource_key           VARCHAR(32) PRIMARY KEY,
    enum_code              SMALLINT NOT NULL UNIQUE, -- Matches SpacePirates.ResourceType (1..5)
    display_name           VARCHAR(64) NOT NULL,
    tier                   VARCHAR(16) NOT NULL CHECK (tier IN ('common', 'mid', 'rare')),
    harvester_unit_class   VARCHAR(64) NOT NULL,
    max_cargo_bounty_cents BIGINT NOT NULL CHECK (max_cargo_bounty_cents >= 0),
    spawn_weight           INT NOT NULL DEFAULT 10 CHECK (spawn_weight > 0),
    color_hex              VARCHAR(16) NOT NULL
);

CREATE TABLE IF NOT EXISTS sp_cluster_variants (
    variant_id       SERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL UNIQUE,
    nodes_layout     JSONB NOT NULL, -- [{dx, dy, radius, is_node, slot_tier, pinned_resource}]
    bounding_radius  DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    scale_min        DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    scale_max        DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    speed_min        DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    speed_max        DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    spin_rate        DOUBLE PRECISION NOT NULL DEFAULT 0.002,
    min_wraps        SMALLINT NOT NULL DEFAULT 2 CHECK (min_wraps >= 0),
    max_wraps        SMALLINT NOT NULL DEFAULT 3 CHECK (max_wraps >= min_wraps),
    spawn_weight     INT NOT NULL DEFAULT 10 CHECK (spawn_weight > 0),
    max_concurrent   SMALLINT NOT NULL DEFAULT 2 CHECK (max_concurrent > 0),
    is_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. SEED DATA (SPACE PIRATES DEFAULT RULESET, TABLE, RESOURCES, UNITS, CLUSTERS)
-- ----------------------------------------------------------------------------

INSERT INTO sp_rulesets (
    name, arena_width, arena_height, allowed_multipliers,
    boss_expended_threshold, boss_escape_seconds, max_active_harvesters, target_cluster_count
) VALUES (
    'Standard Pit', 2400.0, 1600.0, ARRAY[1, 2, 5, 10, 25]::SMALLINT[],
    40, 50, 8, 5
) ON CONFLICT (name) DO NOTHING;

INSERT INTO casino_tables (table_id, game_mode, table_name, max_seats, ruleset_id)
SELECT 'sp-table-1', 'space_pirates', 'Space Pirates — Pit #1', 4, ruleset_id
FROM sp_rulesets WHERE name = 'Standard Pit'
ON CONFLICT (table_id) DO NOTHING;

-- 5-Tier Resource Hierarchy (enum_code aligns 1:1 with schemas/space_pirates.fbs)
INSERT INTO sp_resources (
    resource_key, enum_code, display_name, tier, harvester_unit_class, max_cargo_bounty_cents, spawn_weight, color_hex
) VALUES
    ('metal',         1, 'Metal',         'common', 'mining_barge',   50,  40, '#94a3b8'),
    ('ore',           2, 'Ore',           'common', 'mining_barge',   75,  30, '#d97706'),
    ('isotope',       3, 'Isotope',       'mid',    'plasma_skimmer', 100, 18, '#22c55e'),
    ('plasma_gas',    4, 'Plasma Gas',    'mid',    'plasma_skimmer', 125, 12, '#a855f7'),
    ('graviton_core', 5, 'Graviton Core', 'rare',   'grav_extractor', 150, 8,  '#38bdf8')
ON CONFLICT (resource_key) DO NOTHING;

-- Player Combat Roster (1W -> 5W)
INSERT INTO sp_unit_configs (
    unit_class, faction_role, weight_class, base_cost_cents, base_bounty_cents,
    max_ammo, damage_per_shot, max_cooldown, shield_base, hull_base,
    speed, turn_rate, projectile_speed, projectile_range, optimal_range,
    proj_type, can_fire, fill_duration_seconds, cryo_radius, cryo_duration_seconds, cryo_slow_factor
) VALUES
    ('viper_interceptor', 'player', 1, 10,  0, 30, 40,   10, 1200, 800,  4.2, 0.18, 22.0, 550.0, 320.0, 'laser',   TRUE, 0, 0,  0, 0),
    ('assault_gunship',   'player', 2, 25,  0, 20, 150,  16, 2400, 1600, 3.1, 0.13, 18.0, 650.0, 400.0, 'laser',   TRUE, 0, 0,  0, 0),
    ('cryo_flak',         'player', 3, 50,  0, 12, 450,  38, 3200, 2400, 2.4, 0.10, 15.0, 620.0, 420.0, 'cryo',    TRUE, 0, 85, 6, 0.45),
    ('torpedo_bomber',    'player', 4, 75,  0, 6,  1500, 55, 3600, 3200, 2.1, 0.09, 13.0, 750.0, 520.0, 'torpedo', TRUE, 0, 0,  0, 0),
    ('flagship',          'player', 5, 100, 0, 4,  3000, 65, 6500, 4500, 1.6, 0.07, 20.0, 850.0, 600.0, 'railgun', TRUE, 0, 0,  0, 0)
ON CONFLICT (unit_class, faction_role) DO NOTHING;

-- House Roster (Harvesters, Escorts, Jackpot Boss)
INSERT INTO sp_unit_configs (
    unit_class, faction_role, weight_class, base_cost_cents, base_bounty_cents,
    max_ammo, damage_per_shot, max_cooldown, shield_base, hull_base,
    speed, turn_rate, projectile_speed, projectile_range, optimal_range,
    proj_type, can_fire, fill_duration_seconds, cryo_radius, cryo_duration_seconds, cryo_slow_factor
) VALUES
    ('mining_barge',      'house_harvester', 2, 0, 5,   -1, 0,   0,  1500,  3000,  1.5, 0.08, 0.0,  0.0,   0.0,   'none',    FALSE, 30, 0, 0, 0),
    ('plasma_skimmer',    'house_harvester', 2, 0, 10,  -1, 0,   0,  4000,  5000,  1.8, 0.09, 0.0,  0.0,   0.0,   'none',    FALSE, 45, 0, 0, 0),
    ('grav_extractor',    'house_harvester', 3, 0, 25,  -1, 0,   0,  6000,  8000,  1.3, 0.07, 0.0,  0.0,   0.0,   'none',    FALSE, 60, 0, 0, 0),
    ('viper_interceptor', 'house_escort',    1, 0, 15,  -1, 45,  14, 900,   900,   3.6, 0.16, 19.0, 500.0, 320.0, 'laser',   TRUE,  0,  0, 0, 0),
    ('command_escort',    'house_escort',    3, 0, 25,  -1, 90,  18, 1800,  1400,  2.3, 0.11, 21.0, 650.0, 420.0, 'railgun', TRUE,  0,  0, 0, 0),
    ('flagship',          'house_boss',      5, 0, 500, -1, 220, 20, 25000, 25000, 1.0, 0.05, 18.0, 750.0, 520.0, 'railgun', TRUE,  0,  0, 0, 0)
ON CONFLICT (unit_class, faction_role) DO NOTHING;

-- 3 Starter Asteroid Cluster Variants (editable later via ClusterEditorViewport)
INSERT INTO sp_cluster_variants (
    name, nodes_layout, bounding_radius, scale_min, scale_max,
    speed_min, speed_max, spin_rate, min_wraps, max_wraps, spawn_weight, max_concurrent
) VALUES
(
    'Scrap Drift Belt',
    '[
        {"dx": -90, "dy": -20, "radius": 34, "is_node": true,  "slot_tier": "common", "pinned_resource": null},
        {"dx":   0, "dy":  15, "radius": 42, "is_node": false, "slot_tier": null,     "pinned_resource": null},
        {"dx":  85, "dy": -10, "radius": 32, "is_node": true,  "slot_tier": "common", "pinned_resource": null},
        {"dx":  30, "dy":  70, "radius": 28, "is_node": false, "slot_tier": null,     "pinned_resource": null}
    ]'::jsonb,
    130.0, 0.85, 1.20, 0.30, 0.60, 0.0015, 2, 3, 40, 3
),
(
    'Crescent Isotope Cove',
    '[
        {"dx": -95, "dy": -55, "radius": 38, "is_node": false, "slot_tier": null,     "pinned_resource": null},
        {"dx": -45, "dy": -90, "radius": 44, "is_node": false, "slot_tier": null,     "pinned_resource": null},
        {"dx":  30, "dy": -85, "radius": 40, "is_node": false, "slot_tier": null,     "pinned_resource": null},
        {"dx":  90, "dy": -40, "radius": 36, "is_node": false, "slot_tier": null,     "pinned_resource": null},
        {"dx": -15, "dy":  15, "radius": 34, "is_node": true,  "slot_tier": "mid",    "pinned_resource": null},
        {"dx":  45, "dy":  35, "radius": 30, "is_node": true,  "slot_tier": "common", "pinned_resource": null}
    ]'::jsonb,
    145.0, 0.90, 1.15, 0.25, 0.50, 0.0020, 2, 3, 25, 2
),
(
    'Singularity Shard',
    '[
        {"dx":    0, "dy":    0, "radius": 40, "is_node": true,  "slot_tier": "rare", "pinned_resource": null},
        {"dx": -110, "dy":  -45, "radius": 46, "is_node": false, "slot_tier": null,   "pinned_resource": null},
        {"dx":  110, "dy":  -45, "radius": 46, "is_node": false, "slot_tier": null,   "pinned_resource": null},
        {"dx":    0, "dy":  115, "radius": 48, "is_node": false, "slot_tier": null,   "pinned_resource": null}
    ]'::jsonb,
    165.0, 0.95, 1.10, 0.20, 0.40, 0.0025, 1, 2, 10, 1
)
ON CONFLICT (name) DO NOTHING;

COMMIT;
