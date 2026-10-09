# Spec Sheet: Drifting Mineral Planetoids (ID: 02)

## 1. Overview & Classification
* **Environmental Category:** Dynamic Macro-Landmark (Moving Strategic Terrain & Secondary Resource Node)
* **Classification:** Drifting Mineral Planetoid / Asteroid-Planet Hybrid with Exposed Resource Veins
* **Mobility Status:** **Slow Drift** (Constant, predictable drift across map coordinates to shift tactical lanes over time).

## 2. Scale & Physics Interactions
* **Spatial Scale:** Medium macro-footprint with a radius of **300 to 600 units** (roughly 4–8 times the length of a flagship) on the 12,000-unit baseline map.
* **Pathfinding & Collision:** Acts as a solid physical barrier. Smaller units and corvettes must route around them; direct collisions cause structural damage or redirection.
* **Gravitational Well:** Exerts a weak localized gravity well, slightly influencing close-range orbital vectors and inertia without pulling ships out of transit.
* **Sensor & Line-of-Sight Rules:** 
  * **Physical / Direct LoS:** Blocks physical projectiles, direct-fire weapons, and visual targeting.
  * **Radar & Telemetry:** Does *not* create a radar shadow or blind sensor arrays. Sensor telemetry operates network-wide; if a radar-emitting unit detects an enemy, the fleet array registers it instantly. Sensors are only negatively affected or blinded by dedicated stealth/jamming units (e.g., Phantom units and radar jammers).

## 3. Surface Extraction & Economic Harvesting
* **Topography:** Features exposed surface craters and open crust fissures packed with valuable resources, lacking subterranean tunnel networks.
* **Primary Harvested Resources:** Specialized ores, rare crystals, or secondary **Metal** deposits.
* **Assigned Harvesting Vessel:** Mining Barges operate directly on the surface crust.
* **Vulnerability:** Because resources are exposed on the surface, Mining Barges are completely unprotected from incoming fire or collateral combat damage while extracting.

## 4. Performance & Destruction Constraints (CPU Optimization)
* **Structural Durability:** To maintain minimal CPU overhead, planetoids are **permanently indestructible**. They cannot be fractured, chipped away, or broken into smaller debris fields.
* **Resource Depletion:** Resource veins can be economically exhausted over time through prolonged mining, but the physical body and its collision mesh remain entirely static and intact for the duration of the match.
