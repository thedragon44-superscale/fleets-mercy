Audit why the player's chosen unit in TDM ignores mouse/keyboard control and continuously circles on its own (camera and selection ring track the unit properly, so the piloted ID is recognized visually).

Trace the full control pipeline end-to-end and report findings before editing:
1. **Frontend Input (`src/components/teamDeathMatch/tdmViewport.tsx`):**
   - Verify pointer/mouse/key listeners are attached and firing (not blocked by a HUD overlay or Pixi v8 canvas `pointer-events` change).
   - Verify screen-to-world coordinate conversion accounts for the Pixi v8 camera/resolution/DPR setup and that WebSocket input packets are actually being sent.
2. **Backend WebSocket Read Loop (`backend/internal/game/ws_client.go` & `backend/internal/game/teamDeathMatch/`):**
   - Confirm incoming TDM client input messages (cursor target, movement, fire, pilot selection) are still being read and routed into the TDM room after the `ws_client.go` refactor.
3. **Backend Pilot vs. AI Guard (`backend/internal/game/teamDeathMatch/` & `movement.go`):**
   - Confirm the chosen piloted unit (including non-flagship units) is excluded from automated TDM AI overrides and is reading the live player cursor target instead of a stale `(0, 0)` or spawn target.

Present the exact root cause and file/line fix plan before making changes.
