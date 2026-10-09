# Backend Architecture: `space-tactics-server`

## 1. Directory Structure & Entry Point
* **`cmd/server/main.go`**: The server entry point that initializes the PostgreSQL database[cite: 6], spawns the core game room loop[cite: 8], and binds HTTP and WebSocket endpoints on port `8080`[cite: 8].
* **`internal/api/handlers.go`**: Handles HTTP REST endpoints for player authentication (`/api/login`) and squad loadout management (`/api/loadouts`, `/api/loadouts/save`) with CORS headers enabled[cite: 7].
* **`internal/db/postgres.go`**: Manages the PostgreSQL connection (`spacetactics` database) and pre-loads unit blueprints from the `unit_templates` table into memory upon startup[cite: 6].
* **`internal/game/room.go`**: Houses the main `GameRoom` structure, WebSocket upgrader (`/ws`), native PvE AI brain (`runAI`), squad deployment queue, and the 60 Hz game loop (16ms ticker) handling movement, collisions, and state broadcasting[cite: 4].
* **`internal/game/physics.go`**: Contains core damage-resolution logic, incorporating a 95% damage reduction for flagship dreadnought armor and directional quadrant tracking (front, rear, port, starboard)[cite: 5].
* **`internal/models/structs.go`**: Defines core data structures, including client requests, player loadouts, vector calculations, fleet units, projectiles, and the broadcast server state payload[cite: 3].

## 2. Key Technical Constants & Game Rules
* **Map Boundaries**: Fixed coordinate space spanning $12,000 \times 12,000$ meters with strict position clamping[cite: 3, 4].
* **Tick Rate**: The game loop updates at a fixed interval of 16 milliseconds (~62.5 ticks per second)[cite: 4].
* **Database Backend**: PostgreSQL via `lib/pq` driver[cite: 2, 6], using user credentials `gameadmin` and database `spacetactics`[cite: 6].
* **Communication Protocol**: WebSocket connections managed by `gorilla/websocket`[cite: 1, 4] for real-time bidirectional state streaming and client input parsing.

## PostgreSQL Database Terminal Access

To connect to the database locally and bypass Linux peer authentication[cite: 19], use the following TCP command:

```bash
psql -h 127.0.0.1 -U gameadmin -d spacetactics
password: tactics123

