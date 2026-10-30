# Space Tactics UI - Project Directory Architecture

## 📂 Root Workspace (`/space-tactics-ui`)
```text
space-tactics-ui/
├── 📄 Configuration & Build Files
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
│
├── 📂 Core Directories
│   ├── backend/                 # Go server & database logic
│   ├── src/                     # React frontend UI & Tauri desktop client
│   ├── game-mechanics/          # Comprehensive game design documentation & specs
│   ├── schemas/                 # FlatBuffers schemas (.fbs)
│   ├── src-tauri/               # Tauri rust backend configs
│   ├── public/                  # Static assets
│   ├── updates/                 # Historical/active update logs & notes
│   ├── update-roadmaps/         # Milestone roadmaps
│   └── node_modules/            # NPM packages
│
└── 📄 Project Documentation & Notes
    ├── README.md
    ├── AAA-roadmap.md
    ├── frontendArchitecture.md
    ├── huge-updates.md
    ├── update-logs.md
    └── 001.md

backend/
├── 📄 Documentation & Config
│   ├── backendArchitecture.md
│   ├── dbArchitecture.md
│   ├── unit_templates.md
│   ├── go.mod
│   └── go.sum
│
├── 📂 cmd/
│   └── server/
│       └── main.go              # Application entry point
│
└── 📂 internal/
    ├── api/
    │   └── handlers.go          # HTTP API routing & endpoints
    ├── db/
    │   └── postgres.go          # Database connectivity & query execution
    ├── models/
    │   └── structs.go           # Go data models (FleetUnit, UnitTemplate, etc.)
    ├── game/
    │   ├── ai_behaviors.go      # Finite State Machine (FSM) logic
    │   ├── ballistics.go        # Projectile trajectories & damage math
    │   ├── collisions.go        # Spatial intersection checks
    │   ├── logistics.go         # Supply tender & resource routing
    │   ├── movement.go          # Inertial vectors & velocity curves
    │   ├── physics.go           # 60 Hz simulation loops
    │   ├── radar.go             # Fog of war & telemetry filters
    │   └── room.go              # WebSocket session room management
    └── generated/
        └── SpaceTactics/        # Generated FlatBuffers Go structs
            ├── BehaviorConfigUpdate.go
            ├── ClientInput.go
            ├── FleetUnit.go
            ├── Hull.go
            ├── Projectile.go
            ├── SandboxCountPair.go
            ├── ServerState.go
            ├── Shields.go
            ├── UnitConfigUpdate.go
            ├── UnitGroupingPayload.go
            └── Vector2D.go

src/
├── 📄 Entry Points & Config
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   ├── config.ts
│   └── vite-env.d.ts
│
├── 📂 Assets & Styling
│   ├── assets/                  # Unit PNG icons & entity sprites (aegis.png, flagship.png, etc.)
│   └── utils/
│       └── groupingColors.ts    # UI color mapping utilities
│
├── 📂 Components & Views
│   ├── GameViewport.tsx         # Main 60 FPS tactical canvas renderer
│   ├── MapEditorViewport.tsx    # Data-driven environment builder
│   ├── GarageDashboard.tsx      # Pre-battle loadout & FSM configuration
│   ├── DeveloperSettingsDashboard.tsx
│   ├── DockingModal.tsx
│   ├── LoginScreen.tsx
│   ├── PilotSwitcherModal.tsx
|   |---PracticeViewport.tsx
│   ├── VariableInfoModal.tsx
│   ├── common/
│   │   └── LoadingIndicator.tsx
│   └── UnitConfig/              # Modular unit inspector / configuration studio
│       ├── UnitConfigContainer.tsx
│       ├── UnitConfigHeader.tsx
│       ├── UnitConfigTabs.tsx
│       ├── common/
│       │   └── ConfigRow.tsx
│       └── tabs/
│           ├── AiSensorTab.tsx
│           ├── CombatTab.tsx
│           ├── LogisticsTab.tsx
│           ├── MovementTab.tsx
│           └── VitalsTab.tsx
│
├── 📂 State & Services
│   ├── config/
│   │   └── settingsStore.ts     # Zustand settings store
│   ├── hooks/
│   │   └── useGameSockets.ts    # WebSocket client hook
│   ├── services/
│   │   ├── gameSocketService.ts # Binary WebSocket binary streaming client
│   │   └── mapService.ts        # Map preset loader/exporter
│   └── constants/
│       └── variableDocs.ts      # UI documentation tooltips
│
├── 📂 Parsers & Types
│   ├── parsers/
│   │   └── binaryCodec.ts       # FlatBuffers binary unpacker
│   ├── types/
│   │   └── unitConfig.ts        # TypeScript interface definitions
│   └── renderer/
│       ├── interpolation.ts     # Client-side motion extrapolation
│       └── vectorAssets.ts      # Canvas drawing primitives
│
└── 📂 Generated (FlatBuffers TS)
    └── generated/
        └── space-tactics/       # Generated FlatBuffers TypeScript decoders
            ├── behavior-config-update.ts
            ├── client-input.ts
            ├── fleet-unit.ts
            ├── hull.ts
            ├── projectile.ts
            ├── sandbox-count-pair.ts
            ├── server-state.ts
            ├── shields.ts
            ├── unit-config-update.ts
            ├── unit-grouping-payload.ts
            └── vector2d.ts

game-mechanics/
├── 📄 Master Architecture Docs
│   ├── mechanicsArchitecture.md
│   ├── radar.md
│   ├── formations.md
│   ├── lore.md
│   ├── unitConfigTree.md
│   └── unit-stat-variables.md
│
├── 📂 environment/              # Celestial bodies, hazards & spatial terrain specs
│   ├── environmentsMaster.md
│   ├── 01-major-worlds-terrestrial-crusts.md
│   ├── 02-drifting-mineral-planetoids.md
│   ├── 03-gas-giant-atmospheres.md
│   ├── 04-deep-nebula-plasma.md
│   ├── 05-spatial-singularity-rifts.md
│   ├── 06-moons-satellites.md
│   ├── 07-dense-asteroid-belts.md
│   └── 09-comets.md
│
├── 📂 resource-economy/         # Macro-resources & wreckage mechanics
│   ├── resource-list.md
│   └── wreckage.md
│
├── 📂 unit-specs/               # Detailed unit behaviors & role descriptions
│   ├── MASTER_UNIT_BEHAVIORS.md
│   ├── unit-list.md
│   ├── units-by-weight.md
│   ├── aegis-repair.md
│   ├── aegis-wall.md
│   ├── assault-gunship.md
│   ├── battalion-command.md
│   ├── command-escort.md
│   ├── cryo-flak.md
│   ├── flagship.md
│   ├── grav-extractor.md
│   ├── gun-emplacement.md
│   ├── ion-disabler.md
│   ├── lancer-corvette.md
│   ├── mining-barge.md
│   ├── phantom.md
│   ├── plasma-skimmer.md
│   ├── recon.md
│   ├── specter-jammer.md
│   ├── supply-tender.md
│   ├── torpedo-bomber.md
│   ├── viper.md
│   └── vortex-minelayer.md
│
└── 📂 unit-config/              # Granular JSON/Markdown configuration definitions per unit
    ├── MASTER-UNIT-CONFIG.md
    ├── aegis_repair.md
    ├── aegis_wall.md
    ├── assault_gunship.md
    ├── battalion_command_ship.md
    ├── command_escort.md
    ├── cryo_flak.md
    ├── flagship.md
    ├── grav_extractor.md
    ├── gun_emplacement.md
    ├── ion_interceptor.md
    ├── lancer_corvette.md
    ├── mining_barge.md
    ├── phantom_transport.md
    ├── plasma_skimmer.md
    ├── recon_probe.md
    ├── specter_jammer.md
    ├── supply_tender.md
    ├── torpedo_bomber.md
    ├── viper_interceptor.md
    └── vortex_minelayer.md
