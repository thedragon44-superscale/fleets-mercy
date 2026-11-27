Inspect `src/components/teamDeathMatch/tdmViewport.tsx` (and `src/renderer/pixiEnvRenderer.ts` / `pixiSprites.ts`) — TDM connects and receives all 35 units + 5 env objects (they render on the 2D TDM Radar), but the main Pixi viewport shows `FPS: 0` and only renders the piloted unit.

Check and report on:
1. Any uncaught exception or early return inside the Pixi ticker / render loop in `tdmViewport.tsx` (especially around the new `BitmapText` labels or `pixiEnvRenderer` calls).
2. How `FPS` is calculated and updated in the TDM HUD (why it stays stuck at `0`).
3. Camera transform, zoom scale, and container visibility/z-index for `EnvObjects` and non-piloted units in `tdmViewport.tsx`.
4. Why the bottom-left shield HUD readout (`FRON SHD`, `REAR SHD`, etc.) is slightly clipped on the left edge.

Discuss findings before editing any files.
