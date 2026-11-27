-- ============================================================================
-- Migration 004: Normalize Unit Movement & Rotation Baselines (unit_templates)
-- Safe to run multiple times (idempotent UPDATE by unit_class).
--
-- Fixes legacy per-tick turn_rate values (0.05 rad/tick -> rad/s), overly low
-- capital angular_velocity values (e.g. flagship 0.10 rad/s^2), zeroed
-- acceleration_curve/drift_coefficient fields, and oversized strafing_speed /
-- lateral_thrust_power multipliers that caused sideways thrust to overpower W.
-- ============================================================================

BEGIN;

WITH normalized_baselines (
    unit_class,
    speed,
    strafing_speed,
    turn_rate,
    angular_velocity,
    lateral_thrust_power,
    reverse_thrust_power,
    drift_coefficient,
    acceleration_curve
) AS (
    VALUES
        -- 1W: Interceptors, Probes & Light Transports (fast, snappy rotation)
        ('viper_interceptor',      2.00, 1.75, 9.00, 15.00, 1.00, 0.75, 0.30, 1.20),
        ('ion_interceptor',        1.80, 1.50, 8.00, 14.00, 0.95, 0.75, 0.25, 1.10),
        ('recon_probe',            2.40, 1.90, 7.50, 14.00, 1.00, 0.70, 0.25, 1.15),
        ('phantom_transport',      1.60, 1.25, 6.00, 12.00, 0.85, 0.70, 0.35, 1.00),

        -- 2W: Gunships, Support Corvettes & Harvesters
        ('assault_gunship',        1.60, 1.30, 6.00, 12.00, 0.95, 0.75, 0.35, 1.05),
        ('aegis_repair',           1.50, 1.15, 5.20, 11.00, 0.85, 0.70, 0.35, 0.95),
        ('mining_barge',           1.10, 0.80, 4.00,  9.00, 0.75, 0.65, 0.45, 0.85),
        ('supply_tender',          1.15, 0.85, 4.20,  9.50, 0.75, 0.65, 0.45, 0.85),
        ('plasma_skimmer',         1.20, 0.95, 5.00, 11.00, 0.85, 0.70, 0.35, 0.95),
        ('grav_extractor',         1.05, 0.75, 3.80,  8.50, 0.70, 0.60, 0.50, 0.85),

        -- 3W: Escorts, Flak, Electronic Warfare & Minelayers
        ('command_escort',         1.50, 1.15, 4.50, 10.50, 0.85, 0.70, 0.40, 0.95),
        ('cryo_flak',              1.25, 0.95, 4.00,  9.50, 0.80, 0.70, 0.40, 0.90),
        ('specter_jammer',         1.30, 1.05, 4.50, 10.50, 0.85, 0.70, 0.35, 0.95),
        ('vortex_minelayer',       1.20, 0.90, 3.80,  9.00, 0.80, 0.65, 0.45, 0.90),

        -- 4W: Heavy Corvettes, Bombers & Stationary Turrets
        ('lancer_corvette',        1.25, 0.90, 3.60,  9.00, 0.80, 0.75, 0.45, 0.90),
        ('torpedo_bomber',         1.05, 0.75, 3.00,  8.00, 0.70, 0.60, 0.50, 0.80),
        ('gun_emplacement',        0.00, 0.00, 3.80, 11.00, 0.00, 0.00, 0.00, 1.00),

        -- 5W: Capital Ships & Heavy Walls (deliberate mass, responsive aim)
        ('aegis_wall',             0.90, 0.60, 2.00,  6.00, 0.65, 0.55, 0.55, 0.75),
        ('battalion_command_ship', 1.30, 0.85, 2.40,  7.00, 0.70, 0.60, 0.55, 0.80),
        ('flagship',               1.40, 0.95, 2.60,  7.50, 0.75, 0.65, 0.50, 0.85),
        ('warp_frigate',           1.15, 0.80, 2.50,  7.00, 0.70, 0.60, 0.50, 0.80)
)
UPDATE unit_templates ut
SET
    speed                = nb.speed,
    strafing_speed       = nb.strafing_speed,
    turn_rate            = nb.turn_rate,
    angular_velocity     = nb.angular_velocity,
    lateral_thrust_power = nb.lateral_thrust_power,
    reverse_thrust_power = nb.reverse_thrust_power,
    drift_coefficient    = nb.drift_coefficient,
    acceleration_curve   = nb.acceleration_curve
FROM normalized_baselines nb
WHERE ut.unit_class = nb.unit_class;

COMMIT;
