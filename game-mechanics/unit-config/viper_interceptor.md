# Unit Configuration: Viper Interceptor (`viper`)

## 1. Core Identification & General Stats
* **`unit_class`**: Viper Interceptor[cite: 46]
* **`weight_class`** (1W–5W): 1W (Ultra-Light / Scout)
* **`ai_default_state`**: SEEK (Light Dogfighter & Swarm Corral Unit)[cite: 46]
* **`vision_range`** (Meters): 600m (Standard visual screen range; relies on Recon units to spot targets further out)[cite: 46]
* **`aggro_range`** (Meters): 600m[cite: 46]
* **`aggro_threat_weight`**: 0.7
* **`retreat_morale_threshold`**: 0.0 (Fights to the death to maintain the corral; no retreat protocol)[cite: 46]
* **`squad_cohesion_leash_range`** (Meters): 150m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 100 HP (Unified Pool)[cite: 46]
* **`hull_base`** (HP): 50 HP (Unified Pool)[cite: 46]
* **`quadrant_shielding_enabled`**: false (Unified Pool; no directional quadrants)[cite: 46]
* **`quadrant_shield_pools_enabled`**: false[cite: 46]
* **`quadrant_hull_pools_enabled`**: false[cite: 46]
* **`shield_regen_rate`** (HP/sec): 10 HP/sec
* **`shield_recharge_delay_ticks`**: 30 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.05
* **`armor_hardness_rating`**: Rank D
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"twin_lasers": "standard", "engines": "standard"}[cite: 46]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 2.8 (Rank S Absolute Maximum / Extremely fast, outpacing the Flagship's max thruster boost)[cite: 46]
* **`strafing_speed`**: 2.5
* **`turn_rate`**: 4.5 (Very high turn rate and lateral acceleration for rapid directional changes)[cite: 46]
* **`angular_velocity`**: 4.0
* **`lateral_thrust_power`**: 2.5
* **`reverse_thrust_power`**: 2.0
* **`drift_coefficient`**: 0.15
* **`acceleration_curve`**: Snappy
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 60 DPS (Twin Light Lasers; 10 damage per hit at a fast 0.5s fire rate)[cite: 46]
* **`max_cooldown`** (Ticks): 10 Ticks
* **`projectile_range`** (Meters): 400m[cite: 46]
* **`projectile_speed`**: 600 m/s
* **`optimal_range`** (Meters): 300m
* **`max_range`** (Meters): 400m[cite: 46]
* **`engagement_range_cap`** (Meters): 400m[cite: 46]
* **`ammo_capacity`**: Infinite
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 5.0
* **`weapon_dispersion_bloom`**: 0.02
* **`projectile_tracking_capability`**: 0.9
* **`shield_penetration_factor`**: 0.0 (Shields take 100% of damage until depleted, then damage bleeds to hull)[cite: 46]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited
* **`barrel_cooling_duration`**: 0.5 seconds
* **`burst_salvo_cooldown`**: 10 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 100.0
* **`thermal_dissipation_rate`**: 20.0 / sec
* **`power_grid_allocation_weight`**: 0.6

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 0.4 (Ultra-Light dogfighter profile)
* **`sensor_resolution_tier`**: Standard visual screen range (600m; relies on Recon units to spot targets further out)[cite: 46]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.2s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
* **`requires_recon_telemetry`**: true (Relies on Recon units to spot targets further out)[cite: 46]
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
* **`special_utility_throughput`**: Swarm corrifing / "Cut the Pie" physical boxing to prevent enemy forward advancement[cite: 46].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Light Dogfighter & Swarm Corral Unit)[cite: 46]
* **`target_prioritization`**: Enemy advance vectors and strike units within engagement range.
* **`transition_triggers`**: 
  * Fights to the death to maintain the corral; no retreat protocol[cite: 46].
* **`spatial_loop`**: 
  * **Corral / "Cut the Pie" Loop**: Flies in at maximum speed until reaching weapons range, then aggressively strafes in a semi-circle directly in front of the enemy's forward trajectory, creating a physical wall of swarm fighters to box the enemy in and prevent forward advancement[cite: 46].
