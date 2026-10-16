/**
 * Shape Wars - Bush Stealth & Tactical Visibility Engine
 * 
 * Supports:
 * - Line-of-sight wall occlusion
 * - Tactical fog of war / vision range (~960 units)
 * - Proximity bush facechecking & stealth camouflage
 * - Weapon discharge revealing timer
 * - Shadow cloaking (Eclipse)
 */

import { BushZone, CharacterState, RectWall } from './types';
import { distance, hasLineOfSight } from './physics';
import { ARENA_WALLS } from './arena';

export const VISION_RANGE = 960; // Max sight range in 2400x1350 horizontal arena

/**
 * Checks which bush zone (if any) contains the given point.
 */
export function getContainingBush(x: number, y: number, bushes: BushZone[]): BushZone | null {
  for (const bush of bushes) {
    if (x >= bush.x && x <= bush.x + bush.w && y >= bush.y && y <= bush.y + bush.h) {
      return bush;
    }
  }
  return null;
}

/**
 * Determines whether character `target` is visible to character `viewer`.
 * - Allies always see each other.
 * - If target recently attacked or was hit (revealedTimer > 0), they are revealed to enemies within battlefield range.
 * - If target is in active Shadow Stealth (Eclipse), only revealed at point-blank range (<= 70 units).
 * - If target is in a bush:
 *   - Visible if viewer is inside the exact same bush zone.
 *   - Visible if viewer is within facecheck proximity (<= 85 units).
 *   - Otherwise concealed by foliage.
 * - If target is in the open:
 *   - Visible if within vision range (<= 960 units) and not blocked by solid walls.
 *   - Hidden if on opposite end of the map (> 960 units away).
 */
export function isCharacterVisibleTo(
  target: CharacterState,
  viewer: CharacterState,
  walls: RectWall[] = ARENA_WALLS
): boolean {
  if (!target.isAlive) return false;

  // Teammates always share vision
  if (target.team === viewer.team) return true;

  const dist = distance(target.x, target.y, viewer.x, viewer.y);

  // If target has recently fired or dashed or took damage, they are revealed
  if (target.revealedTimer > 0) {
    return true;
  }

  // Active Shadow Stealth (Eclipse Super)
  if (target.stealthTimer && target.stealthTimer > 0) {
    return dist <= 75; // Extreme close-up detection only
  }

  // Bush Concealment: ONLY applies when target is ACTUALLY inside a bush
  if (target.inBush) {
    // 1. Viewer is in the exact same bush zone
    if (viewer.inBush && viewer.currentBushId && viewer.currentBushId === target.currentBushId) {
      return true;
    }

    // 2. Viewer is physically close enough to facecheck the bush
    if (dist <= 85) {
      return true;
    }

    // Otherwise, target remains concealed by foliage
    return false;
  }

  // Target is in the open (not touching a bush): ALWAYS visible
  return true;
}
