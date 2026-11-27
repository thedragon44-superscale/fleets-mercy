// src/utils/envRenderer.ts
// Shared 2D Canvas renderer for all 9 universal celestial archetypes across
// Space Pirates, Unit Testing Sandbox, 20v20 TDM, and Universal Map Builder.
import type { EnvBlueprint, EnvComponentKind as EnvComponentKindStr, EnvObjectType as EnvObjectTypeStr } from '../services/envService';

export const ENV_OBJECT_TYPE = {
  Unknown: 0,
  MajorWorld: 1,
  MineralPlanetoid: 2,
  GasGiant: 3,
  NebulaField: 4,
  SingularityRift: 5,
  Moon: 6,
  AsteroidBelt: 7,
  AsteroidCluster: 8,
  Comet: 9,
} as const;

export const ENV_COMPONENT_KIND = {
  SolidRock: 0,
  ResourceNode: 1,
  SolidCore: 2,
  CaveMouth: 3,
  CraterNode: 4,
  GasCore: 5,
  GasDeep: 6,
  GasOuter: 7,
  NebulaBlob: 8,
  RiftCore: 9,
  RiftField: 10,
  CometCore: 11,
} as const;

export const DEFAULT_RESOURCE_COLORS: Record<number, string> = {
  1: '#94a3b8', // Metal
  2: '#d97706', // Ore
  3: '#22c55e', // Isotope
  4: '#a855f7', // PlasmaGas
  5: '#38bdf8', // GravitonCore
};

export interface RenderableEnvComponent {
  id: number;
  kind: number;
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  radius: number;
  innerRadius: number;
  isNode: boolean;
  resourceType: number;
  colorHex: string;
}

export interface RenderableEnvObject {
  id: number;
  blueprintId: number;
  objectType: number;
  pos: { x: number; y: number };
  vel: { x: number; y: number };
  angle: number;
  boundingRadius: number;
  parentObjectId: number;
  orbitRadius: number;
  components: RenderableEnvComponent[];
}

const OBJECT_TYPE_STRING_TO_CODE: Record<EnvObjectTypeStr, number> = {
  major_world: ENV_OBJECT_TYPE.MajorWorld,
  mineral_planetoid: ENV_OBJECT_TYPE.MineralPlanetoid,
  gas_giant: ENV_OBJECT_TYPE.GasGiant,
  nebula_field: ENV_OBJECT_TYPE.NebulaField,
  singularity_rift: ENV_OBJECT_TYPE.SingularityRift,
  moon: ENV_OBJECT_TYPE.Moon,
  asteroid_belt: ENV_OBJECT_TYPE.AsteroidBelt,
  asteroid_cluster: ENV_OBJECT_TYPE.AsteroidCluster,
  comet: ENV_OBJECT_TYPE.Comet,
};

const COMP_KIND_STRING_TO_CODE: Record<EnvComponentKindStr, number> = {
  solid_rock: ENV_COMPONENT_KIND.SolidRock,
  resource_node: ENV_COMPONENT_KIND.ResourceNode,
  solid_core: ENV_COMPONENT_KIND.SolidCore,
  cave_mouth: ENV_COMPONENT_KIND.CaveMouth,
  crater_node: ENV_COMPONENT_KIND.CraterNode,
  gas_core: ENV_COMPONENT_KIND.GasCore,
  gas_deep: ENV_COMPONENT_KIND.GasDeep,
  gas_outer: ENV_COMPONENT_KIND.GasOuter,
  nebula_blob: ENV_COMPONENT_KIND.NebulaBlob,
  rift_core: ENV_COMPONENT_KIND.RiftCore,
  rift_field: ENV_COMPONENT_KIND.RiftField,
  comet_core: ENV_COMPONENT_KIND.CometCore,
};

const RESOURCE_KEY_TO_CODE: Record<string, number> = {
  metal: 1,
  ore: 2,
  isotope: 3,
  plasma_gas: 4,
  graviton_core: 5,
};

export function isSoftEnvLayer(objectType: number): boolean {
  return (
    objectType === ENV_OBJECT_TYPE.NebulaField ||
    objectType === ENV_OBJECT_TYPE.GasGiant ||
    objectType === ENV_OBJECT_TYPE.SingularityRift
  );
}

export function drawRockPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  seed: number
): void {
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

export function drawEnvObject(
  ctx: CanvasRenderingContext2D,
  obj: RenderableEnvObject,
  parentById: Map<number, RenderableEnvObject>,
  colorByResourceEnum: Record<number, string>,
  now: number,
  arenaW: number,
  arenaH: number
): void {
  // Draw orbital path ring for orbiting moons
  if (obj.parentObjectId > 0 && obj.orbitRadius > 0) {
    const parent = parentById.get(obj.parentObjectId);
    if (parent) {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.24)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.arc(parent.pos.x, parent.pos.y, obj.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Comet dashed full-arena radar trajectory warning line + luminous ice tail
  if (obj.objectType === ENV_OBJECT_TYPE.Comet) {
    const spd = Math.hypot(obj.vel.x, obj.vel.y);
    if (spd > 0.2) {
      const nx = obj.vel.x / spd;
      const ny = obj.vel.y / spd;
      const maxSpan = Math.hypot(arenaW, arenaH);

      ctx.save();
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(obj.pos.x, obj.pos.y);
      ctx.lineTo(obj.pos.x + nx * maxSpan, obj.pos.y + ny * maxSpan);
      ctx.stroke();
      ctx.setLineDash([]);

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
      case ENV_COMPONENT_KIND.NebulaBlob: {
        const base = c.colorHex || '#7c3aed';
        const ng = ctx.createRadialGradient(
          c.pos.x,
          c.pos.y,
          c.radius * 0.12,
          c.pos.x,
          c.pos.y,
          c.radius
        );
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

      case ENV_COMPONENT_KIND.GasOuter:
      case ENV_COMPONENT_KIND.GasDeep:
      case ENV_COMPONENT_KIND.GasCore: {
        const col =
          c.colorHex ||
          (c.kind === ENV_COMPONENT_KIND.GasCore
            ? '#581c87'
            : c.kind === ENV_COMPONENT_KIND.GasDeep
            ? '#7e22ce'
            : '#c084fc');
        const g = ctx.createRadialGradient(
          c.pos.x,
          c.pos.y,
          c.innerRadius * 0.6,
          c.pos.x,
          c.pos.y,
          c.radius
        );
        if (c.kind === ENV_COMPONENT_KIND.GasCore) {
          g.addColorStop(0, '#3b0764');
          g.addColorStop(1, `${col}dd`);
        } else if (c.kind === ENV_COMPONENT_KIND.GasDeep) {
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
        ctx.strokeStyle = c.kind === ENV_COMPONENT_KIND.GasCore ? '#f43f5e' : `${col}99`;
        ctx.lineWidth = c.kind === ENV_COMPONENT_KIND.GasCore ? 3 : 1.8;
        ctx.stroke();
        break;
      }

      case ENV_COMPONENT_KIND.RiftField: {
        const pulse = 0.94 + 0.06 * Math.sin(now * 0.006 + obj.id);
        const rg = ctx.createRadialGradient(
          c.pos.x,
          c.pos.y,
          c.innerRadius,
          c.pos.x,
          c.pos.y,
          c.radius * pulse
        );
        rg.addColorStop(0, 'rgba(56, 189, 248, 0.36)');
        rg.addColorStop(0.6, 'rgba(139, 92, 246, 0.16)');
        rg.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Refraction ripple rings
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const frac = (now * 0.0005 + rIdx * 0.5) % 1;
          const ringR = c.innerRadius + (c.radius - c.innerRadius) * frac;
          ctx.strokeStyle = `rgba(125, 211, 252, ${0.48 * (1 - frac)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(c.pos.x, c.pos.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case ENV_COMPONENT_KIND.RiftCore: {
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

      case ENV_COMPONENT_KIND.CometCore: {
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

      case ENV_COMPONENT_KIND.SolidCore: {
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

      case ENV_COMPONENT_KIND.CaveMouth:
      case ENV_COMPONENT_KIND.CraterNode: {
        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = c.isNode ? resColor : '#94a3b8';
        ctx.lineWidth = c.isNode ? 2.8 : 2;
        if (c.isNode) {
          ctx.shadowColor = resColor;
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.arc(c.pos.x, c.pos.y, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (c.isNode) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = resColor;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(c.pos.x, c.pos.y, Math.max(5, c.radius * 0.42), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      default: {
        // SolidRock, ResourceNode
        if (c.isNode) {
          ctx.shadowColor = resColor;
          ctx.shadowBlur = 20;
        }
        drawRockPolygon(ctx, c.pos.x, c.pos.y, c.radius, c.id);
        ctx.fillStyle =
          c.isNode
            ? '#1e293b'
            : obj.objectType === ENV_OBJECT_TYPE.AsteroidBelt
            ? '#1e293b'
            : '#2d3748';
        ctx.fill();
        ctx.lineWidth = c.isNode ? 2.8 : 2;
        ctx.strokeStyle = c.isNode
          ? resColor
          : obj.objectType === ENV_OBJECT_TYPE.AsteroidBelt
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

export function drawEnvLayer(
  ctx: CanvasRenderingContext2D,
  envObjects: RenderableEnvObject[],
  layer: 'soft' | 'solid' | 'all',
  now: number,
  arenaW: number,
  arenaH: number,
  colorByResourceEnum: Record<number, string> = DEFAULT_RESOURCE_COLORS
): void {
  if (!envObjects || envObjects.length === 0) return;

  const parentById = new Map<number, RenderableEnvObject>();
  for (const eo of envObjects) parentById.set(eo.id, eo);

  for (const eo of envObjects) {
    const soft = isSoftEnvLayer(eo.objectType);
    if (layer === 'soft' && !soft) continue;
    if (layer === 'solid' && soft) continue;
    drawEnvObject(ctx, eo, parentById, colorByResourceEnum, now, arenaW, arenaH);
  }
}

export function drawStealthRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(192, 132, 252, 0.72)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawEnvObjectsOnRadar(
  radarCtx: CanvasRenderingContext2D,
  envObjects: RenderableEnvObject[],
  scaleX: number,
  scaleY: number,
  isVisible?: (x: number, y: number) => boolean
): void {
  if (!envObjects || envObjects.length === 0) return;

  for (const eo of envObjects) {
    if (isVisible && !isVisible(eo.pos.x, eo.pos.y)) continue;
    const rx = eo.pos.x * scaleX;
    const ry = eo.pos.y * scaleY;
    const rr = Math.max(2, eo.boundingRadius * scaleX);

    radarCtx.save();
    if (eo.objectType === ENV_OBJECT_TYPE.NebulaField) {
      radarCtx.fillStyle = 'rgba(168, 85, 247, 0.22)';
      radarCtx.strokeStyle = 'rgba(192, 132, 252, 0.55)';
    } else if (eo.objectType === ENV_OBJECT_TYPE.GasGiant) {
      radarCtx.fillStyle = 'rgba(192, 132, 252, 0.25)';
      radarCtx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
    } else if (eo.objectType === ENV_OBJECT_TYPE.SingularityRift) {
      radarCtx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      radarCtx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    } else if (eo.objectType === ENV_OBJECT_TYPE.Comet) {
      radarCtx.fillStyle = '#bae6fd';
      radarCtx.strokeStyle = '#f87171';
    } else {
      radarCtx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      radarCtx.strokeStyle = 'rgba(203, 213, 225, 0.75)';
    }
    radarCtx.lineWidth = 1;
    radarCtx.beginPath();
    radarCtx.arc(rx, ry, rr, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.stroke();
    radarCtx.restore();
  }
}

export function blueprintToRenderableEnvObject(params: {
  id: number;
  blueprint: EnvBlueprint;
  posX: number;
  posY: number;
  scale: number;
  angle: number;
  velX?: number;
  velY?: number;
  parentObjectId?: number;
  orbitRadius?: number;
}): RenderableEnvObject {
  const { id, blueprint, posX, posY, scale, angle, velX = 0, velY = 0, parentObjectId = 0, orbitRadius = 0 } = params;
  const s = scale > 0 ? scale : 1;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const components: RenderableEnvComponent[] = blueprint.components.map((c, idx) => {
    const rdx = (c.dx * cos - c.dy * sin) * s;
    const rdy = (c.dx * sin + c.dy * cos) * s;
    return {
      id: id * 100 + idx + 1,
      kind: COMP_KIND_STRING_TO_CODE[c.kind] ?? ENV_COMPONENT_KIND.SolidRock,
      pos: { x: posX + rdx, y: posY + rdy },
      vel: { x: velX, y: velY },
      radius: c.radius * s,
      innerRadius: (c.inner_radius || 0) * s,
      isNode: c.is_node,
      resourceType: c.pinned_resource ? RESOURCE_KEY_TO_CODE[c.pinned_resource] ?? 0 : 0,
      colorHex: c.color_hex || '',
    };
  });

  return {
    id,
    blueprintId: blueprint.blueprintId,
    objectType: OBJECT_TYPE_STRING_TO_CODE[blueprint.objectType] ?? ENV_OBJECT_TYPE.Unknown,
    pos: { x: posX, y: posY },
    vel: { x: velX, y: velY },
    angle,
    boundingRadius: (blueprint.boundingRadius || 80) * s,
    parentObjectId,
    orbitRadius,
    components,
  };
}
