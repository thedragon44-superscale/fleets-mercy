# Unit Configuration: Recon Probe (`recon`)

## 1. Core Identification & General Stats
* **`unit_class`**: Recon Probe[cite: 42]
* **`weight_class`** (1W–5W): 1W (Ultra-Light / Scout)[cite: 28, 42]
* **`ai_default_state`**: SEEK (Passive Forward Observer, Fleet Uplink & Topographical Scout)[cite: 42]
* **`vision_range`** (Meters): 2,500m (Extended Fleet Array / Recon radius)[cite: 28, 42]
* **`aggro_range`** (Meters): 2,500m[cite: 42]
* **`aggro_threat_weight`**: 0.1
* **`retreat_morale_threshold`**: 0.0 (Fights/scouts to the death; no retreat once deployed)[cite: 42]
* **`squad_cohesion_leash_range`** (Meters): 0 (Independent scout unit)

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 20 HP (Unified Pool; instantly destroyed on hit)[cite: 28, 42]
* **`hull_base`** (HP): 20 HP (Unified Pool; instantly destroyed on hit)[cite: 28, 42]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 42]
* **`quadrant_shield_pools_enabled`**: false[cite: 42]
* **`quadrant_hull_pools_enabled`**: false[cite: 42]
* **`shield_regen_rate`** (HP/sec): 0
* **`shield_recharge_delay_ticks`**: 0
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.0
* **`armor_hardness_rating`**: Rank D[cite: 28]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"entire_chassis": "instantly_destroyed_on_hit"}[cite: 28, 42]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 3.5 (Rank S Absolute Maximum / Absolute fastest unit in the fleet)[cite: 28, 42]
* **`strafing_speed`**: 3.5
* **`turn_rate`**: 5.0 (Maximum lateral acceleration; can reverse direction almost instantly)[cite: 42]
* **`angular_velocity`**: 5.0
* **`lateral_thrust_power`**: 3.0
* **`reverse_thrust_power`**: 3.0
* **`drift_coefficient`**: 0.1
* **`acceleration_curve`**: Instantaneous
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 0 (Unarmed)[cite: 28, 42]
* **`max_cooldown`** (Ticks): 0
* **`projectile_range`** (Meters): 0
* **`projectile_speed`**: N/A
* **`optimal_range`** (Meters): 0
* **`max_range`** (Meters): 0
* **`engagement_range_cap`** (Meters): 2,500m[cite: 42]
* **`ammo_capacity`**: 0
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 0
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 0.0
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 0
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 0.0
* **`thermal_dissipation_rate`**: 0.0 / sec
* **`power_grid_allocation_weight`**: 0.2 (Minimal power draw dedicated entirely to sensor arrays)

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 0.2 (Extremely small profile)[cite: 28]
* **`sensor_resolution_tier`**: Extended Fleet Array / Recon (2,500m radius illuminating obstacles and enemy unit weight class icons)[cite: 28, 42]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.1s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Provides vital radar telemetry and pathfinding uplink for harvesters and combat units)[cite: 42]
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: false (Instantly destroyed on hit)[cite: 28, 42]
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false
* **`special_utility_throughput`**: 2,500m detection radius rendering geometric obstacle shapes and unit weight class icons (1W, 2W, etc.) on HUD radar, powering economic/military uplinks[cite: 42].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Passive Forward Observer & Topographical Scout)[cite: 42]
* **`target_prioritization`**: Unexplored Radar Fog sectors during blind sweep; switches to celestial bodies, resource nodes, or enemy ships upon detection within its 2,500m bubble[cite: 42].
* **`transition_triggers`**: 
  * Fights (scouts) to the death; no retreat protocol[cite: 42].
  * If an enemy unit closes within 1,000m, overrides its orbit and flees directly away at maximum speed (3.5) until a safe distance is re-established[cite: 42].
* **`spatial_loop`**: 
  * **Blind Sweep & Anchor**: Flies outward in a sweeping search pattern through Radar Fog; reacts only when an entity breaches its 2,500m detection bubble[cite: 42].
  * **Orbiting & Permanent Anchors**: Once a target is found, anchors itself and maintains a distant, high-speed orbit (~1,800m away). Environmental obstacles and resource nodes act as permanent anchors (continuously illuminating even when depleted), while destroyed enemy ships prompt acquisition of new targets within range[cite: 42].
