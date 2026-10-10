# Unit Configuration: Phantom Transport (`phantom`)

## 1. Core Identification & General Stats
* **`unit_class`**: Phantom Transport[cite: 36]
* **`weight_class`** (1W–5W): 1W (Ultra-Light / Scout)[cite: 26, 36]
* **`ai_default_state`**: SEEK (Stealth Infiltrator & Recon Hunter)[cite: 36]
* **`vision_range`** (Meters): 600m (Strict visual range for radar-invisible unit)[cite: 26, 36]
* **`aggro_range`** (Meters): 600m[cite: 36]
* **`aggro_threat_weight`**: 0.8
* **`retreat_morale_threshold`**: 0.0 (Fights to the death; no retreat once engaged)[cite: 36]
* **`squad_cohesion_leash_range`** (Meters): 200m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 1,500 HP (Rank B Unified Pool with Hull)[cite: 26, 36]
* **`hull_base`** (HP): 2,000 HP (Rank B Unified Pool with Shields)[cite: 26, 36]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 26, 36]
* **`quadrant_shield_pools_enabled`**: false[cite: 36]
* **`quadrant_hull_pools_enabled`**: false[cite: 36]
* **`shield_regen_rate`** (HP/sec): 30 HP/sec
* **`shield_recharge_delay_ticks`**: 60 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.15
* **`armor_hardness_rating`**: Rank B[cite: 26]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"cloaking_array": "standard", "pulse_cannon": "standard"}[cite: 36]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Rank C Velocity / Measured and deliberate)[cite: 26, 36]
* **`strafing_speed`**: 0.8
* **`turn_rate`**: 2.0
* **`angular_velocity`**: 1.8
* **`lateral_thrust_power`**: 1.0
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.3
* **`acceleration_curve`**: Standard
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 50 (Rank C / Anti-System Pulse Cannon & Sabotage Charge at point-blank range)[cite: 26, 36]
* **`max_cooldown`** (Ticks): 60 Ticks
* **`projectile_range`** (Meters): Point-blank / Short range[cite: 36]
* **`projectile_speed`**: 300 m/s
* **`optimal_range`** (Meters): 100m
* **`max_range`** (Meters): 200m
* **`engagement_range_cap`** (Meters): 600m[cite: 36]
* **`ammo_capacity`**: Infinite
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 3.0
* **`weapon_dispersion_bloom`**: 0.10
* **`projectile_tracking_capability`**: 0.8
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 5 seconds
* **`barrel_cooling_duration`**: 2 seconds
* **`burst_salvo_cooldown`**: 60 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 200.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.85

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 0.0 (Completely radar invisible under standard conditions)[cite: 26, 36]
* **`sensor_resolution_tier`**: Radar immune; visual detection only within strict 600m visual range[cite: 36]
* **`jamming_susceptibility`**: 0.0 (Immune)[cite: 36]
* **`target_lock_time`**: 0.2s
* **`radar_immunity_active`**: true[cite: 36]
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true (Radar shadow breaks if it takes damage, discharges weapons, or drops a payload)[cite: 36]
* **`stealth_recovery_delay_seconds`**: 5 seconds (Automatically recovers full radar immunity after 5 consecutive seconds of not taking damage, not firing, and not dropping payloads)[cite: 36]

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 15}}[cite: 36]
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
* **`special_utility_throughput`**: Complete radar immunity allowing stealth infiltration and sabotage strikes against enemy Recon Probes[cite: 36].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Stealth Infiltrator & Recon Hunter)[cite: 36]
* **`target_prioritization`**: Actively seeks out and targets enemy Recon Probes painted by the friendly fleet array[cite: 36].
* **`transition_triggers`**: 
  * Fights to the death once engaged (no retreat protocol)[cite: 36].
  * Decloaks and breaks radar immunity if taking damage, firing weapons, or dropping payloads; recovers cloak after 5 idle seconds[cite: 36].
* **`spatial_loop`**: Uses environmental obstacles (asteroids, structures) and stays outside enemy sightlines to remain completely undetected while stalking its target, utilizing point-blank ambush protocols since enemy Recon Probes cannot trigger evasion until the Phantom actively fires or takes damage[cite: 36].
