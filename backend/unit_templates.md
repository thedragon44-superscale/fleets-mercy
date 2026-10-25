### ⚙️ Core Identity & AI Defaults
* `unit_class` (character varying, Primary Key)
* `weight_class` (integer, Default: 1)
* `ai_default_state` (character varying)

---

### 🚀 Movement & Physics Dynamics
* `speed` (numeric)
* `strafing_speed` (numeric)
* `turn_rate` (numeric)
* `angular_velocity` (numeric)
* `lateral_thrust_power` (numeric)
* `reverse_thrust_power` (numeric)
* `drift_coefficient` (numeric)
* `acceleration_curve` (numeric)

---

### 🛡️ Vitals, Health & Shielding
* `shield_base` (numeric)
* `hull_base` (numeric)
* `shield_regen_rate` (numeric)
* `shield_recharge_delay_ticks` (integer, Default: 300)
* `armor_mitigation` (numeric)
* `armor_hardness_rating` (numeric)
* `ablative_plating_durability` (numeric)
* `quadrant_shielding_enabled` (boolean, Default: false)
* `quadrant_shield_pools_enabled` (boolean, Default: false)
* `quadrant_hull_pools_enabled` (boolean, Default: false)
* `directional_shield_arc` (numeric)
* `asymmetric_vulnerability_enabled` (boolean, Default: false)
* `rear_hull_boost_scaling_enabled` (boolean, Default: false)

---

### ⚔️ Combat, Weapons & Ballistics
* `dps` (double precision, Default: 50.0)
* `max_cooldown` (integer, Default: 0)
* `projectile_range` (numeric, Default: 600.0)
* `projectile_speed` (numeric, Default: 18.0)
* `optimal_range` (numeric, Default: 400.0)
* `max_range` (numeric, Default: 600.0)
* `engagement_range_cap` (numeric, Default: 600.0)
* `ammo_capacity` (integer, Default: -1)
* `initial_ordnance_capacity` (integer, Default: -1)
* `turret_traverse_speed` (numeric)
* `weapon_dispersion_bloom` (numeric)
* `projectile_tracking_capability` (numeric)
* `shield_penetration_factor` (numeric)
* `front_quadrant_weapon_interlock` (boolean, Default: false)
* `sustained_fire_limit_seconds` (numeric)
* `sustained_fire_duration_limit` (numeric)
* `barrel_cooling_duration` (numeric)
* `burst_salvo_cooldown` (numeric)
* `beam_raycast_duration` (numeric)

---

### 📡 Sensors, Radar & AI Control
* `vision_range` (integer, Default: 600)
* `aggro_range` (numeric)
* `aggro_threat_weight` (numeric)
* `squad_cohesion_leash_range` (numeric, Default: 500.0)
* `retreat_morale_threshold` (numeric)
* `jamming_susceptibility` (numeric)
* `target_lock_time` (numeric)
* `radar_immunity_active` (boolean, Default: false)
* `shield_gated_stealth_threshold` (numeric)
* `decloak_on_action_flag` (boolean, Default: true)
* `stealth_recovery_delay_seconds` (numeric, Default: 5.0)

---

### 🔋 Thermal & Power Infrastructure
* `max_thermal_capacity` (numeric, Default: 100.0)
* `thermal_dissipation_rate` (numeric, Default: 10.0)
* `power_grid_allocation_weight` (numeric, Default: 1.0)

---

### 🛠️ Logistics, Special Abilities & Infrastructure Flags
* `port_docking_bay_status` (boolean, Default: true)
* `starboard_deployment_bay_status` (boolean, Default: true)
* `resource_harvesting_type` (integer, Default: 0)
* `warp_canister_capacity` (integer, Default: 0)
* `requires_recon_telemetry` (boolean, Default: false)
* `requires_recon_anchor` (boolean, Default: false)
* `requires_anchor_drone` (boolean, Default: false)
* `is_stationary_after_deployment` (boolean, Default: false)
* `is_stationary_landmark_bound` (boolean, Default: false)
* `salvageable_upon_destruction` (boolean, Default: true)
* `emergency_warp_evacuation_target` (boolean, Default: false)
* `aft_quadrant_propulsion_penalty` (boolean, Default: false)
* `subsystem_vulnerability_mask` (jsonb)
* `repair_resource_requirement_mask` (jsonb)
* `cryo_gas_radius` (numeric)
* `cryo_effect_duration` (numeric)
* `graviton_vortex_duration` (numeric)
