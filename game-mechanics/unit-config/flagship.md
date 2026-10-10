# Unit Configuration: Command Dreadnought (Flagship) (`flagship`)

## 1. Core Identification & General Stats
* **`unit_class`**: Command Dreadnought (Flagship)[cite: 22]
* **`weight_class`** (1W–5W): 5W (Super-Heavy Capital)[cite: 17, 21]
* **`ai_default_state`**: COMMAND_RELAY (Mobile Command Center, Fleet Spawner & Primary Win/Loss Condition)[cite: 22]
* **`vision_range`** (Meters): 2,500m (Extended Fleet Array / Recon)[cite: 17, 21]
* **`aggro_range`** (Meters): 2,000m[cite: 22]
* **`aggro_threat_weight`**: 1.0 (Maximum primary target priority)
* **`retreat_morale_threshold`**: 0.0 (Core destruction triggers Match Lost)[cite: 22]
* **`squad_cohesion_leash_range`** (Meters): 500m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 10,000 HP total (2,500 per quadrant)[cite: 21, 22]
* **`hull_base`** (HP): 7,500 HP total (1,875 per quadrant for capital cores)[cite: 21, 22]
* **`quadrant_shielding_enabled`**: true[cite: 22]
* **`quadrant_shield_pools_enabled`**: true[cite: 22]
* **`quadrant_hull_pools_enabled`**: true[cite: 22]
* **`shield_regen_rate`** (HP/sec): 250 HP/sec
* **`shield_recharge_delay_ticks`**: 120 Ticks
* **`directional_shield_arc`** (Degrees): 360 (4 Quadrants)[cite: 22]
* **`armor_mitigation`**: 0.95 (95% flat damage mitigation applied to incoming fire only after a quadrant's shield has been stripped)[cite: 21, 22]
* **`armor_hardness_rating`**: Rank S[cite: 21]
* **`ablative_plating_durability`**: 500
* **`asymmetric_vulnerability_enabled`**: true[cite: 22]
* **`rear_hull_boost_scaling_enabled`**: true[cite: 22]
* **`subsystem_vulnerability_mask`**: {"core_hull": "match_lost", "front_hull": "match_lost", "rear_hull": "boost_disabled", "starboard_hull": "deployment_bay_offline", "port_hull": "docking_bay_offline"}[cite: 22]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Cruising velocity)[cite: 21, 22]
* **`strafing_speed`**: 1.0 (Crippled by 80% if Rear Hull is destroyed)[cite: 22]
* **`turn_rate`**: 0.5
* **`angular_velocity`**: 0.4
* **`lateral_thrust_power`**: 1.0
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.8
* **`acceleration_curve`**: Capital
* **`aft_quadrant_propulsion_penalty`**: true[cite: 22]
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false
* **`thruster_boost_multiplier`**: Up to 2.5x forward speed via Spacebar[cite: 22]
* **`boost_scaling_rule`**: Scales linearly with Rear Hull health (e.g., 2.5x at 1,875 HP; 1.75x at 937 HP)[cite: 22]

## 4. Combat Output & Ballistics
* **`dps`**: ~1,000 DPS (Piercing Core Beam)[cite: 21, 22]
* **`max_cooldown`** (Ticks): 10-second cooldown between bursts[cite: 21, 22]
* **`projectile_range`** (Meters): 2,000m (Extends into Radar Fog)[cite: 22]
* **`projectile_speed`**: Raycast Instant[cite: 22]
* **`optimal_range`** (Meters): 1,500m
* **`max_range`** (Meters): 2,000m[cite: 22]
* **`engagement_range_cap`** (Meters): 2,000m[cite: 22]
* **`ammo_capacity`**: Infinite (Energy beam core)
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: Mouse rotation dynamically follows cursor in real-time[cite: 22]
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 1.0 (Direct raycast sweep)[cite: 22]
* **`shield_penetration_factor`**: 1.0 (Overpenetration mechanism damages everything touching the raycast line)[cite: 22]
* **`front_quadrant_weapon_interlock`**: true (Front hull 0% permanently disables main cannon and triggers match loss)[cite: 22]
* **`sustained_fire_duration_limit`**: 3 seconds[cite: 21, 22]
* **`barrel_cooling_duration`**: 10 seconds[cite: 21, 22]
* **`burst_salvo_cooldown`**: 10 seconds[cite: 21, 22]
* **`beam_raycast_duration`**: 3 seconds continuous raycast[cite: 22]
* **`max_thermal_capacity`**: 1000.0
* **`thermal_dissipation_rate`**: 50.0 / sec
* **`power_grid_allocation_weight`**: 1.0

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 10.0 (Capital profile)
* **`sensor_resolution_tier`**: Extended Fleet Array / Recon (2,500m radius)[cite: 17, 21]
* **`jamming_susceptibility`**: 0.1
* **`target_lock_time`**: 1.0s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: Fleet Reserve Spawner and Command Hub[cite: 22]
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"external_repair_only": true, "metal_upkeep": 100}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: true (If 0%, Docking Bay offline; cannot recall deployed units for repairs or reserve refunds)[cite: 22]
* **`starboard_deployment_bay_status`**: true (If 0%, Deployment Bay offline; cannot spawn units from reserves)[cite: 22]
* **`salvageable_upon_destruction`**: false (Match lost)[cite: 22]
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false
* **`recall_protocols`**: Manual recall commands restricted strictly to Squads, Battalions, and Harvesting Units; individual standard combat units cannot be manually recalled[cite: 22].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: COMMAND_RELAY (Mobile Command Center & Fleet Spawner)[cite: 22]
* **`target_prioritization`**: Dynamic manual commander cursor tracking via Piercing Core Beam[cite: 22].
* **`transition_triggers`**: 
  * Core Hull or Front Hull reaching 0% triggers catastrophic ship destruction and Match Lost[cite: 22].
  * Quadrant shields absorb 100% incoming damage; if a quadrant shield hits 0%, it shatters permanently for the match[cite: 22].
* **`spatial_loop`**: Maintains capital mobility via cruising velocity and thruster boost scaling, managing unit deployment, docking recalls, and dynamic sector raycast sweeps[cite: 22].
