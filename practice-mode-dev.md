# Development Plan: Unit Testing & Practice Sandbox Mode

## Overview
This document outlines the architectural changes and implementation steps required to introduce a dedicated **Unit Testing & Practice Sandbox Mode** alongside the existing core game mode. This sandbox allows commanders to spawn, select, and test individual units from the master catalog in a controlled environment without standard match constraints.

---

## 1. Backend Architecture Changes (`space-tactics-server`)

### A. `cmd/server/main.go`
* **Objective**: Add route handling or configuration flags to initialize a sandbox game room instance separate from the primary PvE/PvP match loop.
* **Changes**:
  * Register a secondary WebSocket endpoint or pass a mode flag during room initialization (e.g., `/ws/sandbox`).
  * Instantiate a `SandboxRoom` instance that disables automatic win/loss condition tracking and aggressive AI enemy spawning by default.

### B. `internal/game/room.go`
* **Objective**: Create or extend the game room loop to support sandbox operations.
* **Changes**:
  * Implement `SandboxRoom` struct embedding or extending `GameRoom`.
  * Bypass standard deployment queues and victory/defeat timers.
  * Implement command handlers for direct unit spawning, instant health resetting, and god-mode toggles.

### C. `internal/models/structs.go`
* **Objective**: Define new network payloads for sandbox control commands.
* **Changes**:
  * Add client request structs for sandbox actions:
    * `SpawnUnitRequest` (specifying unit ID from the master catalog, team/owner, and initial $(x, y)$ coordinates).
    * `ModifyUnitRequest` (adjusting health, shields, or ammunition on the fly).
    * `ClearSandboxRequest` (wiping all spawned entities from the map).

### D. `internal/api/handlers.go` (Optional)
* **Objective**: Expose HTTP endpoints to configure sandbox initialization parameters (e.g., enabling infinite resources or selecting test environment hazards from `enviornment/`).

---

## 2. Frontend Architecture Changes (`Space Tactics Frontend`)

### A. `src/App.tsx`
* **Objective**: Support navigation and state management between the main game mode and the new Sandbox mode.
* **Changes**:
  * Add routing state to toggle the application view between the primary campaign loop and the `SandboxDashboard`.

### B. `src/components/GarageDashboard.tsx` or `SandboxControlPanel.tsx`
* **Objective**: Build a unit catalog selection interface.
* **Changes**:
  * Create a dedicated sidebar or overlay panel listing every individual unit from `MASTER_UNIT_BEHAVIORS.md` (from 1W to 5W, including harvesters, supports, and capital flagships).
  * Provide interactive buttons to queue unit spawning into the active session.

### C. `src/components/GameViewport.tsx`
* **Objective**: Adapt the canvas render loop for testing and debugging.
* **Changes**:
  * Implement sandbox-specific overlay tools: spawn placement grid cursor, unit health/armor debug telemetry inspectors, and instantaneous reset triggers.

### D. `src/hooks/useGameSockets.ts`
* **Objective**: Transmit and receive sandbox-specific binary or JSON WebSocket commands.
* **Changes**:
  * Add client methods for sending unit spawn coordinates and state modification commands to the backend `SandboxRoom`.
