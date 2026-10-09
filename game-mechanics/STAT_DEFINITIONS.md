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

---

## 2. Unit-Specific Backend Stat Tables

### 1. Aegis Repair Corvette (2W)
* **Weight Class**: 2W
* **Shields / Hull**: Rank A Shields (4,000 HP) / Rank D Hull (100 HP)
* **Speed Class**: Rank C Velocity (1.0)
* **Vision Range**: 600m
* **Combat Output**: Rank D (0 DPS; Dual Nanite Repair Beams at Rank S repair throughput: 500 HP/sec)
* **Resource Cost**: Consumes Metal (standard repairs) or Metal + Exotic Crystals + Rare Isotopes (capital subsystems)

### 2. Aegis Wall (5W)
* **Weight Class**: 5W
* **Shields / Hull**: Rank S Front Shield (10,000 HP directional 180-deg with 250 HP/sec passive regen) / Rank D Hull & Rear (100 HP)
* **Speed Class**: Rank D Velocity (0.3)
* **Vision Range**: 600m
* **Combat Output**: Rank D (0 DPS; Rank S collision/shield barrier projection)

### 3. Assault Gunship (2W)
* **Weight Class**: 2W
* **Shields / Hull**: Rank C Shields (300 HP) / Rank C Hull (500 HP)
* **Speed Class**: Rank A Velocity (2.5)
* **Vision Range**: 600m
* **Combat Output**: Rank C (50 DPS; Twin Rotary Kinetic Cannons, infinite C-rank ammo)

### 4. Battalion Command Ship (5W)
* **Weight Class**: 5W[cite: 18]
* **Shields / Hull**: Rank S Quadrant Shields (10,000 HP total / 2,500 per quadrant) / Rank S Hull (8,000 HP total / 2,000 per quadrant)[cite: 18]
* **Speed Class**: Rank C Velocity (1.0)[cite: 18]
* **Vision Range**: 1,200m[cite: 18]
* **Combat Output**: Rank A (450 DPS; Capital Battery Array)[cite: 18]

### 5. Command Escort Ship (3W)
* **Weight Class**: 3W[cite: 19]
* **Shields / Hull**: Rank B Shields (1,500 HP) / Rank B Hull (2,000 HP)[cite: 19]
* **Speed Class**: Rank B Velocity (1.8)[cite: 19]
* **Vision Range**: 1,200m[cite: 19]
* **Combat Output**: Rank B (150 DPS; Medium Point-Defense Batteries, infinite ammo)[cite: 19]

### 6. Cryo-Flak Frigate (3W)
* **Weight Class**: 3W[cite: 20]
* **Shields / Hull**: Rank B Shields (1,500 HP) / Rank B Hull (2,000 HP)[cite: 20]
* **Speed Class**: Rank B Velocity (1.8)[cite: 20]
* **Vision Range**: 600m[cite: 20]
* **Combat Output**: Rank B (120 DPS explosive equivalent; 75m cryo radius, 10s duration)[cite: 20]

### 7. Command Dreadnought (Flagship)
* **Weight Class**: 5W[cite: 21]
* **Shields / Hull**: 10,000 Total Shields (2,500/quad) / 7,500 Total Core Hull (1,875/quad) with 95% flat armor mitigation post-shield break[cite: 21]
* **Speed Class**: Cruising Velocity 1.0 (Boost up to 2.5x scaled with Rear Hull)[cite: 21]
* **Vision Range**: 2,500m[cite: 21]
* **Combat Output**: Rank S (~1,000 DPS; Piercing Core Beam, 2,000m range, 3s duration / 10s cooldown)[cite: 21]

### 8. Defensive Gun Emplacement (4W)
* **Weight Class**: 4W[cite: 22]
* **Shields / Hull**: 0 Shields / Rank S Hull (6,000 HP anchored)[cite: 22]
* **Speed Class**: Rank D (0 stationary post-deployment)[cite: 22]
* **Vision Range**: 1,000m engagement cap[cite: 22]
* **Combat Output**: Rank A (450 DPS; Fixed Heavy Artillery / Point-Defense)[cite: 22]

### 9. Ion Disabler (1W)
* **Weight Class**: 1W[cite: 23]
* **Shields / Hull**: Rank C Shields (300 HP) / Rank D Hull (100 HP)[cite: 23]
* **Speed Class**: Rank B Velocity (1.8)[cite: 23]
* **Vision Range**: 500m[cite: 23]
* **Combat Output**: Rank C (40 DPS; Focused Pulsed Ion Cannon, Rank S shield damage multiplier)[cite: 23]

### 10. Lancer Railgun Corvette (4W)
* **Weight Class**: 4W[cite: 24]
* **Shields / Hull**: Rank C Shields (300 HP) / Rank C Hull (500 HP)[cite: 24]
* **Speed Class**: Rank C Velocity (1.0)[cite: 24]
* **Vision Range**: 2,500m[cite: 24]
* **Combat Output**: Rank A (500 damage per slug; Heavy Sub-Atomic Railgun Array, 10 slug cache)[cite: 24]

### 11. Mining Barge (2W)
* **Weight Class**: 2W[cite: 25]
* **Shields / Hull**: Rank C Shields (300 HP) / Rank B Hull (2,000 HP)[cite: 25]
* **Speed Class**: Rank D Velocity (0.4)[cite: 25]
* **Vision Range**: 600m[cite: 25]
* **Combat Output**: Rank D (2 DPS; High-Yield Thermal Extraction Beam, Rank S extraction rate)[cite: 25]

### 12. Phantom Transport (1W)
* **Weight Class**: 1W[cite: 26]
* **Shields / Hull**: Rank B Unified Pool (1,500 Shields / 2,000 Hull combined block)[cite: 26]
* **Speed Class**: Rank C Velocity (1.0)[cite: 26]
* **Vision Range**: 600m (Radar invisible unless triggered)[cite: 26]
* **Combat Output**: Rank C (50 DPS; Anti-System Pulse Cannon at point-blank range)[cite: 26]

### 13. Plasma Skimmer (2W)
* **Weight Class**: 2W[cite: 27]
* **Shields / Hull**: Rank C Shields (300 HP) / Rank B Hull (2,000 HP)[cite: 27]
* **Speed Class**: Rank D Velocity (0.4)[cite: 27]
* **Vision Range**: 600m[cite: 27]
* **Combat Output**: Rank D (2 DPS; High-Vacuum Magnetic Plasma Siphon, Rank S extraction rate)[cite: 27]

### 14. Recon Probe (1W)
* **Weight Class**: 1W[cite: 28]
* **Shields / Hull**: 20 Shields / 20 Hull (Instantly destroyed on hit)[cite: 28]
* **Speed Class**: Rank S Velocity (3.5)[cite: 28]
* **Vision Range**: 2,500m radius[cite: 28]
* **Combat Output**: Rank D (0 DPS; Unarmed)[cite: 28]

### 15. Specter Radar Jammer (3W)
* **Weight Class**: 3W[cite: 29]
* **Shields / Hull**: Rank A Shields (4,000 HP) / Rank C Hull (500 HP)[cite: 29]
* **Speed Class**: Rank B Velocity (1.8)[cite: 29]
* **Vision Range**: 600m (Jamming footprint 1,200m)[cite: 29]
* **Combat Output**: Rank D (0 DPS; Aetherium Electronic Cloaking Array)[cite: 29]

### 16. Supply Tender (2W)
* **Weight Class**: 2W[cite: 30]
* **Shields / Hull**: Rank C Shields (300 HP) / Rank B Hull (2,000 HP)[cite: 30]
* **Speed Class**: Rank C Velocity (1.0)[cite: 30]
* **Vision Range**: 600m[cite: 30]
* **Combat Output**: Rank D (0 DPS; On-Board Rapid Ordnance Synthesizer)[cite: 30]

### 17. Heavy Torpedo Bomber (4W)
* **Weight Class**: 4W[cite: 31]
* **Shields / Hull**: Rank C Shields (300 HP) / Rank S Hull (7,500 HP)[cite: 31]
* **Speed Class**: Rank C Velocity (0.9)[cite: 31]
* **Vision Range**: 600m[cite: 31]
* **Combat Output**: Rank A (600 damage per torpedo volley; 2s cooldown)[cite: 31]

### 18. Viper Interceptor (1W)
* **Weight Class**: 1W
* **Shields / Hull**: 100 Shields / 50 Hull
* **Speed Class**: Rank S Velocity (2.8)
* **Vision Range**: 600m
* **Combat Output**: Rank C (60 DPS; Twin Light Lasers, 10 damage/hit, 0.5s fire rate, 400m range)

### 19. Vortex Minelayer (3W)
* **Weight Class**: 3W
* **Shields / Hull**: Rank B Shields (1,500 HP) / Rank B Hull (2,000 HP)
* **Speed Class**: Rank C Velocity (1.0)
* **Vision Range**: 600m
* **Combat Output**: Rank C (50 shield damage per mine; 50 mine cache, 0 hull damage)

### 20. Relay Warp Frigate (5W)
* **Weight Class**: 5W
* **Shields / Hull**: Rank S Shields (10,000 HP) / Rank B Hull (2,000 HP)
* **Speed Class**: Rank B in transit (1.8) / Rank D stationary when anchored (0)
* **Vision Range**: 1,500m telemetry range
* **Combat Output**: Rank D (0 DPS; Quantum Wormhole Generator holding 10 warp canisters)

### 21. Grav Extractor (2W)
* **Weight Class**: 2W
* **Shields / Hull**: Rank C Shields (300 HP) / Rank B Hull (2,000 HP)
* **Speed Class**: Rank D Velocity (0.4)
* **Vision Range**: 600m
* **Combat Output**: Rank D (2 DPS; Gravitational Resonance Pulser, Rank S extraction rate)
