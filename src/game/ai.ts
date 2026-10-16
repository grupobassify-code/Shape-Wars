/**
 * Shape Wars - Tactical Bot AI Engine
 * FSM & Context-Steering for intelligent 3v3 geometric combat.
 */

import { CharacterState, RectWall, Vector2D } from './types';
import { distance, hasLineOfSight, normalize, lineIntersectsRect } from './physics';
import { isCharacterVisibleTo } from './visibility';
import { NAV_WAYPOINTS } from './arena';

export interface AIDecision {
  moveDir: Vector2D;
  aimAngle: number;
  wantsAttack: boolean;
  wantsSuper: boolean;
  wantsGadget: boolean;
}

/**
 * Calculates obstacle avoidance vector by casting feeler rays around obstacles.
 */
function getAvoidanceSteering(bot: CharacterState, targetDir: Vector2D, walls: RectWall[]): Vector2D {
  const feelerDistance = 90;
  const directEnd = {
    x: bot.x + targetDir.x * feelerDistance,
    y: bot.y + targetDir.y * feelerDistance,
  };

  // Check if current desired heading hits any wall
  let hitsWall = false;
  for (const wall of walls) {
    if (lineIntersectsRect(bot.x, bot.y, directEnd.x, directEnd.y, wall.x, wall.y, wall.w, wall.h)) {
      hitsWall = true;
      break;
    }
  }

  if (!hitsWall) {
    return targetDir;
  }

  // Cast lateral test angles (+35, -35, +70, -70, +105, -105) to find clear path
  const testAngles = [0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.4, -2.4];
  const baseAngle = Math.atan2(targetDir.y, targetDir.x);

  for (const offset of testAngles) {
    const testA = baseAngle + offset;
    const testDir = { x: Math.cos(testA), y: Math.sin(testA) };
    const probeEnd = {
      x: bot.x + testDir.x * feelerDistance,
      y: bot.y + testDir.y * feelerDistance,
    };

    let blocked = false;
    for (const wall of walls) {
      if (lineIntersectsRect(bot.x, bot.y, probeEnd.x, probeEnd.y, wall.x, wall.y, wall.w, wall.h)) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      return testDir;
    }
  }

  // If completely pinched, push toward center or nearest nav waypoint
  return targetDir;
}

export function updateBotAI(
  bot: CharacterState,
  allCharacters: CharacterState[],
  walls: RectWall[],
  dt: number
): AIDecision {
  const defaultDecision: AIDecision = {
    moveDir: { x: 0, y: 0 },
    aimAngle: bot.facingAngle,
    wantsAttack: false,
    wantsSuper: false,
    wantsGadget: false,
  };

  if (!bot.isAlive) return defaultDecision;

  // Stagger AI think timer
  bot.aiThinkTimer = (bot.aiThinkTimer || 0) + dt;

  const enemies = allCharacters.filter((c) => c.isAlive && c.team !== bot.team);
  const allies = allCharacters.filter((c) => c.isAlive && c.team === bot.team && c.id !== bot.id);

  // Filter enemies that are actually visible (bush stealth & vision check)
  const visibleEnemies = enemies.filter((e) => isCharacterVisibleTo(e, bot, walls));

  // Target Hysteresis: check if current target is still valid
  let targetEnemy: CharacterState | null = null;
  if (bot.targetId) {
    const existing = visibleEnemies.find((e) => e.id === bot.targetId);
    if (existing && hasLineOfSight(bot.x, bot.y, existing.x, existing.y, walls)) {
      targetEnemy = existing;
    }
  }

  // If no retained target or think cycle elapses, evaluate best target
  if (!targetEnemy || (bot.aiThinkTimer && bot.aiThinkTimer > 0.25)) {
    bot.aiThinkTimer = 0;
    let minScore = Infinity;

    for (const enemy of visibleEnemies) {
      const d = distance(bot.x, bot.y, enemy.x, enemy.y);
      const hasLoS = hasLineOfSight(bot.x, bot.y, enemy.x, enemy.y, walls);

      // Scoring: closer is better, low health is prioritized, lack of LoS penalizes
      let score = d;
      if (!hasLoS) score += 350;
      if (enemy.hp < enemy.maxHp * 0.4) score -= 120; // execute low hp
      if (enemy.isPlayer) score -= 40; // challenge player
      if (enemy.id === bot.targetId) score -= 80; // stickiness hysteresis bonus

      if (score < minScore) {
        minScore = score;
        targetEnemy = enemy;
      }
    }
  }

  bot.targetId = targetEnemy ? targetEnemy.id : null;

  // Fallback: If no visible enemy, pick closest waypoint near enemy side or center
  if (!targetEnemy) {
    const defaultHeadingX = bot.team === 'blue' ? 1 : -1;
    const steer = getAvoidanceSteering(bot, { x: defaultHeadingX, y: 0 }, walls);
    return {
      moveDir: steer,
      aimAngle: Math.atan2(steer.y, steer.x),
      wantsAttack: false,
      wantsSuper: false,
      wantsGadget: false,
    };
  }

  const distToTarget = distance(bot.x, bot.y, targetEnemy.x, targetEnemy.y);
  const hasLoSToTarget = hasLineOfSight(bot.x, bot.y, targetEnemy.x, targetEnemy.y, walls);
  const aimAngle = Math.atan2(targetEnemy.y - bot.y, targetEnemy.x - bot.x);

  let desiredMoveDir: Vector2D = { x: 0, y: 0 };
  let wantsAttack = false;
  let wantsSuper = false;
  let wantsGadget = false;

  // High-Tier Competitive AI: Out-of-Combat progressive healing awareness
  const isLowHp = bot.hp < bot.maxHp * 0.38;
  const isSeekingOutOfCombatRegen = bot.hp < bot.maxHp * 0.55 && (bot.outOfCombatTimer || 0) >= 1.0;
  const canUseGadget = bot.gadgetCooldownTimer <= 0 && bot.gadgetCharges > 0;

  // Role-Specific Tactical Behavior
  if (bot.heroId === 'nova') {
    // NOVA: Tactical Support
    const injuredAlly = allies.find((a) => a.hp < a.maxHp * 0.7);

    // Gadget: Repair pulse if ally or self needs healing
    if (canUseGadget) {
      const alliesInPulse = allies.filter((a) => distance(bot.x, bot.y, a.x, a.y) <= 210 && a.hp < a.maxHp * 0.75);
      if (alliesInPulse.length > 0 || bot.hp < bot.maxHp * 0.6) {
        wantsGadget = true;
      }
    }

    // Super check: Heal if ally or self needs healing and within pulse radius (220)
    if (bot.energy >= 100) {
      const alliesInHealRadius = allies.filter(
        (a) => distance(bot.x, bot.y, a.x, a.y) <= 220 && a.hp < a.maxHp * 0.85
      );
      if (alliesInHealRadius.length > 0 || bot.hp < bot.maxHp * 0.5) {
        wantsSuper = true;
      }
    }

    if (injuredAlly && distance(bot.x, bot.y, injuredAlly.x, injuredAlly.y) > 120) {
      desiredMoveDir = normalize({ x: injuredAlly.x - bot.x, y: injuredAlly.y - bot.y });
    } else {
      if (distToTarget < 170) {
        desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
      } else if (distToTarget > 240) {
        desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
      } else {
        desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
      }
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'bastion') {
    // BASTION: Tank Frontliner
    if (canUseGadget && (bot.hp < bot.maxHp * 0.7 || distToTarget <= 190)) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && (distToTarget <= 220 || bot.hp < bot.maxHp * 0.75)) {
      wantsSuper = true;
    }

    if (distToTarget > 120) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'volt') {
    // VOLT: Fast Assassin
    if (canUseGadget && (distToTarget > 180 || isLowHp)) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && distToTarget <= 280 && hasLoSToTarget) {
      wantsSuper = true;
    }

    if (isLowHp) {
      desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
    } else if (distToTarget > 140) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'prisma') {
    // PRISMA: Precision Control Marksman
    if (canUseGadget && (distToTarget <= 260 || !hasLoSToTarget)) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && distToTarget <= 280) {
      wantsSuper = true;
    }

    if (distToTarget < 190) {
      desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
    } else if (distToTarget > 270) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'boom') {
    // BOOM: Area Demolition Specialist
    if (canUseGadget && distToTarget <= 230) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && distToTarget <= 270) {
      wantsSuper = true;
    }

    if (distToTarget < 170) {
      desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
    } else if (distToTarget > 250) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'eclipse') {
    // ECLIPSE: Shadow Stealth Assassin
    if (canUseGadget && (isLowHp || distToTarget <= 160)) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && (distToTarget <= 240 || isLowHp)) {
      wantsSuper = true;
    }

    if (isLowHp) {
      desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
    } else if (distToTarget > 110) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'cometa') {
    // COMETA: Guided Celestial Support
    const injuredAlly = allies.find((a) => a.hp < a.maxHp * 0.7);
    if (canUseGadget && (injuredAlly || bot.hp < bot.maxHp * 0.75)) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && distToTarget <= 310) {
      wantsSuper = true;
    }

    if (distToTarget < 200) {
      desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
    } else if (distToTarget > 290) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'titan') {
    // TITAN: Unstoppable Heavy Frontline Colossus
    if (canUseGadget && (bot.hp < bot.maxHp * 0.8 || distToTarget <= 150)) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && distToTarget <= 170) {
      wantsSuper = true;
    }

    // Always marches directly toward enemy
    desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else if (bot.heroId === 'vortex') {
    // VORTEX: Gravitational Controller
    if (canUseGadget && distToTarget <= 150) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && distToTarget <= 270) {
      wantsSuper = true;
    }

    if (distToTarget < 170) {
      desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
    } else if (distToTarget > 250) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  } else {
    // PULSAR: Balanced Ranged Shooter
    if (canUseGadget && distToTarget <= 280 && hasLoSToTarget) {
      wantsGadget = true;
    }
    if (bot.energy >= 100 && distToTarget <= 320 && hasLoSToTarget) {
      wantsSuper = true;
    }

    if (distToTarget < 200) {
      desiredMoveDir = normalize({ x: bot.x - targetEnemy.x, y: bot.y - targetEnemy.y });
    } else if (distToTarget > 280) {
      desiredMoveDir = normalize({ x: targetEnemy.x - bot.x, y: targetEnemy.y - bot.y });
    } else {
      desiredMoveDir = normalize({ x: -(targetEnemy.y - bot.y), y: targetEnemy.x - bot.x });
    }

    if (hasLoSToTarget && distToTarget <= bot.range && bot.cooldownTimer <= 0) {
      wantsAttack = true;
    }
  }

  // If seeking out-of-combat regeneration and already inside bush or safe distance, hold fire to avoid giving away stealth
  if (isSeekingOutOfCombatRegen && bot.inBush && distToTarget > 140) {
    wantsAttack = false;
  }

  // Smooth obstacle avoidance steering
  const finalMoveDir = getAvoidanceSteering(bot, desiredMoveDir, walls);

  return {
    moveDir: finalMoveDir,
    aimAngle,
    wantsAttack,
    wantsSuper,
    wantsGadget,
  };
}
