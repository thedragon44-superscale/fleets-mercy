# Space Tactics - Environments, Celestial Objects & Map Builder Data Architecture

To ensure zero hardcoding and support infinite customization via your frontend Map Builder Viewport—while respecting hardware performance limits during massive 100W fleet battles—this architecture decouples static environmental parameters from active simulation loops. 

The system relies on a **Map Presets & JSON Export Schema** where the backend loads a comprehensive map layout file at match initialization, avoiding heavy relational database queries during the 60 Hz simulation tick.

---

## 1. Architectural Strategy for Hardware Performance
* **Data-Driven & Client-Side Math:** Orbital mechanics (orbit radius, speed, satellite rotation) and procedural drift do not need heavy server-side physics ticks for every single asteroid. Instead, static celestial objects use initial seed positions and mathematical time-offset formulas ($X(t), Y(t)$) computed efficiently on both client and server.
* **Static Caching:** Major worlds, asteroid belts, and nebulae are registered as static collision and occlusion boundaries once loaded, keeping CPU overhead minimal.

---

## 2. PostgreSQL Database Schema (Environment Presets & Map Layouts)

```sql
-- 1. Master Map Metadata & Session Presets
CREATE TABLE map_presets (
    id SERIAL PRIMARY KEY,
    preset_name VARCHAR(128) UNIQUE NOT NULL,
    author VARCHAR(64) DEFAULT 'Community',
    map_width FLOAT NOT NULL DEFAULT 20000.0,
    map_height FLOAT NOT NULL DEFAULT 20000.0,
    background_theme_id VARCHAR(64) NOT NULL, -- e.g., 'deep_space_nebula_01'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Celestial Objects & Environmental Hazards Placed via Map Builder
CREATE TABLE map_celestial_objects (
    id SERIAL PRIMARY KEY,
    map_preset_id INT REFERENCES map_presets(id) ON DELETE CASCADE,
    object_uid VARCHAR(64) UNIQUE NOT NULL, -- Unique identifier for map builder referencing
    category VARCHAR(64) NOT NULL,          -- 'terrestrial_world', 'gas_giant', 'nebula_field', 'singularity', 'asteroid_belt', 'moon'
    display_name VARCHAR(128) NOT NULL,     -- e.g., 'Aethelgard Prime'
    
    -- Transform & Spatial Properties
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    scale_radius FLOAT NOT NULL,            -- e.g., 1200.0 units[cite: 7]
    rotation_speed FLOAT DEFAULT 0.0,       -- Degrees per second
    
    -- Orbital Mechanics (for moons/drifting planetoids)
    parent_object_uid VARCHAR(64) DEFAULT NULL, -- Null if stationary anchor
    orbit_radius FLOAT DEFAULT 0.0,
    orbit_speed FLOAT DEFAULT 0.0,
    
    -- Physical & Environmental Forces
    gravitational_pull_strength FLOAT DEFAULT 0.0, -- Range / Force multiplier
    surface_texture_id VARCHAR(64) NOT NULL,       -- Shader/Texture asset reference
    primary_color_hex VARCHAR(7) DEFAULT '#FFFFFF',-- UI & particle tinting
    
    -- Custom Attributes (Stored as flexible JSONB for category-specific traits)
    -- e.g., Gas giant layers, nebula drag coefficients, or singularity repulsion radius
    properties JSONB NOT NULL DEFAULT '{}'
);

-- 3. Binding Resource Nodes Directly to Celestial Objects
CREATE TABLE object_resource_links (
    id SERIAL PRIMARY KEY,
    celestial_object_id INT REFERENCES map_celestial_objects(id) ON DELETE CASCADE,
    resource_type VARCHAR(32) NOT NULL, -- 'metal', 'ore', 'isotopes', 'plasma_gas', 'graviton_cores'[cite: 6]
    max_capacity INT NOT NULL,
    replenishment_rate FLOAT DEFAULT 0.0
);

{
  "map_info": {
    "preset_name": "Sectors of Aethelgard",
    "version": "1.0.0",
    "dimensions": { "width": 25000.0, "height": 25000.0 },
    "background_theme": "nebula_cluster_alpha"
  },
  "celestial_objects": [
    {
      "object_uid": "world_aethelgard_prime",
      "category": "terrestrial_world",
      "display_name": "Aethelgard Prime",
      "transform": {
        "x": 0.0,
        "y": 0.0,
        "radius": 1400.0,
        "rotation_speed": 0.05
      },
      "orbit": {
        "parent_uid": null,
        "radius": 0.0,
        "speed": 0.0
      },
      "physics": {
        "gravitational_pull": 2.5,
        "surface_texture": "texture_crust_rock_04",
        "color_tint": "#A85332"
      },
      "properties": {
        "destructible_crust": true,
        "subterranean_tunnels": true
      },
      "resources": [
        { "type": "metal", "capacity": 15000, "replenish_rate": 0.0 },
        { "type": "ore", "capacity": 10000, "replenish_rate": 0.0 }
      ]
    },
    {
      "object_uid": "moon_phobos_minor",
      "category": "moon",
      "display_name": "Phobos Minor",
      "transform": {
        "x": 0.0,
        "y": 0.0,
        "radius": 350.0,
        "rotation_speed": 0.2
      },
      "orbit": {
        "parent_uid": "world_aethelgard_prime",
        "radius": 3500.0,
        "speed": 1.2
      },
      "physics": {
        "gravitational_pull": 0.8,
        "surface_texture": "texture_ice_moon_01",
        "color_tint": "#CCCCCC"
      },
      "properties": {
        "barren": true
      },
      "resources": [
        { "type": "isotopes", "capacity": 5000, "replenish_rate": 10.0 }
      ]
    },
    {
      "object_uid": "gas_giant_leviathan",
      "category": "gas_giant",
      "display_name": "Leviathan's Breath",
      "transform": {
        "x": -8000.0,
        "y": 4500.0,
        "radius": 3500.0,
        "rotation_speed": 0.01
      },
      "orbit": { "parent_uid": null, "radius": 0.0, "speed": 0.0 },
      "physics": {
        "gravitational_pull": 4.0,
        "surface_texture": "shader_gas_giant_volumetric",
        "color_tint": "#3B5284"
      },
      "properties": {
        "layers": {
          "outer_radius_pct": 1.0,
          "deep_radius_pct": 0.85,
          "core_radius_pct": 0.60
        },
        "radar_transparent": true
      },
      "resources": [
        { "type": "isotopes", "capacity": 25000, "replenish_rate": 50.0 }
      ]
    }
  ]
}
