# Database Architecture: `spacetactics` PostgreSQL Schema

This document defines the relational database architecture for **Fleets' Mercy**, establishing the normalized blueprint-to-instance schema for spatial environments, maps, and unit management. Adhering to these structural principles prevents redundant tables and maintains clean separation of concerns between static master metadata and dynamic sector instances.

---

## 1. Core Design Principles
* **Catalog vs. Instance Separation**: Master environmental definitions and unit specifications are stored in centralized catalog tables (`environmental_structures`, `unit_templates`), while individual tactical theater placements reference these catalogs via foreign keys (`map_structures`)[cite: 2, 13].
* **Explicit Sizing Rules**: Structures are governed by blueprint constraints (`is_resizable`, `min_radius`, `max_radius`). Exact coordinates and radii are exclusively stored within instance tables (`map_structures`), allowing dynamic scaling without modifying master templates.
* **JSONB Flexibility**: Static configuration metadata and custom instance overrides are housed in `JSONB` columns (`custom_metadata`, `custom_props`) to support future gameplay expansions without altering core table schemas.

---

## 2. Core Schema & Table Reference

### A. `maps` (Sector Parent Table)
Stores top-level tactical theater metadata and coordinate space dimensions.
* **`map_id`**: `SERIAL PRIMARY KEY` — Unique sector identifier.
* **`map_key`**: `VARCHAR(64) UNIQUE NOT NULL` — System reference key (e.g., `sector_alpha`, `custom_...`).
* **`map_name`**: `VARCHAR(128) NOT NULL` — Display name for the tactical map.
* **`description`**: `TEXT` — Tactical overview and lore details.
* **`width`**: `NUMERIC NOT NULL DEFAULT 12000` — Horizontal coordinate boundary[cite: 4].
* **`height`**: `NUMERIC NOT NULL DEFAULT 12000` — Vertical coordinate boundary[cite: 4].
* **`created_at`**: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

### B. `environmental_structures` (Master Blueprint Catalog)
Stores generalized characteristics, scaling boundaries, and behavioral traits for the 8 core environmental archetypes (Major Worlds, Planetoids, Gas Giants, Nebulae, Singularities, Moons, Asteroid Belts, and Comets).
* **`id`**: `SERIAL PRIMARY KEY`
* **`structure_key`**: `VARCHAR(64) UNIQUE NOT NULL` — Programmatic key used by the physics engine and backend queries (e.g., `gas_giant`, `asteroid_belt`, `singularity`).
* **`name`**: `VARCHAR(128) NOT NULL` — Full display title.
* **`category`**: `VARCHAR(64) NOT NULL` — Tactical classification (e.g., `Macro-Landmark`, `Volatile Hazard Zone`).
* **`default_radius`**: `NUMERIC NOT NULL` — Standard footprint radius in meters.
* **`min_radius` / `max_radius`**: `NUMERIC` — Scaling bounds for resizable structures.
* **`is_resizable`**: `BOOLEAN NOT NULL DEFAULT TRUE` — Enforces fixed-footprint rules (e.g., singularities and comets are `FALSE`).
* **`is_indestructible`**: `BOOLEAN NOT NULL DEFAULT TRUE`
* **`resource_yield_type`**: `INT` — Binding key to resource extraction mechanics.
* **`custom_metadata`**: `JSONB DEFAULT '{}'` — Layer data, hazard attributes, and specialized physics flags.

### C. `map_structures` (Spatial Instance Placement)
Bridges sector maps (`maps`) to their respective master blueprints (`environmental_structures`), placing individual instances into the coordinate space.
* **`structure_id`**: `SERIAL PRIMARY KEY`
* **`map_id`**: `INT NOT NULL REFERENCES maps(id) ON DELETE CASCADE`
* **`environmental_structure_id`**: `INT NOT NULL REFERENCES environmental_structures(id) ON DELETE CASCADE`
* **`pos_x` / `pos_y`**: `NUMERIC NOT NULL` — Exact center coordinates within the map boundaries.
* **`radius`**: `NUMERIC NOT NULL` — Scaled instance radius (validated against the parent blueprint's min/max bounds).
* **`custom_props`**: `JSONB DEFAULT '{}'` — Instance-specific runtime overrides.

### D. Core Supporting Tables
* **`players`**: Manages pilot authentication, unique IDs, and `password_hash` credentials[cite: 8].
* **`player_loadouts`**: Stores persistent hangar bay configurations, fleet compositions, and hotkey squad assignments (`squad_1` through `squad_4`) as `JSONB` blobs[cite: 5].
* **`unit_templates`**: Pre-loaded master specifications for all tactical units (speeds, base shield/hull health, weight classes, vision ranges, and default AI states)[cite: 6, 9].
* **`resource_types`**: Defines harvestable material categories.

---

## 3. Database Connection Parameters
* **Host**: `127.0.0.1` (TCP bypass for local development)[cite: 6]
* **Database Name**: `spacetactics`[cite: 6]
* **User**: `gameadmin`[cite: 6]
* **Driver**: PostgreSQL via `lib/pq`[cite: 2, 6]

---

## 4. Anti-Redundancy Rules for Future Extensions
1. **Never add hardcoded columns** for environmental properties directly into `map_structures`. If a new hazard property or layer rule is needed, expand the `JSONB` schema in `environmental_structures.custom_metadata` or add a normalized child table.
2. **Never duplicate coordinate systems** (e.g., avoiding split `center_x`/`pos_x` schemas). Use `pos_x` and `pos_y` universally across all spatial tables.
3. **Always use relational JOINs** between `map_structures` and `environmental_structures` rather than fetching raw string literals, ensuring the physics and API layers remain synchronized with the master blueprint catalog.
