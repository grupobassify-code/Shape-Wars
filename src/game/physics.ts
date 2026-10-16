/**
 * Shape Wars - 2D Physics, Collisions & Geometry Math
 */

import { Vector2D, RectWall, CharacterState } from './types';

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

export function distanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function normalize(v: Vector2D): Vector2D {
  const len = Math.hypot(v.x, v.y);
  if (len < 0.0001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Resolves collision between a circular character and an Axis-Aligned Bounding Box (AABB) wall.
 * Returns updated character position with sliding response so character cannot pass or clip inside.
 */
export function resolveCircleWallCollision(
  cx: number,
  cy: number,
  radius: number,
  wall: RectWall
): { x: number; y: number; collided: boolean } {
  // Find closest point on wall to circle center
  const closestX = clamp(cx, wall.x, wall.x + wall.w);
  const closestY = clamp(cy, wall.y, wall.y + wall.h);

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq < radius * radius) {
    const dist = Math.sqrt(distSq);
    if (dist < 0.001) {
      // Circle center inside wall: push out to nearest edge
      const toLeft = Math.abs(cx - wall.x);
      const toRight = Math.abs(cx - (wall.x + wall.w));
      const toTop = Math.abs(cy - wall.y);
      const toBottom = Math.abs(cy - (wall.y + wall.h));
      const minEdge = Math.min(toLeft, toRight, toTop, toBottom);

      if (minEdge === toLeft) return { x: wall.x - radius, y: cy, collided: true };
      if (minEdge === toRight) return { x: wall.x + wall.w + radius, y: cy, collided: true };
      if (minEdge === toTop) return { x: cx, y: wall.y - radius, collided: true };
      return { x: cx, y: wall.y + wall.h + radius, collided: true };
    } else {
      // Push out along normal
      const overlap = radius - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      return {
        x: cx + nx * overlap,
        y: cy + ny * overlap,
        collided: true,
      };
    }
  }

  return { x: cx, y: cy, collided: false };
}

/**
 * Resolves character-to-character soft separation so units do not overlap.
 */
export function resolveCharacterSeparation(c1: CharacterState, c2: CharacterState): void {
  if (!c1.isAlive || !c2.isAlive) return;

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const minDist = c1.radius + c2.radius;
  const distSq = dx * dx + dy * dy;

  if (distSq < minDist * minDist && distSq > 0.0001) {
    const dist = Math.sqrt(distSq);
    const overlap = (minDist - dist) * 0.5;
    const nx = dx / dist;
    const ny = dy / dist;

    c1.x -= nx * overlap;
    c1.y -= ny * overlap;
    c2.x += nx * overlap;
    c2.y += ny * overlap;
  }
}

/**
 * Checks if a line segment between (x1, y1) and (x2, y2) intersects an AABB rectangle.
 * Used for line-of-sight checks and bullet penetration blocking.
 */
export function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  // Liang-Barsky line clipping algorithm
  let t0 = 0.0;
  let t1 = 1.0;
  const dx = x2 - x1;
  const dy = y2 - y1;

  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false; // Parallel and outside
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }

  return t0 <= t1;
}

/**
 * Checks if there is a clear line of sight between two points (not blocked by walls).
 */
export function hasLineOfSight(x1: number, y1: number, x2: number, y2: number, walls: RectWall[]): boolean {
  for (const wall of walls) {
    if (lineIntersectsRect(x1, y1, x2, y2, wall.x, wall.y, wall.w, wall.h)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a circular projectile hits an AABB wall.
 */
export function circleHitsRect(cx: number, cy: number, radius: number, wall: RectWall): boolean {
  const closestX = clamp(cx, wall.x, wall.x + wall.w);
  const closestY = clamp(cy, wall.y, wall.y + wall.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}
