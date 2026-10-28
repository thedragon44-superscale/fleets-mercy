# Space Tactics - Resource Mechanics, Node Architecture & Map Editor Data Specification

This specification defines the economic backbone of *Space Tactics*, establishing how macro-resources are cataloged, extracted, capped, replenished, and configured via the data-driven map editor viewport.

---

## 1. Macro-Resource Catalog & Extraction Mapping

| Resource ID | Resource Name | Harvesting Vessel | Primary Extraction Sources | Key Fleet & Payload Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Metal**[cite: 6] | Mining Barge (2W)[cite: 6] | Asteroid belts, rocky planetary crusts, and dense mineral moons[cite: 6]. | Aegis Repair Units, Battalion Command Ships, Flagships, and general baseline construction[cite: 6]. |
| **2** | **Ore**[cite: 6] | Mining Barge (2W)[cite: 6] | Heavy ore-rich asteroids, tectonic planetary crust deposits, and rocky celestial bodies[cite: 6]. | Defensive Gun Emplacements (paired with Graviton Cores for artillery ammo)[cite: 6]. |
| **3** | **Isotopes**[cite: 6] | Plasma Skimmer (2W)[cite: 6] | Gas giant upper atmospheres, volatile nebulae, and ice moon thermal vents[cite: 6]. | Torpedo Bombers (propellant/fuel), heavy power grids, and advanced ship drives[cite: 6]. |
| **4** | **Plasma Gas**[cite: 6] | Plasma Skimmer (2W)[cite: 6] | Deep-nebula pockets, highly pressurized gas vents, and stellar radiation clouds[cite: 6]. | Cryo-Flak Frigates (area-denial shells) and high-intensity plasma weapon systems[cite: 6]. |
| **5** | **Graviton Cores**[cite: 6] | Grav Extractor (2W)[cite: 6] | High-density space-time anomalies, core singularity nodes, and deep planetary rift deposits[cite: 6]. | Warp Units (spatial jump catalyst) and Defensive Gun Emplacements[cite: 6]. |

---

## 2. Node Yields, Rarity, Hard Caps & Replenishment Rules

To maintain a brisk, high-tension 5–10 minute match flow, resource nodes are balanced around scarcity, active extraction windows, and logistics friction.

* **Node Rarity & Distribution per Match:**
  * *Common Nodes (Metal & Ore):* 8–12 nodes per standard map. High volume, moderate extraction time.
  * *Uncommon Nodes (Isotopes & Plasma Gas):* 4–6 nodes per map. Positioned near hazardous terrain (Gas Giants, Nebula edges).
  * *Legendary Nodes (Graviton Cores):* 1–2 nodes per map. Placed near high-risk anomalies or singularities, requiring dedicated 2W Grav Extractor deployment.
* **Hard Caps & Initial Pool Sizes:**
  * Every node instantiates with a **Hard Cap Storage Pool** (e.g., standard Metal node = 10,000 units; Graviton core anomaly = 1,000 units).
  * Once drained to 0, the node enters a **Depleted State** unless configured otherwise.
* **Replenishment Mechanics:**
  * *Standard Nodes:* Do not naturally replenish during a 5–10 minute match, forcing players to expand outward or raid enemy supply lines.
  * *Active Anomaly / Gas Vent Nodes:* Feature a slow regeneration tick (e.g., +50 units every 30 seconds) to sustain late-game skirmishes without breaking early-game scarcity.

---

## 3. Extraction Flow & Game Pacing Integration

* **Extraction Speed & Cycles:**
  * Harvesters (Mining Barges, Plasma Skimmers, Grav Extractors) operate on an **Extraction Ticker** (extracting 50 units per 3-second cycle).
  * Cargo Capacity Limits: Harvesters hold a maximum of 500 units before requiring an offload run to a Supply Tender or Flagship Port Docking Bay.
* **The Logistics Pipeline:**
  * Harvesters cannot deliver materials straight to production queues; they must offload to **Supply Tenders (3W)** or port docking bays.
  * *Wreckage Salvage:* Destroyed units leave behind structural metal and active payload residue pools which can *only* be harvested by Supply Tenders, completing the closed economic loop.

---

## 4. Map Editor Viewport Data-Driven JSON Schema

To ensure the Map Editor Viewport remains fully data-driven, resource nodes are structured as serializable JSON objects placed across the map grid.

```json
{
  "node_id": "node_graviton_01",
  "resource_type": "graviton_cores",
  "category": "anomaly_singularity",
  "position": {
    "x": 4200.5,
    "y": -1250.0
  },
  "max_capacity": 1000,
  "current_stock": 1000,
  "extraction_rate_multiplier": 1.5,
  "is_replenishing": false,
  "replenishment_rate_per_min": 0,
  "collision_radius": 200.0,
  "visual_asset_id": "anomaly_rift_mesh_03"
}

-- Master table for deployed resource nodes in a match session
CREATE TABLE map_resource_nodes (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    node_template_id VARCHAR(64) NOT NULL,
    resource_type VARCHAR(32) NOT NULL, -- 'metal', 'ore', 'isotopes', 'plasma_gas', 'graviton_cores'
    coord_x FLOAT NOT NULL,
    coord_y FLOAT NOT NULL,
    max_capacity INT NOT NULL,
    current_stock INT NOT NULL,
    is_depleted BOOLEAN DEFAULT FALSE,
    replenishment_rate FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active harvester extraction logs
CREATE TABLE harvester_extraction_states (
    id SERIAL PRIMARY KEY,
    harvester_instance_id VARCHAR(64) NOT NULL,
    target_node_id INT REFERENCES map_resource_nodes(id) ON DELETE CASCADE,
    current_cargo_load INT DEFAULT 0,
    max_cargo_capacity INT DEFAULT 500,
    status VARCHAR(32) DEFAULT 'extracting' -- 'extracting', 'transit_to_tender', 'docked'
);

# Space Tactics - Wreckage, Salvage & Logistics Master Specification

Allowing Supply Tenders to scoop up intact, unspent ammunition crates from enemy wrecks—and reissue them to your own units **instantly** without waiting for the slow onboard synthesis ticker—creates high-value tactical objectives on the battlefield. Players aren't just fighting for territory or resource nodes; they are fighting to secure or deny high-tier logistics caches.

---

## 1. Data-Driven Unit Wreckage Profiles (`wreckage_profile`)
Instead of hardcoding metal yields by weight class, every unit template includes a data-driven `wreckage_profile` object in its database configuration and unit definition file. This defines its base structural salvage values and structural multipliers.

```json
{
  "unit_template_id": "lancer_railgun_corvette_4w",
  "weight_class": 4,
  "wreckage_profile": {
    "base_structural_metal": 1200,
    "structural_ore_yield": 400,
    "weight_scaling_multiplier": 1.2,
    "preserves_inventory_on_death": true,
    "detonation_risk_on_death": {
      "has_volatile_payload": true,
      "aoe_damage_radius": 150.0,
      "detonation_damage_multiplier": 0.25
    }
  }
}

## 2. The Mechanics of Wreckage Salvage & Logistics
* **Structural Salvage (The Baseline):** When a unit is destroyed, its frame leaves a debris field whose structural metal and ore are proportional to its dock weight class (1W through 5W), scaled by its template profile[cite: 8]. Supply Tenders break this down over time into storable raw materials[cite: 6].   
* **Pre-Made Ammo Caches (The Tactical Prize):**
  * If a unit dies with active ammunition left in its inventory (e.g., 6 out of 10 Lancer slugs, or 4 torpedoes), those items are dropped into the wreckage as **Pre-Made Crate Items** rather than raw resource ingredients[cite: 8].   
  * Supply Tenders collect these crates instantly upon reaching the wreck[cite: 8].   
  * When the Supply Tender returns to a port or services a friendly unit, it can transfer these pre-made crates **instantly** (0-second synthesis delay), bypassing the normal 1.5s–5.0s manufacturing times.
* **Volatile Payload Detonations (High-Risk Economy):**
  * To add tactical tension, units carrying high-explosive payloads (like Torpedo Bombers or Minelayers) have a data-driven *Detonation Risk on Death*.
  * When destroyed, their remaining ammo can trigger a secondary localized blast wave, damaging nearby units and destroying a small percentage of the salvageable wreckage.

---

## 3. PostgreSQL Database Schema for Wreckage & Debris Fields
To track dynamic wreckage fields spawned during active matches without clogging performance, we use a dedicated runtime table:

```sql
-- Active battlefield wreckage fields spawned upon unit destruction
CREATE TABLE match_wreckage_fields (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    destroyed_unit_name VARCHAR(128) NOT NULL,
    weight_class INT NOT NULL,
    coord_x FLOAT NOT NULL,
    coord_y FLOAT NOT NULL,
    
    -- Salvageable Structural Materials
    structural_metal_pool INT NOT NULL,
    structural_ore_pool INT NOT NULL,
    
    -- Pre-Made Ammunition/Payload Inventory (Stored as JSONB mapping ammo_type_id -> quantity)
    preserved_ammo_inventory JSONB NOT NULL DEFAULT '{}',
    
    -- Logistics State
    is_fully_salvaged BOOLEAN DEFAULT FALSE,
    assigned_tender_id VARCHAR(64) DEFAULT NULL, -- Track which 3W Supply Tender is en route
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active battlefield wreckage fields spawned upon unit destruction
CREATE TABLE match_wreckage_fields (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    destroyed_unit_name VARCHAR(128) NOT NULL,
    weight_class INT NOT NULL,
    coord_x FLOAT NOT NULL,
    coord_y FLOAT NOT NULL,
    
    -- Salvageable Structural Materials
    structural_metal_pool INT NOT NULL,
    structural_ore_pool INT NOT NULL,
    
    -- Pre-Made Ammunition/Payload Inventory (Stored as JSONB mapping ammo_type_id -> quantity)
    preserved_ammo_inventory JSONB NOT NULL DEFAULT '{}',
    
    -- Logistics State
    is_fully_salvaged BOOLEAN DEFAULT FALSE,
    assigned_tender_id VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
