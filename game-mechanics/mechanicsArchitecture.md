# Architecture: Core Game Mechanics

## 1. Directory Overview & System Purpose
The `game-mechanics` directory serves as the centralized source of truth for all systematic, physical, economic, and tactical rules governing the space strategy game. It is structured into three primary subdirectories:
* **`enviornment/`**: Macro-scale celestial bodies, spatial anomalies, and tactical hazard zones that dictate map-specific routing, line-of-sight, physics, and harvesting loops[cite: 8].
* **`resource-enonomy/`**: Definitions of raw materials, refined payloads, economic tracking, and material salvaging/wreckage mechanics[cite: 8].
* **`unit-specs/`**: Structural classification, weight classes (1W through 5W), capabilities, and tactical roles of all fleet assets[cite: 8].

---

## 2. Directory Structure & File Index

### `enviornment/`
Macro-scale tactical terrain elements with distinct physics and logistical loops[cite: 8]:
* `01-major-worlds-terrestrial-crusts.md` — Terrestrial planetary bodies and surface extraction zones[cite: 8].
* `02-drifting-mineral-planetoids.md` — Dynamic moving asteroid-planet hybrids with exposed surface veins[cite: 8].
* `03-gas-giant-atmospheres.md` — Concentric atmospheric zones, crushing core hazards, and high-altitude skimming[cite: 8].
* `04-deep-nebula-plasma.md` — Radar-blind plasma fields with inertia drag and skimmer/tender hand-off loops[cite: 8].
* `05-spatial-singularity-rifts.md` — Repulsive spatial anomalies, trajectory refraction, and extraction slingshots[cite: 8].
* `06-moons-satellites.md` — Secondary orbital bodies[cite: 8].
* `07-dense-asteroid-belts.md` — Clustered navigational obstacles and mining fields[cite: 8].
* `09-comets.md` — High-velocity transient environmental hazards[cite: 8].
* `features-list` — Comprehensive index of environmental feature triggers and flags[cite: 8].

### `resource-enonomy/`
* `resource-list.md` — Master classification of raw material tiers (Types 1 through 5: Metal, Ore, Isotopes, Plasma Gas, and Graviton Cores) paired with harvesting vessels, extraction sources, storage logistics, and specific unit dependencies[cite: 8, 10].
* `wreckage.md` — Rules for material recovery and salvage economies detailing unit destruction wreckage composition (structural metal scaled by dock weight and preserved active payload/ammunition residue) and exclusive recovery rights for Supply Tenders (3W)[cite: 8, 11].

### `unit-specs/`
* `unit-list.md` — Master index of all active fleet assets[cite: 8].
* `units-by-weight.md` — Categorization matrix for structural weight tiers (1W to 5W)[cite: 8].
* **Core Fleet Units:**
  * `flagship.md` — Command and flagship tier specifications[cite: 8].
  * `command-escort.md` — Fleet coordination and escort vessels[cite: 8].
  * `battalion-command.md` — Regional command asset specs[cite: 8].
  * `warp-frigate.md` — Long-range deployment and mobility units[cite: 8].
  * `assault-gunship.md` — Frontline combat assets[cite: 8].
  * `lancer-corvette.md` — Fast interceptor class[cite: 8].
  * `torpedo-bomber.md` — Heavy ordnance delivery assets[cite: 8].
  * `gun-emplacement.md` — Static defensive platforms[cite: 8].
  * `phantom.md` & `specter-jammer.md` — Stealth and electronic warfare units[cite: 8].
  * `recon.md` — Telemetry and sensor-array scouts[cite: 8].
  * `ion-disabler.md` — Electronic suppression and shield-neutralizing units[cite: 8].
  * `cryo-flak.md` & `vortex-minelayer.md` — Area-denial and crowd-control specialists[cite: 8].
  * `aegis-wall.md` & `aegis-repair.md` — Defensive barrier and field-repair units[cite: 8].
  * `viper.md` — Headhunter and escort combat assets.
* **Logistics & Harvesting Fleet:**
  * `mining-barge.md` — Surface crust extraction vessel[cite: 8].
  * `plasma-skimmer.md` — 2W volatile gas/isotope harvesting specialist (nebula-immune)[cite: 8].
  * `grav-extractor.md` — 2W singularity-interface harvesting specialist[cite: 8].
  * `supply-tender.md` — 3W mobile munitions synthesizer and logistics hub[cite: 8].

---

## 3. Core Design Pillars

### A. Weight Class Tiering (1W to 5W)
* **1W–2W (Light to Medium-Light):** Highly agile, often prioritized for specialized harvesting or scout roles[cite: 8]. Frequently subject to unique environmental forces (e.g., gas giant gravity pulls or nebula drag immunities)[cite: 8].
* **3W (Medium Logistics/Combat):** Baseline standard for mobile infrastructure like Supply Tenders; experiences proportional environmental penalties where applicable[cite: 8].
* **4W–5W (Heavy to Capital Assets):** Massive structural mass; resistant to minor physical displacement but fully impacted by major environmental hazards like core singularity repulsions or planetary crushing depths[cite: 8].

### B. Deterministic Environmental Interactions
* Environments are strictly programmatic, deterministic hazard zones rather than random cosmetic backdrops[cite: 8]. 
* Systems govern line-of-sight blocking, radar suppression, movement drag, ballistic trajectory refraction, and economic extraction loops to force deliberate tactical positioning and choke-point management[cite: 8].

### C. Resource Economy & Salvage Loops
* **Macro-Material Tiers:** Raw materials are categorized across five functional tiers (Metal, Ore, Isotopes, Plasma Gas, and Graviton Cores), each mapped to specific extraction sources, specialized 2W harvesting barges/skimmers/extractors, and unit/payload dependencies[cite: 10].
* **Wreckage and Recovery:** Destroyed units leave behind persistent scrap pools containing structural metal proportional to their weight class alongside preserved payload/ammunition residue, harvested exclusively by 3W Supply Tenders acting as recovery links[cite: 11].
