# Fleets' Mercy: Tactical Tiers & Unit Mechanics Roadmap

## Phase 1: Data Foundation & Struct Updates
*Objective: Extend the backend data schemas to natively support the Buddy, Squad, and Battalion architectural tiers.*

* [ ] **Update `structs.go` (`FleetUnit`)**:
  * Add `SquadID` (int: 1–4 hotkey groups, 0 for unassigned/flagship).
  * Add `IsLeader` (bool: identifies squad or battalion leadership).
  * Add `BuddyID` (string: exclusive 1-to-1 tether ID for support units).
  * Add `ResourceCache` (float64: internal material tracker for support/repair units).
* [ ] **Database Schema Validation**: Ensure PostgreSQL tables map cleanly to these struct extensions for garage loadouts and spawn handlers.

---

## Phase 2: Battalion Command Ship & Deployment Workflow
*Objective: Build out the 5W Battalion Command Ship mechanics, radar routing, and staggered squad rollout.*

* [ ] **Command Ship Spawn & Release**: Implement backend logic where the main Flagship releases the 5W Battalion Command Ship into the sector.
* [ ] **Autonomous Radar Vectoring**: Program the command ship to independently path toward the nearest radar contact or sector target.
* [ ] **Staggered Bay Launch Sequence**: 
  * Disable simultaneous mass dumps to prevent collision gridlock.
  * Implement a sequential rollout queue that launches subordinate squads one by one with a timed delay.
  * Automatically snap deployed units into their relative formation anchors around the command ship.
* [ ] **Automated Repair & Redeployment Loop**:
  * Set up the command ship's internal drydock bay to pull in damaged squadmates.
  * Consume stored **Metal** reserves to patch hulls and subsystems.
  * Automatically redeploy repaired units straight back into their designated squad formation.

---

## Phase 3: Squad Core Mechanics & Doctrines
*Objective: Establish group cohesion, shared targeting, and cascading retreat triggers for hotkey squads (1–4).*

* [ ] **Squad Leader Tracking**: Bind subordinate units to calculate relative positional offsets around their designated squad leader.
* [ ] **Shared Target Scoring**: Implement squad-wide telemetry polling (e.g., specialized units like Ion Disablers automatically targeting whatever enemy is focused by the squad's highest-damage unit).
* [ ] **Cascading Retreat Protocol**: Program health/morale thresholds on squad leaders that instantly broadcast a defensive retreat directive to all attached squadmates.

---

## Phase 4: Buddy Protocol & Support Unit AI
*Objective: Implement exclusive telemetry, positional meat-shielding, and resupply loops for support craft.*

* [ ] **Aegis Repair Corvette (2W)**:
  * Implement Rank A Shields (4,000 HP) and Rank D Hull (100 HP) dynamics[cite: 5].
  * Write closed-loop telemetry restricted to the assigned buddy/squad anchor (600m range)[cite: 5].
  * Code tactical meat-shielding (orbiting behind the heavier squadmate to use it as physical cover)[cite: 5].
  * Implement Dual Nanite Repair Beams (restoring hull HP and resurrecting permanently shattered 0-HP shields)[cite: 5].
  * Code the Resupply Loop (breaking anchor when `ResourceCache` hits zero to refit at the nearest Supply Tender)[cite: 5].
* [ ] **Aegis Wall (5W)**: Implement directional 180-degree shield projection and barrier anchoring logic.

---

## Phase 5: Systematic Unit-by-Unit Roster Implementation
*Objective: Proceed down the master unit catalog to script individual AI states, movement curves, and combat loops.*

* [ ] Implement Assault Gunships, Lancer Railguns, Cryo-Flak Frigates, and remaining catalog entries using the verified spec sheet templates.
