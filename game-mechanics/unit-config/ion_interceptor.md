# Unit Configuration: Ion Disabler (`ion-disabler`)

## 1. Core Identification & General Stats
* **`unit_class`**: Ion Disabler[cite: 31]
* **`weight_class`** (1W–5W): 1W (Ultra-Light / Scout)[cite: 23, 32]
* **`ai_default_state`**: SEEK (Shield Striker, Subsystem Suppressor & Buddy Wingman)[cite: 31]
* **`vision_range`** (Meters): 500m[cite: 23, 31]
* **`aggro_range`** (Meters): 500m[cite: 31]
* **`aggro_threat_weight`**: 0.75
* **`retreat_morale_threshold`**: 0.0 (Fights to the death; no retreat once deployed)[cite: 31]
* **`squad_cohesion_leash_range`** (Meters): 150m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 23, 32]
* **`hull_base`** (HP): 100 HP (Rank D Hull)[cite: 23, 32]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 31]
* **`quadrant_shield_pools_enabled`**: false[cite: 31]
* **`quadrant_hull_pools_enabled`**: false[cite: 31]
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.05
* **`armor_hardness_rating`**: Rank D[cite: 23]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "ion_cannon": "standard"}[cite: 31]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.8 (Rank B Frigate Velocity / Responsive Thrusters)[cite: 23, 32]
* **`strafing_speed`**: 1.6
* **`turn_rate`**: 3.5
* **`angular_velocity`**: 3.0
* **`lateral_thrust_power`**: 2.0
* **`reverse_thrust_power`**: 1.5
* **`drift_coefficient`**: 0.2
* **`acceleration_curve`**: Snappy (High acceleration)[cite: 31]
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 40 DPS (Rank C / Focused Pulsed Ion Cannon, Rank S shield damage multiplier)[cite: 23, 31]
* **`max_cooldown`** (Ticks): 20 Ticks
* **`projectile_range`** (Meters): 500m[cite: 23, 31]
* **`projectile_speed`**: 400 m/s
* **`optimal_range`** (Meters): 400m
* **`max_range`** (Meters): 500m[cite: 23, 31]
* **`engagement_range_cap`** (Meters): 500m[cite: 23, 31]
* **`ammo_capacity`**: Infinite
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 5.0
* **`weapon_dispersion_bloom`**: 0.05
* **`projectile_tracking_capability`**: 0.9
* **`shield_penetration_factor`**: 1.0 (Rank S shield damage multiplier; melts energy shields almost instantly)[cite: 23, 31]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited
* **`barrel_cooling_duration`**: 1 second
* **`burst_salvo_cooldown`**: 20 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 150.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.8

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 0.5 (Ultra-Light profile)[cite: 32]
* **`sensor_resolution_tier`**: Standard visual range (500m); relies on Recon Probes, Fleet Array, or "Buddy" unit to acquire targets through Radar Fog[cite: 23, 31]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.3s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
* **`requires_recon_telemetry`**: true (Relies on Recon Probes or Fleet Array to acquire targets through Radar Fog)[cite: 31]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 10}}
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
* **`special_utility_throughput`**: Continuous hits temporarily freeze target's shield regeneration timer and disable secondary weapon turrets for 2 seconds[cite: 31].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Shield Striker & Buddy Wingman)[cite: 31]
* **`target_prioritization`**: 
  * **Squad Targeting Priority**: Scans its assigned squad for the unit with the highest Hull Damage output; automatically targets the specific enemy currently locked on by that squadmate to peel off its shields[cite: 31].
  * **"Buddy" Protocol**: If deployed outside of a squad or if sole surviving combatant, pairs with the unit possessing the highest Hull Damage in the entire fleet, shadowing its movements and stripping shields off its target[cite: 31].
* **`transition_triggers`**: 
  * As a 1W unit, once deployed, it fights to the death to support its squad or "Buddy" (no retreat protocol)[cite: 31].
* **`spatial_loop`**: Employs a Jousting / Boom-and-Zoom vector alongside its squad leader or "Buddy," charging in at max speed to unleash concentrated Ion salvos before circling wide[cite: 31].
