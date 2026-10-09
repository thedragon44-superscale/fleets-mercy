# Space Tactics Development Update Log

## Map & Environment Scaling Framework (Agreed: Oct 2026)
* **Base Map Size**: Set to an expansive **12,000 units (meters)** for the initial flagship map during development and coding. Additional maps with varying combinations and dimensions will be implemented later.
* **Planet Sizing Strategy**:
  * **Terrestrial Worlds / Major Planets**: Radius of **1,000 to 1,500 units** (approx. 15-20x flagship length) to serve as heavy gravitational anchors and hard tactical cover.
  * **Gas Giants**: Radius of **3,000 to 4,000 units**, dominating quadrants and providing atmospheric drag or harvesting zones.
  * **Moons & Drifting Planetoids**: Radius of **300 to 600 units** for localized cover and mining operations.
* **Organic Ecology Distribution**:
  * **Core / Center**: High-value zones featuring major worlds, spatial singularity rifts, or dense derelict stations.
  * **Mid-Field (Buffer Zones)**: Dense asteroid belts and deep nebula plasma clouds to break line-of-sight and offer tactical stealth/cover.
  * **Outer Rim**: Comets, drifting mineral planetoids, and minor moons dedicated to safe expansion and resource gathering.

# Update Log: Environmental Structure 04 (Deep Nebula Plasma)

* **Status:** Fully defined and logic-locked.
* **Key Additions:**
  - Established map-dependent sizing and shape tracking on radar/HUD.
  - Implemented selective radar-blindness exclusively for units inside the nebula, while allowing radar to trace outer bounds and track targets beyond the cloud.
  - Configured visual range reductions by 50% for units operating in/looking into the nebula.
  - Applied speed and agility drag for 3W and lighter units, with explicit immunity granted to Plasma Skimmers (2W).
  - Confirmed zero hull/shield environmental damage.
  - Locked in resource contents: Plasma Gas (Type 4) and Isotopes (Type 3).
  - Established the logistics rendezvous loop: Skimmers dive deep into pockets to harvest, while Supply Tenders anchor just inside the outer perimeter of the nebula for safety cover, allowing high-speed skimmers to zip out to the edge for payload offloading.

# Coding Update Log: Environmental Structure 03 (Gas Giant Atmospheres)

* **Status:** System Implementation & Physics Logic Complete[cite: 3].
* **Technical Implementation Details:**
  - **Macro-Scale Bounding & Blockers:** Configured a stationary macro-footprint spanning a 3,000 to 4,000 world unit radius, mapping physical collision and line-of-sight blocking triggers for projectiles and direct-fire weapons[cite: 3].
  - **Concentric Layer Trigger Zones:** Established three distinct radial zones from center outward (0%–60% Core, 60%–85% Deep Atmosphere, 85%–100% Outer Atmosphere)[cite: 3].
  - **Layer 1 (Core Lethality Hook):** Coded instant-kill collision event for any unit crossing the 0%–60% boundary, bypassing normal hull health pools and yielding zero recoverable wreckage[cite: 3].
  - **Layer 2 (Deep Atmosphere Physics & AI Autonomy):** 
    - Implemented an AI pathfinding blacklist preventing autonomous units from entering the hazard zone unless overridden by a player-controlled Flagship[cite: 3].
    - Programmed a directional gravity vector pulling 1W (lightweight) units inexorably inward until destruction[cite: 3].
    - Applied movement and agility throttling modifiers to 2W+ and heavier units[cite: 3].
  - **Layer 2 (Stealth & Damage Over Time State):** Hooked continuous environmental damage directly to shield and exposed hull pools, while nullifying radar and telemetry visibility flags for all units inside the zone[cite: 3].
  - **Layer 3 (Outer Atmosphere / Skimming Zone):** Configured zero-drag vector parameters for 1W units and minor speed-dampening drag for 2W+ heavier assets without gravitational pull[cite: 3].
  - **Resource Node & Exposure Hooks:** Mapped volatile, heavy hydrogen, and fuel resource yield properties with open line-of-sight flags to enable external enemy raid targeting[cite: 3].

# Coding Update Log: Environmental Structure 02 (Drifting Mineral Planetoids)

* **Status:** System Implementation & Physics Logic Complete[cite: 4].
* **Technical Implementation Details:**
  - **Dynamic Mobility & Drift Mechanics:** Programmed a slow, constant, and predictable drift system across map coordinates to dynamically shift tactical lanes over the course of a match[cite: 4].
  - **Spatial Bounding & Collision Mesh:** Configured a medium macro-footprint with a radius spanning 300 to 600 world units[cite: 4]. Assigned solid physical collision properties forcing smaller units and corvettes to pathfind around the barrier, with direct impacts triggering structural damage or vector redirection[cite: 4].
  - **Localized Gravity Well:** Implemented a weak gravitational field modifier affecting close-range orbital vectors and ship inertia without pulling units out of active transit[cite: 4].
  - **Sensor & Line-of-Sight Rules:** 
    - Coded physical occlusion for projectiles, direct-fire weapons, and visual targeting pathways[cite: 4].
    - Configured the object so it *does not* generate radar shadows or blind sensor arrays, maintaining network-wide fleet telemetry unless acted upon by dedicated stealth or jamming units[cite: 4].
  - **Surface Extraction & Vulnerability Hooks:** Mapped surface craters and crust fissures to support Mining Barge operations for extracting specialized ores, rare crystals, or secondary Metal deposits[cite: 4]. Set extraction vulnerability parameters leaving harvesters entirely unprotected from incoming fire and collateral combat damage[cite: 4].
  - **CPU Optimization & Indestructibility State:** Enforced permanent structural indestructibility (disallowing fracturing, chipping, or debris generation) to maintain minimal CPU overhead[cite: 4]. Implemented economic resource exhaustion tracking to deplete veins over time while preserving the physical collision mesh as completely static and intact[cite: 4].

# Update Log: Environmental Structure 05 (Spatial Singularity Rifts)

* **Status:** Fully defined and logic-locked.
* **Key Additions:**
  - Configured core size to flagship scale with a precise 200-meter repulsion field radius.
  - Established that telemetry and radar arrays remain fully operational, preventing radar blindness in the zone.
  - Implemented active outward repulsion physics affecting 3W and lighter units to push them clear of the radius.
  - Programmed the **Grav Extractor (2W)** exception as the only free-moving unit capable of operating and holding position inside the 200-meter range.
  - Coded predictable projectile trajectory refraction for any kinetic fire entering the anomaly's radius.
  - Locked in resource yields: **Graviton Cores (Resource Type 5)**.
  - Established the logistics slingshot loop: Supply Tenders (3W) fight forward against the repulsion force to reach harvesters, then utilize the singularity's outward push as a high-speed exit slingshot upon payload collection.

# Update Log: Environmental Structure 06 (Moons & Satellites)

* **Status:** Fully defined and logic-locked.
* **Key Additions:**
  - Configured medium-to-large macro-footprints operating on slow, predictable orbital rotation around a parent Major World or Gas Giant.
  - Established physical pathfinding barriers and visual/direct line-of-sight interruption to support fleet masking and orbital ambushes.
  - Confirmed that moons do not create radar shadows or blind fleet sensor arrays, keeping network telemetry transparent.
  - Divided moons into two map archetypes: Resource-Bearing (featuring harvestable surface crust deposits for Mining Barges) and Barren (purely for tactical positioning and choke-point control).
  - Enforced permanent structural indestructibility for CPU optimization, while allowing economic resource exhaustion of surface deposits over time.

# Update Log: Environmental Structure 07 (Dense Asteroid Belts)

* **Status:** Fully defined and logic-locked.
* **Key Additions:**
  - Configured custom map variations including wide dense corridors, long narrow clusters, and compartmentalized field pockets.
  - Established strict navigational filtering: only light and medium-light units (1W and 2W) can navigate directly through the clusters, while 3W+ heavier units must route completely around them.
  - Enabled specialized support units (stealth, field-repair, supply tenders, and mining barges) utilizing avoidant behavior to use belts as protective sanctuary lanes.
  - Confirmed physical and visual line-of-sight blocking for ambush positioning, while maintaining network-wide radar and telemetry transparency without creating radar shadows.
  - Enforced permanent structural indestructibility to preserve tactical geometry and minimize CPU overhead.

# Update Log: Environmental Structure 09 (Comets)

* **Status:** Fully defined and logic-locked.
* **Key Additions:**
  - Configured high-speed transient motion with randomized edge-to-edge trajectories and zero persistent environmental residue.
  - Established randomized timing and frequency (averaging 5 to 9 appearances per match) with small physical masses and glowing, ephemeral tails.
  - Coded strict weight-class damage scaling on impact: instant destruction for 1W/2W units, heavy damage to shields and exposed hulls for 3W/4W units, and shield absorption or moderate hull damage for 5W capital assets.
  - Programmed automated AI evasion protocols allowing units to detect incoming comets via fleet arrays and scatter using distinct behavioral patterns.
  - Enabled tactical player agency to either actively dodge hazards or intentionally position heavy assets to use comet trajectories offensively.

# Update Log: Resource Economy & Salvage Mechanics

* **Status:** Fully defined and logic-locked.
* **Key Additions:**
  - Established a 5-tier macro-resource classification system (Metal, Ore, Isotopes, Plasma Gas, and Graviton Cores), mapping each material to specialized 2W harvesting barges/skimmers/extractors, extraction sources, storage logistics, and specific unit/payload dependencies[cite: 10].
  - Mapped specific economic flows, such as Metal for baseline construction and structural repairs[cite: 10], Ore paired with Graviton Cores for heavy gun emplacement ammunition[cite: 10], Isotopes for torpedo bomber propellant and heavy power grids[cite: 10], Plasma Gas for cryo-flak payloads and energy weapons[cite: 10], and Graviton Cores for warp units and advanced artillery[cite: 10].
  - Coded unit destruction wreckage composition rules: wrecks yield structural metal proportional to the destroyed unit's dock weight class (1W through 5W) alongside preserved active payload and ammunition residue[cite: 11].
  - Established exclusive recovery rights for Supply Tenders (3W), restricting combat, mining, and command ships from harvesting wreckage directly and enforcing a closed-loop logistics pipeline where tenders physically haul scrap back to processing hubs[cite: 11].


