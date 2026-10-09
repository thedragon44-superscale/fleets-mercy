# Fleets' Mercy: Comprehensive Implementation Guide & Master Roadmap

This document serves as the master coding specification and technical roadmap for implementing remaining core game mechanics, advanced combat statistics, unit AI behaviors, squad/battalion hierarchies, and environmental hazard physics into the backend and physics loops.

---

## Part 1: Database Schema Expansion (`unit_templates`)

To support immersive combat, precise ballistics, and distinct tactical feels, update the PostgreSQL `unit_templates` table to include granular numerical properties:

```sql
ALTER TABLE unit_templates 
ADD COLUMN strafing_speed NUMERIC(10,2) DEFAULT 1.0,
ADD COLUMN turn_rate NUMERIC(10,2) DEFAULT 0.05,
ADD COLUMN shield_regen_rate NUMERIC(10,2) DEFAULT 0.0,
ADD COLUMN armor_mitigation NUMERIC(10,2) DEFAULT 0.0,
ADD COLUMN projectile_range NUMERIC(10,2) DEFAULT 600.0,
ADD COLUMN projectile_speed NUMERIC(10,2) DEFAULT 18.0,
ADD COLUMN ammo_capacity INTEGER DEFAULT -1;
```

---

## Part 2: Squad & Battalion Command Hierarchies

### 1. Squad Mechanics (Micro-Formation & Triage)
* **Formation Anchoring**: Units assigned to squads (`Squads 1 through 4`) must maintain strict relative positioning around a squad leader or designated anchor (e.g., a "buddy" ship or heavy vanguard).
* **Shared Telemetry & Target Scoring**: Squad members must share a closed-loop target scoring matrix in `room.go`. If a squadmate takes heavy hull damage, light support units (like Ion Disablers) automatically shift focus to suppress the attacker.
* **Independent Disengagement**: Individual units evaluate retreat triggers independently (e.g., Assault Gunships fleeing at 0% shields) while maintaining squad cohesion for survivors.

### 2. Battalion Mechanics (Macro-Operations)
* **Regional Command Hubs**: Battalion Command Ships (5W) act as localized operational nodes, managing automated repair/resupply queues for all attached escort and support vessels within their 1,200m sensor bubble.
* **Escort Screening Vectors**: Command Escort Ships (3W) must automatically calculate incoming threat vectors toward the Battalion Command Ship or Flagship, dynamically forming an interception barrier.

---

## Part 3: Complete Unit AI Behavior Catalog to Code

1. **Aegis Repair Corvette (2W)**: Anchors to a targeted unit or squadmate; never retreats due to low health; actively positions friendly units as meat-shields; cycles between repairing hulls/shields and traveling to Supply Tenders when its resource cache is empty.
2. **Aegis Wall (5W)**: Dynamic Intercept AI; actively thrusts its 5W frame between moving allies and incoming enemy hostiles; shatters and retreats to port if its 180-degree front shield hits 0%.
3. **Assault Gunship (2W)**: Executes high-velocity hit-and-run strafing passes; strictly governed by shield-break disengagement (instantly aborts and retreats to port when shields reach 0%).
4. **Battalion Command Ship (5W)**: Anchors regional operations, pairs with Command Escort Ships, and manages automated repair queues.
5. **Command Escort Ship (3W)**: Bodyguard AI; patrols within standard squad range around its assigned command vessel, placing its hull between threats and the command ship.
6. **Cryo-Flak Frigate (3W)**: Area-denial AI; blankets transit lanes and choke points with cryo-gas to disrupt enemy timing and detonate incoming torpedoes.
7. **Command Dreadnought (Flagship)**: Central command hub controlled manually by the player via mouse raycasting and WASD/thruster inputs; handles manual squad recalls and spatial jumps.
8. **Defensive Gun Emplacement (4W)**: Stationary defense AI; bolt-on anchored by Recon drones to celestial bodies; fights to the death covering designated chokepoints.
9. **Ion Disabler (1W)**: Suppressor AI; targets the specific enemy locked on by the squadmate with the highest hull-damage output; enters "Buddy Mode" to shadow the fleet's primary damage dealer.
10. **Lancer Railgun Corvette (4W)**: Sniper AI; tethered exclusively to Flagship telemetry, maintaining maximum standoff distance to target high-value assets (flagships, command ships, harvesters, supply units, recon, warp units).
11. **Mining Barge (2W)**: Industrial harvester AI; extracts Metal and Ore from surface crusts; retreats to port if shields break; offloads directly to field Supply Tenders or Flagship port docks.
12. **Phantom Transport (1W)**: Stealth infiltrator/Recon hunter AI; stays cloaked until firing, taking damage, or dropping payloads; actively hunts enemy Recon Probes.
13. **Plasma Skimmer (2W)**: Nebula harvester AI; extracts Plasma Gas and Isotopes; utilizes Recon stealth pathing; offloads cargo to Supply Tenders parked at nebula perimeters.
14. **Recon Probe (1W)**: Scout AI; flies outward in a blind sweep pattern upon deployment, anchoring into high-speed orbits (~1,800m away) upon finding targets; flees directly away at max speed if enemies close within 1,000m.
15. **Specter Radar Jammer (3W)**: Electronic warfare AI; follows behind squadmates to passively blanket them in radar invisibility (requires shields >75% and squad proximity).
16. **Supply Tender (2W)**: Logistics AI; monitors raw cache levels and ammunition depletion across combat units via Fleet Array telemetry, pathing directly to units to deliver synthesized ordnance via wireless tethers.
17. **Heavy Torpedo Bomber (4W)**: Siege platform AI; executes rapid approach/salvo/loop cycles against stripped capital targets, requiring clear approach vectors.
18. **Viper Interceptor (1W)**: "Cut the Pie" swarm AI; flies at max speed to range, then aggressively strafes in semi-circles in front of enemy trajectories to box them in.
19. **Vortex Minelayer (3W)**: Area-denial AI; patrols between Recon sensors and enemy positions to sow staggered lines of graviton mines.
20. **Relay Warp Frigate (5W)**: Strategic warp anchor AI; drops to stationary anchor upon reaching a target Recon Drone to maintain quantum wormhole stability for squad deployments and Flagship jumps.
21. **Grav Extractor (2W)**: Singularity harvester AI; utilizes unique immunity to operate inside spatial singularity repulsion fields to extract Exotic Crystals and Graviton Cores.

---

## Part 4: Ammunition, Cooldowns, & Resource Logistics Matrix

* **Infinite Energy Weapons**: Standardized fire cycles with heat cooldowns for light lasers, rotary cannons, and point-defense systems requiring zero resource restocking.
* **Finite Ordnance Platforms**: Physical inventory tracking for heavy siege assets (e.g., Lancer railgun slugs, torpedoes, mine caches, warp canisters).
* **Supply Tender Field Resupply**: Automated manufacturing loops where Supply Tenders convert raw harvested materials into finite ammunition and deliver it via wireless fabrication tethers directly in the field.

---

## Part 5: Environmental Hazards & Physics Implementation Checklist (`physics.go` & `room.go`)

1. **Major Worlds & Terrestrial Crusts (ID: 01)**:
   * Code heavy gravitational wells (`gravity_radius = radius * 2.5`).
   * Implement cave-collapse triggers for heavy payloads fired at designated coordinates.
2. **Deep Nebula Plasma Fields (ID: 04)**:
   * Implement selective radar-blindness exclusively for units inside the cloud.
   * Configure visual range reductions by 50% for units operating in/looking into the nebula.
   * Apply speed and agility drag for 3W and lighter units, with explicit immunity granted to Plasma Skimmers (2W).
3. **Spatial Singularity Rifts (ID: 05)**:
   * Program a precise 200m active repulsion field pushing 3W and lighter units outward.
   * Implement the Grav Extractor (2W) exception to hold position inside the core.
   * Code predictable projectile trajectory refraction for kinetic fire entering the anomaly's radius.
4. **Comets (ID: 09)**:
   * Program high-speed transient motion with randomized edge-to-edge trajectories (5 to 9 appearances per match).
   * Code strict weight-class damage scaling on impact (instant destruction for 1W/2W; heavy damage for 3W/4W; shield absorption for 5W).
