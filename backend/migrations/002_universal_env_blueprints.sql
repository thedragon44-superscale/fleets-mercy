-- ============================================================================
-- Migration 002: Universal Environment Blueprints, Mode Pools & Map Placements
-- Safe to run multiple times (idempotent DDL + ON CONFLICT seed guards)
-- Does NOT modify or drop legacy sp_cluster_variants, maps, or TDM/Sandbox tables.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. GLOBAL COMPOSITE ENVIRONMENT BLUEPRINT LIBRARY
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS env_blueprints (
    blueprint_id      SERIAL PRIMARY KEY,
    name              VARCHAR(120) NOT NULL UNIQUE,
    object_type       VARCHAR(32) NOT NULL CHECK (
                          object_type IN (
                              'major_world',
                              'mineral_planetoid',
                              'gas_giant',
                              'nebula_field',
                              'singularity_rift',
                              'moon',
                              'asteroid_belt',
                              'asteroid_cluster',
                              'comet'
                          )
                      ),
    components        JSONB NOT NULL DEFAULT '[]'::jsonb,
    orbiting_children JSONB NOT NULL DEFAULT '[]'::jsonb,
    physics_profile   JSONB NOT NULL DEFAULT '{}'::jsonb,
    motion_profile    JSONB NOT NULL DEFAULT '{}'::jsonb,
    bounding_radius   DOUBLE PRECISION NOT NULL DEFAULT 120.0 CHECK (bounding_radius > 0),
    is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_env_blueprints_type ON env_blueprints (object_type, is_enabled);

-- ----------------------------------------------------------------------------
-- 2. DYNAMIC SPAWNER MODE POOLS (Space Pirates & Future Arcade Modes)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mode_env_pools (
    pool_id        SERIAL PRIMARY KEY,
    game_mode      VARCHAR(64) NOT NULL,
    ruleset_id     INT NOT NULL,
    blueprint_id   INT NOT NULL REFERENCES env_blueprints(blueprint_id) ON DELETE CASCADE,
    spawn_weight   INT NOT NULL DEFAULT 10 CHECK (spawn_weight > 0),
    max_concurrent SMALLINT NOT NULL DEFAULT 2 CHECK (max_concurrent > 0),
    scale_override DOUBLE PRECISION CHECK (scale_override IS NULL OR scale_override > 0),
    is_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (game_mode, ruleset_id, blueprint_id)
);

CREATE INDEX IF NOT EXISTS idx_mode_env_pools_lookup
    ON mode_env_pools (game_mode, ruleset_id, is_enabled);

-- ----------------------------------------------------------------------------
-- 3. AUTHORED MAP PLACEMENTS (Universal Map Builder for Sandbox, TDM & Casino)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS map_env_placements (
    placement_id        SERIAL PRIMARY KEY,
    map_id              INT NOT NULL REFERENCES maps(map_id) ON DELETE CASCADE,
    blueprint_id        INT NOT NULL REFERENCES env_blueprints(blueprint_id) ON DELETE RESTRICT,
    pos_x               DOUBLE PRECISION NOT NULL DEFAULT 0,
    pos_y               DOUBLE PRECISION NOT NULL DEFAULT 0,
    scale               DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (scale > 0),
    angle               DOUBLE PRECISION NOT NULL DEFAULT 0,
    vel_x               DOUBLE PRECISION NOT NULL DEFAULT 0,
    vel_y               DOUBLE PRECISION NOT NULL DEFAULT 0,
    parent_placement_id INT REFERENCES map_env_placements(placement_id) ON DELETE SET NULL,
    orbit_radius        DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (orbit_radius >= 0),
    orbit_speed         DOUBLE PRECISION NOT NULL DEFAULT 0,
    overrides           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_map_env_placements_map ON map_env_placements (map_id);

-- ----------------------------------------------------------------------------
-- 4. MIGRATE EXISTING sp_cluster_variants -> env_blueprints + mode_env_pools
-- ----------------------------------------------------------------------------

INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
)
SELECT
    v.name,
    'asteroid_cluster',
    COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',              'c' || ord::text,
                'kind',            CASE WHEN COALESCE((elem->>'is_node')::boolean, FALSE) THEN 'resource_node' ELSE 'solid_rock' END,
                'dx',              COALESCE((elem->>'dx')::double precision, 0),
                'dy',              COALESCE((elem->>'dy')::double precision, 0),
                'radius',          COALESCE((elem->>'radius')::double precision, 32),
                'inner_radius',    0,
                'is_node',         COALESCE((elem->>'is_node')::boolean, FALSE),
                'slot_tier',       COALESCE(elem->'slot_tier', 'null'::jsonb),
                'pinned_resource', COALESCE(elem->'pinned_resource', 'null'::jsonb),
                'color_hex',       NULL,
                'is_destructible', FALSE
            )
            ORDER BY ord
        )
        FROM jsonb_array_elements(v.nodes_layout) WITH ORDINALITY AS t(elem, ord)
    ), '[]'::jsonb),
    '[]'::jsonb,
    jsonb_build_object(
        'gravity_strength', 0,
        'gravity_radius', 0,
        'repulsion_strength', 0,
        'repulsion_radius', 0,
        'drag_factor', 0,
        'drag_max_weight', 0,
        'max_passable_weight', 0,
        'projectile_behavior', 'block',
        'refract_angle_rad', 0,
        'radar_opaque', FALSE,
        'visual_range_mult', 1.0,
        'immune_unit_classes', '[]'::jsonb
    ),
    jsonb_build_object(
        'mode', 'drift_wrap',
        'scale_min', v.scale_min,
        'scale_max', v.scale_max,
        'speed_min', v.speed_min,
        'speed_max', v.speed_max,
        'spin_rate', v.spin_rate,
        'min_wraps', v.min_wraps,
        'max_wraps', v.max_wraps,
        'transit_cooldown_seconds', 0
    ),
    v.bounding_radius,
    v.is_enabled
FROM sp_cluster_variants v
ON CONFLICT (name) DO NOTHING;

INSERT INTO mode_env_pools (
    game_mode, ruleset_id, blueprint_id, spawn_weight, max_concurrent, scale_override, is_enabled
)
SELECT
    'space_pirates',
    rs.ruleset_id,
    eb.blueprint_id,
    v.spawn_weight,
    v.max_concurrent,
    NULL,
    v.is_enabled
FROM sp_cluster_variants v
JOIN env_blueprints eb ON eb.name = v.name
CROSS JOIN (SELECT ruleset_id FROM sp_rulesets ORDER BY ruleset_id ASC LIMIT 1) rs
ON CONFLICT (game_mode, ruleset_id, blueprint_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. SEED STARTER BLUEPRINTS (1 PER NEW CELESTIAL ARCHETYPE)
-- ----------------------------------------------------------------------------

-- 06: Moon (seeded first so Major World can reference it in orbiting_children)
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
) VALUES (
    'Barren Sentinel Moon',
    'moon',
    '[
        {"id":"core","kind":"solid_core","dx":0,"dy":0,"radius":42,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#94a3b8","is_destructible":false},
        {"id":"crater1","kind":"crater_node","dx":24,"dy":-18,"radius":16,"inner_radius":0,"is_node":true,"slot_tier":"common","pinned_resource":null,"color_hex":"#cbd5e1","is_destructible":false}
    ]'::jsonb,
    '[]'::jsonb,
    '{
        "gravity_strength": 0.0,
        "gravity_radius": 0.0,
        "repulsion_strength": 0.0,
        "repulsion_radius": 0.0,
        "drag_factor": 0.0,
        "drag_max_weight": 0,
        "max_passable_weight": 0,
        "projectile_behavior": "block",
        "refract_angle_rad": 0.0,
        "radar_opaque": false,
        "visual_range_mult": 1.0,
        "immune_unit_classes": []
    }'::jsonb,
    '{
        "mode": "drift_wrap",
        "scale_min": 0.85,
        "scale_max": 1.15,
        "speed_min": 0.25,
        "speed_max": 0.45,
        "spin_rate": 0.0018,
        "min_wraps": 2,
        "max_wraps": 3,
        "transit_cooldown_seconds": 0
    }'::jsonb,
    60.0,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- 02: Mineral Planetoid
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
) VALUES (
    'Ironclad Planetoid',
    'mineral_planetoid',
    '[
        {"id":"core","kind":"solid_core","dx":0,"dy":0,"radius":76,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#78716c","is_destructible":false},
        {"id":"crater1","kind":"crater_node","dx":-52,"dy":-36,"radius":22,"inner_radius":0,"is_node":true,"slot_tier":"common","pinned_resource":null,"color_hex":"#d97706","is_destructible":false},
        {"id":"crater2","kind":"crater_node","dx":54,"dy":32,"radius":22,"inner_radius":0,"is_node":true,"slot_tier":"common","pinned_resource":null,"color_hex":"#94a3b8","is_destructible":false}
    ]'::jsonb,
    '[]'::jsonb,
    '{
        "gravity_strength": 0.045,
        "gravity_radius": 185.0,
        "repulsion_strength": 0.0,
        "repulsion_radius": 0.0,
        "drag_factor": 0.0,
        "drag_max_weight": 0,
        "max_passable_weight": 0,
        "projectile_behavior": "block",
        "refract_angle_rad": 0.0,
        "radar_opaque": false,
        "visual_range_mult": 1.0,
        "immune_unit_classes": []
    }'::jsonb,
    '{
        "mode": "drift_wrap",
        "scale_min": 0.90,
        "scale_max": 1.15,
        "speed_min": 0.18,
        "speed_max": 0.35,
        "spin_rate": 0.0012,
        "min_wraps": 2,
        "max_wraps": 3,
        "transit_cooldown_seconds": 0
    }'::jsonb,
    92.0,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- 04: Nebula Field (stealth lock-break + inertial drag on 1W-3W, plasma_skimmer immune)
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
) VALUES (
    'Cobalt Plasma Nebula',
    'nebula_field',
    '[
        {"id":"b1","kind":"nebula_blob","dx":-85,"dy":-25,"radius":88,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#7c3aed","is_destructible":false},
        {"id":"b2","kind":"nebula_blob","dx":10,"dy":15,"radius":102,"inner_radius":0,"is_node":true,"slot_tier":"mid","pinned_resource":null,"color_hex":"#a855f7","is_destructible":false},
        {"id":"b3","kind":"nebula_blob","dx":95,"dy":-18,"radius":84,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#22c55e","is_destructible":false},
        {"id":"b4","kind":"nebula_blob","dx":20,"dy":-68,"radius":72,"inner_radius":0,"is_node":true,"slot_tier":"mid","pinned_resource":null,"color_hex":"#22c55e","is_destructible":false}
    ]'::jsonb,
    '[]'::jsonb,
    '{
        "gravity_strength": 0.0,
        "gravity_radius": 0.0,
        "repulsion_strength": 0.0,
        "repulsion_radius": 0.0,
        "drag_factor": 0.35,
        "drag_max_weight": 3,
        "max_passable_weight": 5,
        "projectile_behavior": "pass",
        "refract_angle_rad": 0.0,
        "radar_opaque": true,
        "visual_range_mult": 0.5,
        "immune_unit_classes": ["plasma_skimmer"]
    }'::jsonb,
    '{
        "mode": "drift_wrap",
        "scale_min": 0.90,
        "scale_max": 1.20,
        "speed_min": 0.16,
        "speed_max": 0.32,
        "spin_rate": 0.0008,
        "min_wraps": 2,
        "max_wraps": 3,
        "transit_cooldown_seconds": 0
    }'::jsonb,
    185.0,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- 05: Singularity Rift (repulsion field + projectile refraction, grav_extractor immune)
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
) VALUES (
    'Void Singularity Rift',
    'singularity_rift',
    '[
        {"id":"field","kind":"rift_field","dx":0,"dy":0,"radius":165,"inner_radius":42,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#38bdf8","is_destructible":false},
        {"id":"core","kind":"rift_core","dx":0,"dy":0,"radius":42,"inner_radius":0,"is_node":true,"slot_tier":"rare","pinned_resource":"graviton_core","color_hex":"#0ea5e9","is_destructible":false}
    ]'::jsonb,
    '[]'::jsonb,
    '{
        "gravity_strength": 0.0,
        "gravity_radius": 0.0,
        "repulsion_strength": 0.14,
        "repulsion_radius": 165.0,
        "drag_factor": 0.0,
        "drag_max_weight": 0,
        "max_passable_weight": 5,
        "projectile_behavior": "refract",
        "refract_angle_rad": 0.45,
        "radar_opaque": false,
        "visual_range_mult": 1.0,
        "immune_unit_classes": ["grav_extractor"]
    }'::jsonb,
    '{
        "mode": "drift_wrap",
        "scale_min": 0.90,
        "scale_max": 1.10,
        "speed_min": 0.15,
        "speed_max": 0.30,
        "spin_rate": 0.004,
        "min_wraps": 1,
        "max_wraps": 2,
        "transit_cooldown_seconds": 0
    }'::jsonb,
    170.0,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- 07: Dense Asteroid Belt (non-mineable cover corridor, 1W/2W weave through, 3W+ blocked)
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
) VALUES (
    'Razor Corridor Belt',
    'asteroid_belt',
    '[
        {"id":"r1","kind":"solid_rock","dx":-125,"dy":-28,"radius":32,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#64748b","is_destructible":false},
        {"id":"r2","kind":"solid_rock","dx":-58,"dy":34,"radius":36,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#64748b","is_destructible":false},
        {"id":"r3","kind":"solid_rock","dx":0,"dy":-32,"radius":34,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#64748b","is_destructible":false},
        {"id":"r4","kind":"solid_rock","dx":64,"dy":28,"radius":38,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#64748b","is_destructible":false},
        {"id":"r5","kind":"solid_rock","dx":128,"dy":-22,"radius":30,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#64748b","is_destructible":false}
    ]'::jsonb,
    '[]'::jsonb,
    '{
        "gravity_strength": 0.0,
        "gravity_radius": 0.0,
        "repulsion_strength": 0.0,
        "repulsion_radius": 0.0,
        "drag_factor": 0.0,
        "drag_max_weight": 0,
        "max_passable_weight": 2,
        "projectile_behavior": "block",
        "refract_angle_rad": 0.0,
        "radar_opaque": false,
        "visual_range_mult": 1.0,
        "immune_unit_classes": []
    }'::jsonb,
    '{
        "mode": "drift_wrap",
        "scale_min": 0.90,
        "scale_max": 1.15,
        "speed_min": 0.22,
        "speed_max": 0.45,
        "spin_rate": 0.0012,
        "min_wraps": 2,
        "max_wraps": 3,
        "transit_cooldown_seconds": 0
    }'::jsonb,
    165.0,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- 09: Comet (periodic edge-to-edge high-speed transit hazard)
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
) VALUES (
    'Halcyon Hyper-Comet',
    'comet',
    '[
        {"id":"core","kind":"comet_core","dx":0,"dy":0,"radius":22,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#e0f2fe","is_destructible":false}
    ]'::jsonb,
    '[]'::jsonb,
    '{
        "gravity_strength": 0.0,
        "gravity_radius": 0.0,
        "repulsion_strength": 0.0,
        "repulsion_radius": 0.0,
        "drag_factor": 0.0,
        "drag_max_weight": 0,
        "max_passable_weight": 0,
        "projectile_behavior": "pass",
        "refract_angle_rad": 0.0,
        "radar_opaque": false,
        "visual_range_mult": 1.0,
        "immune_unit_classes": [],
        "impact_profile": {
            "melt_max_weight": 2,
            "heavy_damage": 3200.0,
            "shield_absorb_min_weight": 5
        }
    }'::jsonb,
    '{
        "mode": "transient_transit",
        "scale_min": 0.90,
        "scale_max": 1.15,
        "speed_min": 5.5,
        "speed_max": 7.0,
        "spin_rate": 0.04,
        "min_wraps": 0,
        "max_wraps": 0,
        "transit_cooldown_seconds": 28
    }'::jsonb,
    60.0,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- 03: Gas Giant (3 concentric envelopes; disabled by default in Space Pirates pool until toggled)
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
) VALUES (
    'Aether Gas Giant',
    'gas_giant',
    '[
        {"id":"outer","kind":"gas_outer","dx":0,"dy":0,"radius":220,"inner_radius":187,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#c084fc","is_destructible":false},
        {"id":"deep","kind":"gas_deep","dx":0,"dy":0,"radius":187,"inner_radius":132,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#7e22ce","is_destructible":false},
        {"id":"core","kind":"gas_core","dx":0,"dy":0,"radius":132,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#4c1d95","is_destructible":false},
        {"id":"skim1","kind":"resource_node","dx":-198,"dy":0,"radius":22,"inner_radius":0,"is_node":true,"slot_tier":"mid","pinned_resource":"plasma_gas","color_hex":"#a855f7","is_destructible":false},
        {"id":"skim2","kind":"resource_node","dx":198,"dy":0,"radius":22,"inner_radius":0,"is_node":true,"slot_tier":"mid","pinned_resource":"isotope","color_hex":"#22c55e","is_destructible":false}
    ]'::jsonb,
    '[]'::jsonb,
    '{
        "gravity_strength": 0.08,
        "gravity_radius": 240.0,
        "repulsion_strength": 0.0,
        "repulsion_radius": 0.0,
        "drag_factor": 0.30,
        "drag_max_weight": 5,
        "max_passable_weight": 5,
        "projectile_behavior": "pass",
        "refract_angle_rad": 0.0,
        "radar_opaque": true,
        "visual_range_mult": 0.5,
        "immune_unit_classes": [],
        "deep_dot_dps": 600.0,
        "deep_pull_weight_max": 1,
        "outer_drag_factor": 0.18,
        "outer_drag_min_weight": 2
    }'::jsonb,
    '{
        "mode": "drift_wrap",
        "scale_min": 0.85,
        "scale_max": 1.15,
        "speed_min": 0.12,
        "speed_max": 0.22,
        "spin_rate": 0.0006,
        "min_wraps": 1,
        "max_wraps": 2,
        "transit_cooldown_seconds": 0
    }'::jsonb,
    225.0,
    TRUE
) ON CONFLICT (name) DO NOTHING;

-- 01: Major World (solid core + inert cave_mouth sockets + orbiting moon; disabled by default in SP pool)
INSERT INTO env_blueprints (
    name, object_type, components, orbiting_children,
    physics_profile, motion_profile, bounding_radius, is_enabled
)
SELECT
    'Terran Bastion World',
    'major_world',
    '[
        {"id":"core","kind":"solid_core","dx":0,"dy":0,"radius":150,"inner_radius":0,"is_node":false,"slot_tier":null,"pinned_resource":null,"color_hex":"#2563eb","is_destructible":false},
        {"id":"cave1","kind":"cave_mouth","dx":-108,"dy":-74,"radius":26,"inner_radius":0,"is_node":true,"slot_tier":"common","pinned_resource":"ore","color_hex":"#d97706","is_destructible":false},
        {"id":"cave2","kind":"cave_mouth","dx":112,"dy":68,"radius":26,"inner_radius":0,"is_node":true,"slot_tier":"common","pinned_resource":"metal","color_hex":"#94a3b8","is_destructible":false}
    ]'::jsonb,
    COALESCE((
        SELECT jsonb_build_array(
            jsonb_build_object(
                'child_blueprint_id', m.blueprint_id,
                'orbit_radius', 250.0,
                'orbit_speed', 0.004,
                'start_angle', 0.6,
                'scale', 0.85
            )
        )
        FROM env_blueprints m WHERE m.name = 'Barren Sentinel Moon' LIMIT 1
    ), '[]'::jsonb),
    '{
        "gravity_strength": 0.11,
        "gravity_radius": 290.0,
        "repulsion_strength": 0.0,
        "repulsion_radius": 0.0,
        "drag_factor": 0.0,
        "drag_max_weight": 0,
        "max_passable_weight": 0,
        "projectile_behavior": "block",
        "refract_angle_rad": 0.0,
        "radar_opaque": false,
        "visual_range_mult": 1.0,
        "immune_unit_classes": []
    }'::jsonb,
    '{
        "mode": "drift_wrap",
        "scale_min": 0.85,
        "scale_max": 1.10,
        "speed_min": 0.10,
        "speed_max": 0.18,
        "spin_rate": 0.0005,
        "min_wraps": 1,
        "max_wraps": 2,
        "transit_cooldown_seconds": 0
    }'::jsonb,
    290.0,
    TRUE
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. SEED SPACE PIRATES mode_env_pools FOR NEW ARCHETYPES
--    (Gas Giant & Major World start disabled with proportional scale_override)
-- ----------------------------------------------------------------------------

INSERT INTO mode_env_pools (
    game_mode, ruleset_id, blueprint_id, spawn_weight, max_concurrent, scale_override, is_enabled
)
SELECT
    'space_pirates',
    rs.ruleset_id,
    eb.blueprint_id,
    cfg.spawn_weight,
    cfg.max_concurrent,
    cfg.scale_override,
    cfg.is_enabled
FROM (VALUES
    ('Ironclad Planetoid',   18, 2, NULL::double precision, TRUE),
    ('Cobalt Plasma Nebula', 16, 2, NULL::double precision, TRUE),
    ('Void Singularity Rift',10, 1, NULL::double precision, TRUE),
    ('Razor Corridor Belt',  15, 2, NULL::double precision, TRUE),
    ('Barren Sentinel Moon', 10, 2, NULL::double precision, TRUE),
    ('Halcyon Hyper-Comet',  12, 1, NULL::double precision, TRUE),
    ('Aether Gas Giant',      6, 1, 0.65::double precision, FALSE),
    ('Terran Bastion World',  5, 1, 0.60::double precision, FALSE)
) AS cfg(name, spawn_weight, max_concurrent, scale_override, is_enabled)
JOIN env_blueprints eb ON eb.name = cfg.name
CROSS JOIN (SELECT ruleset_id FROM sp_rulesets ORDER BY ruleset_id ASC LIMIT 1) rs
ON CONFLICT (game_mode, ruleset_id, blueprint_id) DO NOTHING;

COMMIT;
