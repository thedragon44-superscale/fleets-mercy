## Phase 4: Enemy Combat Sandbox Spawner (Next Step) ⏳ IN PROGRESS

- [ ] **4.1 Schema Update (`game_state.fbs`)**
  - Update payload schema to support a faction/owner identifier (`"player"` vs. `"enemy"`) for sandbox spawn requests.

- [ ] **4.2 Binary Serialization (`binaryCodec.ts` & `gameSocketService.ts`)**
  - Expand client input serialization to carry the active spawner faction context to the backend.

- [ ] **4.3 Backend Mixed-Strategy Anchor & Room Spawning (`room.go`)**
  - Update `room.go` to handle hostile unit generation under `ownerId: "enemy"`.
  - Enforce mixed spawn positioning:
    - Anchor to an active **Enemy Flagship / Command Ship** if present on the map.
    - Fall back to static sector coordinates (e.g., `6000, 2000`) with randomized offsets if no enemy command ship exists.

- [ ] **4.4 Dual-Tab Spawner Sidebar (`PracticeViewport.tsx`)**
  - Add `[🟢 Friendly Fleet]` vs. `[🔴 Enemy Hostiles]` segment control to the UI.
  - Route spawner actions (`+` / `-`) based on active tab to seamlessly spawn and despawn live hostile units.
