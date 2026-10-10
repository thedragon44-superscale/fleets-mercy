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
