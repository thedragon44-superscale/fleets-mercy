# Unit Configuration: Command Escort Ship (`command-escort`)

## 1. Core Identification & General Stats
* **`unit_class`**: Command Escort Ship[cite: 18]
* **`weight_class`** (1W–5W): 3W (Medium / Frigate)[cite: 19]
* **`ai_default_state`**: BODYGUARD (Dedicated Capital Bodyguard, Interception Screen & Vanguard Shield)[cite: 18]
* **`vision_range`** (Meters): 1,200m (Tactical Frigate Relay)[cite: 18, 19]
* **`aggro_range`** (Meters): 1,200m[cite: 18]
* **`aggro_threat_weight`**: 0.8
* **`retreat_morale_threshold`**: Critical threshold (disengages to seek nearest active port or flagship drydock)[cite: 18]
* **`squad_cohesion_leash_range`** (Meters): 200m (anchors within standard squad range radius around command vessel)[cite: 18]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 1,500 HP (Rank B Shields)[cite: 19]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull)[cite: 19]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 18]
* **`quadrant_shield_pools_enabled`**: false
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 30 HP/sec
* **`shield_recharge_delay_ticks`**: 60 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.15
* **`armor_hardness_rating`**: Rank B[cite: 19]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "batteries": "standard"}

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.8 (Rank B Frigate Velocity / Unflinching Cruise Speed)[cite: 18, 19]
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
* **`thruster_disconnect_rule`**: Cannot match flagship emergency boost; maintains Rank B speed and catches up post-burn[cite: 18]

## 4. Combat Output & Ballistics
* **`dps`**: 150 (Rank B / Medium Point-Defense & Interception Batteries)[cite: 18, 19]
* **`max_cooldown`** (Ticks): 60 Ticks (1-second mandatory cooldown after 3 seconds continuous fire)[cite: 18]
* **`projectile_range`** (Meters): 1,200m (Hard-capped engagement range)[cite: 18, 19]
* **`projectile_speed`**: 350 m/s
* **`optimal_range`** (Meters): 800m
* **`max_range`** (Meters): 1,200m[cite: 18, 19]
* **`engagement_range_cap`** (Meters): 1,200m[cite: 18, 19]
* **`ammo_capacity`**: Infinite (Thermal/cooldown cycle management)[cite: 18]
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 3.0
* **`weapon_dispersion_bloom`**: 0.10
* **`projectile_tracking_capability`**: 0.85
* **`shield_penetration_factor`**: 0.05
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 3 seconds[cite: 18]
* **`barrel_cooling_duration`**: 1 second[cite: 18]
* **`burst_salvo_cooldown`**: 60 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 300.0
* **`thermal_dissipation_rate`**: 25.0 / sec
* **`power_grid_allocation_weight`**: 0.7

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.5
* **`sensor_resolution_tier`**: Tactical Frigate Relay (Passive radar relay extending telemetry around protected command vessel)[cite: 18, 19]
* **`jamming_susceptibility`**: 0.3
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
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

## 7. AI Behavior & State Machine
* **`state_machine_type`**: BODYGUARD (Dedicated Capital Bodyguard & Interception Screen)[cite: 18]
* **`target_prioritization`**: Incoming hostile threats along the vector of highest enemy concentration relative to the command vessel[cite: 18].
* **`transition_triggers`**: 
  * Standard fleet retreat rules apply; disengages to seek the nearest active port or flagship drydock when health reaches critical thresholds[cite: 18].
  * Cannot match flagship emergency boost; maintains Rank B cruise speed and catches up post-burn[cite: 18].
* **`spatial_loop`**: Matches command ship movement and anchors within standard squad range radius, positioning its hull directly between the protected capital ship and high-concentration enemy vectors[cite: 18].
* **`deployment_assignment`**: Cannot be deployed in a standard squad (independent escort asset). Automatically assigns to the Flagship if deployed individually, or to the Battalion Command Ship if in a battalion setup[cite: 18].
