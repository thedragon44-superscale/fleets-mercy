// src/hooks/useFlightControls.ts
import { useEffect, useRef, useCallback } from 'react';
import { SnapshotUnit } from '../parsers/binaryCodec';

const DEADZONE_RADIUS = 35.0;
const INPUT_SEND_INTERVAL_MS = 16; // ~60Hz

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
  /** Transport callback (useGameSocket.sendInput or TDM WebSocket sender) */
  onSendInput: (payload: FlightInputPayload) => void;
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
  const isFiringRef = useRef<boolean>(false);

  const mouseDirtyRef = useRef<boolean>(false);
  const inputDirtyRef = useRef<boolean>(false);
  const lastSendTimeRef = useRef<number>(0);
  const lastAngleRef = useRef<number>(0);

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
      return {
        x: (cx - canvas.width / 2) / z + cam.x,
        y: (cy - canvas.height / 2) / z + cam.y,
      };
    },
    [canvasRef, cameraPosRef, zoomRef]
  );

  const computeAimAngle = useCallback(
    (unit: SnapshotUnit | undefined): number => {
      if (!unit) return lastAngleRef.current;
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
      return unit.angle;
    },
    [canvasToWorld]
  );

  const clearInputs = useCallback(() => {
    keysRef.current = {};
    isFiringRef.current = false;
    inputDirtyRef.current = true;
  }, []);

  /** One-shot sender for mode actions (reset, deploy, sandboxSpawn, etc.) */
  const sendImmediate = useCallback(
    (units: SnapshotUnit[], extra: Record<string, any> = {}) => {
      const unit = resolvePilotedUnitRef.current(units);
      const activeControl = canControlRef.current;
      const angle = computeAimAngle(unit);

      onSendInputRef.current({
        keys: activeControl ? keysRef.current : {},
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
   * Continuously updates cursor-guided heading while moving, aiming, or firing.
   */
  const tickFlightInput = useCallback(
    (currentTime: number, units: SnapshotUnit[]): SnapshotUnit | undefined => {
      const unit = resolvePilotedUnitRef.current(units);
      const activeControl = canControlRef.current;

      const isMoving =
        activeControl &&
        !!(
          keysRef.current['w'] ||
          keysRef.current['a'] ||
          keysRef.current['s'] ||
          keysRef.current['d']
        );

      const shouldSend =
        inputDirtyRef.current ||
        (activeControl && (mouseDirtyRef.current || isMoving || isFiringRef.current));

      if (shouldSend && currentTime - lastSendTimeRef.current >= INPUT_SEND_INTERVAL_MS) {
        inputDirtyRef.current = false;
        mouseDirtyRef.current = false;
        lastSendTimeRef.current = currentTime;

        const angle = computeAimAngle(unit);
        onSendInputRef.current({
          keys: activeControl ? keysRef.current : {},
          angle,
          isFiring: activeControl && isFiringRef.current && !!unit,
          currentId: unit?.id || '',
        });
      }

      return unit;
    },
    [computeAimAngle]
  );

  // Global keyboard, mouse & window-blur listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;

      if (onCustomKeyDownRef.current?.(e)) {
        return;
      }

      if (!canControlRef.current) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!isFiringRef.current) {
          isFiringRef.current = true;
          inputDirtyRef.current = true;
        }
        return;
      }

      const k = e.key.toLowerCase();
      if (!keysRef.current[k]) {
        keysRef.current[k] = true;
        inputDirtyRef.current = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;

      if (e.code === 'Space') {
        if (isFiringRef.current) {
          isFiringRef.current = false;
          inputDirtyRef.current = true;
        }
        return;
      }

      const k = e.key.toLowerCase();
      if (keysRef.current[k]) {
        keysRef.current[k] = false;
        inputDirtyRef.current = true;
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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
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
