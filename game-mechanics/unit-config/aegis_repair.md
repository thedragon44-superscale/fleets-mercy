# Unit Configuration: Aegis Repair Corvette (`aegis-repair`)

## 1. Core Identification & General Stats
* **`unit_class`**: Aegis Repair Corvette[cite: 10]
* **`weight_class`** (1W–5W): 2W[cite: 11]
* **`ai_default_state`**: GUARD (Anchored Triage / Companion Tracking)[cite: 10]
* **`vision_range`** (Meters): 600m[cite: 10, 11]
* **`aggro_range`** (Meters): 600m (Matches operational triage bubble)
* **`aggro_threat_weight`**: 0.2 (Low priority target for enemy units due to unarmed support profile)
* **`retreat_morale_threshold`**: 0.0 (Never retreats; fights and heals to the death, breaking formation only when its internal resource cache is completely depleted)[cite: 10]
* **`squad_cohesion_leash_range`** (Meters): 150m (Maintains close orbit around its anchored companion or squad leader)

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 4,000 HP (Rank A Shields)[cite: 11]
* **`hull_base`** (HP): 100 HP (Rank D Hull; oversized generator protects the ship while its physical frame remains extremely fragile)[cite: 10, 11]
* **`quadrant_shielding_enabled`**: false (Operates on a high-capacity unified shield pool)[cite: 10]
* **`quadrant_shield_pools_enabled`**: false
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 40 HP/sec
* **`shield_recharge_delay_ticks`**: 60 Ticks
* **`directional_shield_arc`** (Degrees): 360 (Omnidirectional high-capacity shield bubble)
* **`armor_mitigation`**: 0.05
* **`armor_hardness_rating`**: Rank D
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: true (Actively orbits its target, positioning friendly units as physical cover ("meat-shielding") between itself and enemy combatants)[cite: 10]
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "generator": "vulnerable"}

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Rank C Velocity / Moderate speed)[cite: 10, 11]
* **`strafing_speed`**: 0.8
* **`turn_rate`**: 2.5
* **`angular_velocity`**: 1.8
* **`lateral_thrust_power`**: 1.2
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.3
* **`acceleration_curve`**: Linear
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false (Constantly orbits and repositions around its anchor target)[cite: 10]
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 0 (Rank D / Unarmed support vessel)[cite: 10, 11]
* **`max_cooldown`** (Ticks): 0
* **`projectile_range`** (Meters): 100m (Tether beam operational range)
* **`projectile_speed`**: N/A (Beam raycast)
* **`optimal_range`** (Meters): 50m
* **`max_range`** (Meters): 100m
* **`engagement_range_cap`** (Meters): 100m
* **`ammo_capacity`**: 0
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: N/A
* **`weapon_dispersion_bloom`**: 0
* **`projectile_tracking_capability`**: 1.0
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (Resource-dependent)
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: Continuous while within range and resources allow
* **`max_thermal_capacity`**: 100.0
* **`thermal_dissipation_rate`**: 5.0 / sec
* **`power_grid_allocation_weight`**: 0.8 (Heavy generator draw for repair tethers)

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 1.0 (Standard Corvette profile)
* **`sensor_resolution_tier`**: Closed-Loop Localized Network (strictly monitors the real-time structural and shield data of its specific anchored squad, battalion, or port ship; blind to wider fleet triage needs)[cite: 10]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Support / Logistics maintenance only)
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 10}, "capital_subsystem_repair": {"metal": 50, "exotic_crystals": 15, "rare_isotopes": 10}}[cite: 10, 11]
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
* **`special_utility_throughput`**: Dual Nanite Repair Beams at Rank S repair throughput (500 HP/sec), capable of restoring hull HP and bringing permanently shattered 0-HP shields back online[cite: 10, 11]
* **`resupply_behavior`**: When its internal cache runs dry, it temporarily breaks anchor, vectors to the nearest Supply Tender carrying necessary materials to refit its cache, and immediately returns to its anchored post[cite: 10].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Anchored Triage / Companion Tracking)[cite: 10]
* **`target_prioritization`**: Lowest structural or shield integrity within the specific anchored squad, battalion, or port ship[cite: 10].
* **`transition_triggers`**: 
  * Never retreats due to low health or combat pressure; fights and heals to the death[cite: 10].
  * If its internal resource cache runs completely depleted, temporarily breaks anchor to vector to the nearest Fleet Supply Tender, refits, and returns[cite: 10].
* **`spatial_loop`**: Trails slightly behind the anchored frontline, continuously orbiting and positioning friendly units as physical cover ("meat-shielding") while maintaining active nanite repair beam tethers[cite: 10].
