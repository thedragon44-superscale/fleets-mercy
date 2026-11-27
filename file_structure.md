# Fleets Mercy (Space Tactics) — Project Context & Workflow

## Architecture Overview

### Backend (Raspberry Pi 5 — `streetcode101.local`)
* **Runtime & Language:** Authoritative 60Hz Go game server (`backend/cmd/server/main.go`) listening on port `8080`.
* **Database:** PostgreSQL hosted locally on the Raspberry Pi (`backend/internal/db/postgres.go`). Stores unit blueprints (`db.Templates`), map definitions, and environmental structures. Zero-hardcoding architecture—unit stats and map geometry are loaded from PostgreSQL and can be live-tuned at runtime.
* **Networking & Serialization:**
  * **REST API (`backend/internal/api/handlers.go`):** Serves unit templates (`/api/templates`), maps, and config endpoints.
  * **Binary WebSockets (`gorilla/websocket` + FlatBuffers):** Real-time 60Hz state broadcasts and client input ingestion over `/ws?mode=sandbox` and `/ws/tdm` using schema `schemas/game_state.fbs` (compiled to `backend/internal/generated/SpaceTactics`).
* **Simulation Modules (`backend/internal/game/`):**
  * `room.go`: Core `GameRoom` loop, zero-unit sandbox initialization (flagship does not auto-spawn; all units can be spawned/despawned freely), live binary template overrides (`TurnRate` capped at `60.0`), and exported getters/setters for sub-packages.
  * `teamDeathMatch/`: Separate `package teamDeathMatch` (`tdm_room.go`, `tdm_spawner.go`, `tdm_rules.go`, `tdm_visibility.go`) for 20v20 skirmishes using smooth `TurnRate` movement physics.
  * Supporting systems: `movement.go`, `physics.go`, `ballistics.go`, `collisions.go`, `ai_behaviors.go`, `logistics.go`, and `radar.go`.

### Frontend (Development Laptop — Linux Mint)
* **Stack:** React, TypeScript, Vite, Tailwind CSS, HTML5 2D Canvas, wrapped in a **Tauri** desktop shell (`src-tauri/`).
* **Server Connection (`src/config.ts`):**
  * `SERVER_HOST = 'streetcode101.local'` (or Pi LAN IP `192.168.1.50`)
  * `API_BASE_URL = http://${SERVER_HOST}:8080`
  * `WS_BASE_URL = ws://${SERVER_HOST}:8080`
* **Binary Codec & Rendering:**
  * `src/parsers/binaryCodec.ts` & `src/generated/space-tactics/`: Encodes `ClientInput` and decodes `ServerState` FlatBuffers frames.
  * `src/services/gameSocketService.ts` & `src/hooks/useGameSockets.ts`: Manages binary WebSocket connections.
  * `src/renderer/interpolation.ts` & `vectorAssets.ts`: Smooth entity interpolation, vector/PNG rendering, and tactical radar.
* **Key Views (`src/components/`):**
  * `PracticeViewport.tsx`: Zero-unit sandbox, catalog spawner, pilot switcher, docking/grouping modal, live `UnitConfig` inspector, and radar.
  * `teamDeathMatch/`: `mapSelection.tsx`, `unitSelection.tsx`, and `tdmViewport.tsx`.
  * `MapEditorViewport.tsx`, `GarageDashboard.tsx`, `GameViewport.tsx`.

---

## Development Workflow & Commands

### 1. Git Sync (Laptop → GitHub via SSH)
Repository: `git@github.com:thedragon44-superscale/fleets-mercy.git` (key pinned in `~/.ssh/config`).

```bash
cd ~/Documents/space-tactics-ui
git status
git add <files>
git commit -m "Describe changes"
git push origin main
```

Verify SSH authentication if needed:
```bash
ssh -T git@github.com
```

### 2. Backend Server (Raspberry Pi)
Pull latest changes and run the Go server against the Pi's PostgreSQL database:

```bash
ssh admin@streetcode101.local
cd ~/fleets-mercy
git pull origin main
cd backend/cmd/server
go run main.go
```

If local changes on the Pi ever block `git pull`:
```bash
git fetch origin && git reset --hard origin/main
```

### 3. Frontend Client (Laptop)
Leave Tauri running during development so Rust's compiled cache (`src-tauri/target/debug/`) stays warm and Vite hot-reloads React/TypeScript changes instantly:

```bash
cd ~/Documents/space-tactics-ui

# Desktop app (recommended — leave open for Vite hot-reload)
npm run tauri dev

# Browser-only Vite dev server (skips Rust entirely)
npm run dev
```
* **Tip:** Press `Ctrl + Shift + R` inside the Tauri window to force a clean frontend/WebSocket reload without restarting Cargo.

### 4. Generate Clean Project File Tree
Prints the directory structure up to 4 levels deep while excluding dependency and build folders:

```bash
tree -I 'node_modules|target|.git|dist' -L 4
```

Fallback if `tree` is not installed:
```bash
find . -maxdepth 4 -not -path '*/.*' -not -path './node_modules*' -not -path './src-tauri/target*'
```

---

## Project Directory Structure

.
├── backend
│   ├── backendArchitecture.md
│   ├── cmd
│   │   ├── dump_db
│   │   │   ├── db_dump_output.sql
│   │   │   └── main.go
│   │   └── server
│   │       └── main.go
│   ├── dbArchitecture.md
│   ├── go.mod
│   ├── go.sum
│   ├── internal
│   │   ├── api
│   │   │   └── handlers.go
│   │   ├── db
│   │   │   └── postgres.go
│   │   ├── game
│   │   │   ├── ai_behaviors.go
│   │   │   ├── ballistics.go
│   │   │   ├── collisions.go
│   │   │   ├── logistics.go
│   │   │   ├── movement.go
│   │   │   ├── physics.go
│   │   │   ├── radar.go
│   │   │   ├── room.go
│   │   │   └── teamDeathMatch
│   │   ├── generated
│   │   │   └── SpaceTactics
│   │   └── models
│   │       └── structs.go
│   └── unit_templates.md
├── file_structure.md
├── game-mechanics
│   ├── enviornment
│   │   ├── 01-major-worlds-terrestrial-crusts.md
│   │   ├── 02-drifting-mineral-planetoids.md
│   │   ├── 03-gas-giant-atmospheres.md
│   │   ├── 04-deep-nebula-plasma.md
│   │   ├── 05-spatial-singularity-rifts.md
│   │   ├── 06-moons-satellites.md
│   │   ├── 07-dense-asteroid-belts.md
│   │   ├── 09-comets.md
│   │   └── environmentsMaster.md
│   ├── formations.md
│   ├── lore.md
│   ├── mechanicsArchitecture.md
│   ├── radar.md
│   ├── resource-enonomy
│   │   ├── resource-list.md
│   │   └── wreckage.md
│   ├── unit-config
│   │   ├── aegis_repair.md
│   │   ├── aegis_wall.md
│   │   ├── assault_gunship.md
│   │   ├── battalion_command_ship.md
│   │   ├── command_escort.md
│   │   ├── cryo_flak.md
│   │   ├── flagship.md
│   │   ├── grav_extractor.md
│   │   ├── gun_emplacement.md
│   │   ├── ion_interceptor.md
│   │   ├── lancer_corvette.md
│   │   ├── MASTER-UNIT-CONFIG.md
│   │   ├── mining_barge.md
│   │   ├── phantom_transport.md
│   │   ├── plasma_skimmer.md
│   │   ├── recon_probe.md
│   │   ├── specter_jammer.md
│   │   ├── supply_tender.md
│   │   ├── torpedo_bomber.md
│   │   ├── viper_interceptor.md
│   │   ├── vortex_minelayer.md
│   │   └── warp_frigate.md
│   ├── unitConfigTree.md
│   ├── unit-specs
│   │   ├── aegis-repair.md
│   │   ├── aegis-wall.md
│   │   ├── assault-gunship.md
│   │   ├── battalion-command.md
│   │   ├── command-escort.md
│   │   ├── cryo-flak.md
│   │   ├── flagship.md
│   │   ├── grav-extractor.md
│   │   ├── gun-emplacement.md
│   │   ├── ion-disabler.md
│   │   ├── lancer-corvette.md
│   │   ├── MASTER_UNIT_BEHAVIORS.md
│   │   ├── mining-barge.md
│   │   ├── phantom.md
│   │   ├── plasma-skimmer.md
│   │   ├── recon.md
│   │   ├── specter-jammer.md
│   │   ├── supply-tender.md
│   │   ├── torpedo-bomber.md
│   │   ├── unit-list.md
│   │   ├── units-by-weight.md
│   │   ├── viper.md
│   │   ├── vortex-minelayer.md
│   │   └── warp-frigate.md
│   └── unit-stat-variables.md
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── public
│   ├── tauri.svg
│   └── vite.svg
├── README.md
├── schemas
│   └── game_state.fbs
├── src
│   ├── App.css
│   ├── App.tsx
│   ├── assets
│   │   ├── aegis.png
│   │   ├── assault.png
│   │   ├── asset-gen.txt
│   │   ├── cryo.png
│   │   ├── dragon_logo.png
│   │   ├── flagship.png
│   │   ├── grav.png
│   │   ├── ion.png
│   │   ├── lancer.png
│   │   ├── mining.png
│   │   ├── phantom.png
│   │   ├── plasma.png
│   │   ├── recon.png
│   │   ├── specter.png
│   │   ├── supply.png
│   │   ├── torpedo.png
│   │   ├── turret.png
│   │   ├── viper.png
│   │   ├── vortex.png
│   │   ├── wall.png
│   │   └── warp.png
│   ├── components
│   │   ├── common
│   │   │   ├── LoadingIndicator.tsx
│   │   │   ├── TacticalRadar.tsx
│   │   │   ├── TacticalSelect.tsx
│   │   │   └── VariableInfoModal.tsx
│   │   ├── game
│   │   │   └── GameViewport.tsx
│   │   ├── garage
│   │   │   └── GarageDashboard.tsx
│   │   ├── mapEditor
│   │   │   └── MapEditorViewport.tsx
│   │   ├── sandbox
│   │   │   ├── constants.ts
│   │   │   ├── modals
│   │   │   ├── PracticeViewport.tsx
│   │   │   ├── SandboxCommandMenu.tsx
│   │   │   └── UnitConfig
│   │   ├── system
│   │   │   ├── DeveloperSettingsDashboard.tsx
│   │   │   └── LoginScreen.tsx
│   │   ├── teamDeathMatch
│   │   │   ├── mapSelection.tsx
│   │   │   ├── tdmViewport.tsx
│   │   │   └── unitSelection.tsx
│   │   └── viewport
│   │       ├── CanvasToolBar.tsx
│   │       └── ViewportTopBar.tsx
│   ├── config
│   │   └── settingsStore.ts
│   ├── config.ts
│   ├── constants
│   │   └── variableDocs.ts
│   ├── frontendArchitecture.md
│   ├── generated
│   │   ├── game_state_generated.ts
│   │   └── space-tactics
│   │       ├── behavior-config-update.ts
│   │       ├── client-input.ts
│   │       ├── fleet-unit.ts
│   │       ├── hull.ts
│   │       ├── projectile.ts
│   │       ├── sandbox-count-pair.ts
│   │       ├── sandbox-time-control.ts
│   │       ├── server-state.ts
│   │       ├── shields.ts
│   │       ├── unit-config-update.ts
│   │       ├── unit-grouping-payload.ts
│   │       └── vector2d.ts
│   ├── hooks
│   │   ├── useFlightControls.ts
│   │   ├── useGameSockets.ts
│   │   └── useUnitTemplates.ts
│   ├── main.tsx
│   ├── parsers
│   │   └── binaryCodec.ts
│   ├── renderer
│   │   ├── interpolation.ts
│   │   └── vectorAssets.ts
│   ├── services
│   │   ├── gameSocketService.ts
│   │   └── mapService.ts
│   ├── types
│   │   └── unitConfig.ts
│   ├── utils
│   │   └── groupingColors.ts
│   └── vite-env.d.ts
├── src-tauri
│   ├── build.rs
│   ├── capabilities
│   │   └── default.json
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── gen
│   │   └── schemas
│   │       ├── acl-manifests.json
│   │       ├── capabilities.json
│   │       ├── desktop-schema.json
│   │       └── linux-schema.json
│   ├── icons
│   │   ├── 128x128@2x.png
│   │   ├── 128x128.png
│   │   ├── 32x32.png
│   │   ├── icon.icns
│   │   ├── icon.ico
│   │   ├── icon.png
│   │   ├── Square107x107Logo.png
│   │   ├── Square142x142Logo.png
│   │   ├── Square150x150Logo.png
│   │   ├── Square284x284Logo.png
│   │   ├── Square30x30Logo.png
│   │   ├── Square310x310Logo.png
│   │   ├── Square44x44Logo.png
│   │   ├── Square71x71Logo.png
│   │   ├── Square89x89Logo.png
│   │   └── StoreLogo.png
│   ├── src
│   │   ├── lib.rs
│   │   └── main.rs
│   └── tauri.conf.json
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── update-roadmaps
│   ├── ai_behaviors_02.md
│   ├── ai_behaviors.md
│   ├── backend_bugs.md
│   ├── ballistics_ammo.md
│   ├── component_restructure.md
│   ├── downstream_payloads_02.md
│   ├── downstream-payloads.md
│   ├── economy.md
│   ├── frontend_upgrades.md
│   ├── map-objects.md
│   ├── payload_upgrade_roadmap.md
│   ├── type_error_fixes.md
│   └── UI_updates.md
└── vite.config.ts

50 directories, 204 files

