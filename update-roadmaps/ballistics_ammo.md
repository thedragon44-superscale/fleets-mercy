# Space Tactics - Ballistics, Ammunition & Logistics Master Specification

This specification defines the finite resource pipelines, ammunition storage limits, synthesis recipes, ballistics physics, and database schema updates required for the ballistics and logistics engine.

---

## 1. Unit Ammunition Capacities & Storage Thresholds

Units are split between those with infinite energy reserves (e.g., Viper Interceptors, Ion Disablers, Assault Gunships) and those requiring strict, finite ammunition resupply via Supply Tenders.

| Unit Class | Weight Class | Ammunition / Payload Type | Max Storage Capacity | Initial Spawn Cache | Consumed Resources for Restock |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lancer Railgun Corvette** | 4W | Sub-Atomic Railgun Slugs | **10 Slugs** | 10 Slugs | Metal, Plasma Gas, Exotic Crystals |
| **Heavy Torpedo Bomber** | 4W | Capital Anti-Armor Torpedoes | **12 Torpedoes** | 12 Torpedoes | Ore, Isotopes, Plasma Gas |
| **Vortex Minelayer** | 3W | Graviton Implosion Mines | **50 Mines** | 50 Mines | Metal, Plasma Gas, Graviton Cores |
| **Cryo-Flak Frigate** | 3W | Cryogenic Flak Shells | **30 Shells** | 30 Shells | Metal, Volatile Gas |
| **Defensive Gun Emplacement** | 4W | Heavy Artillery Shells | **100 Rounds** | 100 Rounds | Ore, Graviton Cores |
| **Relay Warp Frigate** | 5W | Quantum Warp Canisters | **10 Canisters** | 10 Canisters | Exotic Crystals, Rare Isotopes, Graviton Cores |
| **Aegis Repair Corvette** | 2W | Repair Nanite Reserves | **500 Units** | 500 Units | Metal (Standard), Exotic Crystals & Isotopes (Subsystems) |

---

## 2. Resource-to-Ammo Recipe Matrix (Supply Tender Fabrication)

Supply Tenders convert raw harvested resources into finished finite ammunition via an On-Board Rapid Ordnance Synthesizer.

* **Railgun Slug (x1)**
  * *Recipe:* 150 Metal + 50 Plasma Gas + 25 Exotic Crystals
  * *Synthesis Time:* **1.5 seconds** per slug inside the Supply Tender.
* **Capital Torpedo (x1)**
  * *Recipe:* 200 Ore + 100 Isotopes + 75 Plasma Gas
  * *Synthesis Time:* **3.0 seconds** per torpedo.
* **Cryo-Flak Shell (x5 batch)**
  * *Recipe:* 100 Metal + 100 Volatile Gas
  * *Synthesis Time:* **2.0 seconds** per batch.
* **Graviton Mine (x5 batch)**
  * *Recipe:* 150 Metal + 75 Plasma Gas + 10 Graviton Cores
  * *Synthesis Time:* **2.5 seconds** per batch.
* **Warp Canister (x1)**
  * *Recipe:* 50 Exotic Crystals + 50 Rare Isotopes + 20 Graviton Cores
  * *Synthesis Time:* **5.0 seconds** per canister.

---

## 3. Projectile Ballistics & Weapon Behavior Rules

* **Sub-Atomic Railgun Slugs (Lancer Railgun Corvette - 4W):**
  * *Behavior:* High-velocity, hyper-linear projectile. Bypasses standard tracking delays.
  * *Damage Profile:* Extreme armor-piercing kinetic damage. Low shield impact, but overpenetrates unshielded quadrant hulls.
* **Capital Anti-Armor Torpedoes (Heavy Torpedo Bomber - 4W):**
  * *Behavior:* Self-propelled guided missiles with a 2-second ignition delay/cooldown. Cruising speed 1.5.
  * *Damage Profile:* Low shield impact (absorbed or deflected easily), but causes catastrophic structural hull damage on unshielded targets. Can be intercepted and destroyed in flight by Point-Defense batteries or Cryo-Flak detonations.
* **Cryo-Flak Shells (Cryo-Flak Frigate - 3W):**
  * *Behavior:* Arcing ballistic shell with a fuse timer. Detonates on target coordinates to blanket a **75m radius with cryogenic gas for 10 seconds**.
  * *Damage Profile:* Instantly strips shields on 1W craft, slows movement speed by 50%, halts weapon cooldown progression, and detonates incoming enemy torpedoes caught in the cloud.
* **Graviton Mines (Vortex Minelayer - 3W):**
  * *Behavior:* Stationary space mines sowed along choke points or defensive perimeters.
  * *Damage Profile:* Zero hull damage. Triggering a mine opens a **5-second spatial vortex** that pulls surrounding units inward and forcefully breaks stealth on cloaked Phantom Transports within the radius.

---

## 4. UI Diagnostics & Loadout Configuration

* **Loadout Garage (Pre-Battle):** Players configure initial ammunition distribution, secondary warhead types, and Supply Tender resupply prioritization per squad.
* **Tactical HUD (In-Game):**
  * Units with finite ammo display an **Ammo Pips / Percentage Bar** beneath their health and shield arcs.
  * When a unit's ammo drops below 20%, a flashing `[LOW_AMMO]` telemetry warning triggers, automatically flagging the unit for a Supply Tender resupply tether.

---

## 5. Database Schema Updates (PostgreSQL)

To support finite ammunition, synthesis queues, and dynamic inventory tracking across restarts:

```sql
-- 1. Master Catalog of Munitions
CREATE TABLE ammo_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    max_stack_size INT NOT NULL,
    base_synthesis_time_seconds FLOAT NOT NULL,
    damage_profile JSONB NOT NULL
);

-- 2. Resource Requirements per Ammo Type
CREATE TABLE synthesis_recipes (
    id SERIAL PRIMARY KEY,
    ammo_type_id INT REFERENCES ammo_types(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL,
    quantity_required INT NOT NULL
);

-- 3. Runtime & Template Ammunition Inventory Tracking
CREATE TABLE unit_ammo_inventory (
    id SERIAL PRIMARY KEY,
    unit_instance_id VARCHAR(64) NOT NULL,
    ammo_type_id INT REFERENCES ammo_types(id) ON DELETE CASCADE,
    current_ammo INT NOT NULL,
    max_ammo INT NOT NULL
);

-- 4. Supply Tender Active Fabrication Queues
CREATE TABLE supply_tender_queues (
    id SERIAL PRIMARY KEY,
    tender_unit_id VARCHAR(64) NOT NULL,
    target_unit_id VARCHAR(64) NOT NULL,
    ammo_type_id INT REFERENCES ammo_types(id) ON DELETE CASCADE,
    quantity_ordered INT NOT NULL,
    progress_seconds FLOAT DEFAULT 0.0,
    total_time_required FLOAT NOT NULL,
    status VARCHAR(32) DEFAULT 'processing'
);
