# Spec Sheet: Moons & Satellites (ID: 06)

## 1. Overview & Classification
* **Environmental Category:** Secondary Macro-Landmark (Orbital Strategic Terrain & Variable Resource Zone)
* **Classification:** Planetary Satellite / Minor Orbital Body
* **Mobility Status:** **Slow Orbital Motion** (Constant, predictable orbital rotation around a parent Major World or Gas Giant; orbit rates defined per specific system design).

## 2. Spatial Scale & Orbital Physics
* **Spatial Scale:** Medium-to-large macro-footprint, significantly smaller than major terrestrial worlds but larger than drifting mineral planetoids.
* **Orbital Mechanics:** Operates on fixed, programmatic orbital paths around a parent body, dynamically shifting tactical lanes, choke points, and cover angles over the course of an individual match.
* **Pathfinding Barrier:** Acts as a solid physical landmass. Ships cannot pathfind through a moon and must route around its curvature.

## 3. Line-of-Sight & Radar Rules
* **Physical & Visual Line-of-Sight:** Completely blocks physical projectiles, direct-fire weapons, and visual targeting, making moons prime terrain for fleet masking and orbital ambushes.
* **Radar & Telemetry Transparency:** Moons **do not** create radar shadows or blind fleet sensor arrays. Network telemetry and radar tracking remain active network-wide across the moon's orbit; enemy units hidden behind a moon's physical body are invisible to direct-fire weapons, but their general position is tracked by network telemetry unless shielded by specialized stealth or jamming units.

## 4. Asymmetric Economic Value (Resource vs. Barren Archetypes)
Moons are divided into two distinct tactical archetypes per map configuration:
* **Resource-Bearing Moons:** Feature surface crust deposits that can be harvested by **Mining Barges**, serving as secondary match-level economic objectives.
* **Barren Moons:** Completely devoid of harvestable resources, existing purely as geographic terrain features for tactical positioning, choke-point control, or line-of-sight manipulation.

## 5. Performance & Destruction Constraints (CPU Optimization)
* **Structural Durability:** To maintain minimal CPU overhead, moons are **permanently indestructible**. They cannot be fractured, chipped away, or destroyed by flagship payloads or weapon fire.
* **Resource Depletion (Resource-Bearing Moons Only):** Surface resource deposits can be economically exhausted over time through prolonged mining, but the physical moon body, its collision mesh, and its orbital mechanics remain entirely static and intact for the duration of the match.
