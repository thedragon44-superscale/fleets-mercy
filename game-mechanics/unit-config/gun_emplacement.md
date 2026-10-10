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
