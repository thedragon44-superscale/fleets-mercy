// Example Interpolation Loop Concept for Frontend
const RENDER_DELAY = 35; // milliseconds behind server time

export function getInterpolatedUnits(serverHistory: ServerStateSnapshot[], renderTime: number) {
  const targetTime = renderTime - RENDER_DELAY;
  
  // Find the two snapshots surrounding targetTime
  let older = serverHistory[0];
  let newer = serverHistory[1];

  for (let i = 0; i < serverHistory.length - 1; i++) {
    if (serverHistory[i].timestamp <= targetTime && serverHistory[i+1].timestamp >= targetTime) {
      older = serverHistory[i];
      newer = serverHistory[i+1];
      break;
    }
  }

  if (!older || !newer || older === newer) return older?.units || [];

  const alpha = (targetTime - older.timestamp) / (newer.timestamp - older.timestamp);
  
  return newer.units.map(newUnit => {
    const oldUnit = older.units.find(u => u.id === newUnit.id);
    if (!oldUnit) return newUnit;

    // Smooth linear interpolation (lerp) for position
    return {
      ...newUnit,
      pos: {
        x: oldUnit.pos.x + (newUnit.pos.x - oldUnit.pos.x) * alpha,
        y: oldUnit.pos.y + (newUnit.pos.y - oldUnit.pos.y) * alpha,
      },
      // Shortest-path angle interpolation to prevent spinning glitches
      angle: lerpAngle(oldUnit.angle, newUnit.angle, alpha)
    };
  });
}

function lerpAngle(a: number, b: number, t: number): number {
  const diff = (b - a) % (Math.PI * 2);
  const shortest = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + shortest * t;
}
