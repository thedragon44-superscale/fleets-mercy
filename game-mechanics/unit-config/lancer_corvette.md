# Unit Configuration: Lancer Railgun Corvette (`lancer-corvette`)

## 1. Core Identification & General Stats
* **`unit_class`**: Lancer Railgun Corvette[cite: 33]
* **`weight_class`** (1W–5W): 4W (Heavy / Capital Support)[cite: 24, 34]
* **`ai_default_state`**: SEEK (Long-Range Anti-Armor Flagship & Strategic Asset Sniper)[cite: 33]
* **`vision_range`** (Meters): 2,500m (Extended Fleet Array / Recon telemetry)[cite: 24, 33, 34]
* **`aggro_range`** (Meters): 2,500m[cite: 24, 33]
* **`aggro_threat_weight`**: 0.95 (High priority high-value target eliminator)
* **`retreat_morale_threshold`**: Critical threshold (breaks position and returns to nearest active port vessel for repairs when health drops)[cite: 33]
* **`squad_cohesion_leash_range`** (Meters): 0 (Tethered exclusively to Flagship command telemetry; cannot be assigned to standard combat squads/battalions)[cite: 33]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 24, 34]
* **`hull_base`** (HP): 500 HP (Rank C Hull; hyper-streamlined needle chassis)[cite: 24, 33, 34]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 33]
* **`quadrant_shield_pools_enabled`**: false[cite: 33]
* **`quadrant_hull_pools_enabled`**: false[cite: 33]
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank C[cite: 24]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"acceleration_rails": "standard", "needle_chassis": "vulnerable"}[cite: 33]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Rank C Velocity / Medium Speed)[cite: 24, 33, 34]
* **`strafing_speed`**: 0.8
* **`turn_rate`**: 1.5
* **`angular_velocity`**: 1.2
* **`lateral_thrust_power`**: 0.8
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.5
* **`acceleration_curve`**: Standard
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 500 damage per slug (Rank A / Heavy Sub-Atomic Railgun Array, 10 slug cache)[cite: 24, 33]
* **`max_cooldown`** (Ticks): 90 Ticks
* **`projectile_range`** (Meters): 2,500m[cite: 24, 33]
* **`projectile_speed`**: 1,000 m/s (Linear acceleration rails)
* **`optimal_range`** (Meters): 2,000m
* **`max_range`** (Meters): 2,500m[cite: 24, 33]
* **`engagement_range_cap`** (Meters): 2,500m[cite: 24, 33]
* **`ammo_capacity`**: 10 Heavy Railgun Slugs (manufactured from a specialized blend of Plasma, Metal, and Exotic Crystals)[cite: 24, 33]
* **`initial_ordnance_capacity`**: 10 slugs (100%)[cite: 24, 33]
* **`turret_traverse_speed`**: 1.5
* **`weapon_dispersion_bloom`**: 0.01
* **`projectile_tracking_capability`**: 0.95
* **`shield_penetration_factor`**: 1.0 (Rank S armor-piercing single-target piercing damage designed to punch straight through major capital plating)[cite: 33]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (slug-limited)
* **`barrel_cooling_duration`**: 3 seconds
* **`burst_salvo_cooldown`**: 90 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 300.0
* **`thermal_dissipation_rate`**: 20.0 / sec
* **`power_grid_allocation_weight`**: 0.95

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.0 (Needle chassis profile)
* **`sensor_resolution_tier`**: Extended Fleet Array / Recon telemetry (calculates firing solutions far beyond standard visual bounds)[cite: 33]
* **`jamming_susceptibility`**: 0.2
* **`target_lock_time`**: 1.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Slug cache resupplied directly by Supply Units in the field holding necessary resources)[cite: 33]
* **`requires_recon_telemetry`**: true (Utilizes Fleet Array and Recon telemetry for sniper solutions)[cite: 33]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 40}}[cite: 33]
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: true

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Long-Range Anti-Armor Sniper)[cite: 33]
* **`target_prioritization`**: 
  * **Strict High-Value Targeting Matrix**: Completely ignores standard combat fodder, restricting firing solutions exclusively to Flagships, Battalion Command Vessels, Resource Harvesters, Supply Units, Recon Units, and Warp Units[cite: 33].
* **`transition_triggers`**: 
  * When health drops to critical thresholds, breaks position and returns to the nearest active port vessel for repairs[cite: 33].
  * When slug cache is depleted, convenes directly with a Supply Unit in the field to manufacture ammo[cite: 33].
* **`spatial_loop`**: Continuously micro-adjusts position to maintain clean line-of-sight on high-value targets while holding maximum standoff distance, preserving long-range distance rather than close-quarters brawling[cite: 33].
* **`deployment_rule`**: Exclusively tethered to Flagship command telemetry; cannot be assigned to standard squads/battalions and must be launched via the individual unit radial deployment wheel from Flagship bays[cite: 33].
