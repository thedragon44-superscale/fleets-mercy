// src/components/casino/spacePirates/SpacePiratesViewport.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ResourceType,
  SPServerStateSnapshot,
} from '../../../parsers/spacePiratesCodec';
import { SPResourceConfig } from '../../../services/clusterService';
import { formatCents } from '../../../services/walletService';
import { Canvas2DRenderer } from '../../../renderer/canvas2dRenderer';
import type {
  RenderBeacon,
  RenderCryoCloud,
  RenderFloatingText,
  RenderLegacyRock,
  RenderProjectile,
  RenderStarDot,
  RenderUnit,
  RenderUnitLabel,
  ViewportFrameState,
  ViewportRenderer,
} from '../../../renderer/viewportRenderer';

export const SEAT_COLORS = [
  '#22d3ee', // Seat 0 (NW): Cyan
  '#34d399', // Seat 1 (NE): Emerald
  '#fbbf24', // Seat 2 (SW): Amber
  '#c084fc', // Seat 3 (SE): Violet
] as const;

export const HOUSE_COLOR = '#ef4444';

export interface SpacePiratesViewportProps {
  latestStateRef: React.MutableRefObject<SPServerStateSnapshot | null>;
  consumeLatestSnapshot?: () => SPServerStateSnapshot | null;
  resources: Record<string, SPResourceConfig>;
}

interface FloatingPayout {
  eventId: number;
  x: number;
  y: number;
  payoutCents: number;
  multiplier: number;
  seatIndex: number;
  wasBoss: boolean;
  bornMs: number;
}

function generateStars(count: number): RenderStarDot[] {
  const stars: RenderStarDot[] = [];
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      x: nextRand(),
      y: nextRand(),
      r: 0.7 + nextRand() * 1.4,
      alpha: 0.15 + nextRand() * 0.45,
    });
  }
  return stars;
}

const STARFIELD = generateStars(140);

function getSpacePiratesSpriteSize(unitType: string, isBoss: boolean): number {
  if (isBoss) return 112;
  switch (unitType) {
    case 'viper_interceptor':
      return 48;
    case 'assault_gunship':
      return 58;
    case 'cryo_flak':
    case 'command_escort':
    case 'mining_barge':
    case 'plasma_skimmer':
      return 64;
    case 'grav_extractor':
    case 'torpedo_bomber':
      return 74;
    case 'flagship':
      return 92;
    default:
      return 58;
  }
}

export const SpacePiratesViewport: React.FC<SpacePiratesViewportProps> = ({
  latestStateRef,
  consumeLatestSnapshot,
  resources,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const seenPayoutIdsRef = useRef<Set<number>>(new Set());
  const activePopupsRef = useRef<FloatingPayout[]>([]);

  const colorByResourceEnum = useMemo(() => {
    const map: Record<number, string> = {
      [ResourceType.Metal]: '#94a3b8',
      [ResourceType.Ore]: '#d97706',
      [ResourceType.Isotope]: '#22c55e',
      [ResourceType.PlasmaGas]: '#a855f7',
      [ResourceType.GravitonCore]: '#38bdf8',
    };
    for (const r of Object.values(resources)) {
      map[r.enumCode] = r.colorHex;
    }
    return map;
  }, [resources]);

  const colorMapRef = useRef(colorByResourceEnum);
  useEffect(() => {
    colorMapRef.current = colorByResourceEnum;
  }, [colorByResourceEnum]);

  // Swappable ViewportRenderer (Canvas2DRenderer) — Single rAF loop, zero WebGL context loss
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let destroyed = false;
    let rafId = 0;
    let lastErrLogMs = 0;

    const renderer: ViewportRenderer = new Canvas2DRenderer();
    renderer.init(canvas, { backgroundColor: '#03060c' });

    const syncSize = () => {
      if (destroyed) return;
      const r = container.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(240, Math.floor(r.height));
      renderer.resize(w, h);
    };
    syncSize();
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    const renderLoop = () => {
      if (destroyed) return;
      rafId = requestAnimationFrame(renderLoop);

      try {
        const now = performance.now();
        const snap = consumeLatestSnapshot ? consumeLatestSnapshot() : latestStateRef.current;
        const arenaW = snap && snap.arenaWidth > 0 ? snap.arenaWidth : 2400;
        const arenaH = snap && snap.arenaHeight > 0 ? snap.arenaHeight : 1600;
        const resColorMap = colorMapRef.current;

        // 1. 4 Corner Player Deployment Beacons
        const cornerDefs = [
          { x: 150, y: 150, label: 'NW' },
          { x: arenaW - 150, y: 150, label: 'NE' },
          { x: 150, y: arenaH - 150, label: 'SW' },
          { x: arenaW - 150, y: arenaH - 150, label: 'SE' },
        ];
        const beacons: RenderBeacon[] = [];
        for (let idx = 0; idx < 4; idx++) {
          const c = cornerDefs[idx];
          const seat = snap?.seats[idx];
          const occupied = !!seat?.occupied;
          beacons.push({
            x: c.x,
            y: c.y,
            radius: 68,
            color: SEAT_COLORS[idx],
            occupied,
            label: occupied && seat?.username ? seat.username : `${c.label} OPEN`,
          });
        }

        const legacyRocks: RenderLegacyRock[] = [];
        const cryoClouds: RenderCryoCloud[] = [];
        const projectiles: RenderProjectile[] = [];
        const units: RenderUnit[] = [];
        const floatingTexts: RenderFloatingText[] = [];

        if (snap) {
          // 2. Cached Universal Environment Objects (or legacy asteroid fallback)
          if (snap.envObjects.length > 0) {
            renderer.setEnvObjects(snap.envObjects, resColorMap);
          } else {
            renderer.setEnvObjects([], resColorMap);
            for (let i = 0; i < snap.asteroids.length; i++) {
              const rock = snap.asteroids[i];
              legacyRocks.push({
                id: rock.id,
                x: rock.pos.x,
                y: rock.pos.y,
                radius: rock.radius,
                isNode: rock.isNode,
                color: resColorMap[rock.resourceType] || '#94a3b8',
              });
            }
          }

          // 3. Cryo Flak Clouds
          for (let i = 0; i < snap.cryoClouds.length; i++) {
            const cl = snap.cryoClouds[i];
            const ratio =
              cl.maxTicks > 0 ? Math.max(0, Math.min(1, cl.remainingTicks / cl.maxTicks)) : 0.5;
            cryoClouds.push({
              id: cl.id,
              x: cl.pos.x,
              y: cl.pos.y,
              radius: cl.radius,
              ratio,
            });
          }

          // 4. Projectiles
          for (let i = 0; i < snap.projectiles.length; i++) {
            const p = snap.projectiles[i];
            const color = p.isHouse ? '#fb7185' : SEAT_COLORS[p.seatIndex] ?? '#38bdf8';
            const kind: RenderProjectile['kind'] =
              p.projType === 'cryo'
                ? 'cryo'
                : p.projType === 'torpedo'
                ? 'torpedo'
                : p.projType === 'railgun'
                ? 'railgun'
                : 'laser';
            projectiles.push({
              x: p.pos.x,
              y: p.pos.y,
              vx: p.vel.x,
              vy: p.vel.y,
              kind,
              color,
            });
          }

          // 5. Units
          for (let i = 0; i < snap.units.length; i++) {
            const u = snap.units[i];
            const isBoss = u.isHouse && u.unitType === 'flagship';
            const isHarvester =
              u.isHouse &&
              (u.unitType === 'mining_barge' ||
                u.unitType === 'plasma_skimmer' ||
                u.unitType === 'grav_extractor');
            const glowColor = u.isHouse
              ? isBoss
                ? '#f43f5e'
                : HOUSE_COLOR
              : SEAT_COLORS[u.seatIndex] ?? '#38bdf8';
            const size = getSpacePiratesSpriteSize(u.unitType, isBoss);
            const halfR = size * 0.48;

            const labels: RenderUnitLabel[] = [];
            let bars: RenderUnit['bars'];

            if (u.isHouse) {
              if (isBoss) {
                labels.push({
                  text: 'BOSS',
                  yOffset: -halfR - 22,
                  color: '#facc15',
                  fontSize: 18,
                  bold: true,
                });
              }
              if (u.currentBountyCents > 0) {
                labels.push({
                  text: formatCents(u.currentBountyCents),
                  yOffset: halfR + 22,
                  color: isBoss ? '#fde047' : '#fca5a5',
                  fontSize: 14,
                  bold: true,
                });
              }
            } else {
              const barW = Math.max(32, halfR * 1.9);
              const ammoRatio =
                u.maxAmmo > 0 ? Math.max(0, Math.min(1, u.currentAmmo / u.maxAmmo)) : 1;
              bars = [
                {
                  yOffset: halfR + 10,
                  width: barW,
                  height: 5,
                  ratio: ammoRatio,
                  fillColor: ammoRatio <= 0.25 ? '#f87171' : glowColor,
                },
              ];
              if (u.betMultiplier > 1) {
                labels.push({
                  text: `${u.betMultiplier}x`,
                  yOffset: -halfR - 12,
                  color: glowColor,
                  fontSize: 12,
                  bold: true,
                });
              }
            }

            units.push({
              id: u.id,
              unitType: u.unitType,
              x: u.pos.x,
              y: u.pos.y,
              angle: u.angle,
              size,
              alpha: u.isStealthed ? 0.48 : 1,
              fallbackColor: glowColor,
              ring: {
                radius: halfR + (isBoss ? 10 : 4),
                strokeColor: glowColor,
                strokeAlpha: u.isStealthed ? 0.35 : 0.85,
                lineWidth: isBoss ? 3.2 : 2,
                fillColor: glowColor,
                fillAlpha: u.isStealthed ? 0.08 : isBoss ? 0.2 : 0.12,
              },
              stealthRingRadius: u.isStealthed ? halfR + 10 : undefined,
              muzzleFlashDot: u.isFiring,
              harvester: isHarvester
                ? {
                    ringRadius: halfR + 12,
                    cargoRatio: u.cargoRatio,
                    cargoColor: resColorMap[u.resourceType] || '#fbbf24',
                    isHarvesting: u.aiState === 'HARVEST',
                    beamColor: resColorMap[u.resourceType] || '#38bdf8',
                    beamLength: 46,
                  }
                : undefined,
              bars,
              labels: labels.length > 0 ? labels : undefined,
            });
          }

          // 6. Floating Payout Popups
          for (let i = 0; i < snap.payoutEvents.length; i++) {
            const ev = snap.payoutEvents[i];
            if (!seenPayoutIdsRef.current.has(ev.eventId)) {
              seenPayoutIdsRef.current.add(ev.eventId);
              activePopupsRef.current.push({
                eventId: ev.eventId,
                x: ev.pos.x,
                y: ev.pos.y,
                payoutCents: ev.payoutCents,
                multiplier: ev.multiplier,
                seatIndex: ev.seatIndex,
                wasBoss: ev.wasBoss,
                bornMs: now,
              });
              if (seenPayoutIdsRef.current.size > 400) {
                const first = seenPayoutIdsRef.current.values().next().value;
                if (first !== undefined) seenPayoutIdsRef.current.delete(first);
              }
            }
          }

          const surviving: FloatingPayout[] = [];
          for (let i = 0; i < activePopupsRef.current.length; i++) {
            const pop = activePopupsRef.current[i];
            const age = now - pop.bornMs;
            const duration = pop.wasBoss ? 2200 : 1300;
            if (age >= duration) continue;
            surviving.push(pop);

            const t = age / duration;
            const riseY = pop.y - 18 - t * (pop.wasBoss ? 95 : 65);
            const alpha = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
            const color = pop.wasBoss ? '#facc15' : SEAT_COLORS[pop.seatIndex] ?? '#4ade80';
            const txt = `+${formatCents(pop.payoutCents)}${
              pop.multiplier > 1 ? ` (${pop.multiplier}x)` : ''
            }`;

            floatingTexts.push({
              text: txt,
              x: pop.x,
              y: riseY,
              color,
              fontSize: pop.wasBoss ? 34 : 22,
              alpha,
            });
          }
          activePopupsRef.current = surviving;
        } else {
          renderer.setEnvObjects([], resColorMap);
        }

        const frame: ViewportFrameState = {
          now,
          worldWidth: arenaW,
          worldHeight: arenaH,
          backgroundColor: '#03060c',
          backdrop: {
            kind: 'arena',
            fillColor: '#070d1c',
            glowColor: 'rgba(12, 22, 44, 0.55)',
            gridSpacing: 200,
            gridColor: 'rgba(56, 189, 248, 0.05)',
            borderColor: 'rgba(30, 41, 59, 0.9)',
            stars: STARFIELD,
          },
          beacons,
          legacyRocks,
          cryoClouds,
          units,
          projectiles,
          floatingTexts,
        };

        renderer.render(frame, {
          mode: 'fit',
          arenaWidth: arenaW,
          arenaHeight: arenaH,
        });
      } catch (err) {
        const errNow = performance.now();
        if (errNow - lastErrLogMs > 2000) {
          lastErrLogMs = errNow;
          console.error('[SP CANVAS2D] Render tick error:', err);
        }
      }
    };

    rafId = requestAnimationFrame(renderLoop);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.destroy();
    };
  }, [latestStateRef, consumeLatestSnapshot]);

  return (
    <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden bg-[#03060c]">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
