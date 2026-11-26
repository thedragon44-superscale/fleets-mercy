# Sandbox Modals, Inspector Polish & TDM Overhaul — Update Roadmap

Ordered strictly bottom-up (**TDM Backend → Inspector UI → Sandbox Modals → Dev Settings → TDM Frontend**) so each file compiles cleanly with zero backtracking.

---

## Step 1: `backend/internal/game/teamDeathMatch/tdm_room.go`
Align the TDM server loop with the updated FlatBuffers schema and prevent stuck inputs across resets.

* **Telemetry Broadcast:** Populate `Vel`, `AiState`, `CurrentThermal`, and `CurrentAmmo` on each `FleetUnit` inside `Run()`'s FlatBuffers builder.
* **Input Reset Guards:** Zero out `r.lastInput` inside `ResetMatch()` and on client disconnect so movement and firing never stay stuck between matches.

---

## Step 2: `src/components/UnitConfig/UnitConfigHeader.tsx`
Make the Inspector header interactive and data-driven.

* **Live Unit Switcher:** Wire the already-passed `onSelectUnit` prop to a compact `<select>` dropdown populated from `useUnitTemplates` (enriched with `UNIT_DB` display names/roles) so you can switch inspected units directly inside the Inspector.

---

## Step 3: `src/components/UnitConfig/UnitConfigTabs.tsx`
Fix the tab grid layout and add per-tab dirty indicators.

* **Grid Fix:** Change `sm:grid-cols-6` to `sm:grid-cols-5` to eliminate the empty 6th column.
* **Modified Badges:** Accept `modifiedFields?: Set<keyof UnitConfigConfigPayload>` and display an amber indicator dot on any tab that currently has unsaved edits.

---

## Step 4: `src/components/UnitConfig/UnitConfigContainer.tsx`
* **Wire Tab Badges:** Pass `modifiedFields={modifiedFieldSet}` into `<UnitConfigTabs />`.

---

## Step 5: `src/components/PilotSwitcherModal.tsx`
Clean up text artifacts and deduplicate color configuration.

* **Bug Fix:** Remove the stray `[cite: 10]` artifact from the modal description.
* **Shared Colors:** Replace duplicated local squad/battalion color maps with shared imports from `../utils/groupingColors`.

---

## Step 6: `src/components/DockingModal.tsx`
Enforce clean squad leadership and accurate battalion unlocking.

* **Single Squad Leader Enforcement:** When clicking `SET` on a unit, automatically demote any existing leader in that same `(battalionId, squadId)` before promoting the new unit.
* **Per-Battalion Unlocking:** Unlock Battalion 1 (Alpha) and Battalion 2 (Beta) based on actual spawned `battalion_command_ship` battalion IDs instead of unlocking both tiers with a single `hasCommandShip` boolean.

---

## Step 7: `src/components/DeveloperSettingsDashboard.tsx`
* **Clarity Badges:** Tag the 3 unwired placeholder controls (`netSimulatedLatency`, `particleDensityMultiplier`, `aiUpdateIntervalTicks`) with a `WIP` badge so they are clearly distinguished from the live `renderDelay`, `debugCollisions`, and `debugRadarRanges` controls.

---

## Step 8: `src/components/teamDeathMatch/unitSelection.tsx`
Upgrade TDM unit selection to be fully data-driven and visually consistent with the Garage.

* **Live PostgreSQL Stats:** Replace hardcoded strings (`speed: 'High'`, `dps: 'Medium'`) with live numbers from `useUnitTemplates` (Speed, DPS, Shields, Hull, Sensor Range, Weight Class).
* **Real Unit Sprites:** Replace placeholder `🚀` emojis in the hero showcase and fighter grid with actual unit PNG sprites from `src/assets/`.
* **Inline Validation:** Replace the blocking `alert()` with an inline warning and disabled deploy button when 0 spawn pool classes are checked.

---

## Step 9: `src/components/teamDeathMatch/mapSelection.tsx`
Polish TDM map cards and error handling.

* **Card Layout & Metadata:** Add `line-clamp-2` on map descriptions to prevent overflow and display map dimensions (`width × height`) in the card footer.
* **Header & Fallback Feedback:** Format `pilotedUnit` cleanly (`viper_interceptor` → `Viper Interceptor`) and show a non-blocking warning banner if `fetchMaps()` falls back to the default sector.

---

## Step 10: `src/components/teamDeathMatch/tdmViewport.tsx`
Fix the critical 60Hz render-loop bug and bring TDM visuals up to parity with Sandbox and Standard Game.

* **Fix 60Hz Loop Teardown:** Store incoming `ServerStateSnapshot` in a `useRef` instead of React state so `requestAnimationFrame` runs continuously without restarting 60 times/sec; sync only low-frequency HUD state (FPS, team alive counts, `isGameOver`, `winningFaction`) to React.
* **Input & Pilot Stability:**
  * Add `window.blur` cleanup and `.ui-interactive` click guards so keys/firing never stick when clicking HUD buttons or alt-tabbing.
  * Pin the piloted unit's `id` in a ref once acquired (only reassigning if destroyed) so the camera never jumps between allied ships of the same class.
* **Visual & Tactical Parity:**
  * Replace placeholder triangles/dots with `drawFlagship`, `drawUnitAsset`, `drawProjectile`, `renderEnvironmentVector` (via `fetchMapDetail`), and `getInterpolatedUnits`.
  * Add `ResizeObserver` canvas sizing, `drawHUDDiagnostics`, a bottom-right tactical radar with `sensorRange` fog-of-war, and a live `Player vs Enemy` alive scoreboard.

---

## Verification
1. **Backend (Pi):** `cd backend/cmd/server && go run main.go`
2. **Frontend (Laptop):** `npx tsc --noEmit` (confirm 0 errors), then test Inspector, Sandbox Modals, and a full 20v20 TDM match in `npm run tauri dev`.
