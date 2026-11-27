Perform a read-only performance and rendering audit across the WebSocket pipeline, FlatBuffers decoder, and Pixi v8 Sandbox/TDM/Space Pirates viewports before making any edits.

Check and report on:
1. **Backend WebSocket & Tick Loop (`backend/internal/game/room.go`):**
   - Are WebSocket writes non-blocking, or can a slow client stall the 60Hz tick or silently drop frames?
   - Why is `Loaded 6 environmental structures` still executing alongside `envphysics: loaded 5 universal env objects`?
2. **Frontend WebSocket & State Handling:**
   - Does `ws.onmessage` trigger React `setState` per 60Hz binary frame, or write cleanly to a `useRef`?
   - If frames arrive faster than the client renders, is it decoding a stale backlog or dropping to the latest snapshot?
3. **EnvObject Rendering Gap:**
   - Trace `EnvObjects` from `room.go` -> `game_state.fbs` -> TS parser -> Sandbox Pixi viewport to confirm nothing is being dropped, miscoded, culled, or drawn behind another layer.
4. **Pixi v8 Render Loop Bottlenecks:**
   - Identify any per-frame object/texture/Graphics allocations, heavy `clear()` + redraw calls, or filters that would drop FPS to ~20 with ~21 units on screen.

Present your findings with exact file/line references and a prioritized fix plan before changing any code.
