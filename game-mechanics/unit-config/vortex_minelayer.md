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
