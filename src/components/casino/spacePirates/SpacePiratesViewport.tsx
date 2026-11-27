// src/components/casino/spacePirates/SpacePiratesViewport.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { Application, BitmapText, Container, Graphics } from 'pixi.js';
import {
  ResourceType,
  SPServerStateSnapshot,
} from '../../../parsers/spacePiratesCodec';
import { SPResourceConfig } from '../../../services/clusterService';
import { formatCents } from '../../../services/walletService';
import {
  PixiUnitSpriteLayer,
  SpriteSyncItem,
  loadPixiUnitTextures,
} from '../../../renderer/pixiSprites';
import {
  PixiEnvLayer,
  TACTICAL_BITMAP_FONT,
  drawPixiDashedCircle,
  drawPixiRockPolygon,
  ensurePixiBitmapFont,
  hexToPixiColor,
} from '../../../renderer/pixiEnvRenderer';

export const SEAT_COLORS = [
  '#22d3ee', // Seat 0 (NW): Cyan
  '#34d399', // Seat 1 (NE): Emerald
  '#fbbf24', // Seat 2 (SW): Amber
  '#c084fc', // Seat 3 (SE): Violet
] as const;

const SEAT_COLORS_HEX = [0x22d3ee, 0x34d399, 0xfbbf24, 0xc084fc] as const;
export const HOUSE_COLOR = '#ef4444';
const HOUSE_COLOR_HEX = 0xef4444;

export interface SpacePiratesViewportProps {
  latestStateRef: React.MutableRefObject<SPServerStateSnapshot | null>;
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

interface StarDot {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

function generateStars(count: number): StarDot[] {
  const stars: StarDot[] = [];
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

  // Pixi.js v8 WebGL Arena Renderer (Cached EnvObjects + BitmapText + Zero Stencil Mask)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let destroyed = false;
    let initialized = false;
    let resizeObserver: ResizeObserver | null = null;
    const app = new Application();

    (async () => {
      const rect = container.getBoundingClientRect();
      const initW = Math.max(320, Math.floor(rect.width));
      const initH = Math.max(240, Math.floor(rect.height));

      await app.init({
        canvas,
        width: initW,
        height: initH,
        background: 0x03060c,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        antialias: true,
        roundPixels: false,
      });

      if (destroyed) {
        app.destroy(false, { children: true, texture: false, textureSource: false });
        return;
      }
      initialized = true;

      ensurePixiBitmapFont();
      loadPixiUnitTextures();

      // Arena Scene Graph (no stencil mask overhead — clean letterbox border covers edge bleed)
      const arenaContainer = new Container();
      const backdropGfx = new Graphics();
      const beaconsGfx = new Graphics();
      const envLayer = new PixiEnvLayer();
      const cryoGfx = new Graphics();
      const legacyRocksGfx = new Graphics();
      const projGfx = new Graphics();
      const unitBackGfx = new Graphics();
      const unitSprites = new PixiUnitSpriteLayer();
      const unitFrontGfx = new Graphics();
      const labelsContainer = new Container();

      arenaContainer.addChild(
        backdropGfx,
        beaconsGfx,
        envLayer.softContainer,
        cryoGfx,
        envLayer.dynamicGfx,
        envLayer.solidContainer,
        legacyRocksGfx,
        projGfx,
        unitBackGfx,
        unitSprites.container,
        unitFrontGfx,
        labelsContainer
      );

      app.stage.addChild(arenaContainer);

      // Pooled BitmapText labels (all share 1 GPU font atlas = 1 draw call!)
      const labelPool = new Map<string, BitmapText>();
      const activeLabelKeys = new Set<string>();
      const getLabel = (key: string, fontSize: number, tint: number): BitmapText => {
        activeLabelKeys.add(key);
        let t = labelPool.get(key);
        if (!t) {
          t = new BitmapText({
            text: '',
            style: {
              fontFamily: TACTICAL_BITMAP_FONT,
              fontSize,
            },
          });
          t.anchor.set(0.5, 0.5);
          t.tint = tint;
          labelPool.set(key, t);
          labelsContainer.addChild(t);
        } else if (t.tint !== tint) {
          t.tint = tint;
        }
        return t;
      };

      const spriteItems: SpriteSyncItem[] = [];
      let cachedArenaW = 0;
      let cachedArenaH = 0;

      const syncSize = () => {
        if (destroyed) return;
        const r = container.getBoundingClientRect();
        const w = Math.max(320, Math.floor(r.width));
        const h = Math.max(240, Math.floor(r.height));
        if (app.screen.width !== w || app.screen.height !== h) {
          app.renderer.resize(w, h);
        }
      };
      syncSize();
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(container);

      app.ticker.add(() => {
        const now = performance.now();
        const snap = latestStateRef.current;
        const arenaW = snap && snap.arenaWidth > 0 ? snap.arenaWidth : 2400;
        const arenaH = snap && snap.arenaHeight > 0 ? snap.arenaHeight : 1600;

        const viewW = app.screen.width;
        const viewH = app.screen.height;
        const scale = Math.min(viewW / arenaW, viewH / arenaH);
        const offsetX = (viewW - arenaW * scale) / 2;
        const offsetY = (viewH - arenaH * scale) / 2;

        arenaContainer.scale.set(scale);
        arenaContainer.position.set(offsetX, offsetY);

        // 1. Rebuild static starfield & grid only when arena dimensions change
        if (cachedArenaW !== arenaW || cachedArenaH !== arenaH) {
          cachedArenaW = arenaW;
          cachedArenaH = arenaH;

          backdropGfx.clear();
          backdropGfx.rect(0, 0, arenaW, arenaH).fill({ color: 0x070d1c, alpha: 1 });
          backdropGfx
            .circle(arenaW / 2, arenaH / 2, arenaW * 0.42)
            .fill({ color: 0x0c162c, alpha: 0.55 });

          for (let gx = 200; gx < arenaW; gx += 200) {
            backdropGfx.moveTo(gx, 0).lineTo(gx, arenaH);
          }
          for (let gy = 200; gy < arenaH; gy += 200) {
            backdropGfx.moveTo(0, gy).lineTo(arenaW, gy);
          }
          backdropGfx.stroke({ width: 1.5, color: 0x38bdf8, alpha: 0.05 });

          for (const s of STARFIELD) {
            backdropGfx
              .circle(s.x * arenaW, s.y * arenaH, s.r * 1.5)
              .fill({ color: 0xe2e8f0, alpha: s.alpha });
          }

          backdropGfx
            .rect(0, 0, arenaW, arenaH)
            .stroke({ width: 3, color: 0x1e293b, alpha: 0.9 });
        }

        activeLabelKeys.clear();

        // 2. 4 Corner Player Deployment Beacons
        beaconsGfx.clear();
        const corners = [
          { x: 150, y: 150, label: 'NW' },
          { x: arenaW - 150, y: 150, label: 'NE' },
          { x: 150, y: arenaH - 150, label: 'SW' },
          { x: arenaW - 150, y: arenaH - 150, label: 'SE' },
        ];
        for (let idx = 0; idx < 4; idx++) {
          const c = corners[idx];
          const seat = snap?.seats[idx];
          const colorHex = SEAT_COLORS_HEX[idx];
          const occupied = !!seat?.occupied;

          if (occupied) {
            beaconsGfx.circle(c.x, c.y, 68).fill({ color: colorHex, alpha: 0.1 });
          }
          drawPixiDashedCircle(
            beaconsGfx,
            c.x,
            c.y,
            68,
            12,
            10,
            occupied ? colorHex : 0x64748b,
            occupied ? 0.9 : 0.35,
            occupied ? 3 : 1.5
          );

          const seatTxt = occupied && seat?.username ? seat.username : `${c.label} OPEN`;
          const lbl = getLabel(`seat:${idx}`, 18, occupied ? colorHex : 0x64748b);
          if (lbl.text !== seatTxt) lbl.text = seatTxt;
          lbl.position.set(c.x, c.y + 92);
        }

        cryoGfx.clear();
        legacyRocksGfx.clear();
        projGfx.clear();
        unitBackGfx.clear();
        unitFrontGfx.clear();

        const resColorMap = colorMapRef.current;

        if (snap) {
          // 3. Cached Universal Environment Objects (O(1) transform updates)
          if (snap.envObjects.length > 0) {
            envLayer.sync(snap.envObjects, now, arenaW, arenaH, resColorMap);
          } else {
            envLayer.clear();
            for (const rock of snap.asteroids) {
              const resCol = hexToPixiColor(resColorMap[rock.resourceType], 0x94a3b8);
              drawPixiRockPolygon(legacyRocksGfx, rock.pos.x, rock.pos.y, rock.radius, rock.id);
              legacyRocksGfx
                .fill({ color: rock.isNode ? 0x1e293b : 0x2d3748, alpha: 0.96 })
                .stroke({
                  width: rock.isNode ? 2.8 : 2,
                  color: rock.isNode ? resCol : 0x475569,
                  alpha: 0.96,
                });
            }
          }

          // 4. Cryo Flak Clouds
          for (const cl of snap.cryoClouds) {
            const ratio =
              cl.maxTicks > 0 ? Math.max(0, Math.min(1, cl.remainingTicks / cl.maxTicks)) : 0.5;
            const pulse = 0.94 + 0.06 * Math.sin(now * 0.008 + cl.id);
            const rad = cl.radius * pulse;

            cryoGfx.circle(cl.pos.x, cl.pos.y, rad).fill({ color: 0x0ea5e9, alpha: 0.16 * ratio });
            cryoGfx
              .circle(cl.pos.x, cl.pos.y, rad * 0.55)
              .fill({ color: 0x38bdf8, alpha: 0.2 * ratio });
            drawPixiDashedCircle(
              cryoGfx,
              cl.pos.x,
              cl.pos.y,
              rad,
              10,
              8,
              0x7dd3fc,
              0.55 * ratio,
              2
            );
          }

          // 5. Projectiles
          for (const p of snap.projectiles) {
            const colorHex = p.isHouse
              ? 0xfb7185
              : SEAT_COLORS_HEX[p.seatIndex] ?? 0x38bdf8;
            if (p.projType === 'cryo') {
              projGfx.circle(p.pos.x, p.pos.y, 10).fill({ color: 0x38bdf8, alpha: 0.25 });
              projGfx.circle(p.pos.x, p.pos.y, 6.5).fill({ color: 0xbae6fd, alpha: 1 });
            } else if (p.projType === 'torpedo') {
              projGfx.circle(p.pos.x, p.pos.y, 10).fill({ color: colorHex, alpha: 0.25 });
              projGfx
                .circle(p.pos.x, p.pos.y, 6)
                .fill({ color: 0xffffff, alpha: 1 })
                .stroke({ width: 3, color: colorHex, alpha: 1 });
            } else if (p.projType === 'railgun') {
              projGfx
                .moveTo(p.pos.x, p.pos.y)
                .lineTo(p.pos.x - p.vel.x * 1.4, p.pos.y - p.vel.y * 1.4)
                .stroke({ width: 4, color: 0xffffff, alpha: 1 });
            } else {
              projGfx
                .moveTo(p.pos.x, p.pos.y)
                .lineTo(p.pos.x - p.vel.x * 0.9, p.pos.y - p.vel.y * 0.9)
                .stroke({ width: 3, color: colorHex, alpha: 0.95 });
            }
          }

          // 6. Units (Mipmapped Pixi PNG Sprites + Faction Rings + Harvester Cargo & Bounties)
          spriteItems.length = 0;

          for (const u of snap.units) {
            const isBoss = u.isHouse && u.unitType === 'flagship';
            const isHarvester =
              u.isHouse &&
              (u.unitType === 'mining_barge' ||
                u.unitType === 'plasma_skimmer' ||
                u.unitType === 'grav_extractor');
            const glowHex = u.isHouse
              ? isBoss
                ? 0xf43f5e
                : HOUSE_COLOR_HEX
              : SEAT_COLORS_HEX[u.seatIndex] ?? 0x38bdf8;
            const size = getSpacePiratesSpriteSize(u.unitType, isBoss);
            const halfR = size * 0.48;

            unitBackGfx
              .circle(u.pos.x, u.pos.y, halfR + (isBoss ? 10 : 4))
              .fill({ color: glowHex, alpha: u.isStealthed ? 0.08 : isBoss ? 0.2 : 0.12 })
              .stroke({
                width: isBoss ? 3.2 : 2,
                color: glowHex,
                alpha: u.isStealthed ? 0.35 : 0.85,
              });

            if (u.isStealthed) {
              drawPixiDashedCircle(unitBackGfx, u.pos.x, u.pos.y, halfR + 10, 6, 6, 0xc084fc, 0.7, 2);
            }

            if (isHarvester) {
              const ringR = halfR + 12;
              unitBackGfx
                .circle(u.pos.x, u.pos.y, ringR)
                .stroke({ width: 4, color: 0xffffff, alpha: 0.14 });

              if (u.cargoRatio > 0.01) {
                const cargoCol = hexToPixiColor(resColorMap[u.resourceType], 0xfbbf24);
                const startA = -Math.PI / 2;
                const endA = startA + Math.PI * 2 * u.cargoRatio;
                unitBackGfx
                  .moveTo(u.pos.x + Math.cos(startA) * ringR, u.pos.y + Math.sin(startA) * ringR)
                  .arc(u.pos.x, u.pos.y, ringR, startA, endA)
                  .stroke({ width: 4.5, color: cargoCol, alpha: 0.95 });
              }

              if (u.aiState === 'HARVEST') {
                const beamCol = hexToPixiColor(resColorMap[u.resourceType], 0x38bdf8);
                unitFrontGfx
                  .moveTo(u.pos.x + Math.cos(u.angle) * halfR, u.pos.y + Math.sin(u.angle) * halfR)
                  .lineTo(
                    u.pos.x + Math.cos(u.angle) * (halfR + 46),
                    u.pos.y + Math.sin(u.angle) * (halfR + 46)
                  )
                  .stroke({
                    width: 3,
                    color: beamCol,
                    alpha: 0.65 + 0.25 * Math.sin(now * 0.02),
                  });
              }
            }

            if (u.isFiring) {
              unitFrontGfx
                .circle(
                  u.pos.x + Math.cos(u.angle) * halfR,
                  u.pos.y + Math.sin(u.angle) * halfR,
                  Math.max(3.5, size * 0.08)
                )
                .fill({ color: 0xffffff, alpha: 0.95 });
            }

            spriteItems.push({
              id: u.id,
              unitType: u.unitType,
              x: u.pos.x,
              y: u.pos.y,
              angle: u.angle,
              size,
              alpha: u.isStealthed ? 0.48 : 1,
            });

            if (u.isHouse) {
              if (isBoss) {
                const bossLbl = getLabel(`boss:${u.id}`, 18, 0xfacc15);
                if (bossLbl.text !== 'BOSS') bossLbl.text = 'BOSS';
                bossLbl.position.set(u.pos.x, u.pos.y - halfR - 22);
              }
              if (u.currentBountyCents > 0) {
                const bTxt = formatCents(u.currentBountyCents);
                const bLbl = getLabel(`bounty:${u.id}`, 14, isBoss ? 0xfde047 : 0xfca5a5);
                if (bLbl.text !== bTxt) bLbl.text = bTxt;
                bLbl.position.set(u.pos.x, u.pos.y + halfR + 22);
              }
            } else {
              const barW = Math.max(32, halfR * 1.9);
              const barH = 5;
              const bx = u.pos.x - barW / 2;
              const by = u.pos.y + halfR + 10;
              const ammoRatio =
                u.maxAmmo > 0 ? Math.max(0, Math.min(1, u.currentAmmo / u.maxAmmo)) : 1;

              unitFrontGfx.rect(bx, by, barW, barH).fill({ color: 0x0f172a, alpha: 0.85 });
              if (ammoRatio > 0) {
                unitFrontGfx
                  .rect(bx, by, barW * ammoRatio, barH)
                  .fill({ color: ammoRatio <= 0.25 ? 0xf87171 : glowHex, alpha: 1 });
              }

              if (u.betMultiplier > 1) {
                const mTxt = `${u.betMultiplier}x`;
                const mLbl = getLabel(`mult:${u.id}`, 12, glowHex);
                if (mLbl.text !== mTxt) mLbl.text = mTxt;
                mLbl.position.set(u.pos.x, u.pos.y - halfR - 12);
              }
            }
          }

          unitSprites.sync(spriteItems);

          // 7. Floating Payout Popups
          for (const ev of snap.payoutEvents) {
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
          for (const pop of activePopupsRef.current) {
            const age = now - pop.bornMs;
            const duration = pop.wasBoss ? 2200 : 1300;
            if (age >= duration) continue;
            surviving.push(pop);

            const t = age / duration;
            const riseY = pop.y - 18 - t * (pop.wasBoss ? 95 : 65);
            const alpha = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
            const colorHex = pop.wasBoss ? 0xfacc15 : SEAT_COLORS_HEX[pop.seatIndex] ?? 0x4ade80;
            const txt = `+${formatCents(pop.payoutCents)}${
              pop.multiplier > 1 ? ` (${pop.multiplier}x)` : ''
            }`;

            const pLbl = getLabel(`pay:${pop.eventId}`, pop.wasBoss ? 34 : 22, colorHex);
            if (pLbl.text !== txt) pLbl.text = txt;
            pLbl.alpha = alpha;
            pLbl.position.set(pop.x, riseY);
          }
          activePopupsRef.current = surviving;
        } else {
          envLayer.clear();
          unitSprites.clear();
        }

        for (const [key, t] of labelPool) {
          if (!activeLabelKeys.has(key)) {
            labelsContainer.removeChild(t);
            t.destroy();
            labelPool.delete(key);
          }
        }
      });
    })();

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      if (initialized) {
        app.destroy(false, { children: true, texture: false, textureSource: false });
      }
    };
  }, [latestStateRef]);

  return (
    <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden bg-[#03060c]">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
