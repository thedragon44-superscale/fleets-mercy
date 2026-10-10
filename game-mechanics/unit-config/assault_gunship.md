# Unit Configuration: Assault Gunship (`assault-gunship`)

## 1. Core Identification & General Stats
* **`unit_class`**: Assault Gunship[cite: 13]
* **`weight_class`** (1W–5W): 2W[cite: 13]
* **`ai_default_state`**: SEEK (Strafing Run / Escort Harassment)[cite: 13]
* **`vision_range`** (Meters): 600m[cite: 13]
* **`aggro_range`** (Meters): 500m
* **`aggro_threat_weight`**: 0.7
* **`retreat_morale_threshold`**: 0.0 (Triggered strictly by Shield-Break Protocol)[cite: 13]
* **`squad_cohesion_leash_range`** (Meters): 300m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 13]
* **`hull_base`** (HP): 500 HP (Rank C Hull)[cite: 13]
* **`quadrant_shielding_enabled`**: false
* **`quadrant_shield_pools_enabled`**: false
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank C
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "forward_plating": "reinforced"}[cite: 13]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 2.5 (Rank A High Speed / High Acceleration)[cite: 13]
* **`strafing_speed`**: 2.2
* **`turn_rate`**: 3.0
* **`angular_velocity`**: 2.5
* **`lateral_thrust_power`**: 1.8
* **`reverse_thrust_power`**: 1.5
* **`drift_coefficient`**: 0.4
* **`acceleration_curve`**: Snappy
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 50 (Rank C / Twin Rotary Kinetic Cannons)[cite: 13]
* **`max_cooldown`** (Ticks): 5 Ticks
* **`projectile_range`** (Meters): 500m
* **`projectile_speed`**: 300 m/s
* **`optimal_range`** (Meters): 400m
* **`max_range`** (Meters): 500m
* **`engagement_range_cap`** (Meters): 500m
* **`ammo_capacity`**: Infinite (C-Rank standard magazine loop)[cite: 13]
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 4.0
* **`weapon_dispersion_bloom`**: 0.15
* **`projectile_tracking_capability`**: 0.8
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (Infinite supply)[cite: 13]
* **`barrel_cooling_duration`**: 3 seconds
* **`burst_salvo_cooldown`**: 5 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 200.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.6

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.0
* **`sensor_resolution_tier`**: Standard visual and telemetry range (600m), syncing with Recon arrays[cite: 13]
* **`jamming_susceptibility`**: 0.4
* **`target_lock_time`**: 0.4s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Resource independent, does not interact with supply units)[cite: 13]
* **`requires_recon_telemetry`**: true (Syncs with Recon arrays to pinpoint high-speed intersection vectors)[cite: 13]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 15}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Inertial Strafe Loop / Escort Harassment)[cite: 13]
* **`target_prioritization`**: High-speed intersection targets, enemy logistics, surface sub-components, and isolated units[cite: 13].
* **`transition_triggers`**: 
  * **Shield-Break Retreat Protocol**: The moment its unified pool's shields drop completely (shield break), it instantly aborts its attack vector, triggers emergency thrusters, and executes a mandatory retreat back to the nearest active repair vessel or port vessel for shield recharging and hull maintenance (does not interact with supply units)[cite: 13].
* **`spatial_loop`**: Executes high-velocity hit-and-run vector passes utilizing vector-thrust bow engines—sliding laterally while maintaining forward firing arcs to sweep past enemy lines without losing momentum[cite: 13].
