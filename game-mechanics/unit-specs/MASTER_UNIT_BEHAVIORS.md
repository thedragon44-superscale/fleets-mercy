# Master Unit & Structure Specifications (`MASTER_UNIT_BEHAVIORS.md`)

## 1. Aegis Repair Corvette (2W)[cite: 33]
* **Role & Weight Class**: 2W Support Corvette. Role: In-Flight Field Maintenance, Shattered Shield Restoration & Combat Triage[cite: 33].
* **Vitality & Mitigation**: Rank A Shields / Rank D Hull (Unified Pool). Features an oversized, high-capacity shield generator protecting its fragile physical frame. **Retreat Protocol**: Never retreats due to low health; fights and heals to the death, only breaking formation when its resource cache is completely depleted[cite: 33].
* **Movement & Evasion**: Rank C Speed (Medium speed). Highly stabilized vectoring allows it to constantly orbit its anchored target, actively positioning friendly units as "meat-shields" between itself and enemy combatants[cite: 33].
* **Vision, Radar & Telemetry**: Standard 600m visual range. Operates on a strict closed-loop telemetry network monitoring only its specific anchored unit, squad, battalion, "buddy," or port ship (blind to wider fleet triage needs)[cite: 33].
* **Utility Systems & Resource Dependencies**: Dual Nanite Repair Beams (Rank S repair) restoring hulls and reconstructing permanently shattered 0 HP shields. Standard repairs consume **Metal**; capital subsystem repairs (crippled thrusters) require **Metal, Exotic Crystals, and Rare Isotopes**[cite: 33].
* **AI Loop & Logistics**: Trails slightly behind its anchored frontline to continuously patch hulls and cycle shields. When its internal cache runs dry, it breaks anchor to pathfind to the nearest Supply Tender before resuming its post[cite: 33].

## 2. Aegis Wall (5W)
* **Role & Weight Class**: 5W Super-Heavy Capital Vanguard. Role: Projected Directional Shield Barrier & Battalion Linchpin.
* **Vitality & Mitigation**: Rank S Directional Front Shield (180-degrees with massive passive regeneration) / Rank D Hull & exposed rear 180-degrees. **Retreat Protocol**: Permanently shatters if its primary directional shield hits 0%, triggering an immediate retreat to the nearest active port vessel.
* **Movement & Evasion**: Rank D Speed (Super-heavy mass). Sluggish acceleration, utilizing lateral and reverse thrusters with rotational locking to face hostile concentrations.
* **Vision, Radar & Telemetry**: Standard 600m visual range. Uses Fleet Array telemetry to calculate hostile firing lines relative to anchored friendly units.
* **Utility Systems & Resource Dependencies**: 180-Degree Directional Energy Shield Emitter (Rank S defense output, 0 DPS combat damage). Creates a physical collision box large enough to shelter an entire squad or multiple medium units.
* **AI Loop & Logistics**: Dynamic Intercept AI. Squads path normally while the Wall actively thrusts its massive 5W frame between moving allies and incoming enemy hostiles. Acts as a vanguard linchpin or "Buddy" anchor for slow, high-value units.

## 3. Assault Gunship (2W)
* **Role & Weight Class**: 2W Strike Fighter. Role: High-Speed Subsystem Strafing, Logistics Interdiction & Escort Harassment.
* **Vitality & Mitigation**: Rank C Shields / Rank C Hull (Unified Pool) with reinforced forward bulk plating. **Shield-Break Retreat**: Instantly aborts attack vectors and uses emergency thrusters to execute a mandatory retreat back to the nearest active repair/port vessel the moment its shields drop completely (does not interact with supply units).
* **Movement & Evasion**: Rank A Speed (High speed / high acceleration). Utilizes vector-thrust bow engines for inertial strafe loops and high-velocity hit-and-run passes.
* **Vision, Radar & Telemetry**: Standard 600m visual and telemetry range syncing with Recon arrays.
* **Utility Systems & Resource Dependencies**: Twin Rotary Kinetic Cannons (Rank C damage). Infinite C-Rank ammunition requiring zero resources, supply loops, or restocking.
* **AI Loop & Logistics**: Operates within combat squads/battalions as a rapid-response harassment unit, governed strictly by its shield-break disengagement rule.

## 4. Battalion Command Ship (5W)[cite: 18]
* **Role & Weight Class**: 5W Regional Fleet Command & Mobile Repair Hub[cite: 18].
* **Vitality & Mitigation**: Quadrant Shielding (Forward, Port, Starboard, Aft) with localized hull damage calculations. Capital-tier hull (Rank S) vulnerable to specialized snipers/flagships once shields breach[cite: 18]. Cannot repair itself (requires Aegis Repair units)[cite: 18]. Rear/aft damage compromises propulsion/strafing[cite: 18].
* **Movement & Evasion**: Rank C Speed (Massive inertia / slow acceleration); relies on Command Escort Ships to screen vulnerable vectors[cite: 18].
* **Vision, Radar & Telemetry**: Active command relay broadcasting a 1200m+ sensor bubble across the regional zone[cite: 18].
* **Utility Systems & Resource Dependencies**: Capital Battery Array, integrated automated drydock bays, and docking ports (shares Flagship weapon parity). Front shield drops when firing; front quadrant damage disables main guns[cite: 18]. Uses **Metal** exclusively for structural upkeep (no ammo handling)[cite: 18].
* **AI Loop & Logistics**: Automatically pairs with assigned Command Escort Ships and manages automated repair queues for docked assets[cite: 18].

## 5. Command Escort Ship (3W)[cite: 19]
* **Role & Weight Class**: 3W Capital Bodyguard & Vanguard Screen[cite: 19].
* **Vitality & Mitigation**: Rank B Shields / Rank B Hull (Unified Pool). Disengages to seek the nearest active port/flagship drydock when compromised[cite: 19].
* **Movement & Evasion**: Rank B Speed (Unflinching cruise speed). Cannot match flagship thruster boosts and must catch up post-burn[cite: 19].
* **Vision, Radar & Telemetry**: Passive radar relay extending telemetry around its protected command vessel (1200m engagement cap)[cite: 19].
* **Utility Systems & Resource Dependencies**: Medium Point-Defense & Interception Batteries with infinite ammunition (3-second fire cycle, 1-second cooldown)[cite: 19].
* **AI Loop & Logistics**: Anchors within standard squad range around its assigned command vessel, placing its hull between the protected ship and highest enemy concentrations[cite: 19].

## 6. Cryo-Flak Frigate (3W)[cite: 20]
* **Role & Weight Class**: 3W Anti-Swarm Area Denial Frigate[cite: 20].
* **Vitality & Mitigation**: Rank B Shields / Rank B Hull (Unified Pool). Disengages to seek port/drydock when compromised[cite: 20].
* **Movement & Evasion**: Rank B Speed (Moderate acceleration / standard mobility)[cite: 20].
* **Vision, Radar & Telemetry**: Passive radar relay with a strict 600m operational visual range[cite: 20].
* **Utility Systems & Resource Dependencies**: Cryo-Flak Batteries firing precision shells that detonate to lace a 75m radius with heavy cryogenic gas (lasting 10s). Melts 1W units, bypasses shields for Rank C hull damage, slows movement, increases cooldowns, and detonates incoming torpedoes[cite: 20]. Resupplied with **Metal and Volatile Gas** via Supply Tenders[cite: 20].
* **AI Loop & Logistics**: Blankets transit lanes with cryo gas to disrupt enemy timing and protect friendly assets[cite: 20].

## 7. Command Dreadnought (Flagship)[cite: 21]
* **Role & Weight Class**: Super-Heavy Capital Flagship & Fleet Spawner[cite: 21].
* **Vitality & Mitigation**: 7,500 Total Core Hull (1,875 per quadrant: Front, Rear, Port, Starboard) / 10,000 Total Shields (2,500 per quadrant) with 95% flat armor mitigation after shields drop. Subsystem destruction permanently disables specific bays or functions[cite: 21].
* **Movement & Evasion**: Cruising velocity 1.0 with a Spacebar Thruster Boost up to 2.5x (scales with Rear Hull health)[cite: 21].
* **Vision, Radar & Telemetry**: Central fleet command telemetry hub[cite: 21].
* **Utility Systems & Resource Dependencies**: Piercing Core Beam (continuous raycast sweeping via mouse cursor, 2,000m range, ~1,000 DPS, 3s duration / 10s cooldown, overpenetrates targets)[cite: 21].
* **AI Loop & Logistics**: Serves as the primary mobile command center and ultimate win/loss condition; handles manual recalls for squads, battalions, and harvesters[cite: 21].

## 8. Defensive Gun Emplacement (4W)[cite: 22]
* **Role & Weight Class**: 4W Stationary Strategic Bunker & Perimeter Defense[cite: 22].
* **Vitality & Mitigation**: Zero Shields / Rank S Hull. Transit requires a 1W Recon drone anchor to route and physically bolt onto landmarks (asteroids, moons, planets)[cite: 22]. Fights to the death[cite: 22].
* **Movement & Evasion**: Stationary post-deployment (Rank D mobility during transit only)[cite: 22].
* **Vision, Radar & Telemetry**: Static passive radar relay anchored around its fortified landmark (1000m engagement cap)[cite: 22].
* **Utility Systems & Resource Dependencies**: Fixed Heavy Artillery / Point-Defense Batteries (Rank A output, 3-second cooling period after 10s continuous fire)[cite: 22]. Resupplied by Supply Tenders delivering **Graviton Cores and Ore**[cite: 22].
* **AI Loop & Logistics**: Defends chokepoints autonomously based on Recon-illuminated sectors[cite: 22].

## 9. Ion Disabler (1W)[cite: 23]
* **Role & Weight Class**: 1W Light Escort & Subsystem Suppressor[cite: 23].
* **Vitality & Mitigation**: Rank C Shields / Rank D Hull (Unified Pool). Fights to the death[cite: 23].
* **Movement & Evasion**: Rank B Speed (High acceleration and responsive thrusters)[cite: 23].
* **Vision, Radar & Telemetry**: Standard visual range (500m weapon range)[cite: 23].
* **Utility Systems & Resource Dependencies**: Focused Pulsed Ion Cannon (Rank S Shield Damage, Rank D Hull Damage). Continuous hits freeze shield regeneration and disable secondary turrets for 2 seconds[cite: 23]. Infinite standard energy ammo.
* **AI Loop & Logistics**: Targets the specific enemy locked on by the squadmate with the highest hull damage output; enters "Buddy Mode" to shadow the fleet's highest hull-damage unit if unassigned[cite: 23].

## 10. Lancer Railgun Corvette (4W)[cite: 24]
* **Role & Weight Class**: 4W Long-Range Anti-Armor Sniper[cite: 24].
* **Vitality & Mitigation**: Rank C Shields / Rank C Hull (Unified Pool)[cite: 24].
* **Movement & Evasion**: Rank C Speed (Medium speed, maintaining maximum standoff distance)[cite: 24].
* **Vision, Radar & Telemetry**: Extended sniper targeting range utilizing Fleet Array and Recon telemetry[cite: 24].
* **Utility Systems & Resource Dependencies**: Heavy Sub-Atomic Railgun Array with an initial cache of 10 slugs (**Plasma, Metal, Exotic Crystals**)[cite: 24]. Resupplied directly in the field by Supply Units[cite: 24].
* **AI Loop & Logistics**: Tethered exclusively to Flagship telemetry (cannot join standard combat squads); targets high-value assets (Flagships, Command Ships, Harvesters, Supply Units, Recon, Warp Units)[cite: 24].

## 11. Mining Barge (2W)[cite: 25]
* **Role & Weight Class**: 2W Unarmed Industrial Harvester (Resource Collectors 1 & 2)[cite: 25].
* **Vitality & Mitigation**: Rank B Hull / Rank C Shields (Unified Pool). Retreats to Flagship's Port Docking Bay if shields completely break (0%)[cite: 25].
* **Movement & Evasion**: Rank D Speed (Slow & heavy). Uses Recon telemetry for stealth pathing around obstacles[cite: 25].
* **Vision, Radar & Telemetry**: Standard visual range (600m). Relies on Recon telemetry for pathfinding through fog[cite: 25].
* **Utility Systems & Resource Dependencies**: High-Yield Thermal Extraction Beam (Rank S extraction rate, Rank D combat damage). Extracts **Raw Ore (Type 1)** and **Heavy Metals (Type 2)**[cite: 25].
* **AI Loop & Logistics**: Acts as a movement anchor for assigned squads/battalions forming an escort formation. Offloads full cargo directly to the nearest Supply Tender in the field or Flagship port[cite: 25].

## 12. Phantom Transport (1W)[cite: 26]
* **Role & Weight Class**: 1W Stealth Infiltrator & Recon Hunter[cite: 26].
* **Vitality & Mitigation**: Rank B unified hull and shield pool. Fights to the death[cite: 26].
* **Movement & Evasion**: Rank C Speed (Measured and deliberate)[cite: 26].
* **Vision, Radar & Telemetry**: Completely immune to radar detection under standard conditions; only visible within 600m visual range[cite: 26].
* **Utility Systems & Resource Dependencies**: Anti-System Pulse Cannon / Sabotage Charge (Rank C damage, Rank D fire rate, point-blank range). Breaks radar immunity if it takes damage, fires weapons, or drops payloads (recovering cloak after 5 quiet seconds)[cite: 26].
* **AI Loop & Logistics**: Acts as a "Recon Hunter" seeking out enemy Recon Probes[cite: 26].

## 13. Plasma Skimmer (2W)[cite: 27]
* **Role & Weight Class**: 2W Unarmed Industrial Harvester (Resource Collectors 3 & 4)[cite: 27].
* **Vitality & Mitigation**: Rank B Hull / Rank C Shields (Unified Pool). Retreats to Flagship's Port Docking Bay if shields break (0%)[cite: 27].
* **Movement & Evasion**: Rank D Speed (Slow & heavy) utilizing Recon stealth pathing around obstacles and combat zones[cite: 27].
* **Vision, Radar & Telemetry**: Standard visual range (600m). Incapable of locating gas/plasma nodes in fog without active Fleet Array Recon telemetry[cite: 27].
* **Utility Systems & Resource Dependencies**: High-Vacuum Magnetic Plasma Siphon (Rank S extraction rate, Rank D combat damage). Extracts **Plasma Gas (Type 3)** and **Volatile Elements (Type 4)**[cite: 27].
* **AI Loop & Logistics**: Acts as movement anchor for escort squads. Offloads full cargo to the nearest Supply Tender in the field[cite: 27].

## 14. Recon Probe (1W)[cite: 28]
* **Role & Weight Class**: 1W Passive Forward Observer & Topographical Scout[cite: 28].
* **Vitality & Mitigation**: 20 Hull / 20 Shields (Unified pool). Extremely fragile; dies instantly to almost any direct hit[cite: 28]. Fights (scouts) to the death[cite: 28].
* **Movement & Evasion**: Speed 3.5 (Absolute fastest unit in fleet). Maximum lateral acceleration with near-instant directional reversal; flees directly away at max speed if enemies close within 1,000m[cite: 28].
* **Vision, Radar & Telemetry**: 2,500m detection radius (>4x standard range). Highlights HUD radar bubbles, renders environmental obstacle footprints, and displays enemy unit weight class symbols (1W, 2W, etc.)[cite: 28].
* **Utility Systems & Resource Dependencies**: Unarmed (0 damage). Provides critical economic and military telemetry required by harvesters and combat units[cite: 28].
* **AI Loop & Logistics**: Flies outward in a blind sweep pattern upon deployment, anchoring into high-speed orbits (~1,800m away) upon finding celestial bodies or targets[cite: 28].

## 15. Specter Radar Jammer (3W)[cite: 29]
* **Role & Weight Class**: 3W Electronic Warfare Support Frigate[cite: 29].
* **Vitality & Mitigation**: Rank A Shields / Rank C Hull (Unified Pool). Heavily shielded to absorb counter-intel tracing, but built with a fragile hull[cite: 29]. Follows standard fleet retreat rules[cite: 29].
* **Movement & Evasion**: Rank B Speed (Moderate acceleration / standard frigate mobility)[cite: 29].
* **Vision, Radar & Telemetry**: Standard frigate-tier range (600m). Suppresses enemy telemetry and masks signature returns within its operational footprint[cite: 29].
* **Utility Systems & Resource Dependencies**: Aetherium Electronic Cloaking Array (requires no resource upkeep). Grants 1W Phantom-level radar invisibility to squadmates[cite: 29].
* **AI Loop & Logistics**: Functions identically to support repair vessels; never leads directives, instead matching pace behind squadmates to passively blanket them in invisibility (requires Specter shields >75% and squad proximity)[cite: 29].

## 16. Supply Tender (2W)[cite: 30]
* **Role & Weight Class**: 2W Mobile Munitions Synthesizer & Logistics Courier[cite: 30].
* **Vitality & Mitigation**: Rank B Hull / Rank C Shields (Unified Pool). Reinforced containment frame; retreats to port if shields break (0%)[cite: 30].
* **Movement & Evasion**: Rank C Speed (Balanced speed for transit cycles). Avoids direct line-of-fire, utilizing obstacle cover and positioning friendly combat units between itself and hostiles[cite: 30].
* **Vision, Radar & Telemetry**: Standard visual range (600m). Uses Fleet Array telemetry to monitor raw cache levels in harvesters and ammunition depletion across combat units[cite: 30].
* **Utility Systems & Resource Dependencies**: On-Board Rapid Ordnance Synthesizer & Wireless Fabrication Tether (Rank S resupply speed). Converts raw harvested resources directly into specific finite ammunition on-the-fly[cite: 30].
* **AI Loop & Logistics**: Paths to harvesters to collect raw materials, matches depletion data via Fleet Array, and vectors directly to depleted combat units to deliver synthesized ordnance via tether[cite: 30].

## 17. Heavy Torpedo Bomber (4W)[cite: 31]
* **Role & Weight Class**: 4W Capital-Cracking Siege Platform[cite: 31].
* **Vitality & Mitigation**: Rank C Shields / Rank S Hull (Unified Pool). Immensely thick capital hull with thin screens; retreats to port/drydock when compromised[cite: 31].
* **Movement & Evasion**: Rank C Speed (Slow acceleration / measured inertia). Requires dedicated spacing and clear approach vectors[cite: 31].
* **Vision, Radar & Telemetry**: Standard 600m range; relies on external telemetry (Recon, Phantom relay, Command data) for out-of-sight targeting[cite: 31].
* **Utility Systems & Resource Dependencies**: Heavy Torpedo Bays (Rank A ordnance output). Fires rapid burst-fire salvos with a strict 2-second cooldown between volleys[cite: 31]. Deals low shield damage (requires stripped shields first) followed by devastating structural hull damage. Uses finite ammunition resupplied by Supply Tenders using **ore, isotopes, and plasma gas**[cite: 31].
* **AI Loop & Logistics**: Operates in strike squadrons or attached to Battalion Command Ships, executing rapid approach/salvo/loop cycles[cite: 31].

## 18. Viper Interceptor (1W)[cite: 32]
* **Role & Weight Class**: 1W Light Dogfighter & Swarm Corral Unit[cite: 32].
* **Vitality & Mitigation**: 50 Hull / 100 Shields (Unified pool, no directional quadrants). Shields take 100% damage until depleted, then bleed to hull[cite: 32]. Fights to the death[cite: 32].
* **Movement & Evasion**: Speed 2.8 (Extremely fast, outpacing Flagship max thruster boost). Very high turn rate and lateral acceleration[cite: 32].
* **Vision, Radar & Telemetry**: Standard visual screen range (600m). Relies on Recon units for extended spotting[cite: 32].
* **Utility Systems & Resource Dependencies**: Twin Light Lasers (10 damage per hit, fast 0.5s fire rate, 400m range). Infinite standard ammo[cite: 32].
* **AI Loop & Logistics**: "Cut the Pie" strategy. Flies at max speed to weapons range, then aggressively strafes in a semi-circle in front of enemy trajectories to box them in and prevent advancement[cite: 32].

## 19. Vortex Minelayer (3W)[cite: 33]
* **Role & Weight Class**: 3W Heavy Spatial Chokepoint & Area Denial Platform[cite: 33].
* **Vitality & Mitigation**: Rank B Shields / Rank B Hull (Unified Pool). Follows standard fleet retreat rules to active port vessels[cite: 33].
* **Movement & Evasion**: Rank C Speed (Medium speed). Omnidirectional thrusters allow independent inertial drift maneuvering and strafing[cite: 33].
* **Vision, Radar & Telemetry**: Standard visual range (600m). Tracks active minefields and relays spatial data to Fleet Array[cite: 33].
* **Utility Systems & Resource Dependencies**: Graviton Implosion Mine System (50 mine starting cache; manufactured from **Graviton Cores, Metal, and Plasma Gas**). Deals Rank C damage to shields / 0 to hull (no friendly fire)[cite: 33].
* **AI Loop & Logistics**: Anchored to active Recon Drones. Patrols between recon sensors and enemy positions to sow staggered lines of graviton mines. Triggers a 5-second spatial vortex pulling units inward and forcing stealthed Phantoms onto radar[cite: 33].

## 20. Relay Warp Frigate (5W)
* **Role & Weight Class**: 5W Super-Heavy Strategic Jump Anchor & Wormhole Generator.
* **Vitality & Mitigation**: Rank S Shields / Rank B Hull. Super-heavy stationary anchor; does not retreat. If critically compromised, it collapses inward permanently, closing active wormholes.
* **Movement & Evasion**: Rank B Speed in transit; drops to Rank D (Stationary / Extremely Slow) once anchored to a target Recon Drone.
* **Vision, Radar & Telemetry**: Extended telemetry range (1,500m) functioning as a secondary tactical relay node.
* **Utility Systems & Resource Dependencies**: Quantum Wormhole Generator & Stabilizer holding a maximum cache of **10 Warp Canisters** (each transit consumes 1 canister; replenished by Supply Tenders). 0 DPS combat damage.
* **AI Loop & Logistics**: Anchors to player-selected Recon Drones to facilitate frontline squad/battalion deployments, emergency retreat routing, and manual Flagship spatial jumps (towing all attached fleet units through the fold together).

## 21. Grav Extractor (2W)
* **Role & Weight Class**: 2W Unarmed Industrial Harvester (Resource Collector 3 of 3).
* **Vitality & Mitigation**: Rank B Hull / Rank C Shields (Unified Pool). Retreats to Flagship's Port Docking Bay if shields completely break (0%).
* **Movement & Evasion**: Rank D Speed (Slow & heavy). Uses Recon telemetry for stealth pathing around obstacles and enemy line-of-sight.
* **Vision, Radar & Telemetry**: Standard visual range (600m). Requires active Fleet Array Recon telemetry to locate gravity wells or exotic crystal deposits in fog.
* **Utility Systems & Resource Dependencies**: Gravitational Resonance Pulser / Tether (Rank S extraction rate, Rank D combat damage). Extracts **Exotic Crystals (Type 5)** and **Graviton Cores / Rare Isotopes (Type 6)**.
* **AI Loop & Logistics**: Acts as a movement anchor for assigned escort squads. Offloads full cargo directly to the nearest field Supply Tender or Flagship port dock.
