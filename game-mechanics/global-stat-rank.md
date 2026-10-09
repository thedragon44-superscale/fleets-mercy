# Global Stat & Backend Definitions (`STAT_DEFINITIONS.md`)

To drive backend combat calculations, pathfinding, and logistics, all generalized ranks correspond to the following absolute numerical values.

---

## 1. Global Scale Reference

### Weight Classes (W-Rating) & Mass Profiles
* **1W (Ultra-Light / Scout)**: Mass multiplier 0.5x. Fits into specialized light deployment racks.
* **2W (Light / Utility)**: Mass multiplier 1.0x. Agile support, harvesters, and corvettes.
* **3W (Medium / Frigate)**: Mass multiplier 2.5x. Standard combat vessels and jammers.
* **4W (Heavy / Capital Support)**: Mass multiplier 5.0x. Siege platforms, railguns, and bunkers.
* **5W (Super-Heavy / Capital)**: Mass multiplier 10.0x+. Flagships, command ships, and warp frigates.

### Health, Shields & Armor Ranks (Absolute HP)
* **Rank D (Fragile / Unarmored)**: Shields: 50 HP | Hull: 100 HP.
* **Rank C (Standard / Moderate)**: Shields: 300 HP | Hull: 500 HP.
* **Rank B (Reinforced)**: Shields: 1,500 HP | Hull: 2,000 HP.
* **Rank A (Heavy / Shield-Tank)**: Shields: 4,000 HP | Hull: 5,000 HP.
* **Rank S (Capital Super-Dense)**: Shields: 10,000 HP (2,500 per quadrant) | Hull: 7,500–12,000+ HP (1,875 per quadrant for capital cores).

### Movement & Speed Classes (Base Velocity)
* **Rank D (Super-Heavy / Immobile)**: Velocity 0.3 (Sluggish mass, restricted turning).
* **Rank C (Medium Cruising)**: Velocity 1.0 (Standard fleet transit pace).
* **Rank B (Responsive / Frigate)**: Velocity 1.8 (Quick correctional thrusters).
* **Rank A (High-Speed / Strike)**: Velocity 2.5 (Rapid vector-thrust loops).
* **Rank S (Absolute Maximum)**: Velocity 3.5 (Outpaces standard tracking).

### Vision, Radar & Telemetry Ranges (Meters)
* **Standard Visual / Closed Loop**: 600m radius.
* **Tactical Frigate Relay**: 1,200m radius.
* **Extended Fleet Array / Recon**: 2,500m radius.

### Combat Damage & Utility Output (DPS)
* **Rank D**: 0 to 5 DPS (Unarmed / Utility).
* **Rank C**: 50 DPS (Light harassment / continuous fire).
* **Rank B**: 150 DPS (Standard frigate combat).
* **Rank A**: 450 DPS (Heavy ordnance / railguns).
* **Rank S**: 1,000+ DPS (Capital core beams / capital batteries).

