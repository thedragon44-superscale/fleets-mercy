# Unit Configuration: Battalion Command Ship (`battalion-command`)

## 1. Core Identification & General Stats
* **`unit_class`**: Battalion Command Ship[cite: 15]
* **`weight_class`** (1W–5W): 5W (Super-Heavy Capital)[cite: 16]
* **`ai_default_state`**: COMMAND_RELAY (Regional Fleet Command, Mobile Repair Hub & Capital Artillery)[cite: 15]
* **`vision_range`** (Meters): 1200m+ (Extended capital-tier telemetry range)[cite: 15, 16]
* **`aggro_range`** (Meters): 1200m
* **`aggro_threat_weight`**: 0.9
* **`retreat_morale_threshold`**: 0.1 (Enters heavy emergency withdrawal status when critically compromised)[cite: 15]
* **`squad_cohesion_leash_range`** (Meters): 400m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 10,000 HP total (2,500 per quadrant)[cite: 16]
* **`hull_base`** (HP): 8,000 HP total (2,000 per quadrant for capital cores)[cite: 16]
* **`quadrant_shielding_enabled`**: true[cite: 15]
* **`quadrant_shield_pools_enabled`**: true[cite: 15]
* **`quadrant_hull_pools_enabled`**: true[cite: 15]
* **`shield_regen_rate`** (HP/sec): 250 HP/sec
* **`shield_recharge_delay_ticks`**: 120 Ticks
* **`directional_shield_arc`** (Degrees): 360 (4 Quadrants)[cite: 15]
* **`armor_mitigation`**: 0.20
* **`armor_hardness_rating`**: Rank S
* **`ablative_plating_durability`**: 500
* **`asymmetric_vulnerability_enabled`**: true (Vulnerable to sniper units and flagships post-shield breach)[cite: 15]
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"port_docking_bay": "disables_docking", "deploy_bay": "disables_deployment", "aft_quadrant": "propulsion_failure", "front_quadrant": "weapon_lock"}[cite: 15]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Rank C Massive Inertia / Slow Acceleration)[cite: 15, 16]
* **`strafing_speed`**: 0.5
* **`turn_rate`**: 0.6
* **`angular_velocity`**: 0.4
* **`lateral_thrust_power`**: 1.0
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.8
* **`acceleration_curve`**: Sluggish
* **`aft_quadrant_propulsion_penalty`**: true (Aft quadrant damage compromises propulsion and stabilization, preventing proper strafing or thrusting)[cite: 15]
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 450 (Rank A / Capital Battery Array)[cite: 16]
* **`max_cooldown`** (Ticks): 30 Ticks
* **`projectile_range`** (Meters): 1200m
* **`projectile_speed`**: 400 m/s
* **`optimal_range`** (Meters): 1000m
* **`max_range`** (Meters): 1200m
* **`engagement_range_cap`** (Meters): 1200m
* **`ammo_capacity`**: 0 (Metal-only logistics; does not handle ammunition)[cite: 15]
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 1.5
* **`weapon_dispersion_bloom`**: 0.05
* **`projectile_tracking_capability`**: 0.9
* **`shield_penetration_factor`**: 0.15
* **`front_quadrant_weapon_interlock`**: true (Front shield momentarily drops when firing main cannon; if front quadrant is damaged, main weapon is disabled entirely)[cite: 15]
* **`sustained_fire_duration_limit`**: Unlimited
* **`barrel_cooling_duration`**: 5 seconds
* **`burst_salvo_cooldown`**: 30 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 1000.0
* **`thermal_dissipation_rate`**: 50.0 / sec
* **`power_grid_allocation_weight`**: 1.0

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 10.0 (Capital profile)
* **`sensor_resolution_tier`**: Extended capital-tier telemetry range (1200m+) acting as an active command relay[cite: 15, 16]
* **`jamming_susceptibility`**: 0.1
* **`target_lock_time`**: 1.2s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Dedicated strictly to structural upkeep using metal as the sole resource)[cite: 15]
* **`requires_recon_telemetry`**: true
* **`repair_resource_requirement_mask`**: {"external_repair_only": true, "metal_upkeep": 100}[cite: 15]
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: true (If damaged/destroyed, cannot dock units needing repair or accept supply vessels dropping off metal)[cite: 15]
* **`starboard_deployment_bay_status`**: true (If damaged, cannot deploy units out into the field)[cite: 15]
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: true

## 7. AI Behavior & State Machine
* **`state_machine_type`**: COMMAND_RELAY (Regional Fleet Command & Mobile Repair Hub)[cite: 15]
* **`target_prioritization`**: Capital and heavy threats within regional radar telemetry bubble.
* **`transition_triggers`**: 
  * If critically compromised, enters heavy emergency withdrawal status seeking secure friendly territory[cite: 15].
  * Cannot repair itself; relies entirely on external field intervention by deployed Aegis Repair units (2W)[cite: 15].
* **`spatial_loop`**: Automatically pairs with assigned Command Escort Ships (3W) for physical screening while balancing heavy capital combat, managing automated repair queues, and anchoring regional operations[cite: 15].
