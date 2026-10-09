# Space Tactics Frontend - Architecture Specification

## Overview
The Space Tactics frontend is a React and HTML5 Canvas-based tactical command terminal[cite: 7]. It features persistent user authentication, a comprehensive hangar bay and fleet requisition garage, a real-time combat viewport streaming state via WebSockets, a unit-testing sandbox, a custom Map Creator Studio, and a rich documentation library defining game mechanics, unit specifications, and environmental features[cite: 7].

---

## Directory & File Structure

### Core Application & Entry Points (`src/`)
* **`src/App.tsx`**: Manages top-level application routing states (login, main menu, garage, map selection, standard game, unit sandbox, map editor selection, and map editor), persistent session storage, and dynamic map refreshing[cite: 7].
* **`src/main.tsx`**: Application entry point mounting the React root[cite: 7].
* **`src/config.ts`**: Centralized configuration parameters and environment routing[cite: 7].

### Components (`src/components/`)
* **`src/components/LoginScreen.tsx`**: Handles pilot authentication against backend API endpoints and initializes command sessions[cite: 7].
* **`src/components/GarageDashboard.tsx`**: Manages fleet blueprints, requisition allocation, hotkey squad assignments, and unit telemetry[cite: 7].
* **`src/components/GameViewport.tsx`**: Implements the HTML5 Canvas render loop, camera tracking anchored to the flagship, input handling, radial deployment menus, and win/loss state tracking[cite: 7].
* **`src/components/PracticeViewport.tsx`**: Implements the isolated, enemy-free unit testing sandbox canvas viewport with sidebar catalog controls for direct unit spawning, structure rendering, and radar support[cite: 7].
* **`src/components/MapEditorViewport.tsx`**: Implements the Map Creator Studio viewport allowing commanders to configure sector dimensions, place custom environmental structures (gas giants, asteroid belts, nebulae, etc.), navigate via WASD, toggle UI panels via right-click, and persist sector layouts to PostgreSQL[cite: 7].

### Renderer, Networking & Services (`src/renderer/`, `src/hooks/`, `src/services/`)
* **`src/renderer/vectorAssets.ts`**: Handles image sprite caching, rotational offset calculations, quadrant shield arcs, HUD diagnostics, projectile rendering, and environment structure vector rendering[cite: 7].
* **`src/hooks/useGameSockets.ts`**: Establishes binary WebSocket connections (`ArrayBuffer`) for real-time network synchronization[cite: 7].
* **`src/services/mapService.ts`**: Fetches map sector metadata, detailed structure layouts, and handles custom map persistence (creation and modification) via backend API endpoints[cite: 7].

### Game Mechanics Documentation (`game-mechanics/`)
* **`game-mechanics/unit-specs/`**: Contains markdown configuration files and specifications for individual units (flagship, viper, aegis, phantom, etc.) and master unit listings[cite: 7].
* **`game-mechanics/resource-enonomy/`**: Defines resource lists and wreckage mechanics[cite: 7].
* **`game-mechanics/enviornment/`**: Documents spatial environments, terrain types, anomalies, and hazards (e.g., asteroid belts, gas giants, nebulae)[cite: 7].

---

## Core Subsystems & Data Flow

1. **Authentication Flow**: 
   - User credentials are verified via `src/components/LoginScreen.tsx`[cite: 7]. 
   - Successful responses cache session tokens and transition the application state to the garage dashboard or command terminal (`src/components/GarageDashboard.tsx`)[cite: 7].

2. **Fleet Loadout Management**:
   - Commanders configure units and group them into hotkey squads (`1` through `4`) within `src/components/GarageDashboard.tsx`[cite: 7].
   - Requisition parameters are validated against weight limits prior to launching practice simulations[cite: 7].

3. **Map Creator Studio & Sector Persistence**:
   - Commanders can create new sectors or load and edit existing maps via `src/components/MapEditorViewport.tsx`[cite: 7].
   - Sector definitions and environmental structures are fetched, updated, or created via `src/services/mapService.ts` and stored in PostgreSQL[cite: 7].

4. **Real-Time Combat & Rendering**:
   - `src/components/GameViewport.tsx` and `src/components/PracticeViewport.tsx` utilize `src/hooks/useGameSockets.ts` to connect to the backend server, continuously broadcasting local inputs and unit commands[cite: 7].
   - The canvas render loop translates incoming binary server states and map structure details into high-performance graphics using assets and helper functions from `src/renderer/vectorAssets.ts`[cite: 7].
