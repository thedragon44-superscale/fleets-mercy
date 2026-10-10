# Backend Architecture: `space-tactics-server`

## 1. Directory Structure & Entry Point
* **`cmd/server/main.go`**: The server entry point that initializes the PostgreSQL database[cite: 6], spawns the core game room loop, and binds HTTP and WebSocket endpoints on port `8080`.
* **`internal/api/handlers.go`**: Handles HTTP REST endpoints for player authentication (`/api/login`) and squad loadout management (`/api/loadouts`, `/api/loadouts/save`) with CORS headers enabled[cite: 7].
* **`internal/db/postgres.go`**: Manages the PostgreSQL connection (`spacetactics` database) and pre-loads expanded unit blueprints from the `unit_templates` table into memory upon startup[cite: 6].
* **`internal/game/room.go`**: Houses the main `GameRoom` structure, WebSocket upgrader (`/ws`), native PvE AI brain (`runAI`), squad deployment queue, map structure loading, and the 60 Hz game loop (16ms ticker) orchestrating simulation sub-modules and broadcasting server state[cite: 4, 6].
* **`internal/game/ai_behaviors.go`**: Houses unit-specific autonomous state machines and transition triggers including GUARD, SEEK, COMMAND_RELAY, BODYGUARD, RETREAT, recon evasion, and buddy repair protocols[cite: 4].
* **`internal/game/ballistics.go`**: Manages weapon firing cooldowns, projectile calculations, speed vectors, range capping, and projectile-to-unit collision/damage resolution[cite: 5].
* **`internal/game/movement.go`**: Processes user throttle, strafing, velocity vector clamping, acceleration curves, and physics displacement[cite: 4].
* **`internal/game/collisions.go`**: Resolves physics-based overlapping collisions between individual fleet units with impact damage integration[cite: 5].
* **`internal/game/logistics.go`**: Manages resource harvesting loops, supply tender cache generation, and capital ship support operations[cite: 3].
* **`internal/game/radar.go`**: Implements the shared Fleet Array telemetry grid (`IsUnitVisible`) to calculate shared fog-of-war vision across direct sensors, frigate relays, and recon probes[cite: 5].
* **`internal/game/physics.go`**: Contains core damage-resolution logic, incorporating a 95% damage reduction for flagship dreadnought armor, directional quadrant tracking (front, rear, port, starboard), and environmental/gravitational interaction[cite: 5].
* **`internal/models/structs.go`**: Defines core data structures, including client requests, player loadouts, vector calculations, hierarchical/tactical fields (`SquadID`, `IsSquadLeader`, `IsBattalionCommander`, `BuddyID`), universal resource tracking (`ResourceCache`, `MaxResourceCapacity`), expanded `UnitTemplate` schemas, fleet units, projectiles, and the broadcast server state payload[cite: 3].

## 2. Key Technical Constants & Game Rules
* **Map Boundaries**: Fixed coordinate space spanning $12,000 \times 12,000$ meters with strict position clamping[cite: 3, 4].
* **Tick Rate**: The game loop updates at a fixed interval of 16 milliseconds (~62.5 ticks per second)[cite: 4].
* **Database Backend**: PostgreSQL via `lib/pq` driver[cite: 2, 6], using user credentials `gameadmin` and database `spacetactics`[cite: 6].
* **Communication Protocol**: WebSocket connections managed by `gorilla/websocket`[cite: 1, 4] for real-time bidirectional state streaming and client input parsing.

psql -h 127.0.0.1 -U gameadmin -d spacetactics

(Password: tactics123)
