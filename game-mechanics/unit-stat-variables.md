# Unit Specification Master Worksheet

## 1. Core Identification & General Stats
* **`unit_class`**: 
* **`weight_class`** (1W–5W): 
* **`ai_default_state`**: 
* **`vision_range`** (Meters): 
* **`aggro_range`** (Meters): 
* **`aggro_threat_weight`**: 
* **`retreat_morale_threshold`**: 
* **`squad_cohesion_leash_range`** (Meters): 

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 
* **`hull_base`** (HP): 
* **`quadrant_shielding_enabled`** (true/false): 
* **`quadrant_shield_pools_enabled`** (true/false): 
* **`quadrant_hull_pools_enabled`** (true/false): 
* **`shield_regen_rate`** (HP/sec): 
* **`shield_recharge_delay_ticks`**: 
* **`directional_shield_arc`** (Degrees): 
* **`armor_mitigation`**: 
* **`armor_hardness_rating`**: 
* **`ablative_plating_durability`**: 
* **`asymmetric_vulnerability_enabled`** (true/false): 
* **`rear_hull_boost_scaling_enabled`** (true/false): 
* **`subsystem_vulnerability_mask`** (JSONB): 

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 
* **`strafing_speed`**: 
* **`turn_rate`**: 
* **`angular_velocity`**: 
* **`lateral_thrust_power`**: 
* **`reverse_thrust_power`**: 
* **`drift_coefficient`**: 
* **`acceleration_curve`**: 
* **`aft_quadrant_propulsion_penalty`** (true/false): 
* **`is_stationary_after_deployment`** (true/false): 
* **`is_stationary_landmark_bound`** (true/false): 

## 4. Combat Output & Ballistics
* **`dps`**: 
* **`max_cooldown`** (Ticks): 
* **`projectile_range`** (Meters): 
* **`projectile_speed`**: 
* **`optimal_range`** (Meters): 
* **`max_range`** (Meters): 
* **`engagement_range_cap`** (Meters): 
* **`ammo_capacity`**: 
* **`initial_ordnance_capacity`**: 
* **`turret_traverse_speed`**: 
* **`weapon_dispersion_bloom`**: 
* **`projectile_tracking_capability`**: 
* **`shield_penetration_factor`**: 
* **`front_quadrant_weapon_interlock`** (true/false): 
* **`sustained_fire_duration_limit`** / **`sustained_fire_limit_seconds`**: 
* **`barrel_cooling_duration`** / **`barrel_cooling_duration_seconds`**: 
* **`burst_salvo_cooldown`**: 
* **`beam_raycast_duration`**: 
* **`max_thermal_capacity`**: 
* **`thermal_dissipation_rate`**: 
* **`power_grid_allocation_weight`**: 

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 
* **`sensor_resolution_tier`**: 
* **`jamming_susceptibility`**: 
* **`target_lock_time`**: 
* **`radar_immunity_active`** (true/false): 
* **`shield_gated_stealth_threshold`**: 
* **`decloak_on_action_flag`** (true/false): 
* **`stealth_recovery_delay_seconds`**: 

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: 
* **`requires_recon_telemetry`** (true/false): 
* **`repair_resource_requirement_mask`** (JSONB): 
* **`requires_anchor_drone`** (true/false): 
* **`requires_recon_anchor`** (true/false): 
* **`port_docking_bay_status`** (true/false): 
* **`starboard_deployment_bay_status`** (true/false): 
* **`salvageable_upon_destruction`** (true/false): 
* **`cryo_gas_radius`**: 
* **`cryo_effect_duration`**: 
* **`graviton_vortex_duration`**: 
* **`warp_canister_capacity`**: 
* **`emergency_warp_evacuation_target`** (true/false):
