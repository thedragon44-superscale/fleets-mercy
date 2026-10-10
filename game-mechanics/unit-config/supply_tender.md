# Unit Configuration: Supply Tender (`supply-tender`)

## 1. Core Identification & General Stats
* **`unit_class`**: Supply Tender[cite: 45]
* **`weight_class`** (1W–5W): 2W (Light / Utility)[cite: 30]
* **`ai_default_state`**: GUARD (Mobile Munitions Synthesizer, Field Fabricator & Logistics Courier)[cite: 45]
* **`vision_range`** (Meters): 600m (Standard visual range)[cite: 45]
* **`aggro_range`** (Meters): 300m
* **`aggro_threat_weight`**: 0.3
* **`retreat_morale_threshold`**: Shields broken (0% shield triggers immediate abort and retreat to Flagship or Battalion Command Ship Port Docking Bay)[cite: 45]
* **`squad_cohesion_leash_range`** (Meters): 200m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 30]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull; reinforced containment frame)[cite: 30, 45]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 45]
* **`quadrant_shield_pools_enabled`**: false[cite: 45]
* **`quadrant_hull_pools_enabled`**: false[cite: 45]
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank B[cite: 30]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"synthesizer": "standard", "containment_frame": "reinforced"}[cite: 45]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Rank C Velocity / Balanced speed for efficient transit cycles)[cite: 30, 45]
* **`strafing_speed`**: 0.8
* **`turn_rate`**: 1.5
* **`angular_velocity`**: 1.2
* **`lateral_thrust_power`**: 0.8
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.4
* **`acceleration_curve`**: Standard (Moderate acceleration and vectoring capabilities for smooth mid-space docking/tethering)[cite: 45]
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 0 (Rank D / Unarmed On-Board Rapid Ordnance Synthesizer)[cite: 30, 45]
* **`max_cooldown`** (Ticks): 0
* **`projectile_range`** (Meters): Tether range
* **`projectile_speed`**: N/A
* **`optimal_range`** (Meters): 50m
* **`max_range`** (Meters): 100m
* **`engagement_range_cap`** (Meters): 150m
* **`ammo_capacity`**: Synthesis Hold Capacity (Converts raw resources into finite ammunition on-demand)[cite: 45]
* **`initial_ordnance_capacity`**: 100%
* **`turret_traverse_speed`**: 0
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 1.0 (Wireless fabrication tether)[cite: 45]
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 0
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: Instantaneous synthesis tether transfer (Rank S resupply speed)[cite: 45]
* **`max_thermal_capacity`**: 200.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.95 (Heavy synthesis power draw)

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.0 (Standard utility profile)
* **`sensor_resolution_tier`**: Fleet Logistics Telemetry (monitors raw resource cache levels in harvesters and secondary munitions depletion across deployed combat units via Fleet Array)[cite: 45]
* **`jamming_susceptibility`**: 0.4
* **`target_lock_time`**: 0.3s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Converts raw harvested resources into finite ammunition and secondary payloads)[cite: 45]
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 20}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: true (Retreats to Flagship or Battalion Command Ship Port Docking Bay for repairs if shields break)[cite: 45]
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: true
* **`special_utility_throughput`**: Rank S resupply speed via On-Board Rapid Ordnance Synthesizer & Wireless Fabrication Tether[cite: 45].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Mobile Munitions Synthesizer & Logistics Courier)[cite: 45]
* **`target_prioritization`**: Harvesters with raw resources in cache and friendly combat units requiring secondary/finite ammunition[cite: 45].
* **`transition_triggers`**: 
  * If shields are completely broken (0%), immediately aborts operations and retreats to the Flagship's or Battalion Command Ship's Port Docking Bay for repairs[cite: 45].
* **`spatial_loop`**: 
  * **Field Logistics Loop**: Paths to nearest Harvester to transfer raw materials into synthesis hold -> scans Fleet Array for nearest unit requiring matching ammo -> vectors directly to depleted unit to synthesize and transfer ordnance via tether beam -> returns to harvesters for additional materials[cite: 45].
  * **Evasive Behavior**: Avoids direct line-of-fire, using obstacle cover and maneuvering to position friendly combat units between itself and hostiles[cite: 45].
