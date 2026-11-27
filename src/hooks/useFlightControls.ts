// src/hooks/useFlightControls.ts
import { useEffect, useRef, useCallback } from 'react';
import { SnapshotUnit } from '../parsers/binaryCodec';
import { screenToWorld } from '../renderer/viewportCamera';

const DEADZONE_RADIUS = 35.0;
const INPUT_SEND_INTERVAL_MS = 16; // Match 60Hz server tick cadence (discrete key transitions flush immediately)

const CODE_TO_FLIGHT_KEY: Record<string, 'w' | 'a' | 's' | 'd'> = {
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
};

const resolveFlightKey = (e: KeyboardEvent): 'w' | 'a' | 's' | 'd' | undefined => {
  const byCode = CODE_TO_FLIGHT_KEY[e.code];
  if (byCode) return byCode;
  const k = e.key?.toLowerCase();
  if (k === 'w' || k === 'a' || k === 's' || k === 'd') return k;
  return undefined;
};

export interface FlightInputPayload {
  keys: { [key: string]: boolean };
  angle: number;
  isFiring: boolean;
  currentId: string;
  [key: string]: any;
}

interface UseFlightControlsOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraPosRef: React.RefObject<{ x: number; y: number }>;
  zoomRef?: React.RefObject<number>;
  /** Set false when a non-flight canvas tool (e.g. Click-Spawn or Pick) is active */
  canControl?: boolean;
  /** Resolves the active piloted unit from the current snapshot */
  resolvePilotedUnit: (units: SnapshotUnit[]) => SnapshotUnit | undefined;
  /** Transport callback (useGameSocket.sendInput or TDM WebSocket sender). Return false if socket not open. */
  onSendInput: (payload: FlightInputPayload) => boolean | void;
  /** Optional mode-specific hotkeys (return true to consume the event) */
  onCustomKeyDown?: (e: KeyboardEvent) => boolean | void;
}

const isTypingInInput = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

export const useFlightControls = ({
  canvasRef,
  cameraPosRef,
  zoomRef,
  canControl = true,
  resolvePilotedUnit,
  onSendInput,
  onCustomKeyDown,
}: UseFlightControlsOptions) => {
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseCanvasPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMouseMovedRef = useRef<boolean>(false);
  const isFiringRef = useRef<boolean>(false);

  const mouseDirtyRef = useRef<boolean>(false);
  const inputDirtyRef = useRef<boolean>(false);
  const lastSendTimeRef = useRef<number>(0);
  const lastAngleRef = useRef<number>(0);
  const lastSentUnitIdRef = useRef<string>('');

  // Keep latest callbacks/flags in refs so window listeners never go stale
  const canControlRef = useRef<boolean>(canControl);
  const resolvePilotedUnitRef = useRef(resolvePilotedUnit);
  const onSendInputRef = useRef(onSendInput);
  const onCustomKeyDownRef = useRef(onCustomKeyDown);

  useEffect(() => {
    canControlRef.current = canControl;
    if (!canControl) {
      keysRef.current = {};
      isFiringRef.current = false;
      inputDirtyRef.current = true;
    }
  }, [canControl]);

  useEffect(() => {
    resolvePilotedUnitRef.current = resolvePilotedUnit;
  }, [resolvePilotedUnit]);

  useEffect(() => {
    onSendInputRef.current = onSendInput;
  }, [onSendInput]);

  useEffect(() => {
    onCustomKeyDownRef.current = onCustomKeyDown;
  }, [onCustomKeyDown]);

  const canvasToWorld = useCallback(
    (cx: number, cy: number) => {
      const canvas = canvasRef.current;
      const cam = cameraPosRef.current;
      if (!canvas) return { x: cam.x, y: cam.y };
      const z = zoomRef?.current ?? 1.0;
      const cssW = canvas.clientWidth || canvas.width;
      const cssH = canvas.clientHeight || canvas.height;
      return screenToWorld(cx, cy, { mode: 'camera', x: cam.x, y: cam.y, zoom: z }, cssW, cssH);
    },
    [canvasRef, cameraPosRef, zoomRef]
  );

  const computeAimAngle = useCallback(
    (unit: SnapshotUnit | undefined): number => {
      if (!unit) return lastAngleRef.current;
      // Do not steer toward default (0, 0) top-left before the user has moved the cursor
      if (!hasMouseMovedRef.current) {
        lastAngleRef.current = unit.angle;
        return unit.angle;
      }
      const worldMouse = canvasToWorld(
        mouseCanvasPosRef.current.x,
        mouseCanvasPosRef.current.y
      );
      const dx = worldMouse.x - unit.pos.x;
      const dy = worldMouse.y - unit.pos.y;

      if (Math.hypot(dx, dy) > DEADZONE_RADIUS) {
        const nextAngle = Math.atan2(dy, dx);
        lastAngleRef.current = nextAngle;
        return nextAngle;
      }
      // Hold last intentional aim inside deadzone instead of chasing lagged server angle
      return lastAngleRef.current;
    },
    [canvasToWorld]
  );

  const clearInputs = useCallback(() => {
    keysRef.current = {};
    isFiringRef.current = false;
    const prevUnitId = lastSentUnitIdRef.current;
    lastSentUnitIdRef.current = '';

    // Flush zeroed controls immediately so blur/visibilitychange/contextmenu stop thrust
    // even if requestAnimationFrame is paused by the browser or OS.
    const sent = onSendInputRef.current({
      keys: {},
      angle: lastAngleRef.current,
      isFiring: false,
      currentId: prevUnitId,
    });
    inputDirtyRef.current = sent === false;
  }, []);

  /** One-shot sender for mode actions (reset, deploy, sandboxSpawn, etc.) */
  const sendImmediate = useCallback(
    (units: SnapshotUnit[], extra: Record<string, any> = {}) => {
      const unit = resolvePilotedUnitRef.current(units);
      const activeControl = canControlRef.current;
      const angle = computeAimAngle(unit);
      if (unit?.id) {
        lastSentUnitIdRef.current = unit.id;
      }

      onSendInputRef.current({
        keys: activeControl ? { ...keysRef.current } : {},
        angle,
        isFiring: activeControl && isFiringRef.current && !!unit,
        currentId: unit?.id || '',
        ...extra,
      });
    },
    [computeAimAngle]
  );

  /**
   * Call once per frame inside the viewport's 60Hz render loop.
   * Continuously updates cursor-guided heading while moving, drifting, aiming, or firing,
   * and flushes discrete key/pilot transitions immediately without waiting for the throttle interval.
   */
  const tickFlightInput = useCallback(
    (currentTime: number, units: SnapshotUnit[]): SnapshotUnit | undefined => {
      const unit = resolvePilotedUnitRef.current(units);
      const activeControl = canControlRef.current;

      // Immediately sync piloted unit ownership to server whenever the active unit changes
      if (unit && unit.id !== lastSentUnitIdRef.current) {
        if (!hasMouseMovedRef.current) {
          lastAngleRef.current = unit.angle;
        }
        inputDirtyRef.current = true;
      }

      const isMoving =
        activeControl &&
        !!(
          keysRef.current['w'] ||
          keysRef.current['a'] ||
          keysRef.current['s'] ||
          keysRef.current['d']
        );

      const isDrifting =
        activeControl &&
        !!unit &&
        hasMouseMovedRef.current &&
        Math.hypot(unit.vel?.x || 0, unit.vel?.y || 0) > 0.05;

      const immediateFlush = inputDirtyRef.current;
      const periodicSend =
        activeControl &&
        (mouseDirtyRef.current || isMoving || isFiringRef.current || isDrifting) &&
        currentTime - lastSendTimeRef.current >= INPUT_SEND_INTERVAL_MS;

      if (immediateFlush || periodicSend) {
        const angle = computeAimAngle(unit);
        const sent = onSendInputRef.current({
          keys: activeControl ? { ...keysRef.current } : {},
          angle,
          isFiring: activeControl && isFiringRef.current && !!unit,
          currentId: unit?.id || '',
        });

        // Only clear dirty flags if the socket actually accepted the packet
        if (sent !== false) {
          inputDirtyRef.current = false;
          mouseDirtyRef.current = false;
          lastSendTimeRef.current = currentTime;
          lastSentUnitIdRef.current = unit?.id || '';
        }
      }

      return unit;
    },
    [computeAimAngle]
  );

  // Global keyboard, mouse & window-blur listeners
  useEffect(() => {
    const flushKeyTransition = () => {
      const activeControl = canControlRef.current;
      const sent = onSendInputRef.current({
        keys: activeControl ? { ...keysRef.current } : {},
        angle: lastAngleRef.current,
        isFiring: activeControl && isFiringRef.current && !!lastSentUnitIdRef.current,
        currentId: lastSentUnitIdRef.current,
      });
      if (sent === false) {
        inputDirtyRef.current = true;
      } else {
        inputDirtyRef.current = false;
        lastSendTimeRef.current = performance.now();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;

      if (onCustomKeyDownRef.current?.(e)) {
        return;
      }

      // Ignore OS/browser modifier shortcuts (e.g. Ctrl+W, Alt+W, Super+W) whose keyup is often swallowed
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (!canControlRef.current) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isFiringRef.current) {
          isFiringRef.current = true;
          flushKeyTransition();
        }
        return;
      }

      const flightKey = resolveFlightKey(e);
      if (flightKey && !keysRef.current[flightKey]) {
        keysRef.current[flightKey] = true;
        flushKeyTransition();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Never swallow keyup for already-held flight keys even if focus moved into an input
      if (e.code === 'Space' || e.key === ' ') {
        if (isFiringRef.current) {
          isFiringRef.current = false;
          flushKeyTransition();
        }
        return;
      }

      const flightKey = resolveFlightKey(e);
      if (flightKey && keysRef.current[flightKey]) {
        keysRef.current[flightKey] = false;
        flushKeyTransition();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseCanvasPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      hasMouseMovedRef.current = true;
      mouseDirtyRef.current = true;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!canControlRef.current) return;
      if ((e.target as HTMLElement)?.closest('.ui-interactive')) return;

      isFiringRef.current = true;
      inputDirtyRef.current = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && isFiringRef.current) {
        isFiringRef.current = false;
        inputDirtyRef.current = true;
      }
    };

    const onBlur = () => {
      clearInputs();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearInputs();
      }
    };

    const onContextMenu = () => {
      clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [canvasRef, clearInputs]);

  return {
    keysRef,
    mouseCanvasPosRef,
    isFiringRef,
    canvasToWorld,
    tickFlightInput,
    sendImmediate,
    clearInputs,
  };
};
