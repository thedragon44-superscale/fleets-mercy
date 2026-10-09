## Phase 1: Radar Fog, Telemetry & Recon Probe Architecture
*Objective: Build the core vision and visibility grid that all combat units, harvesters, and command AI rely on.*

* [ ] **Fog of War & Telemetry Grid**:
  * Implement three visibility states: Unexplored/Shrouded, Radar Contact (Pinged), and Visually Clear.
  * Establish telemetry cascading where forward data feeds back through tactical frigate relays (1,200m) to command anchors.
* [ ] **Recon Probe (1W) Mechanics**:
  * Program the 2,500m extended detection bubble[cite: 7].
  * Build the structured metadata uplink: rendering environmental obstacles as geometric footprints and enemy units via distinct weight class symbols (1W, 2W, etc.) on the HUD radar[cite: 7].
* [ ] **Recon Probe AI Loop**:
  * Code the "Blind Sweep & Anchor" flight pattern through radar fog[cite: 7].
  * Implement high-speed target/obstacle orbiting (~1,800m away)[cite: 7].
  * Code the emergency evasion protocol (overriding orbit to flee at absolute maximum speed when an enemy breaches 1,000m)[cite: 7].
  * Enforce absolute dedication: 20 unified HP pool, 0 DPS, and zero retreat thresholds[cite: 7].

---
