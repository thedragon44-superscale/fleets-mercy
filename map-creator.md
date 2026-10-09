# Fleets' Mercy - In-Game Map Editor Roadmap

This roadmap outlines the systematic development steps for implementing the interactive, in-game **Map Editor Mode**. This feature empowers creators to design, configure, and persist custom tactical sectors with real-time visual placement and instant integration into both Standard and Sandbox game modes.

---

## Phase 1: Viewport Scaffolding & Flight Navigation
* **Create `MapEditorViewport.tsx`**: Mirror the core camera, grid rendering, and server/local loop setup established in `PracticeViewport.tsx`.
* **Implement WASD & Mouse Flight Controls**: Enable pilot-style navigation across the sector where WASD moves the observation drone and the mouse cursor dictates facing/aim vectors.
* **Dynamic Sector Bounds**: Support adjustable map width and height parameters that scale the background grid and border limits in real time.

## Phase 2: Metadata & Sector Configuration Panel
* **Sidebar Metadata Controls**: Add input fields for **Map Name** and **Sector Description** to define map identity upon saving.
* **Dimension Sliders/Inputs**: Configure custom operational theater sizes (ranging from standard $12,000\text{m}$ sectors to massive $24,000\text{m}$ combat arenas).
* **View Integration (`App.tsx`)**: Introduce the `'map-editor'` view state in `App.tsx` and hook up navigation routing from the main command terminal.

## Phase 3: Interactive Ghost Asset & Placement Tooling
* **Environmental Catalog Sidebar**: Display selectable structure types powered by existing vector renderers (`gas_giant`, `asteroid_belt`, `nebula`, `moon`, `singularity`, `comet`, etc.)[cite: 4].
* **Active Ghost Preview**: Lock the selected structure type to the cursor position in world space as a semi-transparent preview before placement.
* **Placement & Editing Mechanics**:
  * **Left-Click**: Anchor and permanently place the structure at current world coordinates.
  * **Right-Click / ESC**: Cancel active ghost placement.
  * **Object Inspection**: Click existing placed structures to delete or adjust their properties.

## Phase 4: Proportional Tactical Radar Minimap
* **Proportional Scaling**: Update the bottom-right radar canvas to dynamically scale against custom map width and height bounds.
* **Structural Footprint Rendering**: Render every placed environmental hazard as a proportionally sized vector shape on the radar (e.g., large circular footprints for gas giants or cluster distributions for asteroid belts).
* **Viewport Frustum Tracking**: Display the camera tracking box accurately over the proportional map layout.

## Phase 5: Backend Persistence & Automatic Mode Integration
* **Export Payload Compilation**: Package map metadata, custom dimensions, and the structured array of placed objects into a unified JSON configuration.
* **Backend Upsert (`mapService.ts`)**: Wire the save action to your backend database service so custom maps are instantly committed to PostgreSQL.
* **Zero-Code Mode Routing**: Ensure `fetchMaps()` automatically picks up newly saved maps, making them immediately selectable in the `map-select` screen for both Standard Tactical and Unit Testing Sandbox modes.
