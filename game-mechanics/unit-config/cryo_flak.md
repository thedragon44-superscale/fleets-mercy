# Unit Configuration: Cryo-Flak Frigate (`cryo-flak`)

## 1. Core Identification & General Stats
* **`unit_class`**: Cryo-Flak Frigate[cite: 19]
* **`weight_class`** (1W–5W): 3W (Medium / Frigate)[cite: 20]
* **`ai_default_state`**: GUARD (Anti-Swarm Area Denial, Tactical Interdiction & Screening Loop)[cite: 19]
* **`vision_range`** (Meters): 600m (Strict operational range tied to field of vision)[cite: 19, 20]
* **`aggro_range`** (Meters): 600m[cite: 19, 20]
* **`aggro_threat_weight`**: 0.75
* **`retreat_morale_threshold`**: Critical threshold (disengages to seek the nearest active port or flagship drydock when compromised)[cite: 19]
* **`squad_cohesion_leash_range`** (Meters): 250m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 1,500 HP (Rank B Shields)[cite: 20]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull)[cite: 20]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 19]
* **`quadrant_shield_pools_enabled`**: false[cite: 19]
* **`quadrant_hull_pools_enabled`**: false[cite: 19]
* **`shield_regen_rate`** (HP/sec): 30 HP/sec
* **`shield_recharge_delay_ticks`**: 60 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.15
* **`armor_hardness_rating`**: Rank B[cite: 20]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "flak_batteries": "standard"}

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.8 (Rank B Frigate Velocity / Moderate Acceleration & Standard Mobility)[cite: 19, 20]
* **`strafing_speed`**: 1.5
* **`turn_rate`**: 2.2 (Pivots smoothly to realign flak batteries)[cite: 19]
* **`angular_velocity`**: 1.8
* **`lateral_thrust_power`**: 1.2
* **`reverse_thrust_power`**: 1.0
* **`drift_coefficient`**: 0.4
* **`acceleration_curve`**: Standard
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 120 explosive equivalent (Rank B / Cryo-Flak Batteries)[cite: 19, 20]
* **`max_cooldown`** (Ticks): 45 Ticks
* **`projectile_range`** (Meters): 600m[cite: 19, 20]
* **`projectile_speed`**: 250 m/s
* **`optimal_range`** (Meters): 400m
* **`max_range`** (Meters): 600m[cite: 19, 20]
* **`engagement_range_cap`** (Meters): 600m[cite: 19, 20]
* **`ammo_capacity`**: Finite ammunition (manufactured from a mix of metal and volatile gas, resupplied by Supply Tenders)[cite: 19]
* **`initial_ordnance_capacity`**: 100%
* **`turret_traverse_speed`**: 3.5
* **`weapon_dispersion_bloom`**: 0.20
* **`projectile_tracking_capability`**: 0.9 (Precision proximity shells)[cite: 19]
* **`shield_penetration_factor`**: 1.0 (Bypasses shields entirely, inflicting Rank C hull damage directly to targets inside the cloud)[cite: 19]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 10 seconds
* **`barrel_cooling_duration`**: 2 seconds
* **`burst_salvo_cooldown`**: 45 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 250.0
* **`thermal_dissipation_rate`**: 20.0 / sec
* **`power_grid_allocation_weight`**: 0.75

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.5
* **`sensor_resolution_tier`**: Tactical Frigate Relay (Doubles as a passive radar relay for the fleet sensor array, extending telemetry and fog-of-war visibility)[cite: 19, 20]
* **`jamming_susceptibility`**: 0.3
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Resupplied by Supply Tenders with metal and volatile gas)[cite: 19]
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 30}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 75m[cite: 19]
* **`cryo_effect_duration`**: 10 seconds[cite: 19]
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: true
* **`special_utility_throughput`**: Cryo-gas cloud instantly shreds 1W units, slows enemy movement, increases cooldown/heat accumulation, and detonates incoming enemy torpedoes or unguided munitions on contact[cite: 19].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Anti-Swarm Area Denial & Escort Screening)[cite: 19]
* **`target_prioritization`**: Incoming swarms, torpedoes, and fast movers within its 600m visual zone[cite: 19].
* **`transition_triggers`**: 
  * Follows standard fleet retreat rules, disengaging to seek the nearest active port or flagship drydock when compromised[cite: 19].
  * Requests ammunition resupply from Supply Tenders when finite cryo payloads run low[cite: 19].
* **`spatial_loop`**: Operates as an escort frigate or localized area-denial anchor, automatically calculating trajectories of incoming threats and blanketing transit lanes with temporary cryo gas to disrupt enemy timing and protect friendly assets[cite: 19].
