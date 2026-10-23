# Implementation Roadmap: Radar, Fog of War & Autonomous Recon Networks

## Objective
Upgrade the backend simulation server and frontend practice viewport to support a dynamic **Fog of War (3-State Vision Grid)**, **Telemetry Cascades**, and **Autonomous Non-Redundant Recon Probe Spatial Coverage**.

---

## Phase 1: Backend Vision Engine & Telemetry Cascading (`radar.go` & `room.go`)

- [ ] **1.1 Multi-State Fog & Telemetry Resolution (`IsUnitVisible`)**
  - Implement three distinct visibility states for enemy assets and terrain:
    - **Shrouded / Unexplored (0)**: Hidden on HUD, locked out from targeting loops.
    - **Radar Contact / Pinged (1)**: Weight-class icon visible on tactical radar; no subsystem details.
    - **Visually Clear (2)**: Full model, health, shields, and subsystem data illuminated.
  - Establish tier-based sensor detection radii:
    - Standard Visual Baseline: `600m`
    - Tactical Frigate Relays (3W+): `1,200m` network bubble
    - Extended Recon Probes (1W): `2,500m` sensor bubble

- [ ] **1.2 Server-Side Combat & Targeting Enforcement**
  - Update `findBestTarget` (`room.go`) and AI loops (`ai_behaviors_2.go`) to restrict combat units from locking onto targets in Shrouded space unless illuminated by an active telemetry link.

---

## Phase 2: Recon Probe Autonomous Positioning & Coverage Protocol (`ai_behaviors_2.go`)

- [ ] **2.1 Non-Redundant Spatial Spacing Loop (Geometric Overlap Protocol)**
  - Enforce a strict **Mutual Exclusion Distance** between active friendly Recon Probes:
    - **Effective Sensor Radius**: `2,500m`
    - **Allowed Perimeter Overlap**: `100m – 200m`
    - **Target Inter-Probe Separation Distance**: `2,300m – 2,400m`
  - When searching or anchoring, probes continuously calculate repulsive vector forces from sibling probes to prevent overlapping sensor bubbles.

- [ ] **2.2 Autonomous "Blind Sweep" & Sector Grid Distribution**
  - Program unassigned probes to automatically vector toward the nearest unilluminated Fog-of-War quadrant while steering away from sibling probes' `2,300m` exclusion zones.

- [ ] **2.3 Orbit, Landmark Anchor & Emergency Evasion**
  - **Landmark/Enemy Orbit**: Maintain high-speed orbit (~`1,800m` radius) around detected landmarks or enemy formations.
  - **Evasion Protocol**: If an enemy unit breaches `1,000m`, temporarily override orbit/sweep vectors and flee at max speed (`3.5` velocity) until safe distance is restored.
  - **Enforce Stat Caps**: Maintain 20 HP, 0 DPS, and immunity to morale retreats.

---

## Phase 3: Tactical Radar Canvas & UI Enhancements (`PracticeViewport.tsx`)

- [ ] **3.1 Dynamic Vision Overlay Rendering**
  - Render active `2,500m` detection circles around Recon Probes on the tactical radar.
  - Color-code overlapping detection zones to visually confirm the `100m–200m` geometric radar grid integration.

- [ ] **3.2 HUD Radar Weight-Class & Obstacle Icons**
  - Display contacts using weight-class symbols (`1W`, `2W`, `3W`, `4W`, `5W`).
  - Project static environmental boundaries (asteroids, moons, nebulae) as geometric footprints within illuminated telemetry zones.
