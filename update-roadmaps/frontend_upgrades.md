# Unit Testing Sandbox — Zero-Backtrack Upgrade Roadmap

This roadmap is ordered strictly from the bottom of the stack upward (**Schema → Backend → Wire Codec → Shared State → Renderer → Inspector → Main Viewport**) so each layer is finalized before any dependent file is touched.

---

## Step 1: `schemas/game_state.fbs` (Wire Contract)
Update the FlatBuffers schema first so both Go and TypeScript types are locked in before any code edits.

* **`FleetUnit` table (Downstream Telemetry):**
  * Add `vel: Vector2D;` (for velocity vector debug overlays).
  * Add `ai_state: string;` (for floating AI state labels).
  * Add `current_thermal: float;` and `current_ammo: int;` (for live combat diagnostics).
* **`ClientInput` table (Upstream Sandbox Controls):**
  * Add `is_paused: bool;` and `time_scale: float;` (wires the UI pause and `0.25x`–`2.0x` speed buttons).
  * Add `sandbox_spawn_owner: string;` (enables click-to-spawn for both `player` and `enemy` factions alongside existing `sandbox_spawn`, `spawn_x`, `spawn_y`).
* **`UnitConfigUpdate` table (Optional Scalars):**
  * Verify `shield_gated_stealth_threshold: double;` matches frontend/backend types.
  * *(Optional but recommended)* Mark numeric override fields as optional (`= null`) if your `flatc` version supports it, allowing explicit `0` overrides without colliding with FlatBuffers default values.
* **Action:** Run `flatc` to regenerate `backend/internal/generated/SpaceTactics/` and `src/generated/space-tactics/`.

---

## Step 2: `backend/internal/game/room.go` (Authoritative Sandbox Loop)
Implement all server-side sandbox capabilities once, matching the regenerated Go FlatBuffers bindings.

* **Time Scale & Pause:**
  * Add `isPaused bool`, `timeScale float64`, and a tick accumulator to `GameRoom`.
  * Read `clientInput.IsPaused()` and `clientInput.TimeScale()` in `HandleWS`.
  * In `Run()`, skip AI, movement, physics, and ballistics when paused (or step proportionally to `timeScale`) while continuing to broadcast `ServerState` so the frontend stays responsive.
* **Faction-Aware Spatial Spawning:**
  * Update the `clientInput.SandboxSpawn()` handler to read `SandboxSpawnOwner()` (defaulting to `"player"`) and spawn the unit directly at `(SpawnX, SpawnY)` without random offset drift when exact placement is requested.
* **Complete Live Stat Overrides:**
  * Expand the `TemplateOverrideConfig` block to apply *all* ~60 `UnitConfigUpdate` fields to both `db.Templates[unitType]` and live `r.units` instances.
  * Remove `if val != 0` guards (since the frontend sends the full unit config object on change, or use FlatBuffers presence checks if optional scalars were enabled in Step 1) so stats can be live-tuned down to `0`.
* **Broadcast Debug Telemetry:**
  * Populate `Vel`, `AIState`, `CurrentThermal`, and `CurrentAmmo` on each `FleetUnit` in the `Run()` FlatBuffers broadcast.

---

## Step 3: `src/parsers/binaryCodec.ts` (Frontend Wire Codec)
Align TypeScript serialization and deserialization with the regenerated FlatBuffers classes.

* **Fix Type Mismatch:** Change `shieldGatedStealthThreshold?: boolean` to `number`.
* **Update `SnapshotUnit` & `unpackServerBinaryMessage`:**
  * Unpack `vel: { x, y }`, `aiState: string`, `currentThermal: number`, and `currentAmmo: number`.
* **Update `serializeClientInput`:**
  * Accept and encode `isPaused`, `timeScale`, and `sandboxSpawnOwner`.

---

## Step 4: `src/services/gameSocketService.ts` & `src/hooks/useGameSockets.ts` (Transport & Metrics)
Expose real network/tick telemetry and ensure new sandbox commands pass through cleanly.

* **Pass-Through Fields:** Ensure `sendInput` forwards `isPaused`, `timeScale`, `sandboxSpawn`, `sandboxSpawnOwner`, `spawnX`, and `spawnY` to `serializeClientInput`.
* **Real Tick Telemetry:** Track the rolling average delta (ms) between incoming `ServerState` binary frames and expose `tickMs` from `useGameSocket` so the viewport header no longer displays a hardcoded `16ms`.

---

## Step 5: `src/hooks/useUnitTemplates.ts` *(New File — Shared Template Store)*
Create a single source of truth for PostgreSQL unit templates before updating the inspector or viewport.

* Fetch `GET /api/templates` once on mount (handling both `camelCase` and `snake_case` normalization in one place).
* Store both `templates` (active/live state) and `originalTemplates` (pristine DB baseline), plus a synced `templatesRef` for the 60fps canvas render loop.
* Expose helper methods: `updateLiveTemplate(unitType, patch)`, `revertTemplate(unitType)`, `saveTemplateToDB(unitType)`, and `refreshTemplates()`.
* Eliminates the 2-second polling interval in `PracticeViewport.tsx` and the duplicate fetch in `UnitConfigContainer.tsx`.

---

## Step 6: `src/renderer/vectorAssets.ts` (Visual Debug Overlays)
Add pure canvas drawing helpers before wiring their toggles into the viewport.

* **`drawUnitDebugOverlays(ctx, unit, template, overlayFlags)`:**
  * **Range Rings:** Toggleable dashed circles for `visionRange`, `sensorRange`, `aggroRange`, `optimalRange`, and `maxRange`.
  * **Vitals & Telemetry:** Floating compact shield/hull bars, unit ID, `aiState` tag, squad/battalion badge, and thermal/ammo indicators.
  * **Velocity Vector:** Directional arrow scaled by `unit.vel`.
* **`drawSpawnGhost(ctx, worldX, worldY, unitType, faction)`:**
  * Renders a translucent placement reticle at the cursor when click-to-spawn mode is active.

---

## Step 7: `src/components/UnitConfig/UnitConfigContainer.tsx` (Inspector Polish)
Refactor the inspector to consume the shared template store.

* Replace local `/api/templates` fetching and baseline state with `useUnitTemplates`.
* Add dirty-state diffing between `templates[selectedUnitId]` and `originalTemplates[selectedUnitId]` to display modified badges on edited tabs/fields.
* Keep `sendTemplateOverride` wired to live edits, saves, and reverts so canvas overlays and radar ranges stay instantly in sync.

---

## Step 8: `src/components/PracticeViewport.tsx` (Final Sandbox Integration)
Bring every completed layer together in a single pass with zero backtracking.

* **Core Bug & Performance Fixes:**
  * Remove the 60fps `console.log('[PROJECTILE DEBUG]...')` call inside `render()`.
  * Move `setIsBootstrapping(false)` and `setControlledUnitId(newId)` out of the component body into a `useEffect`.
  * Throttle `onMouseMove` input transmission (sync to `requestAnimationFrame` or 60Hz interval instead of firing on every raw pointer event).
  * Attach a `ResizeObserver` to the canvas container to dynamically update `canvas.width` and `canvas.height`, fixing aim-offset drift on window resize.
  * Remove dead `loadedImages` / `localAssets` preloading and the 2-second `/api/templates` `setInterval`.
* **Real Controls & Telemetry Header:**
  * Wire `0.25x`–`2.0x` and `PAUSE` buttons to `sendInput({ isPaused, timeScale })`.
  * Display measured client FPS (from `dt` rolling average), real `tickMs` from `useGameSocket`, and per-faction unit/projectile counts.
* **Data-Driven Catalog & Scenario Presets:**
  * Build the spawner catalog and radar weight classes directly from `useUnitTemplates` instead of hardcoded `UNIT_DB`, and add a quick-search filter input.
  * Add one-click scenario preset buttons (*1v1 Duel*, *Recon Fog-of-War*, *Squad Skirmish*) dispatched via `sandboxCounts`.
* **Interactive Canvas (Camera, Click-to-Spawn & Debug Toolbar):**
  * Add **Zoom** (mouse wheel) and **Free-Cam Pan** (middle-click drag + camera lock toggle), updating world-to-screen and screen-to-world coordinate transforms accordingly.
  * Add **Click-to-Spawn** mode (dispatches `sandboxSpawn`, `sandboxSpawnOwner`, `spawnX`, `spawnY` on canvas click) and **Click-to-Select** (click any live unit to pilot or open in Inspector).
  * Add a compact **Debug Overlay Toolbar** toggling range rings, AI/HP labels, and velocity vectors via `drawUnitDebugOverlays`.
