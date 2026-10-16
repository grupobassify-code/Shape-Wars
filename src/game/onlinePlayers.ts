/**
 * Shape Wars - Online Player Directory & Matchmaker Generator
 * Generates believable, high-tier competitive player profiles with clans,
 * regional servers, flags, and skill rankings for authentic 1v1 and 3v3 online play.
 */

import { HeroId, ALL_HERO_IDS, HERO_DEFINITIONS, HeroRarity, HeroCategory } from './types';

export interface OnlinePlayerProfile {
  id: string;
  name: string;
  clan: string;
  flag: string;
  countryName: string;
  heroId: HeroId;
  heroPowerLevel: number;
  trophies: number;
  rankTitle: string;
  winRate: number;
  pingMs: number;
  avatarIcon: HeroId;
  serverRegion: string;
  badgeRarity?: HeroRarity;
  category?: HeroCategory;
}

// Regional pool for authentic competitive feel
const REGIONS: Array<{ country: string; flag: string; region: string; clans: string[] }> = [
  {
    country: 'México',
    flag: '🇲🇽',
    region: 'LATAM Norte (CDMX)',
    clans: ['[MX] Furia Azteca', '[MX] Gladiadores CDMX', '[MX] Guerreros Águila', '[LATAM] Nova Force'],
  },
  {
    country: 'Argentina',
    flag: '🇦🇷',
    region: 'LATAM Sur (Buenos Aires)',
    clans: ['[ARG] Legión Astral', '[ARG] CyberPampa', '[SUD] Alianza Celeste'],
  },
  {
    country: 'España',
    flag: '🇪🇸',
    region: 'Europa Sur (Madrid)',
    clans: ['[ESP] Titanes Reales', '[ESP] Furia Roja', '[EU] Apex Squad'],
  },
  {
    country: 'Colombia',
    flag: '🇨🇴',
    region: 'LATAM Central (Bogotá)',
    clans: ['[COL] CyberSquad', '[COL] Cafeteros Gaming', '[ANDES] Fuerza Cóndor'],
  },
  {
    country: 'Chile',
    flag: '🇨🇱',
    region: 'LATAM Sur (Santiago)',
    clans: ['[CHL] Cóndor Élite', '[CHL] Rayo Andino'],
  },
  {
    country: 'Perú',
    flag: '🇵🇪',
    region: 'LATAM Central (Lima)',
    clans: ['[PER] Inka Warriors', '[PER] Imperio Solar'],
  },
  {
    country: 'Estados Unidos',
    flag: '🇺🇸',
    region: 'Norteamérica (Dallas)',
    clans: ['[US] Apex Shapes', '[NA] Velocity Gaming'],
  },
  {
    country: 'Brasil',
    flag: '🇧🇷',
    region: 'Brasil (São Paulo)',
    clans: ['[BR] Fúria Gamer', '[BR] Estrelas Digitais'],
  },
];

const PLAYER_NAME_PRESETS = [
  'ShadowVortex',
  'NovaSniper_MX',
  'CyberWolf99',
  'AstroPulse',
  'TitanCrush_YT',
  'ElectroVolt',
  'BrawlerKing',
  'Zenith_Gamer',
  'Kakaroto_77',
  'PrismaLord',
  'BorealGhost',
  'SonicBlaster',
  'Ragnarok_Pro',
  'ZeroGravity',
  'NexusStriker',
  'PhantomBlade',
  'CometaRider',
  'BoomBoxer',
  'NightStalker',
  'PixelMaster_9',
  'QuantumDash',
  'FénixDorado',
  'SolarValkyrie',
  'DarkHydra',
];

export function getRankTitle(trophies: number): string {
  if (trophies < 100) return 'Aspirante de Bronce';
  if (trophies < 300) return 'Guerrero de Plata';
  if (trophies < 600) return 'Gladiador de Oro';
  if (trophies < 1000) return 'Maestro de Diamante';
  if (trophies < 1500) return 'Campeón Mítico';
  return 'Leyenda Suprema';
}

/**
 * Generates an authentic rival player profile matched against current user trophies.
 */
export function generateMatchRival(
  userTrophies: number,
  excludeHeroId?: HeroId,
  preferredHeroId?: HeroId
): OnlinePlayerProfile {
  const regionData = REGIONS[Math.floor(Math.random() * REGIONS.length)];
  const nameBase = PLAYER_NAME_PRESETS[Math.floor(Math.random() * PLAYER_NAME_PRESETS.length)];
  const clan = regionData.clans[Math.floor(Math.random() * regionData.clans.length)];

  // Choose rival hero
  let rivalHero: HeroId;
  if (preferredHeroId && preferredHeroId !== excludeHeroId) {
    rivalHero = preferredHeroId;
  } else {
    const pool = ALL_HERO_IDS.filter((h) => h !== excludeHeroId);
    rivalHero = pool[Math.floor(Math.random() * pool.length)] || 'volt';
  }

  const def = HERO_DEFINITIONS[rivalHero];

  // Trophy MMR bracket: around user trophies +- 25, clamped to min 10
  const trophyDelta = Math.floor(Math.random() * 51) - 25;
  const rivalTrophies = Math.max(10, userTrophies + trophyDelta);

  // Power level based on trophies
  const powerLevel = Math.min(5, Math.max(1, Math.round(1 + rivalTrophies / 250)));
  const winRate = Math.floor(48 + Math.random() * 22); // 48% to 70%
  const pingMs = Math.floor(18 + Math.random() * 28); // 18ms to 46ms

  return {
    id: `online_rival_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: nameBase,
    clan,
    flag: regionData.flag,
    countryName: regionData.country,
    heroId: rivalHero,
    heroPowerLevel: powerLevel,
    trophies: rivalTrophies,
    rankTitle: getRankTitle(rivalTrophies),
    winRate,
    pingMs,
    avatarIcon: rivalHero,
    serverRegion: regionData.region,
    badgeRarity: def.rarity,
    category: def.category,
  };
}

/**
 * Generates a full 3v3 team composition (allies and enemies) for team matchmaking.
 */
export function generateTeamCompositions(
  userTrophies: number,
  playerHeroId: HeroId
): { allies: OnlinePlayerProfile[]; rivals: OnlinePlayerProfile[] } {
  const pool = ALL_HERO_IDS.filter((h) => h !== playerHeroId);
  const shuffled = [...pool].sort(() => 0.5 - Math.random());

  const allies: OnlinePlayerProfile[] = [
    generateMatchRival(userTrophies, playerHeroId, shuffled[0]),
    generateMatchRival(userTrophies, playerHeroId, shuffled[1]),
  ];

  const rivals: OnlinePlayerProfile[] = [
    generateMatchRival(userTrophies, undefined, shuffled[2]),
    generateMatchRival(userTrophies, undefined, shuffled[3]),
    generateMatchRival(userTrophies, undefined, shuffled[4]),
  ];

  return { allies, rivals };
}
