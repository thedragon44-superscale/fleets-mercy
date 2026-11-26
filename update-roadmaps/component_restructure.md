# Frontend Component Reorganization & Sandbox Refactor Roadmap

## 1. Target `src/components/` Architecture
Every viewport gets its own module folder and pulls shared HUD, radar, and modal components from `common/` and `viewport/`.

```text
src/components/
├── common/
│   ├── LoadingIndicator.tsx
│   ├── TacticalRadar.tsx              # Universal minimap (FoW for Sandbox/Game, open for TDM)
│   └── VariableInfoModal.tsx          # Moved from root
├── viewport/
│   ├── ViewportTopBar.tsx             # Shared header (title, time controls, FPS/tick/unit telemetry, nav)
│   └── CanvasToolBar.tsx              # Shared mode selector (Pilot/Spawn/Inspect), debug toggles, cam/zoom
├── sandbox/
│   ├── index.ts                       # Barrel export (PracticeViewport)
│   ├── PracticeViewport.tsx           # Thin orchestrator (socket, canvas loop, layout)
│   ├── SandboxSidebar.tsx             # Clean left drawer (presets, faction, search, unit catalog, reset)
│   ├── SandboxStudioDrawer.tsx        # Unified right-docked drawer (tabs: Inspector | Pilots | Docking)
│   ├── constants.ts                   # SCENARIO_PRESETS, GRID_SPACING, zoom limits
│   └── modals/
│       ├── PilotSwitcherModal.tsx     # Moved from root (works standalone or docked)
│       └── DockingModal.tsx           # Moved from root (works standalone or docked)
├── UnitConfig/                        # Already modular (unchanged internal structure)
│   ├── index.ts
│   ├── types.ts
│   ├── UnitConfigContainer.tsx
│   ├── UnitConfigHeader.tsx
│   ├── UnitConfigTabs.tsx
│   ├── common/
│   └── tabs/
├── teamDeathMatch/                    # Uses shared PNG renderer + TacticalRadar
│   ├── unitSelection.tsx
│   ├── mapSelection.tsx
│   └── tdmViewport.tsx
├── game/
│   └── GameViewport.tsx               # Moved from root
├── garage/
│   └── GarageDashboard.tsx            # Moved from root
├── mapEditor/
│   └── MapEditorViewport.tsx          # Moved from root
└── system/
    ├── LoginScreen.tsx                # Moved from root
    └── DeveloperSettingsDashboard.tsx # Moved from root
