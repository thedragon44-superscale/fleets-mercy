# Go Backend Bugfix, Thread-Safety & Zero-Hardcoding Roadmap

Ordered strictly bottom-up (**DB Layer → REST API → Core Simulation Helpers → AI & TDM Room**) so every package compiles cleanly at each step with zero backtracking.

---

## Step 1: `backend/internal/db/postgres.go`
Eliminate concurrent map read/write races and close persistence gaps.

* **Thread-Safe Template Cache:** Add a `sync.RWMutex` (`TemplatesMu`) around `db.Templates` along with safe helper functions (`GetTemplate(unitType)` / `SetTemplate(unitType, tmpl)`) so HTTP handlers and 60Hz game rooms never race.
* **Complete Persistence:** Expand `SaveTemplateOverride` to persist missing columns (`weight_class`, `optimal_range`, `max_range`, `engagement_range_cap`, `ammo_capacity`, `radar_immunity_active`, `lateral_thrust_power`, `reverse_thrust_power`, `drift_coefficient`).

---

## Step 2: `backend/internal/api/handlers.go`
Harden REST responses, fix silent errors, and synchronize the in-memory cache safely.

* **Thread-Safe Cache Sync:** Update `SaveTemplateHandler` to write through `db.TemplatesMu` and sync all active `FleetUnit` fields (`OptimalRange`, `MaxRange`, `EngagementRangeCap`, `RadarImmunityActive`, `StealthTimer`, etc.) back into memory.
* **Clean JSON Arrays & Logging:** Initialize `loadouts` and `maps` with `make([]..., 0)` so empty results serialize as `[]` instead of `null`, and log any `rows.Scan` errors inside `GetTemplatesHandler` instead of silently skipping rows.
* **Loadout Squad Leaders:** Add `squad_leaders` support to `GetLoadoutsHandler` and `SaveLoadoutHandler` (if the `player_loadouts` table has the column; otherwise keep backward-compatible).

---

## Step 3: `backend/internal/game/movement.go`
Unify smooth turning physics and wire remaining PostgreSQL movement stats.

* **Shared Turn-Rate Helper:** Extract `RotateTowards(unit *models.FleetUnit, targetAngle float64)` using `unit.TurnRate` at 60Hz so both player ships and AI ships turn smoothly without direction snapping.
* **Wire Database Stats:** Use `unit.StrafingSpeed` (when `> 0`) for lateral strafing and scale thrust using `unit.AccelerationCurve` instead of hardcoded multipliers.

---

## Step 4: `backend/internal/game/physics.go`
Fix combat damage math and activate shield regeneration.

* **Overkill Bleed-Through:** Update `applyDamage` so excess damage that breaks a shield quadrant bleeds directly into the corresponding hull quadrant instead of vanishing.
* **Shield Regeneration Loop:** Add `RegenerateShields(unit *models.FleetUnit)` driven by `unit.ShieldRegenRate` and `unit.ShieldRechargeDelayTicks` (tracking damage cooldown ticks per unit).

---

## Step 5: `backend/internal/game/collisions.go`
Fix double-damage collisions and stacked-spawn deadlocks.

* **Single-Pass Pair Iteration:** Convert the map to a slice and iterate `for i := 0; i < n; i++ { for j := i + 1; j < n; j++ }` so every colliding pair is resolved once per pass instead of twice (halves CPU cost and fixes 2× collision damage).
* **Zero-Distance Unstacking:** Handle `dist <= 0.1` with a deterministic tiny separation vector so units spawned on identical coordinates push apart cleanly instead of staying permanently stacked.

---

## Step 6: `backend/internal/game/ballistics.go`
Wire live ammo and thermal mechanics to match the new FlatBuffers telemetry.

* **Ammo Consumption:** When `unit.MaxAmmoCapacity >= 0`, require `unit.CurrentAmmo > 0` to fire and decrement `unit.CurrentAmmo` on each shot (`-1` remains infinite).
* **Thermal Loop:** Increment `unit.CurrentThermal` on fire, block firing if overheated (`CurrentThermal >= MaxThermalCapacity > 0`), and cool down each tick.

---

## Step 7: `backend/internal/game/radar.go`
Eliminate hardcoded radar ranges and honor stealth flags.

* **Database-Driven Vision:** Replace the hardcoded `600.0` visual clear threshold with `unit.VisionRange` (falling back to `600.0` only if `<= 0`).
* **Stealth Immunity:** Respect `target.RadarImmunityActive` so cloaked units remain `VisibilityShrouded` outside visual clear range.

---

## Step 8: `backend/internal/game/logistics.go`
* **4-Quadrant Field Repair:** Update `processFieldRepairTether` to repair the most damaged quadrant across `Front`, `Rear`, `Port`, and `Starboard` instead of only `Hull.Front`.

---

## Step 9: `backend/internal/game/ai_behaviors.go`
Eliminate AI direction snapping, dead code, and hardcoded constants.

* **Smooth AI Turning:** Replace every instant `unit.Angle = math.Atan2(...)` snap with `RotateTowards(unit, desiredAngle)`.
* **Remove Dead Code & Duplication:** Remove the redundant `r.findBestTarget(unit)` call inside the `BODYGUARD` `else if` branch, and remove duplicate field-repair loops already handled by `logistics.go`.
* **Zero-Hardcoding Cleanup:** Replace Recon Probe's hardcoded flee speed (`3.5`) with `unit.Speed * 1.5` and derive sweep center from room bounds instead of hardcoded `6000.0`.

---

## Step 10: `backend/internal/game/teamDeathMatch/tdm_room.go`
Bring TDM server broadcasts and input lifecycle up to parity with `room.go`.

* **Full Telemetry Broadcast:** Populate `Vel`, `AiState`, `CurrentThermal`, and `CurrentAmmo` on each `FleetUnit` in `Run()`'s FlatBuffers builder.
* **Clean Input Resets:** Clear `r.lastInput` in `ResetMatch()` and on client disconnect so movement and firing never stick across matches.

---

## Verification
```bash
cd ~/fleets-mercy/backend
go build ./...
cd cmd/server && go run main.go
