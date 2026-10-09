# Roadmap: Map Making & Environmental Integration System

## Phase 1: Database Schema & Backend Map API
* **Map Definition Tables**: Design PostgreSQL tables to store master map configurations, including unique identifiers, display names, descriptions, and base map dimensions (e.g., the 12,000-unit baseline)[cite: 6].
* **Structure Placement Tables**: Create relational schema to store individual environmental structures (Major Worlds, Gas Giants, Nebulae, Asteroid Belts, Singularity Rifts, Moons, and Drifting Planetoids) linked to specific map IDs, along with their coordinates, radii, and custom parameters.
* **API Endpoints**: Implement Go backend endpoints to fetch the list of available maps and load the complete spatial structure layout for a selected map when initializing a sandbox or battle session.

## Phase 2: Map Selection UI & Garage Integration
* **Map Selection Component**: Build a frontend React view accessible before entering practice or battle modes[cite: 6], allowing commanders to browse available maps, view descriptions, and preview environmental hazards.
* **State Management**: Update application routing and session state in `App.tsx` and `GarageDashboard.tsx`[cite: 5] to pass the selected `mapId` down to the WebSocket connection and canvas viewports.
* **Sandbox Integration**: Wire the selection parameters into `PracticeViewport.tsx` so users can test custom map layouts instantly[cite: 5].

## Phase 3: Procedural & Asset-Based Environmental Rendering
* **Macro-Landmarks (`vectorAssets.ts`)**: Expand rendering functions to handle stationary anchors like Terrestrial Worlds (radius 1,000–1,500 units) and Gas Giants (radius 3,000–4,000 units) with their concentric atmospheric layers[cite: 6, 8].
* **Dynamic & Vector Terrain**: Implement vector rendering for Deep Nebula Plasma fields[cite: 10] and Spatial Singularity Rifts[cite: 11] with radar-suppression and repulsion field visuals[cite: 10, 11].
* **Cached Asset Clusters**: Set up cached sprite and procedural rotation loops for Asteroid Belts, Drifting Planetoids, and Moons to maintain CPU optimization and permanent structural bounds[cite: 7, 8, 12, 13].

## Phase 4: Environmental Physics, Hazards & Gameplay Integration
* **Zone-Based Physics Hooks**: Integrate server-side and client-side physics checks for gravitational pulls, nebula speed/agility drag, gas giant core lethality, and comet transient trajectories[cite: 6, 8, 10, 13].
* **Radar & Telemetry Rules**: Enforce visibility constraints, such as radar-blindness inside nebulae contrasted with network-wide telemetry transparency across asteroid fields and moons[cite: 10, 11, 12].
* **Logistics & Resource Loops**: Connect specialized harvesting vessels (Mining Barges, Plasma Skimmers, Grav Extractors) and Supply Tenders to their respective environmental zones and extraction mechanics[cite: 6, 8, 10, 11].
