# Fleets' Mercy: Comprehensive Database & Codebase Restructuring Roadmap

## Phase 1: Database Schema Restructuring (Catalog vs. Instance)
* **Step 1.1: Design Master Catalog (`environmental_structures`)**
  * Structure the blueprint catalog table to store generalized characteristics, default radii ranges (`min_radius`, `max_radius`), a `is_resizable` boolean flag (locking down fixed-footprint anomalies like singularities while allowing scaling for gas giants, planets, and asteroid belts), resource yield bindings (Types 1-5), and JSON metadata for variations.
* **Step 1.2: Design Parent & Instance Tables (`maps` and `map_structures`)**
  * `maps`: Parent metadata container (`map_id`, name, width, height)[cite: 11].
  * `map_structures`: Spatial instance bridge linking `map_id` to an `environmental_structure_id` with exact instance coordinates (`pos_x`, `pos_y`), custom scaled radius (validated against blueprint limits), and instance overrides.
* **Step 1.3: Execute SQL Migration on Your Pi**
  * Drop legacy/conflicting tables and duplicate columns (`center_x`/`center_y` vs `pos_x`/`pos_y`).
  * Recreate clean relational schemas with proper foreign keys.

## Phase 2: Blueprint Catalog Seeding
* **Step 2.1: Seed the 8 Master Environmental Blueprints**
  * Insert master records into `environmental_structures`:
    1. Major Worlds / Terrestrial Crusts (Radius range 1,000–1,500 units, resizable, heavy gravity, metal/ore extraction, cave collapse flags)[cite: 7].
    2. Drifting Mineral Planetoids (Radius range 300–600 units, resizable, slow drift, weak gravity, static indestructible collision mesh)[cite: 8].
    3. Gas Giant Atmospheres (Radius range 3,000–4,000 units, resizable, 3 concentric layers metadata: Core, Deep Atmosphere, Outer Atmosphere)[cite: 9].
    4. Deep Nebula Plasma Fields (Resizable, speed drag flags, radar-blindness profiles, Plasma/Isotope resource bindings)[cite: 10].
    5. Spatial Singularity Rifts (Fixed size 200m repulsion field radius, non-resizable, projectile refraction, Graviton Core bindings)[cite: 11].
    6. Moons & Satellites (Resizable radius ranges, orbital parameters, resource-bearing vs barren archetypes)[cite: 12].
    7. Dense Asteroid Belts (Resizable cluster parameters, weight-class filtering rules)[cite: 13].
    9. Comets (Fixed transient trajectory properties, non-resizable, weight-class impact damage scaling)[cite: 14].

## Phase 3: Backend Codebase Updates (Go)
* **Step 3.1: Update Go Models (`models/`)**
  * Define structs mapping the relationship between `map_structures` and `environmental_structures`.
* **Step 3.2: Refactor Room Initialization & Queries (`room.go`)**
  * Strip out all hardcoded fallback coordinate slices.
  * Implement dynamic database querying to instantiate rooms purely from active `map_structures` rows.
* **Step 3.3: Refactor Physics Engine (`physics.go`)**
  * **Global Hazards**: Implement multi-layer gas giant physics (core death zone hooks[cite: 3], deep atmosphere drag/damage, outer skimming), singularity repulsion & projectile refraction[cite: 11], and high-speed transient comet trajectory handling[cite: 14].
  * **Cluster-Aware Mechanics**: Maintain the 12-node procedural offset loop for asteroid belts with precise gap tolerances.
  * **Unit-Driven Capability Integration**: Ensure environment code checks unit property flags (e.g., verifying if a unit's class spec grants nebula drag immunity like Plasma Skimmers[cite: 10], singularity immunity like Grav Extractors[cite: 11], or unit-level pathfinding bypass rules) rather than hardcoding environment-side blacklists.

## Phase 4: Frontend Map Creator Studio & Viewports (TypeScript / React)
* **Step 4.1: Update Map Service (`mapService.ts`)**
  * Align frontend save/load payloads with the new blueprint-to-instance database structure.
* **Step 4.2: Update Map Creator Palette (`MapEditorViewport.tsx`)**
  * Wire the sidebar UI catalog palette to pull available structure blueprints dynamically from the database.
  * Implement dynamic form logic in the inspector: if a blueprint has `is_resizable: true`, expose the radius slider/input within its `min`/`max` bounds; if `is_resizable: false`, lock the radius input to its fixed default value.
* **Step 4.3: Synchronize Radars & Viewports**
  * Ensure all viewports and radar minimaps render instances, cluster nodes, and radial hazard layers accurately based on live database data.

## Phase 5: End-to-End Verification & Testing
* **Step 5.1: Database Sanity Check via `psql`**
  * Verify relational integrity, foreign keys, and saved JSON metadata on the Pi.
* **Step 5.2: In-Game Tactical Validation**
  * Test custom map creation, seamless gap navigation through asteroid fields, hazard layer interactions, and dynamic resource harvesting loops.
