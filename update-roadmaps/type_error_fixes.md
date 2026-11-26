# Frontend Type-Safety, Bugfix & Binary Migration Roadmap

Ordered strictly bottom-up (**Renderer Utility → Leaf Components → Shared Types/Garage → Standard Viewport → App Entry**) so each file compiles cleanly before any dependent file is modified.

---

## Step 1: `src/renderer/interpolation.ts`
Fix TypeScript errors, prevent `NaN` / backward-snap rendering glitches, and optimize lookup complexity for large skirmishes.

* **Type Safety:** Replace the undefined `ServerStateSnapshot` reference with a generic `InterpolationSnapshot<T extends { id: string; pos: { x: number; y: number }; angle: number }>` interface (`{ timestamp: number; units: T[] }`).
* **Boundary & `NaN` Guards:**
  * Return the newest snapshot when `targetTime >= last.timestamp` and the oldest when `targetTime <= first.timestamp` (prevents ships from snapping backward on low-latency LAN connections).
  * Guard against `newer.timestamp <= older.timestamp` to prevent division-by-zero (`NaN` coordinates), and clamp `alpha` strictly to `[0, 1]`.
* **Performance & Smoothness:**
  * Replace the $O(N^2)$ `older.units.find(...)` inside `newer.units.map(...)` with a `Map<string, T>` for $O(N)$ per-frame interpolation.
  * Safely normalize negative angles in `lerpAngle`.

---

## Step 2: `src/components/UnitConfig/tabs/AiSensorTab.tsx`
Fix the checkbox type error and complete missing sensor/stealth controls.

* **Type Safety:** Widen `handleSliderChange` parameter type from `val: number` to `val: number | boolean`.
* **UX & Input Fix:** Add `onKeyUp` alongside `onMouseUp`/`onTouchEnd` on range sliders so keyboard arrow-key adjustments commit live WebSocket overrides.
* **Missing Field:** Add the `shieldGatedStealthThreshold` slider (already wired in `game_state.fbs`, `binaryCodec.ts`, and `useUnitTemplates`).

---

## Step 3: `src/components/GarageDashboard.tsx` *(Minimal Fix Pass — Full Overhaul Deferred)*
Clear all 21 TypeScript errors and fix critical state/crash bugs without altering the existing Garage layout or tier tabs (saved for a dedicated Garage upgrade later).

* **Type Safety:** Add `'sensorRange'` to the `Omit<UnitBlueprint, ...>` union on `BASE_CATALOG_METADATA`.
* **Bug Fixes:**
  * **Avoid In-Place State Mutation:** Clone `squad1`–`squad4` before filtering removed units inside `updateFleetQuantity`.
  * **Squad Leader Index Shift:** In `removeUnitFromSlot`, decrement `leaders[squadKey]` by 1 whenever `leaders[squadKey] > slotIdx` so splicing an earlier slot doesn't shift leadership to the wrong ship.
  * **Null-Safe Picker Lookup:** Replace `unitDbState.find(x => x.id === uId)!` with a safe guard so stale database loadouts cannot crash the picker modal.
* **Shared Data Store:** Consume `useUnitTemplates` instead of running a duplicate `GET /api/templates` fetch on mount.

---

## Step 4: `src/components/GameViewport.tsx`
Migrate Standard Mode from broken JSON WebSockets to the binary FlatBuffers pipeline and fix all canvas/listener bugs.

* **Type Safety:** Add `playerId: 0, loadoutIndex: 0` to the `defaultLoadout` fallback object.
* **Binary WebSocket Migration:**
  * Replace raw `new WebSocket()` + `JSON.parse`/`JSON.stringify` with `useGameSocket(`${WS_BASE_URL}/ws`)` so frames match `room.go`'s `websocket.BinaryMessage` handler.
  * Remove the dead legacy `mode === 'sandbox'` branch and props (superseded by `PracticeViewport.tsx`).
* **Critical Bug Fixes:**
  * **Listener Cleanup:** Store named references for `blur`, `mousemove`, `mousedown`, and `mouseup` listeners and remove them in the `useEffect` cleanup.
  * **World-Space Explosion Fix:** Render the victory/defeat flagship explosion *before* `ctx.restore()` so `(go.x, go.y)` draws in world space instead of off-screen pixels.
  * **Wire `[R]` Hotkey:** Trigger reset + reserve refill when `'r'` is pressed in `onKeyDown` (matching the `RESET [R]` button).
  * **Resize & Throttling:** Attach a `ResizeObserver` to keep canvas pixel dimensions synced with the viewport, and throttle mouse aim transmissions to 60Hz inside `requestAnimationFrame`.
* **Visual & Tactical Upgrades:**
  * Plug in `getInterpolatedUnits` for smooth 60fps ship motion.
  * Render environmental structures on the main canvas via `renderEnvironmentVector`.
  * Filter enemy radar blips using player `sensorRange` from `useUnitTemplates` to match server fog-of-war rules.

---

## Step 5: `src/App.tsx`
Clean up routing guards, deduplicate map fetching, and pre-warm shared templates.

* **Type Safety:** Remove the unused default `React` import (`import { useState, useEffect } from 'react';`).
* **Prop Alignment:** Remove the legacy `mode="standard"` prop from `<GameViewport />` after Step 4.
* **Bug Fixes & Polish:**
  * **Blank-Screen Guard:** If `view === 'standard-game'` is entered with `activeLoadout === null`, redirect/render `GarageDashboard` instead of returning `null`.
  * **Safe Default Map:** When `fetchMaps()` resolves, fall back `selectedMapId` to `data[0].id` if the current ID is not in the returned map list.
  * **Deduplicate & Pre-Warm:** Consolidate the 5 inline `fetchMaps()` calls into a single `refreshMaps()` helper and trigger `refreshUnitTemplates()` once after login so Garage, Sandbox, and Standard Game open with instant specs.

---

## Step 6: `src/main.tsx`
* **Type Safety:** Remove the unused `import React from "react";` line.

---

## Verification
After Step 6, run:
```bash
npx tsc --noEmit
