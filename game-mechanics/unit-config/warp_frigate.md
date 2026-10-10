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
