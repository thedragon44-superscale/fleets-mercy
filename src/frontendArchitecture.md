# Space Tactics Frontend Architecture

This document maps out the full directory structure, current file inventory, and modular design principles for the Space Tactics Tauri/React frontend.

---

## Complete Project Directory Structure

```text
src/
├── App.css                  # Global styling rules
├── App.tsx                  # Root component layout and view router
├── config.ts                # Environment and base URL definitions (WS_BASE_URL)
├── main.tsx                 # Application entry point (React root render)
├── vite-env.d.ts            # Vite TypeScript definitions
├── frontendArchitecture.md  # Architecture documentation
├── assets/                  # Static image assets and sprite sheets
│   ├── aegis.png
│   ├── assault.png
│   ├── cryo.png
│   ├── flagship.png
│   ├── grav.png
│   ├── ion.png
│   ├── lancer.png
│   ├── mining.png
│   ├── phantom.png
│   ├── plasma.png
│   ├── recon.png
│   ├── specter.png
│   ├── supply.png
│   ├── torpedo.png
│   ├── turret.png
│   ├── viper.png
│   ├── vortex.png
│   ├── wall.png
│   └── warp.png
├── components/              # Pure UI views and canvas presentation
│   ├── GameViewport.tsx     # Main tactical gameplay canvas view
│   ├── GarageDashboard.tsx  # Fleet configuration and hangar management
│   ├── LoginScreen.tsx      # Authentication / user entry screen
│   ├── MapEditorViewport.tsx# Map design & environmental structure tool
│   └── PracticeViewport.tsx # Sandbox testing environment
├── hooks/                   # Persistent connection & lifecycle hooks
│   ├── useGameSockets.ts    # Centralized WebSocket transport for single-player/sandbox
│   └── usePvpSocket.ts      # (Projected) Future multiplayer PvP WebSocket hook
├── renderer/                # Canvas drawing helpers and vector assets
│   └── vectorAssets.ts      # Canvas rendering primitives and shapes
├── services/                # Stateless HTTP/REST API communication
│   └── mapService.ts        # Fetches map definitions and coordinates backend DB saves
└── parsers/                 # (Projected) Pure data translation and serialization functions
    ├── jsonParser.ts        # Current JSON payload serializers/deserializers
    └── binaryCodec.ts       # Future binary opcode byte-packer / unpacker
