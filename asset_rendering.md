# Execution Plan: Phase 1 (Stability) -> Phase 2 Option A (2D Canvas + Swappable Renderer)

Proceed with **Phase 1 first**, verify stability and clean builds, then execute **Phase 2 — Option A (HTML5 2D Canvas + PNG Sprites)** structured behind a clean renderer interface so Pixi.js (or WebGPU) can be swapped back in later without rewriting viewports or game logic.

---

## Phase 1: Backend & WebSocket Stability (Execute First)

1. **`WSClient` panic + head-drop latest-frame queue**
   - Files:
     - `backend/internal/game/ws_client.go`
     - `backend/internal/game/room.go`
     - `backend/internal/game/teamDeathMatch/tdm_room.go`
     - `backend/internal/game/spacePirates/sp_room.go`
   - Goal: Eliminate server panics on abrupt client disconnect and prevent Wi-Fi stale-frame rubber-banding by dropping stale queued frames in favor of the latest snapshot.

2. **`db.Templates` data race & `ReloadMapStructures` DB-under-lock / split-mutex bug**
   - Files:
     - `backend/internal/game/room.go`
     - `backend/internal/game/teamDeathMatch/tdm_room.go`
   - Goal: Fix concurrent map/slice access races and ensure DB queries are never executed while holding active game-loop locks.

3. **Space Pirates idle broadcast + double-rAF race + root `App` re-render storm**
   - Files:
     - `backend/internal/game/spacePirates/sp_room.go`
     - `src/hooks/useSpacePiratesSocket.ts`
     - `src/components/casino/spacePirates/SpacePiratesTableView.tsx`
   - Goal: Stop unnecessary idle broadcasts, eliminate duplicate `requestAnimationFrame` loops, and isolate high-frequency socket updates from triggering root React re-renders.

4. **TDM socket `closedByCleanup` race & Sandbox `fetchMapDetail` camera race + mid-frame `setState`**
   - Files:
     - `src/components/teamDeathMatch/tdmViewport.tsx`
     - `src/components/sandbox/PracticeViewport.tsx`
     - `src/hooks/useGameSockets.ts`
   - Goal: Fix cleanup race conditions on mode switches, prevent `fetchMapDetail` from clobbering camera initialization, and remove mid-frame React `setState` calls inside the render loop.

**Phase 1 Verification:**
- Run Go build & race check (`go build ./...`, `go test -race ./...` where applicable).
- Run frontend typecheck (`npx tsc --noEmit`).
- Pause and report Phase 1 completion before starting Phase 2.

---

## Phase 2: Option A — Clean HTML5 2D Canvas + Swappable Renderer Contract

Move the 3 viewports (`SpacePiratesViewport.tsx`, `tdmViewport.tsx`, `PracticeViewport.tsx`) back to clean HTML5 2D Canvas rendering using our optimized 256/512px PNG sprites (`ctx.drawImage`).

### Preserve All Performance Wins
- Latest-frame coalescing from the WebSocket buffer.
- Offscreen-cached environment objects (asteroids/structures) with proper cache invalidation after async config loads.
- Throttled 12Hz radar updates.
- Throttled React HUD updates.
- Zero WebGL2 / WebKitGTK driver quirks or context-loss glitches on mode switches.

### Future-Proofing Rules (For Swapping to Pixi.js Later)
Build the 2D Canvas layer with strict boundaries so a future `PixiRenderer` can drop in without touching React viewports, sockets, or game modes:

1. **Single Renderer Interface (`ViewportRenderer`)**
   - Abstract rendering behind a shared TypeScript interface (e.g., `init(container)`, `resize(width, height)`, `setEnvObjects(objects)`, `render(frameState, camera)`, `destroy()`).
   - Implement `Canvas2DRenderer` against this contract; viewports should only talk to the interface, never directly to `CanvasRenderingContext2D`.
2. **Stateless Renderer**
   - Keep all entity state, interpolation, and snapshot buffering in plain TypeScript structs outside the renderer. The renderer only reads frame data and draws.
3. **Renderer-Agnostic Camera & Input Math**
   - Keep pan, zoom, screen-to-world, world-to-screen, and hit-testing math in a pure utility module shared by all viewports.
4. **Data-Driven Sprite Registry**
   - Load and cache the 256/512px PNG sprites via a shared, data-driven asset manifest so the exact same assets work for both `ctx.drawImage` now and Pixi textures later.

**Phase 2 Verification:**
- Confirm zero TypeScript errors (`npx tsc --noEmit`) and clean Tauri/Vite build.
- Verify all 3 viewports switch cleanly without context loss, stale env fallbacks, or memory leaks on unmount.
