// src/components/casino/spacePirates/SpacePiratesViewport.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import {
  EnvComponentKind,
  EnvObjectType,
  ResourceType,
  SPEnvObjectSnapshot,
  SPServerStateSnapshot,
  SPUnitSnapshot,
} from '../../../parsers/spacePiratesCodec';
import { SPResourceConfig } from '../../../services/clusterService';
import { formatCents } from '../../../services/walletService';

export const SEAT_COLORS = [
  '#22d3ee', // Seat 0 (NW): Cyan
  '#34d399', // Seat 1 (NE): Emerald
  '#fbbf24', // Seat 2 (SW): Amber
  '#c084fc', // Seat 3 (SE): Violet
] as const;

export const HOUSE_COLOR = '#ef4444';

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

function drawRockPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number
) {
  const verts = 10;
  ctx.beginPath();
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2;
    const jitter = 0.87 + 0.13 * Math.sin(seed * 2.9 + i * 2.1) * Math.cos(seed * 1.7 - i * 1.3);
    const r = radius * jitter;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function getShipDrawScale(unitType: string, isBoss: boolean): number {
  if (isBoss) return 38;
  switch (unitType) {
    case 'viper_interceptor':
      return 15;
    case 'assault_gunship':
      return 19;
    case 'cryo_flak':
    case 'command_escort':
    case 'mining_barge':
    case 'plasma_skimmer':
      return 22;
    case 'grav_extractor':
    case 'torpedo_bomber':
      return 26;
    case 'flagship':
      return 31;
    default:
      return 20;
  }
}

function drawShipHull(
  ctx: CanvasRenderingContext2D,
  u: SPUnitSnapshot,
  size: number,
  glowColor: string,
  isBoss: boolean
) {
  ctx.save();
  ctx.translate(u.pos.x, u.pos.y);

  // Subtle visual dimming + dashed cloak ring for stealthed ships inside Nebula / Gas Deep
  if (u.isStealthed) {
    ctx.globalAlpha = 0.48;
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.rotate(u.angle);
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = isBoss ? 28 : u.isStealthed ? 6 : 16;

  ctx.fillStyle = u.isHouse ? '#2a0f17' : '#0f172a';
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = isBoss ? 3.5 : 2.2;

  ctx.beginPath();
  if (u.unitType === 'mining_barge' || u.unitType === 'plasma_skimmer' || u.unitType === 'grav_extractor') {
    ctx.moveTo(size * 0.9, -size * 0.45);
    ctx.lineTo(size * 0.9, size * 0.45);
    ctx.lineTo(size * 0.2, size * 0.78);
    ctx.lineTo(-size * 0.95, size * 0.65);
    ctx.lineTo(-size * 0.95, -size * 0.65);
    ctx.lineTo(size * 0.2, -size * 0.78);
  } else if (u.unitType === 'cryo_flak') {
    ctx.moveTo(size * 1.0, 0);
    ctx.lineTo(size * 0.35, size * 0.75);
    ctx.lineTo(-size * 0.75, size * 0.6);
    ctx.lineTo(-size * 0.95, 0);
    ctx.lineTo(-size * 0.75, -size * 0.6);
    ctx.lineTo(size * 0.35, -size * 0.75);
  } else if (u.unitType === 'flagship') {
    ctx.moveTo(size * 1.15, 0);
    ctx.lineTo(size * 0.4, size * 0.68);
    ctx.lineTo(-size * 0.55, size * 0.85);
    ctx.lineTo(-size * 1.0, size * 0.42);
    ctx.lineTo(-size * 0.8, 0);
    ctx.lineTo(-size * 1.0, -size * 0.42);
    ctx.lineTo(-size * 0.55, -size * 0.85);
    ctx.lineTo(size * 0.4, -size * 0.68);
  } else {
    ctx.moveTo(size * 1.15, 0);
    ctx.lineTo(-size * 0.85, size * 0.78);
    ctx.lineTo(-size * 0.42, 0);
    ctx.lineTo(-size * 0.85, -size * 0.78);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(size * 0.25, 0, Math.max(2.5, size * 0.16), 0, Math.PI * 2);
  ctx.fill();

  if (u.isFiring) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size * 1.15, 0, Math.max(3, size * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawEnvObject(
  ctx: CanvasRenderingContext2D,
  obj: SPEnvObjectSnapshot,
  parentById: Map<number, SPEnvObjectSnapshot>,
  colorByResourceEnum: Record<number, string>,
  now: number,
  arenaW: number,
  arenaH: number
) {
  // Draw orbital path ring for orbiting moons
  if (obj.parentObjectId > 0 && obj.orbitRadius > 0) {
    const parent = parentById.get(obj.parentObjectId);
    if (parent) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(parent.pos.x, parent.pos.y, obj.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Comet dashed full-arena radar trajectory warning line
  if (obj.objectType === EnvObjectType.Comet) {
    const spd = Math.hypot(obj.vel.x, obj.vel.y);
    if (spd > 0.2) {
      const nx = obj.vel.x / spd;
      const ny = obj.vel.y / spd;
      const maxSpan = Math.hypot(arenaW, arenaH);

      ctx.save();
      // Forward dashed radar warning vector
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(obj.pos.x, obj.pos.y);
      ctx.lineTo(obj.pos.x + nx * maxSpan, obj.pos.y + ny * maxSpan);
      ctx.stroke();
      ctx.setLineDash([]);

      // Luminous ice tail behind comet
      const tailGrad = ctx.createLinearGradient(
        obj.pos.x,
        obj.pos.y,
        obj.pos.x - nx * 190,
        obj.pos.y - ny * 190
      );
      tailGrad.addColorStop(0, 'rgba(186, 230, 253, 0.85)');
      tailGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)');
      tailGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(obj.pos.x, obj.pos.y);
      ctx.lineTo(obj.pos.x - nx * 190, obj.pos.y - ny * 190);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Sort components largest-first so inner cores/nodes render cleanly on top of atmospheres/fields
  const sorted = [...obj.components].sort((a, b) => b.radius - a.radius);

  for (const c of sorted) {
    const resColor = colorByResourceEnum[c.resourceType] || c.colorHex || '#94a3b8';

    ctx.save();
    switch (c.kind) {
      case EnvComponentKind.NebulaBlob: {
        const base = c.colorHex || '#7c3aed';
        const ng = ctx.createRadialGradient(c.pos.x, c.pos.y, c.radius * 0.12, c.pos.x, c.pos.y, c.radius);
        ng.addColorStop(0, `${base}66`);
        ng.addColorStop(0.65, `${base}2b`);
        ng.addColorStop(1, `${base}00`);
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        if (c.isNode) {
          ctx.shadowColor = resColor;
          ctx.shadowBlur = 18;
          ctx.fillStyle = resColor;
          ctx.beginPath();
          ctx.arc(c.pos.x, c.pos.y, Math.max(9, c.radius * 0.18), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case EnvComponentKind.GasOuter:
      case EnvComponentKind.GasDeep:
      case EnvComponentKind.GasCore: {
        const col =
          c.colorHex ||
          (c.kind === EnvComponentKind.GasCore
            ? '#581c87'
            : c.kind === EnvComponentKind.GasDeep
            ? '#7e22ce'
            : '#c084fc');
        const g = ctx.createRadialGradient(c.pos.x, c.pos.y, c.innerRadius * 0.6, c.pos.x, c.pos.y, c.radius);
        if (c.kind === EnvComponentKind.GasCore) {
          g.addColorStop(0, '#3b0764');
          g.addColorStop(1, `${col}dd`);
        } else if (c.kind === EnvComponentKind.GasDeep) {
          g.addColorStop(0, `${col}66`);
          g.addColorStop(1, `${col}22`);
        } else {
          g.addColorStop(0, `${col}2c`);
          g.addColorStop(1, `${col}08`);
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c.kind === EnvComponentKind.GasCore ? '#f43f5e' : `${col}99`;
        ctx.lineWidth = c.kind === EnvComponentKind.GasCore ? 3 : 1.8;
        ctx.stroke();
        break;
      }

      case EnvComponentKind.RiftField: {
        const pulse = 0.94 + 0.06 * Math.sin(now * 0.006 + obj.id);
        const rg = ctx.createRadialGradient(c.pos.x, c.pos.y, c.innerRadius, c.pos.x, c.pos.y, c.radius * pulse);
        rg.addColorStop(0, 'rgba(56, 189, 248, 0.36)');
        rg.addColorStop(0.6, 'rgba(139, 92, 246, 0.16)');
        rg.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Refraction ripple rings
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const frac = ((now * 0.0005 + rIdx * 0.5) % 1);
          const ringR = c.innerRadius + (c.radius - c.innerRadius) * frac;
          ctx.strokeStyle = `rgba(125, 211, 252, ${0.48 * (1 - frac)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(c.pos.x, c.pos.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case EnvComponentKind.RiftCore: {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (c.isNode) {
          ctx.fillStyle = resColor;
          ctx.beginPath();
          ctx.arc(c.pos.x, c.pos.y, c.radius * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case EnvComponentKind.CometCore: {
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#f0f9ff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case EnvComponentKind.SolidCore: {
        const base = c.colorHex || '#475569';
        const pg = ctx.createRadialGradient(
          c.pos.x - c.radius * 0.3,
          c.pos.y - c.radius * 0.3,
          c.radius * 0.1,
          c.pos.x,
          c.pos.y,
          c.radius
        );
        pg.addColorStop(0, base);
        pg.addColorStop(1, '#0f172a');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.6;
        ctx.stroke();
        break;
      }

      default: {
        // SolidRock, ResourceNode, CraterNode, CaveMouth
        if (c.isNode) {
          ctx.shadowColor = resColor;
          ctx.shadowBlur = 20;
        }
        drawRockPolygon(ctx, c.pos.x, c.pos.y, c.radius, c.id);
        ctx.fillStyle =
          c.isNode
            ? '#1e293b'
            : obj.objectType === EnvObjectType.AsteroidBelt
            ? '#1e293b'
            : '#2d3748';
        ctx.fill();
        ctx.lineWidth = c.isNode ? 2.8 : 2;
        ctx.strokeStyle = c.isNode
          ? resColor
          : obj.objectType === EnvObjectType.AsteroidBelt
          ? '#64748b'
          : '#475569';
        ctx.stroke();

        if (c.isNode) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = resColor;
          ctx.globalAlpha = 0.88;
          ctx.beginPath();
          ctx.arc(c.pos.x, c.pos.y, Math.max(7, c.radius * 0.36), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const render = (now: number) => {
      const rect = container.getBoundingClientRect();
      const viewW = Math.max(320, Math.floor(rect.width));
      const viewH = Math.max(240, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== viewW * dpr || canvas.height !== viewH * dpr) {
        canvas.width = viewW * dpr;
        canvas.height = viewH * dpr;
        canvas.style.width = `${viewW}px`;
        canvas.style.height = `${viewH}px`;
      }

      const snap = latestStateRef.current;
      const arenaW = snap && snap.arenaWidth > 0 ? snap.arenaWidth : 2400;
      const arenaH = snap && snap.arenaHeight > 0 ? snap.arenaHeight : 1600;

      const scale = Math.min(viewW / arenaW, viewH / arenaH);
      const offsetX = (viewW - arenaW * scale) / 2;
      const offsetY = (viewH - arenaH * scale) / 2;

      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#03060c';
      ctx.fillRect(0, 0, viewW, viewH);

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      ctx.beginPath();
      ctx.rect(0, 0, arenaW, arenaH);
      ctx.clip();

      const grad = ctx.createRadialGradient(
        arenaW / 2,
        arenaH / 2,
        120,
        arenaW / 2,
        arenaH / 2,
        arenaW * 0.65
      );
      grad.addColorStop(0, '#0c1426');
      grad.addColorStop(1, '#050811');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, arenaW, arenaH);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.045)';
      ctx.lineWidth = 1.5;
      for (let gx = 200; gx < arenaW; gx += 200) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, arenaH);
        ctx.stroke();
      }
      for (let gy = 200; gy < arenaH; gy += 200) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(arenaW, gy);
        ctx.stroke();
      }

      for (const s of STARFIELD) {
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x * arenaW, s.y * arenaH, s.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4 Corner Player Deployment Beacons
      const corners = [
        { x: 150, y: 150, label: 'NW' },
        { x: arenaW - 150, y: 150, label: 'NE' },
        { x: 150, y: arenaH - 150, label: 'SW' },
        { x: arenaW - 150, y: arenaH - 150, label: 'SE' },
      ];
      corners.forEach((c, idx) => {
        const seat = snap?.seats[idx];
        const color = SEAT_COLORS[idx];
        const occupied = !!seat?.occupied;

        ctx.save();
        ctx.strokeStyle = occupied ? color : 'rgba(100, 116, 139, 0.35)';
        ctx.lineWidth = occupied ? 3 : 1.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        if (occupied) {
          ctx.fillStyle = `${color}18`;
          ctx.beginPath();
          ctx.arc(c.x, c.y, 68, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = occupied ? color : 'rgba(148, 163, 184, 0.45)';
        ctx.font = '700 18px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(occupied && seat?.username ? seat.username : `${c.label} OPEN`, c.x, c.y + 92);
        ctx.restore();
      });

      if (snap) {
        // 1. Background Soft Environment Layers (Nebulas, Gas Giants, Singularity Rifts)
        const envParentMap = new Map<number, SPEnvObjectSnapshot>();
        for (const eo of snap.envObjects) envParentMap.set(eo.id, eo);

        for (const eo of snap.envObjects) {
          if (
            eo.objectType === EnvObjectType.NebulaField ||
            eo.objectType === EnvObjectType.GasGiant ||
            eo.objectType === EnvObjectType.SingularityRift
          ) {
            drawEnvObject(ctx, eo, envParentMap, colorByResourceEnum, now, arenaW, arenaH);
          }
        }

        // 2. Cryo Flak Clouds
        for (const cl of snap.cryoClouds) {
          const ratio = cl.maxTicks > 0 ? Math.max(0, Math.min(1, cl.remainingTicks / cl.maxTicks)) : 0.5;
          const pulse = 0.94 + 0.06 * Math.sin(now * 0.008 + cl.id);
          const rad = cl.radius * pulse;

          const cg = ctx.createRadialGradient(cl.pos.x, cl.pos.y, rad * 0.1, cl.pos.x, cl.pos.y, rad);
          cg.addColorStop(0, `rgba(56, 189, 248, ${0.36 * ratio})`);
          cg.addColorStop(0.7, `rgba(14, 165, 233, ${0.2 * ratio})`);
          cg.addColorStop(1, 'rgba(14, 165, 233, 0)');

          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(cl.pos.x, cl.pos.y, rad, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(125, 211, 252, ${0.55 * ratio})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.arc(cl.pos.x, cl.pos.y, rad, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 3. Solid Environment Objects (Worlds, Planetoids, Moons, Belts, Clusters, Comets)
        if (snap.envObjects.length > 0) {
          for (const eo of snap.envObjects) {
            if (
              eo.objectType !== EnvObjectType.NebulaField &&
              eo.objectType !== EnvObjectType.GasGiant &&
              eo.objectType !== EnvObjectType.SingularityRift
            ) {
              drawEnvObject(ctx, eo, envParentMap, colorByResourceEnum, now, arenaW, arenaH);
            }
          }
        } else {
          // Fallback to legacy asteroids vector if connected to older server
          for (const rock of snap.asteroids) {
            const resColor = colorByResourceEnum[rock.resourceType] || '#94a3b8';
            drawRockPolygon(ctx, rock.pos.x, rock.pos.y, rock.radius, rock.id);
            ctx.fillStyle = rock.isNode ? '#1e293b' : '#2d3748';
            ctx.fill();
            ctx.lineWidth = rock.isNode ? 2.8 : 2;
            ctx.strokeStyle = rock.isNode ? resColor : '#475569';
            ctx.stroke();
          }
        }

        // 4. Projectiles
        for (const p of snap.projectiles) {
          const color = p.isHouse ? '#fb7185' : SEAT_COLORS[p.seatIndex] || '#38bdf8';
          ctx.save();
          if (p.projType === 'cryo') {
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#bae6fd';
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, 6.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.projType === 'torpedo') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(p.pos.x, p.pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          } else if (p.projType === 'railgun') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(p.pos.x, p.pos.y);
            ctx.lineTo(p.pos.x - p.vel.x * 1.4, p.pos.y - p.vel.y * 1.4);
            ctx.stroke();
          } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.pos.x, p.pos.y);
            ctx.lineTo(p.pos.x - p.vel.x * 0.9, p.pos.y - p.vel.y * 0.9);
            ctx.stroke();
          }
          ctx.restore();
        }

        // 5. Units (House + Players)
        for (const u of snap.units) {
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
            : SEAT_COLORS[u.seatIndex] || '#38bdf8';
          const size = getShipDrawScale(u.unitType, isBoss);

          if (isHarvester) {
            const ringR = size + 12;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(u.pos.x, u.pos.y, ringR, 0, Math.PI * 2);
            ctx.stroke();

            if (u.cargoRatio > 0.01) {
              const cargoColor = colorByResourceEnum[u.resourceType] || '#fbbf24';
              ctx.strokeStyle = cargoColor;
              ctx.lineWidth = 4.5;
              ctx.beginPath();
              ctx.arc(
                u.pos.x,
                u.pos.y,
                ringR,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * u.cargoRatio
              );
              ctx.stroke();
            }

            if (u.aiState === 'HARVEST') {
              const beamColor = colorByResourceEnum[u.resourceType] || '#38bdf8';
              ctx.strokeStyle = beamColor;
              ctx.lineWidth = 3;
              ctx.globalAlpha = 0.65 + 0.25 * Math.sin(now * 0.02);
              ctx.beginPath();
              ctx.moveTo(u.pos.x + Math.cos(u.angle) * size, u.pos.y + Math.sin(u.angle) * size);
              ctx.lineTo(
                u.pos.x + Math.cos(u.angle) * (size + 46),
                u.pos.y + Math.sin(u.angle) * (size + 46)
              );
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }

          drawShipHull(ctx, u, size, glowColor, isBoss);

          if (u.isHouse) {
            if (isBoss) {
              ctx.fillStyle = '#facc15';
              ctx.font = '900 18px ui-monospace, SFMono-Regular, monospace';
              ctx.textAlign = 'center';
              ctx.fillText('👑 BOSS', u.pos.x, u.pos.y - size - 18);
            }
            if (u.currentBountyCents > 0) {
              ctx.fillStyle = isBoss ? '#fde047' : '#fca5a5';
              ctx.font = '700 14px ui-monospace, SFMono-Regular, monospace';
              ctx.textAlign = 'center';
              ctx.fillText(formatCents(u.currentBountyCents), u.pos.x, u.pos.y + size + 22);
            }
          } else {
            const barW = Math.max(30, size * 1.9);
            const barH = 5;
            const bx = u.pos.x - barW / 2;
            const by = u.pos.y + size + 10;
            const ammoRatio = u.maxAmmo > 0 ? Math.max(0, Math.min(1, u.currentAmmo / u.maxAmmo)) : 1;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(bx, by, barW, barH);
            ctx.fillStyle = ammoRatio <= 0.25 ? '#f87171' : glowColor;
            ctx.fillRect(bx, by, barW * ammoRatio, barH);

            if (u.betMultiplier > 1) {
              ctx.fillStyle = glowColor;
              ctx.font = '800 12px ui-monospace, SFMono-Regular, monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`${u.betMultiplier}x`, u.pos.x, u.pos.y - size - 10);
            }
          }
        }

        // 6. Floating Payout Popups
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
          const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
          const color = pop.wasBoss ? '#facc15' : SEAT_COLORS[pop.seatIndex] || '#4ade80';

          ctx.save();
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.font = pop.wasBoss
            ? '900 36px ui-monospace, SFMono-Regular, monospace'
            : '800 22px ui-monospace, SFMono-Regular, monospace';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 8;
          ctx.fillStyle = color;
          const label = `+${formatCents(pop.payoutCents)}${pop.multiplier > 1 ? ` (${pop.multiplier}x)` : ''}`;
          ctx.fillText(label, pop.x, riseY);
          ctx.restore();
        }
        activePopupsRef.current = surviving;
      }

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, arenaW - 4, arenaH - 4);

      ctx.restore();
      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [latestStateRef, colorByResourceEnum]);

  return (
    <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden bg-[#03060c]">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
