# Unit Configuration: Heavy Torpedo Bomber (`torpedo-bomber`)

## 1. Core Identification & General Stats
* **`unit_class`**: Heavy Torpedo Bomber[cite: 43]
* **`weight_class`** (1W–5W): 4W (Heavy / Capital Support)[cite: 31, 44]
* **`ai_default_state`**: SEEK (Capital-Cracking Siege Platform & Infrastructure Destroyer)[cite: 43]
* **`vision_range`** (Meters): 600m (Standard visual/telemetry range)[cite: 43, 44]
* **`aggro_range`** (Meters): 600m[cite: 43]
* **`aggro_threat_weight`**: 0.9
* **`retreat_morale_threshold`**: Critical threshold (disengages to seek the nearest active port or flagship drydock when compromised)[cite: 43]
* **`squad_cohesion_leash_range`** (Meters): 250m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 31, 44]
* **`hull_base`** (HP): 7,500 HP (Rank S Capital Hull; immensely thick capital hull)[cite: 31, 43, 44]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 43]
* **`quadrant_shield_pools_enabled`**: false[cite: 43]
* **`quadrant_hull_pools_enabled`**: false[cite: 43]
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.20
* **`armor_hardness_rating`**: Rank S[cite: 31]
* **`ablative_plating_durability`**: 200
* **`asymmetric_vulnerability_enabled`**: true (Once C-rank shields are busted, sniper units and flagships ruthlessly melt exposed hull)[cite: 43]
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"torpedo_bays": "standard", "capital_hull": "shield_gated_vulnerability"}[cite: 43]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 0.9 (Rank C Velocity / Heavy Cruising Speed & Slow Acceleration)[cite: 31, 43, 44]
* **`strafing_speed`**: 0.6
* **`turn_rate`**: 1.0
* **`angular_velocity`**: 0.8
* **`lateral_thrust_power`**: 0.6
* **`reverse_thrust_power`**: 0.5
* **`drift_coefficient`**: 0.6
* **`acceleration_curve`**: Sluggish
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 600 damage per torpedo volley (Rank A / Heavy Torpedo Bays, 2s cooldown)[cite: 31, 43]
* **`max_cooldown`** (Ticks): 120 Ticks (Strict 2-second cooldown between volleys)[cite: 43]
* **`projectile_range`** (Meters): 600m[cite: 43, 44]
* **`projectile_speed`**: 250 m/s
* **`optimal_range`** (Meters): 500m
* **`max_range`** (Meters): 600m[cite: 43, 44]
* **`engagement_range_cap`** (Meters): 600m[cite: 43, 44]
* **`ammo_capacity`**: Finite ammunition (supplied by Supply Tenders using a small, balanced mix of ore, isotopes, and plasma gas)[cite: 43]
* **`initial_ordnance_capacity`**: 100%[cite: 43]
* **`turret_traverse_speed`**: 1.5
* **`weapon_dispersion_bloom`**: 0.10
* **`projectile_tracking_capability`**: 0.85
* **`shield_penetration_factor`**: 0.1 (Low shield damage; requires shields to be stripped before high-explosive payloads inflict devastating structural hull damage)[cite: 43]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Burst-fire salvo[cite: 43]
* **`barrel_cooling_duration`**: 2 seconds[cite: 43]
* **`burst_salvo_cooldown`**: 120 Ticks[cite: 43]
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 400.0
* **`thermal_dissipation_rate`**: 25.0 / sec
* **`power_grid_allocation_weight`**: 0.9

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 4.0 (Heavy siege platform profile)[cite: 44]
* **`sensor_resolution_tier`**: Standard visual/telemetry range (600m); relies on external telemetry (Recon, Phantom relay beacons, or Command Ship data) for out-of-sight targeting[cite: 43, 44]
* **`jamming_susceptibility`**: 0.3
* **`target_lock_time`**: 1.0s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Payload cache refilled by Supply Tenders using ore, isotopes, and plasma gas)[cite: 43]
* **`requires_recon_telemetry`**: true (Relies on external telemetry for out-of-sight targeting)[cite: 43]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 50}}
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
* **`special_utility_throughput`**: Burst-fire torpedo volleys delivering heavy structural hull destruction against targets with stripped shields[cite: 43].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Capital-Cracking Siege Platform & Infrastructure Destroyer)[cite: 43]
* **`target_prioritization`**: High-value capital ships and installations with compromised energy shields.
* **`transition_triggers`**: 
  * Disengages to seek the nearest active port or flagship drydock when compromised[cite: 43].
  * Requests ordnance resupply from Supply Tenders when finite torpedo payloads run low[cite: 43].
* **`spatial_loop`**: 
  * **Bomb-Run AI Loop**: Plots approach vector -> executes rapid burst-fire torpedo salvo -> handles 2-second cooldown cycle while managing momentum -> loops back for resupply[cite: 43].
