# Space Tactics Frontend - Architecture Specification

## Overview
The Space Tactics frontend is a React and HTML5 Canvas-based tactical command terminal. It features persistent user authentication, a comprehensive hangar bay and fleet requisition garage, a real-time combat viewport streaming state via WebSockets, and a rich documentation library defining game mechanics, unit specifications, and environmental features[cite: 11].

---

## Directory & File Structure

### Core Application & Entry Points (`src/`)
* **`src/App.tsx`**: Manages top-level application routing states and persistent session storage[cite: 11].
* **`src/main.tsx`**: Application entry point mounting the React root[cite: 11].
* **`src/config.ts`**: Centralized configuration parameters and environment routing[cite: 11].

### Components (`src/components/`)
* **`src/components/LoginScreen.tsx`**: Handles pilot authentication against backend API endpoints and initializes command sessions[cite: 11].
* **`src/components/GarageDashboard.tsx`**: Manages fleet blueprints, requisition allocation, hotkey squad assignments, and unit telemetry[cite: 11].
* **`src/components/GameViewport.tsx`**: Implements the HTML5 Canvas render loop, camera tracking anchored to the flagship, input handling, radial deployment menus, and win/loss state tracking[cite: 11].
* **`src/components/PracticeViewport.tsx`**: Implements the isolated, enemy-free unit testing sandbox canvas viewport with sidebar catalog controls for direct unit spawning[cite: 11].

### Renderer, Networking & Services (`src/renderer/`, `src/hooks/`, `src/services/`)
* **`src/renderer/vectorAssets.ts`**: Handles image sprite caching, rotational offset calculations, quadrant shield arcs, HUD diagnostics, and projectile rendering[cite: 11].
* **`src/hooks/useGameSockets.ts`**: Establishes binary WebSocket connections (`ArrayBuffer`) for real-time network synchronization[cite: 11].
* **`src/services/mapService.ts`**: Fetches map sector metadata and environmental structure definitions from the backend API endpoints[cite: 11].

### Game Mechanics Documentation (`game-mechanics/`)
* **`game-mechanics/unit-specs/`**: Contains markdown configuration files and specifications for individual units (flagship, viper, aegis, phantom, etc.) and master unit listings[cite: 11].
* **`game-mechanics/resource-enonomy/`**: Defines resource lists and wreckage mechanics[cite: 11].
* **`game-mechanics/enviornment/`**: Documents spatial environments, terrain types, anomalies, and hazards (e.g., asteroid belts, gas giants, nebulae)[cite: 11].

---

## Core Subsystems & Data Flow

1. **Authentication Flow**: 
   - User credentials are verified via `src/components/LoginScreen.tsx`[cite: 11]. 
   - Successful responses cache session tokens and transition the application state to the garage dashboard (`src/components/GarageDashboard.tsx`)[cite: 11].

2. **Fleet Loadout Management**:
   - Commanders configure units and group them into hotkey squads (`1` through `4`) within `src/components/GarageDashboard.tsx`[cite: 11].
   - Requisition parameters are validated against weight limits prior to launching practice simulations[cite: 11].

3. **Real-Time Combat & Rendering**:
   - `src/components/GameViewport.tsx` utilizes `src/hooks/useGameSockets.ts` to connect to the backend server, continuously broadcasting local inputs and unit commands[cite: 11].
   - The canvas render loop translates incoming binary server states into high-performance graphics using assets and helper functions from `src/renderer/vectorAssets.ts`[cite: 11].
