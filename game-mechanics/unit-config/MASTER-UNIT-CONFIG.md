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



# Unit Configuration: Assault Gunship (`assault-gunship`)

## 1. Core Identification & General Stats
* **`unit_class`**: Assault Gunship[cite: 13]
* **`weight_class`** (1W–5W): 2W[cite: 13]
* **`ai_default_state`**: SEEK (Strafing Run / Escort Harassment)[cite: 13]
* **`vision_range`** (Meters): 600m[cite: 13]
* **`aggro_range`** (Meters): 500m
* **`aggro_threat_weight`**: 0.7
* **`retreat_morale_threshold`**: 0.0 (Triggered strictly by Shield-Break Protocol)[cite: 13]
* **`squad_cohesion_leash_range`** (Meters): 300m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 13]
* **`hull_base`** (HP): 500 HP (Rank C Hull)[cite: 13]
* **`quadrant_shielding_enabled`**: false
* **`quadrant_shield_pools_enabled`**: false
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank C
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "forward_plating": "reinforced"}[cite: 13]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 2.5 (Rank A High Speed / High Acceleration)[cite: 13]
* **`strafing_speed`**: 2.2
* **`turn_rate`**: 3.0
* **`angular_velocity`**: 2.5
* **`lateral_thrust_power`**: 1.8
* **`reverse_thrust_power`**: 1.5
* **`drift_coefficient`**: 0.4
* **`acceleration_curve`**: Snappy
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 50 (Rank C / Twin Rotary Kinetic Cannons)[cite: 13]
* **`max_cooldown`** (Ticks): 5 Ticks
* **`projectile_range`** (Meters): 500m
* **`projectile_speed`**: 300 m/s
* **`optimal_range`** (Meters): 400m
* **`max_range`** (Meters): 500m
* **`engagement_range_cap`** (Meters): 500m
* **`ammo_capacity`**: Infinite (C-Rank standard magazine loop)[cite: 13]
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 4.0
* **`weapon_dispersion_bloom`**: 0.15
* **`projectile_tracking_capability`**: 0.8
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (Infinite supply)[cite: 13]
* **`barrel_cooling_duration`**: 3 seconds
* **`burst_salvo_cooldown`**: 5 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 200.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.6

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.0
* **`sensor_resolution_tier`**: Standard visual and telemetry range (600m), syncing with Recon arrays[cite: 13]
* **`jamming_susceptibility`**: 0.4
* **`target_lock_time`**: 0.4s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Resource independent, does not interact with supply units)[cite: 13]
* **`requires_recon_telemetry`**: true (Syncs with Recon arrays to pinpoint high-speed intersection vectors)[cite: 13]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 15}}
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

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Inertial Strafe Loop / Escort Harassment)[cite: 13]
* **`target_prioritization`**: High-speed intersection targets, enemy logistics, surface sub-components, and isolated units[cite: 13].
* **`transition_triggers`**: 
  * **Shield-Break Retreat Protocol**: The moment its unified pool's shields drop completely (shield break), it instantly aborts its attack vector, triggers emergency thrusters, and executes a mandatory retreat back to the nearest active repair vessel or port vessel for shield recharging and hull maintenance (does not interact with supply units)[cite: 13].
* **`spatial_loop`**: Executes high-velocity hit-and-run vector passes utilizing vector-thrust bow engines—sliding laterally while maintaining forward firing arcs to sweep past enemy lines without losing momentum[cite: 13].



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



# Unit Configuration: Command Dreadnought (Flagship) (`flagship`)

## 1. Core Identification & General Stats
* **`unit_class`**: Command Dreadnought (Flagship)[cite: 22]
* **`weight_class`** (1W–5W): 5W (Super-Heavy Capital)[cite: 17, 21]
* **`ai_default_state`**: COMMAND_RELAY (Mobile Command Center, Fleet Spawner & Primary Win/Loss Condition)[cite: 22]
* **`vision_range`** (Meters): 2,500m (Extended Fleet Array / Recon)[cite: 17, 21]
* **`aggro_range`** (Meters): 2,000m[cite: 22]
* **`aggro_threat_weight`**: 1.0 (Maximum primary target priority)
* **`retreat_morale_threshold`**: 0.0 (Core destruction triggers Match Lost)[cite: 22]
* **`squad_cohesion_leash_range`** (Meters): 500m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 10,000 HP total (2,500 per quadrant)[cite: 21, 22]
* **`hull_base`** (HP): 7,500 HP total (1,875 per quadrant for capital cores)[cite: 21, 22]
* **`quadrant_shielding_enabled`**: true[cite: 22]
* **`quadrant_shield_pools_enabled`**: true[cite: 22]
* **`quadrant_hull_pools_enabled`**: true[cite: 22]
* **`shield_regen_rate`** (HP/sec): 250 HP/sec
* **`shield_recharge_delay_ticks`**: 120 Ticks
* **`directional_shield_arc`** (Degrees): 360 (4 Quadrants)[cite: 22]
* **`armor_mitigation`**: 0.95 (95% flat damage mitigation applied to incoming fire only after a quadrant's shield has been stripped)[cite: 21, 22]
* **`armor_hardness_rating`**: Rank S[cite: 21]
* **`ablative_plating_durability`**: 500
* **`asymmetric_vulnerability_enabled`**: true[cite: 22]
* **`rear_hull_boost_scaling_enabled`**: true[cite: 22]
* **`subsystem_vulnerability_mask`**: {"core_hull": "match_lost", "front_hull": "match_lost", "rear_hull": "boost_disabled", "starboard_hull": "deployment_bay_offline", "port_hull": "docking_bay_offline"}[cite: 22]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Cruising velocity)[cite: 21, 22]
* **`strafing_speed`**: 1.0 (Crippled by 80% if Rear Hull is destroyed)[cite: 22]
* **`turn_rate`**: 0.5
* **`angular_velocity`**: 0.4
* **`lateral_thrust_power`**: 1.0
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.8
* **`acceleration_curve`**: Capital
* **`aft_quadrant_propulsion_penalty`**: true[cite: 22]
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false
* **`thruster_boost_multiplier`**: Up to 2.5x forward speed via Spacebar[cite: 22]
* **`boost_scaling_rule`**: Scales linearly with Rear Hull health (e.g., 2.5x at 1,875 HP; 1.75x at 937 HP)[cite: 22]

## 4. Combat Output & Ballistics
* **`dps`**: ~1,000 DPS (Piercing Core Beam)[cite: 21, 22]
* **`max_cooldown`** (Ticks): 10-second cooldown between bursts[cite: 21, 22]
* **`projectile_range`** (Meters): 2,000m (Extends into Radar Fog)[cite: 22]
* **`projectile_speed`**: Raycast Instant[cite: 22]
* **`optimal_range`** (Meters): 1,500m
* **`max_range`** (Meters): 2,000m[cite: 22]
* **`engagement_range_cap`** (Meters): 2,000m[cite: 22]
* **`ammo_capacity`**: Infinite (Energy beam core)
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: Mouse rotation dynamically follows cursor in real-time[cite: 22]
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 1.0 (Direct raycast sweep)[cite: 22]
* **`shield_penetration_factor`**: 1.0 (Overpenetration mechanism damages everything touching the raycast line)[cite: 22]
* **`front_quadrant_weapon_interlock`**: true (Front hull 0% permanently disables main cannon and triggers match loss)[cite: 22]
* **`sustained_fire_duration_limit`**: 3 seconds[cite: 21, 22]
* **`barrel_cooling_duration`**: 10 seconds[cite: 21, 22]
* **`burst_salvo_cooldown`**: 10 seconds[cite: 21, 22]
* **`beam_raycast_duration`**: 3 seconds continuous raycast[cite: 22]
* **`max_thermal_capacity`**: 1000.0
* **`thermal_dissipation_rate`**: 50.0 / sec
* **`power_grid_allocation_weight`**: 1.0

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 10.0 (Capital profile)
* **`sensor_resolution_tier`**: Extended Fleet Array / Recon (2,500m radius)[cite: 17, 21]
* **`jamming_susceptibility`**: 0.1
* **`target_lock_time`**: 1.0s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: Fleet Reserve Spawner and Command Hub[cite: 22]
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"external_repair_only": true, "metal_upkeep": 100}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: true (If 0%, Docking Bay offline; cannot recall deployed units for repairs or reserve refunds)[cite: 22]
* **`starboard_deployment_bay_status`**: true (If 0%, Deployment Bay offline; cannot spawn units from reserves)[cite: 22]
* **`salvageable_upon_destruction`**: false (Match lost)[cite: 22]
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false
* **`recall_protocols`**: Manual recall commands restricted strictly to Squads, Battalions, and Harvesting Units; individual standard combat units cannot be manually recalled[cite: 22].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: COMMAND_RELAY (Mobile Command Center & Fleet Spawner)[cite: 22]
* **`target_prioritization`**: Dynamic manual commander cursor tracking via Piercing Core Beam[cite: 22].
* **`transition_triggers`**: 
  * Core Hull or Front Hull reaching 0% triggers catastrophic ship destruction and Match Lost[cite: 22].
  * Quadrant shields absorb 100% incoming damage; if a quadrant shield hits 0%, it shatters permanently for the match[cite: 22].
* **`spatial_loop`**: Maintains capital mobility via cruising velocity and thruster boost scaling, managing unit deployment, docking recalls, and dynamic sector raycast sweeps[cite: 22].



# Unit Configuration: Grav Extractor (`grav-extractor`)

## 1. Core Identification & General Stats
* **`unit_class`**: Grav Extractor[cite: 25]
* **`weight_class`** (1W–5W): 2W (Light / Utility)[cite: 26]
* **`ai_default_state`**: GUARD (Unarmed Industrial Harvester / Movement Anchor)[cite: 25]
* **`vision_range`** (Meters): 600m (Standard visual range)[cite: 25, 26]
* **`aggro_range`** (Meters): 300m
* **`aggro_threat_weight`**: 0.2
* **`retreat_morale_threshold`**: Shields broken (0% shield triggers immediate abort and retreat to Flagship Port Docking Bay)[cite: 25]
* **`squad_cohesion_leash_range`** (Meters): 150m (Squad enters dedicated escort formation around the Extractor)[cite: 25]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 26]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull; heavily reinforced gravitational damping frame)[cite: 25, 26]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 25]
* **`quadrant_shield_pools_enabled`**: false
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank B[cite: 26]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"harvesting_pulser": "standard", "gravitational_damper": "reinforced"}[cite: 25]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 0.4 (Rank D Velocity / Slow & Heavy)[cite: 25, 26]
* **`strafing_speed`**: 0.3
* **`turn_rate`**: 1.0
* **`angular_velocity`**: 0.8
* **`lateral_thrust_power`**: 0.5
* **`reverse_thrust_power`**: 0.5
* **`drift_coefficient`**: 0.6
* **`acceleration_curve`**: Sluggish
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 2 (Rank D / Gravitational Resonance Pulser)[cite: 26]
* **`max_cooldown`** (Ticks): 45 Ticks
* **`projectile_range`** (Meters): 150m
* **`projectile_speed`**: N/A (Extraction tether/pulser)
* **`optimal_range`** (Meters): 100m
* **`max_range`** (Meters): 150m
* **`engagement_range_cap`** (Meters): 200m
* **`ammo_capacity`**: Cargo Hold Capacity (100%)[cite: 25]
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 1.0
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 1.0
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (Harvesting cycle)
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: Continuous extraction tether
* **`max_thermal_capacity`**: 150.0
* **`thermal_dissipation_rate`**: 10.0 / sec
* **`power_grid_allocation_weight`**: 0.9 (Heavy draw for resonance pulser)

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.0
* **`sensor_resolution_tier`**: Standard visual range (600m); dependent on Recon Probe telemetry to locate nodes in Radar Fog[cite: 25, 26]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: Resource Type 5 (Exotic Crystals) and Resource Type 6 (Graviton Cores / Rare Isotopes)[cite: 25]
* **`requires_recon_telemetry`**: true (Incapable of locating gravity wells or crystal deposits in Radar Fog without active Fleet Array telemetry from a Recon Probe)[cite: 25]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 20}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: true (Returns to Flagship Port Docking Bay to deposit materials)[cite: 25]
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false
* **`special_utility_throughput`**: Rank S extraction rate via Gravitational Resonance Pulser/Tether to fracture dense crystals and stabilize heavy isotopes[cite: 25, 26].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Unarmed Industrial Harvester / Movement Anchor)[cite: 25]
* **`target_prioritization`**: Illuminated resource nodes (Exotic Crystals / Graviton Cores) via Fleet Array telemetry[cite: 25].
* **`transition_triggers`**: 
  * If shields are completely broken (0%), immediately aborts operations and retreats to the Flagship's Port (Left) Docking Bay for repairs and shelter[cite: 25].
  * Does not perform panic evasive maneuvers when taking fire; remains 100% focused on its task until shields break completely[cite: 25].
* **`spatial_loop`**: 
  * **Stealth Pathing AI**: Plots vectors through asteroid fields and around environmental obstacles using friendly Recon Probe telemetry, actively avoiding enemy line-of-sight and combat zones on both outward and inward journeys[cite: 25].
  * **Harvesting Loop**: Acquires node -> paths stealthily (with escort squad following) -> extracts until cargo hold reaches 100% capacity -> offloads directly to the nearest Supply Tender in the field (or returns to Flagship Port Docking Bay if carrying capital construction resources, needing repairs, or manually recalled)[cite: 25].



# Unit Configuration: Defensive Gun Emplacement (`gun-emplacement`)

## 1. Core Identification & General Stats
* **`unit_class`**: Defensive Gun Emplacement[cite: 28]
* **`weight_class`** (1W–5W): 4W (Heavy / Capital Support)[cite: 17, 22]
* **`ai_default_state`**: GUARD (Stationary Strategic Bunker, Chokepoint Denial & Territory Fortification)[cite: 28]
* **`vision_range`** (Meters): 1,000m (Engagement cap)[cite: 22, 28]
* **`aggro_range`** (Meters): 1,000m[cite: 28]
* **`aggro_threat_weight`**: 0.85
* **`retreat_morale_threshold`**: 0.0 (Cannot retreat; fights until destroyed)[cite: 28]
* **`squad_cohesion_leash_range`** (Meters): 0 (Stationary/Immobile once anchored)[cite: 28]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 0 (Zero Shields)[cite: 22, 28]
* **`hull_base`** (HP): 6,000 HP anchored (Rank S Hull; massive, impenetrable structural armor)[cite: 22, 28]
* **`quadrant_shielding_enabled`**: false[cite: 28]
* **`quadrant_shield_pools_enabled`**: false[cite: 28]
* **`quadrant_hull_pools_enabled`**: false[cite: 28]
* **`shield_regen_rate`** (HP/sec): 0
* **`shield_recharge_delay_ticks`**: 0
* **`directional_shield_arc`** (Degrees): 0
* **`armor_mitigation`**: 0.25
* **`armor_hardness_rating`**: Rank S[cite: 22, 28]
* **`ablative_plating_durability`**: 300
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"structural_armor": "impenetrable", "artillery_turret": "standard"}[cite: 28]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 0.0 (Stationary post-deployment / Rank D Immobile)[cite: 22, 28]
* **`strafing_speed`**: 0.0
* **`turn_rate`**: 0.5
* **`angular_velocity`**: 0.5
* **`lateral_thrust_power`**: 0.0
* **`reverse_thrust_power`**: 0.0
* **`drift_coefficient`**: 0.0
* **`acceleration_curve`**: None
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: true[cite: 22, 28]
* **`is_stationary_landmark_bound`**: true (Must physically attach and bolt onto the nearest available landmark such as an asteroid, moon, planet, or mining location)[cite: 28]

## 4. Combat Output & Ballistics
* **`dps`**: 450 (Rank A / Fixed Heavy Artillery & Point-Defense Batteries)[cite: 22, 28]
* **`max_cooldown`** (Ticks): 45 Ticks
* **`projectile_range`** (Meters): 1,000m (Hard-capped engagement range)[cite: 22, 28]
* **`projectile_speed`**: 400 m/s
* **`optimal_range`** (Meters): 800m
* **`max_range`** (Meters): 1,000m[cite: 22, 28]
* **`engagement_range_cap`** (Meters): 1,000m[cite: 22, 28]
* **`ammo_capacity`**: Massive cheap initial finite ammunition cache (refilled by Supply Tenders delivering graviton cores and ore)[cite: 28]
* **`initial_ordnance_capacity`**: 100%[cite: 28]
* **`turret_traverse_speed`**: 2.0
* **`weapon_dispersion_bloom`**: 0.05
* **`projectile_tracking_capability`**: 0.85
* **`shield_penetration_factor`**: 0.10
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 10 seconds[cite: 28]
* **`barrel_cooling_duration`**: 3 seconds (Automatic barrel-cooling/thermal-cycling cycle after 10 seconds continuous fire)[cite: 28]
* **`burst_salvo_cooldown`**: 45 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 500.0
* **`thermal_dissipation_rate`**: 30.0 / sec
* **`power_grid_allocation_weight`**: 1.0

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 5.0 (Fortified platform profile)
* **`sensor_resolution_tier`**: Static passive radar relay anchoring the sensor grid around its fortified landmark[cite: 28]
* **`jamming_susceptibility`**: 0.2
* **`target_lock_time`**: 0.8s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Requires Supply Tender delivery of graviton cores and ore for ammunition reloading)[cite: 28]
* **`requires_recon_telemetry`**: true (Relies on a designated 1W Recon drone anchor to set travel destination and broader fleet network for targets outside line of sight)[cite: 28]
* **`repair_resource_requirement_mask`**: {"armor_welding": {"metal": 50}}
* **`requires_anchor_drone`**: true (Requires a designated 1W Recon drone anchor for transit routing)[cite: 28]
* **`requires_recon_anchor`**: true[cite: 28]
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true (Leaves behind salvageable wreckage for supply ships)[cite: 28]
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false
* **`special_utility_throughput`**: Shreds advancing medium units, zones out light swarms, and punishes unsupported strike craft entering its 1000m arc[cite: 28].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Stationary Strategic Bunker & Chokepoint Denial)[cite: 28]
* **`target_prioritization`**: Automatically locks onto enemy units entering its 1,000m firing arc, prioritizing high-threat entities threatening its anchored territory[cite: 28].
* **`transition_triggers`**: 
  * Cannot retreat to a drydock; fights until destroyed, leaving behind salvageable wreckage[cite: 28].
  * Requests ammunition resupply from Supply Tenders when graviton-ore ordnance is depleted[cite: 28].
* **`spatial_loop`**: 
  * **Transit Routing**: Takes the safest route during transit using a 1W Recon drone anchor, actively avoiding enemy fleets and leveraging environmental cover until it physically attaches and bolts onto the nearest available landmark[cite: 28].
  * **Stationary Defense Loop**: Maintains constant watch, managing its 10-second sustained fire cycles and graviton-ore ordnance until depleted or serviced[cite: 28].



# Unit Configuration: Ion Disabler (`ion-disabler`)

## 1. Core Identification & General Stats
* **`unit_class`**: Ion Disabler[cite: 31]
* **`weight_class`** (1W–5W): 1W (Ultra-Light / Scout)[cite: 23, 32]
* **`ai_default_state`**: SEEK (Shield Striker, Subsystem Suppressor & Buddy Wingman)[cite: 31]
* **`vision_range`** (Meters): 500m[cite: 23, 31]
* **`aggro_range`** (Meters): 500m[cite: 31]
* **`aggro_threat_weight`**: 0.75
* **`retreat_morale_threshold`**: 0.0 (Fights to the death; no retreat once deployed)[cite: 31]
* **`squad_cohesion_leash_range`** (Meters): 150m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 23, 32]
* **`hull_base`** (HP): 100 HP (Rank D Hull)[cite: 23, 32]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 31]
* **`quadrant_shield_pools_enabled`**: false[cite: 31]
* **`quadrant_hull_pools_enabled`**: false[cite: 31]
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.05
* **`armor_hardness_rating`**: Rank D[cite: 23]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"engines": "standard", "ion_cannon": "standard"}[cite: 31]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.8 (Rank B Frigate Velocity / Responsive Thrusters)[cite: 23, 32]
* **`strafing_speed`**: 1.6
* **`turn_rate`**: 3.5
* **`angular_velocity`**: 3.0
* **`lateral_thrust_power`**: 2.0
* **`reverse_thrust_power`**: 1.5
* **`drift_coefficient`**: 0.2
* **`acceleration_curve`**: Snappy (High acceleration)[cite: 31]
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 40 DPS (Rank C / Focused Pulsed Ion Cannon, Rank S shield damage multiplier)[cite: 23, 31]
* **`max_cooldown`** (Ticks): 20 Ticks
* **`projectile_range`** (Meters): 500m[cite: 23, 31]
* **`projectile_speed`**: 400 m/s
* **`optimal_range`** (Meters): 400m
* **`max_range`** (Meters): 500m[cite: 23, 31]
* **`engagement_range_cap`** (Meters): 500m[cite: 23, 31]
* **`ammo_capacity`**: Infinite
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 5.0
* **`weapon_dispersion_bloom`**: 0.05
* **`projectile_tracking_capability`**: 0.9
* **`shield_penetration_factor`**: 1.0 (Rank S shield damage multiplier; melts energy shields almost instantly)[cite: 23, 31]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited
* **`barrel_cooling_duration`**: 1 second
* **`burst_salvo_cooldown`**: 20 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 150.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.8

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 0.5 (Ultra-Light profile)[cite: 32]
* **`sensor_resolution_tier`**: Standard visual range (500m); relies on Recon Probes, Fleet Array, or "Buddy" unit to acquire targets through Radar Fog[cite: 23, 31]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.3s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
* **`requires_recon_telemetry`**: true (Relies on Recon Probes or Fleet Array to acquire targets through Radar Fog)[cite: 31]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 10}}
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
* **`special_utility_throughput`**: Continuous hits temporarily freeze target's shield regeneration timer and disable secondary weapon turrets for 2 seconds[cite: 31].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Shield Striker & Buddy Wingman)[cite: 31]
* **`target_prioritization`**: 
  * **Squad Targeting Priority**: Scans its assigned squad for the unit with the highest Hull Damage output; automatically targets the specific enemy currently locked on by that squadmate to peel off its shields[cite: 31].
  * **"Buddy" Protocol**: If deployed outside of a squad or if sole surviving combatant, pairs with the unit possessing the highest Hull Damage in the entire fleet, shadowing its movements and stripping shields off its target[cite: 31].
* **`transition_triggers`**: 
  * As a 1W unit, once deployed, it fights to the death to support its squad or "Buddy" (no retreat protocol)[cite: 31].
* **`spatial_loop`**: Employs a Jousting / Boom-and-Zoom vector alongside its squad leader or "Buddy," charging in at max speed to unleash concentrated Ion salvos before circling wide[cite: 31].



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



# Unit Configuration: Mining Barge (`mining-barge`)

## 1. Core Identification & General Stats
* **`unit_class`**: Mining Barge[cite: 33]
* **`weight_class`** (1W–5W): 2W (Light / Utility)[cite: 34]
* **`ai_default_state`**: GUARD (Unarmed Industrial Harvester / Movement Anchor)[cite: 33]
* **`vision_range`** (Meters): 600m (Standard visual range)[cite: 33, 34]
* **`aggro_range`** (Meters): 300m
* **`aggro_threat_weight`**: 0.2
* **`retreat_morale_threshold`**: Shields broken (0% shield triggers immediate abort and retreat to Flagship Port Docking Bay)[cite: 33]
* **`squad_cohesion_leash_range`** (Meters): 150m (Squad enters dedicated escort formation around the Barge)[cite: 33]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 34]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull; heavy structural hull plating)[cite: 33, 34]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 33]
* **`quadrant_shield_pools_enabled`**: false
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank B[cite: 34]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"mining_beam": "standard", "hull_plating": "reinforced"}[cite: 33]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 0.4 (Rank D Velocity / Slow & Heavy)[cite: 33, 34]
* **`strafing_speed`**: 0.3
* **`turn_rate`**: 1.0
* **`angular_velocity`**: 0.8
* **`lateral_thrust_power`**: 0.5
* **`reverse_thrust_power`**: 0.5
* **`drift_coefficient`**: 0.6
* **`acceleration_curve`**: Sluggish
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 2 (Rank D / High-Yield Thermal Extraction Beam)[cite: 34]
* **`max_cooldown`** (Ticks): 45 Ticks
* **`projectile_range`** (Meters): 150m
* **`projectile_speed`**: N/A (Extraction beam)
* **`optimal_range`** (Meters): 100m
* **`max_range`** (Meters): 150m
* **`engagement_range_cap`** (Meters): 200m
* **`ammo_capacity`**: Cargo Hold Capacity (100%)[cite: 33]
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 1.0
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 1.0
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (Harvesting cycle)
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: Continuous extraction beam
* **`max_thermal_capacity`**: 150.0
* **`thermal_dissipation_rate`**: 10.0 / sec
* **`power_grid_allocation_weight`**: 0.9

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.0
* **`sensor_resolution_tier`**: Standard visual range (600m); dependent on Recon Probe telemetry to locate celestial bodies in Radar Fog[cite: 33, 34]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: Resource Type 1 (Raw Ore) and Resource Type 2 (Heavy Metals)[cite: 33]
* **`requires_recon_telemetry`**: true (Incapable of locating celestial bodies in Radar Fog without active Fleet Array telemetry from a Recon Probe)[cite: 33]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 20}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: true (Returns to Flagship Port Docking Bay to deposit materials)[cite: 33]
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false
* **`special_utility_throughput`**: Rank S extraction rate via High-Yield Thermal Extraction Beam to break down target nodes for designated resource types[cite: 33, 34].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Unarmed Industrial Harvester / Movement Anchor)[cite: 33]
* **`target_prioritization`**: Illuminated resource nodes (Raw Ore / Heavy Metals) via Fleet Array telemetry[cite: 33].
* **`transition_triggers`**: 
  * If shields are completely broken (0%), immediately aborts operations and retreats to the Flagship's Port (Left) Docking Bay for repairs and shelter[cite: 33].
  * Does not perform panic evasive maneuvers when taking fire; remains 100% focused on its task until shields break completely[cite: 33].
* **`spatial_loop`**: 
  * **Stealth Pathing AI**: Plots vectors through asteroid fields and around environmental obstacles using friendly Recon Probe telemetry, actively avoiding enemy line-of-sight and combat zones on both outward and inward journeys[cite: 33].
  * **Harvesting Loop**: Acquires node -> paths stealthily (with escort squad following) -> harvests until cargo hold reaches 100% capacity -> offloads directly to the nearest Supply Tender in the field (or returns to Flagship Port Docking Bay if carrying capital construction resources, needing repairs, or manually recalled)[cite: 33].



# Unit Configuration: Phantom Transport (`phantom`)

## 1. Core Identification & General Stats
* **`unit_class`**: Phantom Transport[cite: 36]
* **`weight_class`** (1W–5W): 1W (Ultra-Light / Scout)[cite: 26, 36]
* **`ai_default_state`**: SEEK (Stealth Infiltrator & Recon Hunter)[cite: 36]
* **`vision_range`** (Meters): 600m (Strict visual range for radar-invisible unit)[cite: 26, 36]
* **`aggro_range`** (Meters): 600m[cite: 36]
* **`aggro_threat_weight`**: 0.8
* **`retreat_morale_threshold`**: 0.0 (Fights to the death; no retreat once engaged)[cite: 36]
* **`squad_cohesion_leash_range`** (Meters): 200m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 1,500 HP (Rank B Unified Pool with Hull)[cite: 26, 36]
* **`hull_base`** (HP): 2,000 HP (Rank B Unified Pool with Shields)[cite: 26, 36]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 26, 36]
* **`quadrant_shield_pools_enabled`**: false[cite: 36]
* **`quadrant_hull_pools_enabled`**: false[cite: 36]
* **`shield_regen_rate`** (HP/sec): 30 HP/sec
* **`shield_recharge_delay_ticks`**: 60 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.15
* **`armor_hardness_rating`**: Rank B[cite: 26]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"cloaking_array": "standard", "pulse_cannon": "standard"}[cite: 36]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Rank C Velocity / Measured and deliberate)[cite: 26, 36]
* **`strafing_speed`**: 0.8
* **`turn_rate`**: 2.0
* **`angular_velocity`**: 1.8
* **`lateral_thrust_power`**: 1.0
* **`reverse_thrust_power`**: 0.8
* **`drift_coefficient`**: 0.3
* **`acceleration_curve`**: Standard
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 50 (Rank C / Anti-System Pulse Cannon & Sabotage Charge at point-blank range)[cite: 26, 36]
* **`max_cooldown`** (Ticks): 60 Ticks
* **`projectile_range`** (Meters): Point-blank / Short range[cite: 36]
* **`projectile_speed`**: 300 m/s
* **`optimal_range`** (Meters): 100m
* **`max_range`** (Meters): 200m
* **`engagement_range_cap`** (Meters): 600m[cite: 36]
* **`ammo_capacity`**: Infinite
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 3.0
* **`weapon_dispersion_bloom`**: 0.10
* **`projectile_tracking_capability`**: 0.8
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 5 seconds
* **`barrel_cooling_duration`**: 2 seconds
* **`burst_salvo_cooldown`**: 60 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 200.0
* **`thermal_dissipation_rate`**: 15.0 / sec
* **`power_grid_allocation_weight`**: 0.85

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 0.0 (Completely radar invisible under standard conditions)[cite: 26, 36]
* **`sensor_resolution_tier`**: Radar immune; visual detection only within strict 600m visual range[cite: 36]
* **`jamming_susceptibility`**: 0.0 (Immune)[cite: 36]
* **`target_lock_time`**: 0.2s
* **`radar_immunity_active`**: true[cite: 36]
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true (Radar shadow breaks if it takes damage, discharges weapons, or drops a payload)[cite: 36]
* **`stealth_recovery_delay_seconds`**: 5 seconds (Automatically recovers full radar immunity after 5 consecutive seconds of not taking damage, not firing, and not dropping payloads)[cite: 36]

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
* **`requires_recon_telemetry`**: false
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 15}}[cite: 36]
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
* **`special_utility_throughput`**: Complete radar immunity allowing stealth infiltration and sabotage strikes against enemy Recon Probes[cite: 36].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Stealth Infiltrator & Recon Hunter)[cite: 36]
* **`target_prioritization`**: Actively seeks out and targets enemy Recon Probes painted by the friendly fleet array[cite: 36].
* **`transition_triggers`**: 
  * Fights to the death once engaged (no retreat protocol)[cite: 36].
  * Decloaks and breaks radar immunity if taking damage, firing weapons, or dropping payloads; recovers cloak after 5 idle seconds[cite: 36].
* **`spatial_loop`**: Uses environmental obstacles (asteroids, structures) and stays outside enemy sightlines to remain completely undetected while stalking its target, utilizing point-blank ambush protocols since enemy Recon Probes cannot trigger evasion until the Phantom actively fires or takes damage[cite: 36].



# Unit Configuration: Plasma Skimmer (`plasma-skimmer`)

## 1. Core Identification & General Stats
* **`unit_class`**: Plasma Skimmer[cite: 39]
* **`weight_class`** (1W–5W): 2W (Light / Utility)[cite: 40]
* **`ai_default_state`**: GUARD (Unarmed Industrial Harvester / Movement Anchor)[cite: 39]
* **`vision_range`** (Meters): 600m (Standard visual range)[cite: 39, 40]
* **`aggro_range`** (Meters): 300m
* **`aggro_threat_weight`**: 0.2
* **`retreat_morale_threshold`**: Shields broken (0% shield triggers immediate abort and retreat to Flagship Port Docking Bay)[cite: 39]
* **`squad_cohesion_leash_range`** (Meters): 150m (Squad enters dedicated escort formation around the Skimmer)[cite: 39]

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 300 HP (Rank C Shields)[cite: 40]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull; reinforced containment plating)[cite: 39, 40]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 39]
* **`quadrant_shield_pools_enabled`**: false
* **`quadrant_hull_pools_enabled`**: false
* **`shield_regen_rate`** (HP/sec): 15 HP/sec
* **`shield_recharge_delay_ticks`**: 45 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.10
* **`armor_hardness_rating`**: Rank B[cite: 40]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"plasma_siphon": "standard", "containment_plating": "reinforced"}[cite: 39]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 0.4 (Rank D Velocity / Slow & Heavy)[cite: 39, 40]
* **`strafing_speed`**: 0.3
* **`turn_rate`**: 1.0
* **`angular_velocity`**: 0.8
* **`lateral_thrust_power`**: 0.5
* **`reverse_thrust_power`**: 0.5
* **`drift_coefficient`**: 0.6
* **`acceleration_curve`**: Sluggish
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 2 (Rank D / High-Vacuum Magnetic Plasma Siphon)[cite: 40]
* **`max_cooldown`** (Ticks): 45 Ticks
* **`projectile_range`** (Meters): 150m
* **`projectile_speed`**: N/A (Magnetic siphon tether)
* **`optimal_range`** (Meters): 100m
* **`max_range`** (Meters): 150m
* **`engagement_range_cap`** (Meters): 200m
* **`ammo_capacity`**: Cargo Containment Capacity (100%)[cite: 39]
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 1.0
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 1.0
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (Harvesting cycle)
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: Continuous magnetic siphon tether
* **`max_thermal_capacity`**: 150.0
* **`thermal_dissipation_rate`**: 10.0 / sec
* **`power_grid_allocation_weight`**: 0.9

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.0
* **`sensor_resolution_tier`**: Standard visual range (600m); dependent on Recon Probe telemetry to locate gas clouds/plasma nodes in Radar Fog[cite: 39, 40]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: false
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: Resource Type 3 (Plasma Gas) and Resource Type 4 (Volatile Elements)[cite: 39]
* **`requires_recon_telemetry`**: true (Incapable of locating gas clouds or plasma nodes in Radar Fog without active Fleet Array telemetry from a Recon Probe)[cite: 39]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 20}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: false
* **`port_docking_bay_status`**: true (Returns to Flagship Port Docking Bay to deposit materials)[cite: 39]
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: false
* **`special_utility_throughput`**: Rank S extraction rate via High-Vacuum Magnetic Plasma Siphon to rapidly siphon and compress energetic gases and fluids[cite: 39, 40].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Unarmed Industrial Harvester / Movement Anchor)[cite: 39]
* **`target_prioritization`**: Illuminated resource nodes (Plasma Gas / Volatile Elements) via Fleet Array telemetry[cite: 39].
* **`transition_triggers`**: 
  * If shields are completely broken (0%), immediately aborts operations and retreats to the Flagship's Port (Left) Docking Bay for repairs and shelter[cite: 39].
  * Does not perform panic evasive maneuvers when taking fire; remains 100% focused on its task until shields break completely[cite: 39].
* **`spatial_loop`**: 
  * **Stealth Pathing AI**: Plots vectors through asteroid fields and around environmental obstacles using friendly Recon Probe telemetry, actively avoiding enemy line-of-sight and combat zones on both outward and inward journeys[cite: 39].
  * **Harvesting Loop**: Acquires node -> paths stealthily (with escort squad following) -> siphons until cargo containment reaches 100% capacity -> offloads directly to the nearest Supply Tender in the field (or returns to Flagship Port Docking Bay if carrying capital construction resources, needing repairs, or manually recalled)[cite: 39].



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



# Unit Configuration: Viper Interceptor (`viper`)

## 1. Core Identification & General Stats
* **`unit_class`**: Viper Interceptor[cite: 46]
* **`weight_class`** (1W–5W): 1W (Ultra-Light / Scout)
* **`ai_default_state`**: SEEK (Light Dogfighter & Swarm Corral Unit)[cite: 46]
* **`vision_range`** (Meters): 600m (Standard visual screen range; relies on Recon units to spot targets further out)[cite: 46]
* **`aggro_range`** (Meters): 600m[cite: 46]
* **`aggro_threat_weight`**: 0.7
* **`retreat_morale_threshold`**: 0.0 (Fights to the death to maintain the corral; no retreat protocol)[cite: 46]
* **`squad_cohesion_leash_range`** (Meters): 150m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 100 HP (Unified Pool)[cite: 46]
* **`hull_base`** (HP): 50 HP (Unified Pool)[cite: 46]
* **`quadrant_shielding_enabled`**: false (Unified Pool; no directional quadrants)[cite: 46]
* **`quadrant_shield_pools_enabled`**: false[cite: 46]
* **`quadrant_hull_pools_enabled`**: false[cite: 46]
* **`shield_regen_rate`** (HP/sec): 10 HP/sec
* **`shield_recharge_delay_ticks`**: 30 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.05
* **`armor_hardness_rating`**: Rank D
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"twin_lasers": "standard", "engines": "standard"}[cite: 46]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 2.8 (Rank S Absolute Maximum / Extremely fast, outpacing the Flagship's max thruster boost)[cite: 46]
* **`strafing_speed`**: 2.5
* **`turn_rate`**: 4.5 (Very high turn rate and lateral acceleration for rapid directional changes)[cite: 46]
* **`angular_velocity`**: 4.0
* **`lateral_thrust_power`**: 2.5
* **`reverse_thrust_power`**: 2.0
* **`drift_coefficient`**: 0.15
* **`acceleration_curve`**: Snappy
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 60 DPS (Twin Light Lasers; 10 damage per hit at a fast 0.5s fire rate)[cite: 46]
* **`max_cooldown`** (Ticks): 10 Ticks
* **`projectile_range`** (Meters): 400m[cite: 46]
* **`projectile_speed`**: 600 m/s
* **`optimal_range`** (Meters): 300m
* **`max_range`** (Meters): 400m[cite: 46]
* **`engagement_range_cap`** (Meters): 400m[cite: 46]
* **`ammo_capacity`**: Infinite
* **`initial_ordnance_capacity`**: 0
* **`turret_traverse_speed`**: 5.0
* **`weapon_dispersion_bloom`**: 0.02
* **`projectile_tracking_capability`**: 0.9
* **`shield_penetration_factor`**: 0.0 (Shields take 100% of damage until depleted, then damage bleeds to hull)[cite: 46]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited
* **`barrel_cooling_duration`**: 0.5 seconds
* **`burst_salvo_cooldown`**: 10 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 100.0
* **`thermal_dissipation_rate`**: 20.0 / sec
* **`power_grid_allocation_weight`**: 0.6

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 0.4 (Ultra-Light dogfighter profile)
* **`sensor_resolution_tier`**: Standard visual screen range (600m; relies on Recon units to spot targets further out)[cite: 46]
* **`jamming_susceptibility`**: 0.5
* **`target_lock_time`**: 0.2s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE
* **`requires_recon_telemetry`**: true (Relies on Recon units to spot targets further out)[cite: 46]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 10}}
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
* **`special_utility_throughput`**: Swarm corrifing / "Cut the Pie" physical boxing to prevent enemy forward advancement[cite: 46].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Light Dogfighter & Swarm Corral Unit)[cite: 46]
* **`target_prioritization`**: Enemy advance vectors and strike units within engagement range.
* **`transition_triggers`**: 
  * Fights to the death to maintain the corral; no retreat protocol[cite: 46].
* **`spatial_loop`**: 
  * **Corral / "Cut the Pie" Loop**: Flies in at maximum speed until reaching weapons range, then aggressively strafes in a semi-circle directly in front of the enemy's forward trajectory, creating a physical wall of swarm fighters to box the enemy in and prevent forward advancement[cite: 46].



# Unit Configuration: Vortex Minelayer (`vortex-minelayer`)

## 1. Core Identification & General Stats
* **`unit_class`**: Vortex Minelayer[cite: 49]
* **`weight_class`** (1W–5W): 3W (Medium / Frigate)[cite: 49]
* **`ai_default_state`**: GUARD (Heavy Spatial Chokepoint Control, Area Denial & Gravity Disruption)[cite: 49]
* **`vision_range`** (Meters): 600m (Standard visual range)[cite: 49]
* **`aggro_range`** (Meters): 600m[cite: 49]
* **`aggro_threat_weight`**: 0.8
* **`retreat_morale_threshold`**: Critical threshold (breaks away to the nearest active port vessel for repairs when health drops)[cite: 49]
* **`squad_cohesion_leash_range`** (Meters): 250m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 1,500 HP (Rank B Shields)[cite: 49]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull; heavy 3W flat-disc chassis with reinforced plating)[cite: 49]
* **`quadrant_shielding_enabled`**: false (Unified Pool)[cite: 49]
* **`quadrant_shield_pools_enabled`**: false[cite: 49]
* **`quadrant_hull_pools_enabled`**: false[cite: 49]
* **`shield_regen_rate`** (HP/sec): 30 HP/sec
* **`shield_recharge_delay_ticks`**: 60 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.15
* **`armor_hardness_rating`**: Rank B[cite: 49]
* **`ablative_plating_durability`**: 0
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"deployment_chutes": "standard", "omnidirectional_thrusters": "standard"}[cite: 49]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.0 (Rank C Velocity / Medium Speed)[cite: 49]
* **`strafing_speed`**: 1.0 (Omnidirectional thrusters allow independent strafing and rotation)[cite: 49]
* **`turn_rate`**: 2.0
* **`angular_velocity`**: 1.8
* **`lateral_thrust_power`**: 1.5
* **`reverse_thrust_power`**: 1.2
* **`drift_coefficient`**: 0.3
* **`acceleration_curve`**: Standard
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: false
* **`is_stationary_landmark_bound`**: false

## 4. Combat Output & Ballistics
* **`dps`**: 50 shield damage per mine (Rank C equivalent / Graviton Implosion Mine System, 50 mine cache, 0 hull damage)[cite: 49]
* **`max_cooldown`** (Ticks): 30 Ticks
* **`projectile_range`** (Meters): Mine deployment range
* **`projectile_speed`**: N/A (Stationary spatial traps)
* **`optimal_range`** (Meters): 300m
* **`max_range`** (Meters): 600m[cite: 49]
* **`engagement_range_cap`** (Meters): 600m[cite: 49]
* **`ammo_capacity`**: 50 Graviton Mines (manufactured using Graviton Cores, Metal, and Plasma Gas)[cite: 49]
* **`initial_ordnance_capacity`**: 50 mines (100%)[cite: 49]
* **`turret_traverse_speed`**: 3.0
* **`weapon_dispersion_bloom`**: 0.05
* **`projectile_tracking_capability`**: 1.0 (Proximity trigger)[cite: 49]
* **`shield_penetration_factor`**: 1.0 (Rank C damage to shields / 0 damage to hull; fries energy shielding while leaving physical ship structures untouched)[cite: 49]
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: Unlimited (Mine cache limited)
* **`barrel_cooling_duration`**: 1 second
* **`burst_salvo_cooldown`**: 30 Ticks
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 250.0
* **`thermal_dissipation_rate`**: 20.0 / sec
* **`power_grid_allocation_weight`**: 0.85

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 2.5 (Flat-disc frigate profile)[cite: 49]
* **`sensor_resolution_tier`**: Standard visual range (600m); tracks active mine fields and relays spatial data back to Fleet Array[cite: 49]
* **`jamming_susceptibility`**: 0.3
* **`target_lock_time`**: 0.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Mine cache reloaded by Supply units or Flagship)[cite: 49]
* **`requires_recon_telemetry`**: true (Anchored directly to active Recon Drones for routing and sowing)[cite: 49]
* **`repair_resource_requirement_mask`**: {"standard_repair": {"metal": 30}}[cite: 49]
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: true (Anchored directly to active Recon Drones rather than standard combat squads)[cite: 49]
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 5 seconds[cite: 49]
* **`warp_canister_capacity`**: 0
* **`emergency_warp_evacuation_target`**: true
* **`special_utility_throughput`**: Graviton Vortex pulls enemy units inward for 5 seconds, disrupting movement, stripping 50 shield points per mine, and forcing stealth Phantom units out of cloak into radar telemetry[cite: 49].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: GUARD (Heavy Spatial Chokepoint Control & Area Denial)[cite: 49]
* **`target_prioritization`**: Active patrol routes between anchored Recon units and known enemy approach vectors.
* **`transition_triggers`**: 
  * If health drops to critical thresholds, breaks away to the nearest active port vessel for repairs[cite: 49].
  * When mine cache is depleted, seeks out nearest Supply unit carrying required resources (Graviton Cores, Metal, Plasma Gas); falls back to Flagship if no Supply unit is available[cite: 49].
* **`spatial_loop`**: 
  * **Predictive Sowing AI**: Constantly patrols between its anchored Recon unit and known enemy positions, liberally sowing staggered lines of graviton mines directly in the path between the recon sensor and incoming enemy forces[cite: 49].
  * **Vortex Mechanics**: Proximity triggers initiate a 5-second spatial implosion pulling units to the center, grouping them tightly and stripping shields while breaking Phantom stealth visibility for the full 5-second detonation window[cite: 49].



# Unit Configuration: Relay Warp Frigate (`warp-frigate`)

## 1. Core Identification & General Stats
* **`unit_class`**: Relay Warp Frigate[cite: 54]
* **`weight_class`** (1W–5W): 5W (Super-Heavy / Capital)[cite: 54]
* **`ai_default_state`**: SEEK (Super-Heavy Strategic Jump Anchor & Mobile Wormhole Generator)[cite: 54]
* **`vision_range`** (Meters): 1,500m (Extended radar/telemetry range acting as secondary tactical relay node)[cite: 54]
* **`aggro_range`** (Meters): 1,500m[cite: 54]
* **`aggro_threat_weight`**: 0.9
* **`retreat_morale_threshold`**: 0.0 (Super-heavy stationary anchor; does not retreat. Collapses inward, permanently closing active wormholes if critically compromised)[cite: 54]
* **`squad_cohesion_leash_range`** (Meters): 300m

## 2. Vitals, Health & Shield Systems
* **`shield_base`** (HP): 10,000 HP (Rank S Shields; massive high-capacity energy shield grid)[cite: 54]
* **`hull_base`** (HP): 2,000 HP (Rank B Hull; reinforced to withstand extreme gravitational stress of localized wormhole generation)[cite: 54]
* **`quadrant_shielding_enabled`**: true (Capital-grade quadrant pool)[cite: 54]
* **`quadrant_shield_pools_enabled`**: true[cite: 54]
* **`quadrant_hull_pools_enabled`**: false[cite: 54]
* **`shield_regen_rate`** (HP/sec): 100 HP/sec
* **`shield_recharge_delay_ticks`**: 90 Ticks
* **`directional_shield_arc`** (Degrees): 360
* **`armor_mitigation`**: 0.25
* **`armor_hardness_rating`**: Rank S[cite: 54]
* **`ablative_plating_durability`**: 300
* **`asymmetric_vulnerability_enabled`**: false
* **`rear_hull_boost_scaling_enabled`**: false
* **`subsystem_vulnerability_mask`**: {"quantum_wormhole_generator": "standard", "anchor_grid": "reinforced"}[cite: 54]

## 3. Movement, Speed & Physics Dynamics
* **`speed`** (Base Velocity): 1.8 in transit (Rank B Velocity); shifts to 0 when anchored (Rank D stationary)[cite: 54]
* **`strafing_speed`**: 1.0 in transit / 0 anchored
* **`turn_rate`**: 0.8
* **`angular_velocity`**: 0.6
* **`lateral_thrust_power`**: 0.8
* **`reverse_thrust_power`**: 0.5
* **`drift_coefficient`**: 0.8
* **`acceleration_curve`**: Sluggish
* **`aft_quadrant_propulsion_penalty`**: false
* **`is_stationary_after_deployment`**: true (Anchors 5W mass directly to local spatial grid upon reaching target Recon Drone)[cite: 54]
* **`is_stationary_landmark_bound`**: true[cite: 54]

## 4. Combat Output & Ballistics
* **`dps`**: 0 (Rank D / Unarmed Quantum Wormhole Generator)[cite: 54]
* **`max_cooldown`** (Ticks): 0
* **`projectile_range`** (Meters): 0
* **`projectile_speed`**: N/A
* **`optimal_range`** (Meters): 0
* **`max_range`** (Meters): 1,500m[cite: 54]
* **`engagement_range_cap`** (Meters): 1,500m[cite: 54]
* **`ammo_capacity`**: 10 Warp Canisters (each jump consumes 1 canister; replenished by Supply Tenders)[cite: 54]
* **`initial_ordnance_capacity`**: 10 canisters (100%)[cite: 54]
* **`turret_traverse_speed`**: 0
* **`weapon_dispersion_bloom`**: 0.0
* **`projectile_tracking_capability`**: 0.0
* **`shield_penetration_factor`**: 0.0
* **`front_quadrant_weapon_interlock`**: false
* **`sustained_fire_duration_limit`**: 0
* **`barrel_cooling_duration`**: 0
* **`burst_salvo_cooldown`**: 0
* **`beam_raycast_duration`**: 0
* **`max_thermal_capacity`**: 500.0
* **`thermal_dissipation_rate`**: 30.0 / sec
* **`power_grid_allocation_weight`**: 1.0 (Maximum capital power draw dedicated to wormhole stability)

## 5. Radar, Sensor & Stealth Systems
* **`radar_cross_section`**: 10.0 (Super-heavy capital profile)[cite: 54]
* **`sensor_resolution_tier`**: Extended telemetry range (1,500m secondary tactical relay feeding structural data back to Flagship through Fleet Array)[cite: 54]
* **`jamming_susceptibility`**: 0.1
* **`target_lock_time`**: 1.5s
* **`radar_immunity_active`**: false
* **`shield_gated_stealth_threshold`**: 0.0
* **`decloak_on_action_flag`**: true
* **`stealth_recovery_delay_seconds`**: 0

## 6. Logistics, Harvesting & Special Systems
* **`resource_harvesting_type`**: NONE (Consumes Warp Canisters synthesized from Graviton Core, Isotope, and Ore)[cite: 54]
* **`requires_recon_telemetry`**: true (Locks onto active Recon Drones to anchor spatial jump gates)[cite: 54]
* **`repair_resource_requirement_mask`**: {"capital_repair": {"metal": 100, "exotic_crystals": 20, "rare_isotopes": 10}}
* **`requires_anchor_drone`**: false
* **`requires_recon_anchor`**: true (Selects an active Recon Drone via radial UI to lock deployment destination)[cite: 54]
* **`port_docking_bay_status`**: false
* **`starboard_deployment_bay_status`**: false
* **`salvageable_upon_destruction`**: true
* **`cryo_gas_radius`**: 0
* **`cryo_effect_duration`**: 0
* **`graviton_vortex_duration`**: 0
* **`warp_canister_capacity`**: 10 Warp Canisters[cite: 54]
* **`emergency_warp_evacuation_target`**: true (Retreating units use warp gate to safely evacuate back to port if Frigate is closer than active Command/Port vessel)[cite: 54]
* **`special_utility_throughput`**: Quantum Wormhole Generator maintaining 10 warp canisters for frontline squad/battalion deployment, Flagship manual jumps, and fleet towing[cite: 54].

## 7. AI Behavior & State Machine
* **`state_machine_type`**: SEEK (Super-Heavy Strategic Jump Anchor & Fleet Deployment Nexus)[cite: 54]
* **`target_prioritization`**: Designated active Recon Drones for spatial anchoring and wormhole generation[cite: 54].
* **`transition_triggers`**: 
  * If shields drop and hull is critically compromised, collapses inward and permanently closes active wormholes/warp channels[cite: 54].
  * Dry-Dock State: If internal Warp Canister cache drops to 0, Frigate becomes unstable, is removed as a retreat route, and greys out on manual warp selection wheels until a Supply Tender replenishes canisters[cite: 54].
* **`spatial_loop`**: 
  * **Destination Anchoring Loop**: Vectors toward selected Recon Drone at Rank B speed -> stops and locks permanently stationary within drone's 600m visual range -> acts as a frontline deployment nexus for squads/battalions routed through the warp gate[cite: 54].
  * **Fleet Interfacing**: Supports emergency unit evacuation, Flagship manual warp selection via specialized radial UI, and fleet towing synchronization[cite: 54].
