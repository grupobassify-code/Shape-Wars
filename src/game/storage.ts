/**
 * Shape Wars - Persistent Storage & Progression Engine
 */

import { HeroId, UserProgress, HERO_DEFINITIONS } from './types';

export type { UserProgress };

const STORAGE_KEY = 'shape_wars_save_v1';

export const MAX_UPGRADE_LEVEL = 5;

// Upgrade costs per tier (Level 2 to Level 5)
export const UPGRADE_COSTS: Record<number, number> = {
  2: 75,
  3: 150,
  4: 260,
  5: 420,
};

// Stat multiplier bonus per level (e.g. Lv 2 = +8%, Lv 5 = +32%)
export function getStatBonusMultiplier(level: number): number {
  return 1 + (level - 1) * 0.08;
}

export function getDefaultProgress(): UserProgress {
  return {
    coins: 200,
    kronus: 50, // Starting Kronus to give players a jumpstart
    trophies: 0,
    claimedTrophyRewards: [],
    selectedMode: '3v3',
    playerTag: '#SHAPE101',
    avatarIcon: 'pulsar',
    unlockedHeroes: ['pulsar', 'bastion'],
    heroUpgrades: {
      pulsar: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      volt: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      bastion: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      nova: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      prisma: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      boom: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      eclipse: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      cometa: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      titan: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
      vortex: { hpLevel: 1, damageLevel: 1, speedLevel: 1 },
    },
    selectedBackground: 'pulsar',
    selectedHero: 'pulsar',
    autoAimEnabled: true,
    soundEnabled: true,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
  };
}

export function loadUserProgress(): UserProgress {
  if (typeof window === 'undefined') return getDefaultProgress();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProgress();

    const parsed = JSON.parse(raw);
    const defaults = getDefaultProgress();

    // Validate and fill missing fields
    const validHeroes: HeroId[] = [
      'pulsar',
      'volt',
      'bastion',
      'nova',
      'prisma',
      'boom',
      'eclipse',
      'cometa',
      'titan',
      'vortex',
    ];
    const unlocked: HeroId[] = Array.isArray(parsed.unlockedHeroes)
      ? parsed.unlockedHeroes.filter((h: string): h is HeroId => validHeroes.includes(h as HeroId))
      : defaults.unlockedHeroes;

    // Ensure initial free heroes are unlocked
    if (!unlocked.includes('pulsar')) unlocked.push('pulsar');
    if (!unlocked.includes('bastion')) unlocked.push('bastion');

    const heroUpgrades = { ...defaults.heroUpgrades };
    validHeroes.forEach((h) => {
      if (parsed.heroUpgrades && parsed.heroUpgrades[h]) {
        heroUpgrades[h] = {
          hpLevel: Math.min(MAX_UPGRADE_LEVEL, Math.max(1, Number(parsed.heroUpgrades[h].hpLevel) || 1)),
          damageLevel: Math.min(MAX_UPGRADE_LEVEL, Math.max(1, Number(parsed.heroUpgrades[h].damageLevel) || 1)),
          speedLevel: Math.min(MAX_UPGRADE_LEVEL, Math.max(1, Number(parsed.heroUpgrades[h].speedLevel) || 1)),
        };
      } else {
        heroUpgrades[h] = { hpLevel: 1, damageLevel: 1, speedLevel: 1 };
      }
    });

    const activeHero = validHeroes.includes(parsed.selectedHero) && unlocked.includes(parsed.selectedHero)
      ? parsed.selectedHero
      : 'pulsar';

    const activeBg = validHeroes.includes(parsed.selectedBackground) && unlocked.includes(parsed.selectedBackground)
      ? parsed.selectedBackground
      : activeHero;

    return {
      coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? parsed.coins : defaults.coins,
      kronus: typeof parsed.kronus === 'number' && parsed.kronus >= 0 ? parsed.kronus : defaults.kronus || 50,
      trophies: typeof parsed.trophies === 'number' && parsed.trophies >= 0 ? parsed.trophies : 0,
      claimedTrophyRewards: Array.isArray(parsed.claimedTrophyRewards) ? parsed.claimedTrophyRewards : [],
      selectedMode: parsed.selectedMode === '1v1' || parsed.selectedMode === 'ctf' ? parsed.selectedMode : '3v3',
      playerTag: typeof parsed.playerTag === 'string' ? parsed.playerTag : defaults.playerTag,
      avatarIcon: validHeroes.includes(parsed.avatarIcon) ? parsed.avatarIcon : 'pulsar',
      selectedBackground: activeBg,
      unlockedHeroes: unlocked,
      heroUpgrades,
      selectedHero: activeHero,
      autoAimEnabled: typeof parsed.autoAimEnabled === 'boolean' ? parsed.autoAimEnabled : true,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      matchesPlayed: Number(parsed.matchesPlayed) || 0,
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
    };
  } catch (err) {
    console.warn('Failed to parse saved progression, restoring defaults', err);
    return getDefaultProgress();
  }
}

export function saveUserProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progression to localStorage', err);
  }
}

export function unlockHeroWithKronus(progress: UserProgress, heroId: HeroId): { success: boolean; progress: UserProgress; message?: string } {
  if (progress.unlockedHeroes.includes(heroId)) {
    return { success: false, progress, message: 'El personaje ya está desbloqueado.' };
  }

  const cost = HERO_DEFINITIONS[heroId].kronusCost || 50;
  const currentKronus = progress.kronus || 0;
  if (currentKronus < cost) {
    return { success: false, progress, message: `Necesitas ${cost} Kronus para desbloquear a este personaje.` };
  }

  const updated: UserProgress = {
    ...progress,
    kronus: currentKronus - cost,
    unlockedHeroes: [...progress.unlockedHeroes, heroId],
    selectedHero: heroId,
  };

  saveUserProgress(updated);
  return { success: true, progress: updated };
}

export function unlockHero(progress: UserProgress, heroId: HeroId): { success: boolean; progress: UserProgress; message?: string } {
  return unlockHeroWithKronus(progress, heroId);
}

export function claimTrophyReward(
  progress: UserProgress,
  trophiesMilestone: number,
  rewardCoins: number,
  rewardKronus: number
): { success: boolean; progress: UserProgress; message?: string } {
  const currentTrophies = progress.trophies || 0;
  const claimed = progress.claimedTrophyRewards || [];

  if (currentTrophies < trophiesMilestone) {
    return { success: false, progress, message: 'Aún no alcanzas las copas necesarias.' };
  }

  if (claimed.includes(trophiesMilestone)) {
    return { success: false, progress, message: 'Esta recompensa ya fue reclamada.' };
  }

  const updated: UserProgress = {
    ...progress,
    coins: progress.coins + rewardCoins,
    kronus: (progress.kronus || 0) + rewardKronus,
    claimedTrophyRewards: [...claimed, trophiesMilestone],
  };

  saveUserProgress(updated);
  return { success: true, progress: updated };
}

export function upgradeHeroStat(
  progress: UserProgress,
  heroId: HeroId,
  stat: 'hp' | 'damage' | 'speed'
): { success: boolean; progress: UserProgress; message?: string } {
  const currentLevels = progress.heroUpgrades[heroId] || { hpLevel: 1, damageLevel: 1, speedLevel: 1 };
  const currentLevel = stat === 'hp' ? currentLevels.hpLevel : stat === 'damage' ? currentLevels.damageLevel : currentLevels.speedLevel;

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return { success: false, progress, message: 'Max level reached' };
  }

  const nextLevel = currentLevel + 1;
  const cost = UPGRADE_COSTS[nextLevel] || 100;

  if (progress.coins < cost) {
    return { success: false, progress, message: 'Not enough coins' };
  }

  const updated: UserProgress = {
    ...progress,
    coins: progress.coins - cost,
    heroUpgrades: {
      ...progress.heroUpgrades,
      [heroId]: {
        ...currentLevels,
        [stat === 'hp' ? 'hpLevel' : stat === 'damage' ? 'damageLevel' : 'speedLevel']: nextLevel,
      },
    },
  };

  saveUserProgress(updated);
  return { success: true, progress: updated };
}

export function applyMatchReward(
  progress: UserProgress,
  result: 'VICTORY' | 'DEFEAT' | 'DRAW',
  eliminations: number
): { coinsEarned: number; kronusEarned: number; updatedProgress: UserProgress } {
  let baseReward = 40;
  if (result === 'VICTORY') baseReward = 100;
  else if (result === 'DRAW') baseReward = 55;

  const killBonus = eliminations * 12;
  const coinsEarned = baseReward + killBonus;
  const kronusEarned = result === 'VICTORY' ? 5 : 0;

  // Brawl Stars style trophies
  const trophyDelta = result === 'VICTORY' ? 8 : result === 'DEFEAT' ? -3 : 2;
  const currentTrophies = progress.trophies || 0;
  const newTrophies = Math.max(0, currentTrophies + trophyDelta);

  const updatedProgress: UserProgress = {
    ...progress,
    coins: progress.coins + coinsEarned,
    kronus: (progress.kronus || 0) + kronusEarned,
    trophies: newTrophies,
    matchesPlayed: progress.matchesPlayed + 1,
    wins: result === 'VICTORY' ? progress.wins + 1 : progress.wins,
    losses: result === 'DEFEAT' ? progress.losses + 1 : progress.losses,
  };

  saveUserProgress(updatedProgress);
  return { coinsEarned, kronusEarned, updatedProgress };
}
