# 📡 Telemetry & Recon Network Roadmap: Symmetrical AI Vision

## 🎯 Executive Overview
Transition the macro-level enemy AI (`runAI`) from direct, omniscient global position tracking to a fully symmetrical telemetry-driven sensor model. Enemy capital ships, flagships, and reserve waves will operate under the exact same radar and fog-of-war constraints as player units, relying on active local sensors and forward **Recon Probe (2,500m)** network relays.

---

## 🏗️ Architecture & Component Roadmap

### Phase 1: Faction-Wide Telemetry Pooling
* **Objective:** Aggregate individual unit radar vision states into a single faction intelligence network.
* **Backend Addition:** Implement `IsTargetVisibleToFaction(factionOwner string, target *models.FleetUnit) bool` in `room.go`.
* **Behavior:** Loop over all operational units and recon probes belonging to `factionOwner`. If at least one unit/probe maintains a visibility state greater than `VisibilityShrouded` against the target, return `true`.

---

### Phase 2: Macro AI Logic Refactoring (`runAI`)
* **Objective:** Remove hardcoded, global player tracking from enemy flagships and command ships.
* **Telemetry Guard Clause:** Wrap flagship combat state execution in `IsTargetVisibleToFaction("enemy", player)`.
* **State Behavior:**
  * **Target Detected (Telemetry Active):** Lock heading, execute firing loops, and update target lead coordinates.
  * **Target Shrouded (No Telemetry):** Hold current position or enter a passive **Search/Patrol** mode around the last known telemetry coordinates.

---

### Phase 3: Networked Sensor Relays (Recon Probes)
* **Objective:** Leverage forward recon probes and command ship sensor bubbles as shared intelligence relays for the fleet.
* **Sensor Range Expansion:** Ensure `recon_probe` units and `battalion_command_ship` hulls feed their expanded `VisionRange` bubbles into the shared faction telemetry pool.
* **Tactical Impact:** Destroying or blinding an enemy recon probe breaks the link and blinds behind-the-lines capital ships.

---

### Phase 4: Intelligence-Driven Reserve Spawning
* **Objective:** Tie reinforcement wave spawning directly to confirmed target intelligence.
* **Conditional Spawning:** Modify reserve timer blocks inside `runAI()` to spawn reinforcement waves (`viper_interceptor`, `lancer_corvette`, etc.) **only** when active telemetry confirms target presence within the 8,000m engagement radius.
* **Stealth Counterplay:** Staying outside enemy recon probe networks or employing electronic warfare allows players to bypass enemy reinforcements entirely.

---

## 📊 Summary of Symmetrical Parity

| Feature | Player Fleet | Enemy Fleet (Legacy) | Enemy Fleet (New Telemetry) |
| :--- | :--- | :--- | :--- |
| **Fog-of-War** | Enforced | Ignored | **Enforced** |
| **Target Acquisition** | Local Sensors / Radar | Omniscient Global Tracking | **Faction Sensor Network** |
| **Recon Probes** | Provides 2,500m Vision | Purely Visual | **Active Sensor Relay** |
| **Reinforcement Calls** | Manual Deploy Queue | Automated Global Timer | **Active Intelligence Trigger** |
