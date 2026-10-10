# Unit Configuration: Specter Radar Jammer (`specter-jammer`)

## 1. Core Identification & General Stats
* **`unit_class`**: Specter Radar Jammer[cite: 42]
* **`weight_class`** (1W–5W): 3W (Medium / Frigate)[cite: 43]
* **`ai_default_state`**: GUARD (Squad-Wide Electronic Concealment & Radar Disruption)[cite: 42]
* **`vision_range`** (Meters): 600m (Standard frigate-tier range)[cite: 42, 43]
* **`aggro_range`** (Meters): 600m[cite: 42]
* **`aggro_threat_weight`**: 0.7
* **`retreat_morale_threshold`**: Critical threshold (disengages to seek nearest active port or flagship drydock when compromised)[cite: 42]
* **`squad_cohesion_leash_range`** (Meters): 250m (Squadmates must remain within standard formation distance to maintain cloak)[cite: 42]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 4,000 HP (Rank A Shields)[cite: 43]
* **`hull_base`** (HP): 500 HP (Rank C Hull)[cite: 43]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 42]
* **`quadrant_shield_pools_enabled`**: false[cite: 42]
* **`quadrant_hull_pools_enabled`**: false[cite: 42]
* **`shield_regen_rate`** (HP/sec): 40 HP/sec
* **`shield_recharge_delay_ticks`**: 60 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank C[cite: 43]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "cloaking_array": "shield_gated"}[cite: 42]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.8 (Rank B Frigate Velocity / Moderate Acceleration & Standard Mobility)[cite: 42, 43]
* **`strafing_speed`**: 1.5
* **`turn_rate`**: 2.0
* **`angular_velocity`**: 1.8
* **`lateral_thrust_power`**: 1.2
* **`reverse_thrust_power`**: 1.0
* **`drift_coefficient`**: 0.4
* **`acceleration_curve`**: Standard
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 0 (Rank D / Aetherium Electronic Cloaking Array)[cite: 43]
* **`max_cooldown`** (Ticks): 0
* **`projectile_range`** (Meters): 0
* **`projectile_speed`**: N/A
* **`optimal_range`** (Meters): 0
* **`max_range`** (Meters): 600m[cite: 42]
* **`engagement_range_cap`** (Meters): 600m[cite: 42]
* **`ammo_capacity`**: Infinite (Resource-free electronic array)[cite: 42]
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
* **`max_thermal_capacity`**: 150.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.9 (Heavy power draw for active electronic jamming)

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.5 (Frigate profile)[cite: 43]
* **`sensor_resolution_tier`**: Active stealth projection (suppresses enemy telemetry and masks signature returns within its operational footprint)[cite: 42]
* **`jamming_susceptibility`**: 0.1
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: true (Squad-wide via Aetherium array)[cite: 42]
* **`shield_gated_stealth_threshold`**: 0.75 (Jamming only functions completely when shields are above 75%)[cite: 42]
* **`decloak_on_action_flag`**: true (Taking fire drops shields below 75%, causing stealth to flicker and shut down until shields fully regenerate)[cite: 42]
* **`stealth_recovery_delay_seconds`**: Shield recharge duration back above 75%[cite: 42]

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Requires no resource upkeep)[cite: 42]
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 30}}
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
* **`special_utility_throughput`**: Grants 1W Phantom-equivalent radar invisibility to squadmates within formation distance while Specter shields remain above 75%[cite: 42].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Squad-Wide Electronic Concealment & Support)[cite: 42]
* **`target_prioritization`**: Passive positioning relative to squadmates; avoids direct offensive engagement to preserve shield integrity.
* **`transition_triggers`**: 
  * Follows standard fleet retreat rules when compromised[cite: 42].
  * If shields drop below 75% due to incoming fire, squad-wide stealth flickers and shuts down immediately, remaining offline until shields fully regenerate back above 75%[cite: 42].
* **`spatial_loop`**: Functions similarly to a support repair vessel; never dictates or leads squad directives, matching pace and sticking closely behind squadmates to passively blanket them in radar invisibility[cite: 42].
