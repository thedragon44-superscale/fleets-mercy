-- ============================================================================
-- Migration 003: Universal Map Metadata & Customizable Space Pirates Env Pool
-- Safe to run multiple times (idempotent DDL + WHERE NOT EXISTS backfill).
-- Zero starter maps are seeded: maps are purely authored in Universal Map Builder.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DEDICATED SPACE PIRATES SPAWN POOL WITH PER-ENTRY SPEED & WRAP OVERRIDES
--    Allows unlimited env_blueprints entries per ruleset.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sp_env_pool (
    pool_id        SERIAL PRIMARY KEY,
    ruleset_id     INT NOT NULL REFERENCES sp_rulesets(ruleset_id) ON DELETE CASCADE,
    blueprint_id   INT NOT NULL REFERENCES env_blueprints(blueprint_id) ON DELETE CASCADE,
    spawn_weight   INT NOT NULL DEFAULT 10 CHECK (spawn_weight > 0),
    max_concurrent SMALLINT NOT NULL DEFAULT 2 CHECK (max_concurrent > 0),
    scale_override DOUBLE PRECISION CHECK (scale_override IS NULL OR scale_override > 0),
    speed_min      DOUBLE PRECISION CHECK (speed_min IS NULL OR speed_min >= 0),
    speed_max      DOUBLE PRECISION CHECK (speed_max IS NULL OR speed_max >= 0),
    min_wraps      SMALLINT CHECK (min_wraps IS NULL OR min_wraps >= 0),
    max_wraps      SMALLINT CHECK (max_wraps IS NULL OR max_wraps >= 0),
    is_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_env_pool_lookup
    ON sp_env_pool (ruleset_id, is_enabled);

-- Idempotent one-time backfill from mode_env_pools (space_pirates) if sp_env_pool is empty
INSERT INTO sp_env_pool (
    ruleset_id, blueprint_id, spawn_weight, max_concurrent,
    scale_override, speed_min, speed_max, min_wraps, max_wraps, is_enabled
)
SELECT
    mep.ruleset_id,
    mep.blueprint_id,
    mep.spawn_weight,
    mep.max_concurrent,
    mep.scale_override,
    NULLIF((eb.motion_profile->>'speed_min')::double precision, 0),
    NULLIF((eb.motion_profile->>'speed_max')::double precision, 0),
    (eb.motion_profile->>'min_wraps')::smallint,
    (eb.motion_profile->>'max_wraps')::smallint,
    mep.is_enabled
FROM mode_env_pools mep
JOIN env_blueprints eb ON eb.blueprint_id = mep.blueprint_id
WHERE mep.game_mode = 'space_pirates'
  AND NOT EXISTS (
      SELECT 1 FROM sp_env_pool existing
      WHERE existing.ruleset_id = mep.ruleset_id
        AND existing.blueprint_id = mep.blueprint_id
  );

-- ----------------------------------------------------------------------------
-- 2. UNIVERSAL MAPS METADATA & PLACEMENT CASCADE SAFETY
--    Keeps existing maps(map_id, map_key, map_name, description, width, height)
--    canonical while adding updated_at for the Universal Map Builder.
-- ----------------------------------------------------------------------------

ALTER TABLE maps
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_map_env_placements_map
    ON map_env_placements (map_id);

COMMIT;
