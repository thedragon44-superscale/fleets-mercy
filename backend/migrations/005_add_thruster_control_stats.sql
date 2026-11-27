-- ============================================================================
-- Migration 005: Add Data-Driven Thruster Control Stats (unit_templates)
-- Idempotent migration (safe to run multiple times).
--
-- Adds:
--   - braking_thrust_power: Active counter-thrust / retro-braking multiplier
--     used when reversing direction (W->S, A->D), cancelling unpressed-axis
--     slip (W->D), or stabilizing lateral drift during sharp turns.
--   - inertial_damping: Active hands-off inertial dampener strength when no
--     movement keys are pressed, controlling smooth deceleration to (0, 0).
-- ============================================================================

BEGIN;

ALTER TABLE unit_templates
    ADD COLUMN IF NOT EXISTS braking_thrust_power DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    ADD COLUMN IF NOT EXISTS inertial_damping     DOUBLE PRECISION NOT NULL DEFAULT 1.0;

WITH thruster_baselines (
    unit_class,
    braking_thrust_power,
    inertial_damping
) AS (
    VALUES
        -- 1W: Interceptors, Probes & Light Transports (snappiest reversals & stops)
        ('viper_interceptor',      2.80, 1.50),
        ('ion_interceptor',        2.70, 1.50),
        ('recon_probe',            2.60, 1.45),
        ('phantom_transport',      2.30, 1.25),

        -- 2W: Gunships, Support Corvettes & Harvesters
        ('assault_gunship',        2.40, 1.30),
        ('aegis_repair',           2.20, 1.20),
        ('mining_barge',           1.85, 1.00),
        ('supply_tender',          1.90, 1.00),
        ('plasma_skimmer',         2.15, 1.15),
        ('grav_extractor',         1.80, 0.95),

        -- 3W: Escorts, Flak, Electronic Warfare & Minelayers
        ('command_escort',         2.15, 1.15),
        ('cryo_flak',              2.00, 1.05),
        ('specter_jammer',         2.15, 1.15),
        ('vortex_minelayer',       1.95, 1.00),

        -- 4W: Heavy Corvettes, Bombers & Stationary Turrets
        ('lancer_corvette',        1.90, 1.00),
        ('torpedo_bomber',         1.75, 0.90),
        ('gun_emplacement',        0.00, 0.00),

        -- 5W: Capital Ships & Heavy Walls (deliberate mass, still responsive)
        ('aegis_wall',             1.45, 0.75),
        ('battalion_command_ship', 1.60, 0.85),
        ('flagship',               1.70, 0.90),
        ('warp_frigate',           1.60, 0.85)
)
UPDATE unit_templates ut
SET
    braking_thrust_power = tb.braking_thrust_power,
    inertial_damping     = tb.inertial_damping
FROM thruster_baselines tb
WHERE ut.unit_class = tb.unit_class;

COMMIT;
