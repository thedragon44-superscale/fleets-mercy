# Spec Sheet: Dense Asteroid Belts (ID: 07)

## 1. Overview & Classification
* **Environmental Category:** Macro-Landmark (Stationary Navigational Terrain & Tactical Barrier)
* **Classification:** Clustered Asteroid Field / Dense Navigational Obstacle
* **Mobility Status:** 100% Stationary (Fixed map-specific landmark features that remain constant throughout an individual match).

## 2. Form Factor & Spatial Scale
* **Custom Map Variations:** Structure and layout vary per map design, appearing as wide dense corridors, long narrow clusters, or compartmentalized field pockets.
* **Pathfinding Barrier:** Acts as a solid physical obstacle field designed to force tactical routing and divide space.

## 3. Navigational Filtering & Weight-Class Constraints
* **Light-Unit Access (1W & 2W):** Only light and medium-light units possess the agility and micro-thruster control required to slip directly through the dense asteroid clusters.
* **Heavy-Unit Exclusion (3W+):** Higher-weight assets (3W logistics/combat and 4W–5W capital ships) cannot navigate the dense cluster network and must route completely around the belt.
* **Utility & Defensive Sanctuary Lanes:** Specialized support units (stealth units, field-repair platforms, supply tenders, and mining barges) utilizing avoidant behavior can navigate through the asteroid belt to use the dense field as protective cover against heavy capital threats.
* **In-Belt Combat & Defense:** Light combat assets (such as 1W headhunter units or agile squad escorts) can actively target, engage, and defend within the asteroid fields.

## 4. Line-of-Sight & Radar Rules
* **Physical & Visual Line-of-Sight:** Completely blocks physical projectiles, direct-fire weapons, and visual line-of-sight, allowing fleets to use asteroid clusters for ambush positioning and line-of-sight breaking.
* **Radar & Telemetry Transparency:** Asteroid belts **do not** create radar shadows or blind fleet sensor arrays. Network telemetry and radar tracking remain active network-wide across the belt's volume; enemy units hidden behind asteroid masses are invisible to direct-fire weapons, but their general position is tracked by network telemetry unless shielded by specialized stealth or jamming units.

## 5. Performance & Destruction Constraints (CPU Optimization)
* **Structural Durability:** To maintain minimal CPU overhead and consistent tactical geometry, asteroids are **permanently indestructible**. They cannot be fractured, chipped away, mined for resources, or destroyed by flagship payloads or weapon fire.
