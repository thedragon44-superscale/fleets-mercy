// src/parsers/jsonParser.ts

/**
 * Parses raw incoming WebSocket text data into a typed game state object.
 */
export function parseServerMessage(rawData: string): any {
  try {
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Failed to parse incoming WebSocket message:", error);
    return null;
  }
}

/**
 * Serializes player action parameters and input keys into an outgoing JSON string.
 */
export function serializePlayerAction(actionParams: {
  keys: { w?: boolean; s?: boolean; a?: boolean; d?: boolean };
  angle: number;
  isFiring: boolean;
  currentId: string | null;
  reset?: boolean;
  sandboxCounts?: Record<string, number>;
}): string {
  return JSON.stringify({
    w: !!actionParams.keys.w,
    s: !!actionParams.keys.s,
    a: !!actionParams.keys.a,
    d: !!actionParams.keys.d,
    angle: actionParams.angle,
    isFiring: actionParams.isFiring,
    controlledUnitId: actionParams.currentId,
    reset: actionParams.reset || false,
    sandboxCounts: actionParams.sandboxCounts || undefined,
  });
}

/**
 * Serializes unit count changes for the catalog spawner into an outgoing JSON string.
 */
export function serializeUnitCounts(counts: Record<string, number>): string {
  return JSON.stringify({
    sandboxCounts: counts,
  });
}
