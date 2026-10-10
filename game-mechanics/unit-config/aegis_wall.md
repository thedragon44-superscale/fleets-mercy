# Unit Configuration: Aegis Wall (`aegis-wall`)

## 1. Core Identification & General Stats
* **`unit_class`**: Aegis Wall
* **`weight_class`** (1W–5W): 5W (Super-Heavy Capital)
* **`ai_default_state`**: GUARD (Dynamic Vanguard Intercept / Shield Projection)[cite: 15]
* **`vision_range`** (Meters): 600m (Standard visual range)[cite: 15]
* **`aggro_range`** (Meters): 800m (Locks onto enemy firing lines threatening anchored squadmates)
* **`aggro_threat_weight`**: 0.9 (High priority target for enemy units attempting to flank the primary shield barrier)
* **`retreat_morale_threshold`**: 0.0 (Retreats only when its primary directional shield hits 0% and permanently shatters, falling back to the nearest active port vessel for repairs)[cite: 15]
* **`squad_cohesion_leash_range`** (Meters): 200m (Operates dynamically around squad pathing lines to cast a protective collision shadow)[cite: 15]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 10,000 HP (Rank S Front Shield; 180-degree forward directional barrier)
* **`hull_base`** (HP): 100 HP (Rank D Hull & Rear; sheer mass and volume leave the rear 180-degrees completely exposed and highly fragile)[cite: 15]
* **`quadrant_shielding_enabled`**: true (180-deg forward barrier scaled to super-heavy standards)[cite: 15]
* **`quadrant_shield_pools_enabled`**: true
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 250 HP/sec (Rank S passive regeneration)
* **`shield_recharge_delay_ticks`**: 120 Ticks
* **`directional_shield_arc`** (Degrees): 180 (Forward-facing primary energy barrier)[cite: 15]
* **`armor_mitigation`**: 0.05
* **`armor_hardness_rating`**: Rank D (Rear vulnerable)[cite: 15]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: true (Rear 180-degrees bypasses the primary barrier entirely, striking the Rank D hull directly)[cite: 15]
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"rear_hull": "highly_vulnerable", "forward_emitter": "shield_locked"}

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 0.3 (Rank D Velocity / Slow, heavy mass)[cite: 13]
* **`strafing_speed`**: 0.2
* **`turn_rate`**: 0.8
* **`angular_velocity`**: 0.5
* **`lateral_thrust_power`**: 2.0 (Heavy lateral and reverse thrusters for maintaining intercept angles)[cite: 15]
* **`reverse_thrust_power`**: 1.5
* **`drift_coefficient`**: 0.7 (High mass momentum)
* **`acceleration_curve`**: Sluggish
* **`aft_quadrant_propulsion_penalty`**: true
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 0 (Rank D / Zero offensive weapons; Rank S physical collision/shield barrier projection)[cite: 15]
* **`max_cooldown`** (Ticks): 0
* **`projectile_range`** (Meters): 0
* **`projectile_speed`**: N/A
* **`optimal_range`** (Meters): 0
* **`max_range`** (Meters): 0
* **`engagement_range_cap`** (Meters): 600m
* **`ammo_capacity`**: 0
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: N/A
* **`weapon_dispersion_bloom`**: 0
* **`projectile_tracking_capability`**: 0
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: N/A
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 500.0
* **`thermal_dissipation_rate`**: 20.0 / sec
* **`power_grid_allocation_weight`**: 1.0 (Massive power draw dedicated entirely to the forward shield emitter grid)

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 5.0 (Massive capital-scale profile)
* **`sensor_resolution_tier`**: Fleet Array Telemetry (calculates physical firing lines between known enemy hostiles and anchored friendly units in real-time)[cite: 15]
* **`jamming_susceptibility`**: 0.2
* **`target_lock_time`**: 1.0s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
* **`requires_recon_telemetry`**: true (Relies on Fleet Array vectors to calculate incoming crossfire paths)[cite: 15]
* **`repair_resource_requirement_mask`**: {"shield_generator_rebuild": {"metal": 100, "exotic_crystals": 40}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: true (Falls back to nearest port vessel upon barrier collapse)[cite: 15]
* **`special_utility_throughput`**: 180-Degree Directional Energy Shield Emitter creating a physical collision box large enough to cast a protective shadow over an entire squad[cite: 15]

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Dynamic Vanguard Intercept / Shield Projection)
* **`target_prioritization`**: Threat vectoring via Fleet Array telemetry calculating active enemy firing lines against anchored friendly units.
* **`transition_triggers`**: 
  * If the primary directional shield hits exactly 0%, it permanently shatters, triggering an immediate abort of the vanguard position and a retreat to the nearest active port vessel for repairs.
* **`spatial_loop`**: Operates dynamically around independent squad pathing lines, constantly calculating enemy trajectories and actively thrusting to position its massive 5W frame directly between allies and hostiles to project a wide protective collision shadow.
