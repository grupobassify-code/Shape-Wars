/**
 * Shape Wars - Type Definitions & Constants
 */

export type HeroId =
  | 'pulsar'
  | 'volt'
  | 'bastion'
  | 'nova'
  | 'prisma'
  | 'boom'
  | 'eclipse'
  | 'cometa'
  | 'titan'
  | 'vortex';

export const ALL_HERO_IDS: HeroId[] = [
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

export type TeamId = 'blue' | 'red';
export type ShapeType =
  | 'circle'
  | 'triangle'
  | 'square'
  | 'hexagon'
  | 'diamond'
  | 'octagon'
  | 'crescent'
  | 'star'
  | 'shield'
  | 'pentagon';

export type GadgetId =
  | 'mini_turret'
  | 'speed_boost'
  | 'barrier'
  | 'repair_pulse'
  | 'prism_bounce'
  | 'proximity_mine'
  | 'holo_decoy'
  | 'guardian_drone'
  | 'knockback_resist'
  | 'gravity_pulse';

export interface Vector2D {
  x: number;
  y: number;
}

export type HeroCategory = 'Artillería' | 'Asesino' | 'Sniperos' | 'Técnicos' | 'Tanques' | 'Apoyos';

export type HeroRarity = 'Inicial' | 'Especial' | 'Superespecial' | 'Épico' | 'Mítico' | 'Legendario';

export interface RarityConfig {
  id: HeroRarity;
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeGradient: string;
  accentHex: string;
  icon: string;
}

export const RARITY_CONFIG: Record<HeroRarity, RarityConfig> = {
  Inicial: {
    id: 'Inicial',
    label: 'INICIAL',
    textColor: 'text-sky-300',
    bgColor: 'bg-sky-950/70',
    borderColor: 'border-sky-400',
    badgeGradient: 'from-sky-500 to-blue-600',
    accentHex: '#38bdf8',
    icon: '🔷',
  },
  Especial: {
    id: 'Especial',
    label: 'ESPECIAL',
    textColor: 'text-emerald-300',
    bgColor: 'bg-emerald-950/70',
    borderColor: 'border-emerald-400',
    badgeGradient: 'from-emerald-500 to-green-600',
    accentHex: '#34d399',
    icon: '🟢',
  },
  Superespecial: {
    id: 'Superespecial',
    label: 'SUPERESPECIAL',
    textColor: 'text-blue-300',
    bgColor: 'bg-blue-950/70',
    borderColor: 'border-blue-400',
    badgeGradient: 'from-blue-500 to-indigo-600',
    accentHex: '#60a5fa',
    icon: '🔵',
  },
  Épico: {
    id: 'Épico',
    label: 'ÉPICO',
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-950/70',
    borderColor: 'border-purple-400',
    badgeGradient: 'from-purple-500 to-fuchsia-600',
    accentHex: '#c084fc',
    icon: '🟣',
  },
  Mítico: {
    id: 'Mítico',
    label: 'MÍTICO',
    textColor: 'text-rose-300',
    bgColor: 'bg-rose-950/70',
    borderColor: 'border-rose-500',
    badgeGradient: 'from-rose-500 to-red-600',
    accentHex: '#f43f5e',
    icon: '🔴',
  },
  Legendario: {
    id: 'Legendario',
    label: 'LEGENDARIO',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-950/70',
    borderColor: 'border-amber-400',
    badgeGradient: 'from-amber-400 via-yellow-500 to-orange-500',
    accentHex: '#fbbf24',
    icon: '🟡',
  },
};

export interface CategoryConfig {
  id: HeroCategory;
  label: string;
  icon: string;
  color: string;
  badgeBg: string;
  description: string;
}

export const CATEGORY_CONFIG: Record<HeroCategory, CategoryConfig> = {
  Artillería: {
    id: 'Artillería',
    label: 'Artillería',
    icon: '🎯',
    color: 'text-orange-400 border-orange-400/40 bg-orange-950/40',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    description: 'Dispara proyectiles en arco por encima de muros con gran impacto de área.',
  },
  Asesino: {
    id: 'Asesino',
    label: 'Asesino',
    icon: '⚡',
    color: 'text-purple-400 border-purple-400/40 bg-purple-950/40',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Velocidad supersónica, sigilo letal y capacidad de emboscada implacable.',
  },
  Sniperos: {
    id: 'Sniperos',
    label: 'Sniperos',
    icon: '🏹',
    color: 'text-sky-400 border-sky-400/40 bg-sky-950/40',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: 'Tiradores de largo alcance con división de proyectiles o perforación balística.',
  },
  Técnicos: {
    id: 'Técnicos',
    label: 'Técnicos',
    icon: '⚙️',
    color: 'text-cyan-400 border-cyan-400/40 bg-cyan-950/40',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Control estratégico del mapa mediante torretas defensivas y fuego sostenido.',
  },
  Tanques: {
    id: 'Tanques',
    label: 'Tanques',
    icon: '🛡️',
    color: 'text-emerald-400 border-emerald-400/40 bg-emerald-950/40',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Alta salud, escudos de absorción masiva e inmunidad ante empujes físicos.',
  },
  Apoyos: {
    id: 'Apoyos',
    label: 'Apoyos',
    icon: '✨',
    color: 'text-fuchsia-400 border-fuchsia-400/40 bg-fuchsia-950/40',
    badgeBg: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    description: 'Restaura y regenera salud a los compañeros de escuadrón en batalla.',
  },
};

export interface GadgetDefinition {
  id: GadgetId;
  name: string;
  description: string;
  maxCharges: number;
  cooldown: number; // in seconds (updated to 13s-16s)
  duration?: number;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  shape: ShapeType;
  title: string;
  role: string;
  category: HeroCategory;
  rarity: HeroRarity;
  avatarUrl: string;
  baseHp: number;
  baseSpeed: number;
  baseDamage: number;
  attackCooldown: number; // in seconds
  range: number;          // in virtual arena units
  projectileSpeed: number;
  projectileRadius: number;
  projectileColor: string;
  superName: string;
  superDescription: string;
  gadget: GadgetDefinition;
  isLobbed?: boolean;     // Artillery arc over walls
  splitsOnEnd?: boolean;  // Splits into 2 projectiles at end
  splitCount?: number;
  accentColor: string;
  primaryColor: string;
  darkColor: string;
  unlockCost: number;     // legacy coins
  kronusCost: number;     // Kronus cost to unlock
}

export const HERO_DEFINITIONS: Record<HeroId, HeroDefinition> = {
  pulsar: {
    id: 'pulsar',
    name: 'Pulsar',
    shape: 'circle',
    title: 'El Cañonero Cuántico',
    role: 'Atacante a Distancia Equilibrado',
    category: 'Técnicos',
    rarity: 'Inicial',
    avatarUrl: '/src/assets/images/hero_pulsar_portrait_1791566427575.jpg',
    baseHp: 100,
    baseSpeed: 170,
    baseDamage: 20,
    attackCooldown: 0.6,
    range: 300,
    projectileSpeed: 520,
    projectileRadius: 8,
    projectileColor: '#38bdf8', // sky-400
    superName: 'Ráfaga Penta-Dispersa',
    superDescription: 'Dispara un abanico frontal de 5 proyectiles de alta energía. Cada proyectil causa 15 de daño.',
    gadget: {
      id: 'mini_turret',
      name: 'Mini-Torreta',
      description: 'Despliega una torreta automática con 45 PS que vigila y dispara a rivales visibles durante 9s.',
      maxCharges: 2,
      cooldown: 14.0,
      duration: 9.0,
    },
    accentColor: '#38bdf8',
    primaryColor: '#0284c7',
    darkColor: '#0369a1',
    unlockCost: 0,
    kronusCost: 0, // Unlocked initially
  },
  volt: {
    id: 'volt',
    name: 'Volt',
    shape: 'triangle',
    title: 'El Relámpago Afilado',
    role: 'Atacante Veloz y Agresivo',
    category: 'Asesino',
    rarity: 'Superespecial',
    avatarUrl: '/src/assets/images/hero_volt_portrait_1791566440706.jpg',
    baseHp: 85,
    baseSpeed: 210,
    baseDamage: 16,
    attackCooldown: 0.5,
    range: 220,
    projectileSpeed: 580,
    projectileRadius: 7,
    projectileColor: '#fbbf24', // amber-400
    superName: 'Embestida Relámpago',
    superDescription: 'Embestida supersónica en línea recta que inflige 38 de daño de contacto y desorienta. Se detiene ante muros.',
    gadget: {
      id: 'speed_boost',
      name: 'Impulso Electrónico',
      description: 'Sobrecarga de velocidad (+55% durante 2.8s) para flanquear o eludir fuego enemigo.',
      maxCharges: 2,
      cooldown: 13.0,
      duration: 2.8,
    },
    accentColor: '#facc15',
    primaryColor: '#eab308',
    darkColor: '#ca8a04',
    unlockCost: 150,
    kronusCost: 40,
  },
  bastion: {
    id: 'bastion',
    name: 'Bastion',
    shape: 'square',
    title: 'La Fortaleza Geométrica',
    role: 'Tanque Defensivo Pesado',
    category: 'Tanques',
    rarity: 'Especial',
    avatarUrl: '/src/assets/images/hero_bastion_portrait_1791566451816.jpg',
    baseHp: 150,
    baseSpeed: 135,
    baseDamage: 22,
    attackCooldown: 0.8,
    range: 190,
    projectileSpeed: 440,
    projectileRadius: 10,
    projectileColor: '#34d399', // emerald-400
    superName: 'Baluarte de Adamantio',
    superDescription: 'Genera un escudo de aleación pesada que reduce todo el daño recibido en un 65% durante 4.5 segundos.',
    gadget: {
      id: 'barrier',
      name: 'Barrera Reactiva',
      description: 'Activa una barrera defensiva temporal que reduce el daño recibido un 45% durante 3.5s.',
      maxCharges: 2,
      cooldown: 15.0,
      duration: 3.5,
    },
    accentColor: '#34d399',
    primaryColor: '#10b981',
    darkColor: '#059669',
    unlockCost: 0,
    kronusCost: 0, // Unlocked initially
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    shape: 'hexagon',
    title: 'La Guardiana Resonante',
    role: 'Apoyo Táctico y Restauración',
    category: 'Apoyos',
    rarity: 'Especial',
    avatarUrl: '/src/assets/images/hero_nova_portrait_1791566461364.jpg',
    baseHp: 105,
    baseSpeed: 160,
    baseDamage: 14,
    attackCooldown: 0.7,
    range: 260,
    projectileSpeed: 490,
    projectileRadius: 8,
    projectileColor: '#c084fc', // purple-400
    superName: 'Pulso de Regeneración',
    superDescription: 'Emite una onda armónica que restaura 42 de salud a todos los aliados cercanos sin superar su salud máxima.',
    gadget: {
      id: 'repair_pulse',
      name: 'Pulso Reparador',
      description: 'Emite un pulso instantáneo que restaura 30 PS a aliados vivos cercanos (radio 210u).',
      maxCharges: 2,
      cooldown: 14.0,
    },
    accentColor: '#c084fc',
    primaryColor: '#a855f7',
    darkColor: '#9333ea',
    unlockCost: 180,
    kronusCost: 50,
  },
  prisma: {
    id: 'prisma',
    name: 'Prisma',
    shape: 'diamond',
    title: 'El Cristal Omnidireccional',
    role: 'Tirador de Control Táctico',
    category: 'Sniperos',
    rarity: 'Superespecial',
    avatarUrl: '/src/assets/images/hero_prisma_portrait_1791572925320.jpg',
    baseHp: 95,
    baseSpeed: 165,
    baseDamage: 15,
    attackCooldown: 0.65,
    range: 290,
    projectileSpeed: 520,
    projectileRadius: 7,
    projectileColor: '#38bdf8',
    splitsOnEnd: true,
    splitCount: 2,
    superName: 'Barrera Refractaria',
    superDescription: 'Despliega una barrera cristalina temporal de 70 PS que intercepta y desintegra proyectiles enemigos durante 5s.',
    gadget: {
      id: 'prism_bounce',
      name: 'Rebote Prismático',
      description: 'Imbuye tus 2 siguientes ataques con resonancia reflectiva, permitiendo que reboten una vez en muros.',
      maxCharges: 2,
      cooldown: 14.0,
      duration: 5.0,
    },
    accentColor: '#67e8f9',
    primaryColor: '#06b6d4',
    darkColor: '#0891b2',
    unlockCost: 200,
    kronusCost: 60,
  },
  boom: {
    id: 'boom',
    name: 'Boom',
    shape: 'octagon',
    title: 'El Maestro de Demoliciones',
    role: 'Especialista en Daño de Área',
    category: 'Artillería',
    rarity: 'Épico',
    avatarUrl: '/src/assets/images/hero_boom_portrait_1791572941838.jpg',
    baseHp: 110,
    baseSpeed: 155,
    baseDamage: 28,
    attackCooldown: 0.85,
    range: 280,
    projectileSpeed: 380,
    projectileRadius: 10,
    projectileColor: '#fb923c',
    isLobbed: true, // Parabolas over walls like Tick / Sprout
    superName: 'Bombardeo de Racimo',
    superDescription: 'Lanza una descarga de 4 bombas aéreas que vuelan sobre muros y detonan en cascada con daño de área de 24 cada una.',
    gadget: {
      id: 'proximity_mine',
      name: 'Mina Táctica',
      description: 'Coloca una mina camuflada que detecta enemigos cercanos en un radio de 50u y detona causando 35 de daño en área.',
      maxCharges: 2,
      cooldown: 15.0,
      duration: 14.0,
    },
    accentColor: '#fb923c',
    primaryColor: '#ea580c',
    darkColor: '#c2410c',
    unlockCost: 220,
    kronusCost: 70,
  },
  eclipse: {
    id: 'eclipse',
    name: 'Eclipse',
    shape: 'crescent',
    title: 'La Sombra Penumbrosa',
    role: 'Asesino de Sigilo y Velocidad',
    category: 'Asesino',
    rarity: 'Mítico',
    avatarUrl: '/src/assets/images/hero_eclipse_portrait_1791572961839.jpg',
    baseHp: 80,
    baseSpeed: 215,
    baseDamage: 18,
    attackCooldown: 0.42,
    range: 175,
    projectileSpeed: 590,
    projectileRadius: 6,
    projectileColor: '#a78bfa',
    superName: 'Paso Sombrío',
    superDescription: 'Se desvanece en las sombras (+50% velocidad y sigilo total) durante 3.2s, haciéndose casi indetectable por bots y rivales.',
    gadget: {
      id: 'holo_decoy',
      name: 'Señuelo Umbrío',
      description: 'Proyecta un señuelo holográfico con 40 PS que avanza hacia el rival más cercano y distrae los disparos de la IA durante 6s.',
      maxCharges: 2,
      cooldown: 14.0,
      duration: 6.0,
    },
    accentColor: '#a78bfa',
    primaryColor: '#7c3aed',
    darkColor: '#6d28d9',
    unlockCost: 250,
    kronusCost: 80,
  },
  cometa: {
    id: 'cometa',
    name: 'Cometa',
    shape: 'star',
    title: 'El Mensajero Estelar',
    role: 'Tirador y Rastreo Guiado',
    category: 'Sniperos',
    rarity: 'Épico',
    avatarUrl: '/src/assets/images/hero_cometa_portrait_1791572980833.jpg',
    baseHp: 100,
    baseSpeed: 175,
    baseDamage: 22,
    attackCooldown: 0.65,
    range: 330,
    projectileSpeed: 600,
    projectileRadius: 7,
    projectileColor: '#2dd4bf',
    superName: 'Lluvia de Meteoros',
    superDescription: 'Marca una zona donde caen impactos celestiales orbitales que infligen 30 de daño y revelan a enemigos en arbustos.',
    gadget: {
      id: 'guardian_drone',
      name: 'Dron Guardián',
      description: 'Despliega un dron de escolta que orbita al aliado más cercano (o a sí mismo), reduciendo el daño recibido en 35% por 4.5s.',
      maxCharges: 2,
      cooldown: 14.0,
      duration: 4.5,
    },
    accentColor: '#2dd4bf',
    primaryColor: '#0d9488',
    darkColor: '#0f766e',
    unlockCost: 280,
    kronusCost: 90,
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    shape: 'shield',
    title: 'El Coloso Imparable',
    role: 'Tanque Pesado y Empuje',
    category: 'Tanques',
    rarity: 'Mítico',
    avatarUrl: '/src/assets/images/hero_titan_portrait_1791572997975.jpg',
    baseHp: 180,
    baseSpeed: 125,
    baseDamage: 32,
    attackCooldown: 0.95,
    range: 160,
    projectileSpeed: 420,
    projectileRadius: 12,
    projectileColor: '#f97316',
    superName: 'Onda Tectónica',
    superDescription: 'Emite una gigantesca onda de choque sísmica radial que causa 35 de daño y empuja violentamente hacia atrás a los rivales.',
    gadget: {
      id: 'knockback_resist',
      name: 'Estabilizador Pesado',
      description: 'Activa un anclaje inercial que anula el empuje recibido y reduce el daño entrante un 30% durante 4s.',
      maxCharges: 2,
      cooldown: 16.0,
      duration: 4.0,
    },
    accentColor: '#fb923c',
    primaryColor: '#78716c',
    darkColor: '#57534e',
    unlockCost: 300,
    kronusCost: 100,
  },
  vortex: {
    id: 'vortex',
    name: 'Vortex',
    shape: 'pentagon',
    title: 'El Maestro Gravitatorio',
    role: 'Control de Campo y Singularidad',
    category: 'Artillería',
    rarity: 'Legendario',
    avatarUrl: '/src/assets/images/hero_vortex_portrait_1791573029213.jpg',
    baseHp: 95,
    baseSpeed: 160,
    baseDamage: 24,
    attackCooldown: 0.72,
    range: 280,
    projectileSpeed: 450,
    projectileRadius: 9,
    projectileColor: '#e879f9',
    isLobbed: true, // Vortex also launches gravitational singularity orbs over terrain
    superName: 'Singularidad Gravitatoria',
    superDescription: 'Genera un agujero negro que succiona y atrae a los rivales hacia su centro mientras inflige daño continuo durante 3.5s.',
    gadget: {
      id: 'gravity_pulse',
      name: 'Pulso de Inversión',
      description: 'Emite una distorsión gravitacional de 140u que repele y ralentiza a los enemigos cercanos un 45% durante 2.5s.',
      maxCharges: 2,
      cooldown: 15.0,
      duration: 2.5,
    },
    accentColor: '#e879f9',
    primaryColor: '#c026d3',
    darkColor: '#a21caf',
    unlockCost: 320,
    kronusCost: 120,
  },
};

export interface DeployedTurret {
  id: string;
  ownerId: string;
  team: TeamId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  duration: number;
  timeRemaining: number;
  range: number;
  damage: number;
  attackCooldown: number;
  cooldownTimer: number;
  aimAngle: number;
  damageFlashTimer: number;
}

export interface DeployedBarrier {
  id: string;
  ownerId: string;
  team: TeamId;
  x: number;
  y: number;
  angle: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  duration: number;
  timeRemaining: number;
}

export interface DeployedMine {
  id: string;
  ownerId: string;
  team: TeamId;
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  timeRemaining: number;
  triggered: boolean;
  armTimer: number;
}

export interface DeployedDecoy {
  id: string;
  ownerId: string;
  team: TeamId;
  heroId: HeroId;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  duration: number;
  timeRemaining: number;
  aimAngle: number;
  damageFlashTimer: number;
}

export interface DeployedVortex {
  id: string;
  ownerId: string;
  team: TeamId;
  x: number;
  y: number;
  radius: number;
  duration: number;
  timeRemaining: number;
  pulseTimer: number;
  damage: number;
}

export interface DeployedMeteor {
  id: string;
  ownerId: string;
  team: TeamId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  delay: number;
  damage: number;
  exploded: boolean;
}

export interface RectWall {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'wall' | 'pillar';
}

export interface BushZone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface JumpPad {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  targetX: number;
  targetY: number;
  cooldownTimer: number;
  rechargeDuration: number;
}

export interface SpeedPad {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  directionAngle: number;
  boostMultiplier: number;
  boostDuration: number;
}

export interface HealthStation {
  id: string;
  x: number;
  y: number;
  radius: number;
  healRate: number;
  pulseTimer: number;
}

export interface PowerOrb {
  id: string;
  x: number;
  y: number;
  radius: number;
  energyBoost: number;
  isAvailable: boolean;
  respawnTimer: number;
  pulseCycle: number;
}

export interface SpikeTrap {
  id: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  isArmed: boolean;
  rearmTimer: number;
}

export interface CharacterState {
  id: string;
  heroId: HeroId;
  name: string;
  team: TeamId;
  isPlayer: boolean;
  isBot: boolean;
  shape: ShapeType;

  // Transform
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingAngle: number;
  aimAngle: number;

  // Combat Stats (scaled by upgrade levels)
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  range: number;
  cooldownTimer: number;

  // Super Ability
  energy: number;       // 0 - 100
  maxEnergy: number;    // 100

  // Gadget System (2 uses per match)
  gadgetCharges: number;
  gadgetCooldownTimer: number;
  speedBoostTimer: number;
  barrierTimer: number;

  // Hero Specific Buffs & Timers
  stealthTimer: number;          // Eclipse Super
  bounceAttackCharges: number;   // Prisma Gadget
  guardianDroneTimer: number;    // Cometa Gadget
  titanStabilityTimer: number;   // Titan Gadget
  slowTimer: number;             // Vortex Gadget

  // Buffs / Special State
  isDashing: boolean;
  dashDuration: number;
  dashTimer: number;
  dashVx: number;
  dashVy: number;
  dashDamage: number;
  hasHitInDash: Set<string>;

  shieldActive: boolean;
  shieldTimer: number;
  shieldDamageReduction: number; // e.g. 0.65

  // Airborne / Jump Pad State (Maña de Trampolines Cuánticos)
  isAirborne?: boolean;
  jumpStartX?: number;
  jumpStartY?: number;
  jumpTargetX?: number;
  jumpTargetY?: number;
  jumpDuration?: number;
  jumpTimer?: number;
  jumpHeightZ?: number;

  // Arena Modifiers / Mañas
  boostPadTimer?: number;
  spikeSlowTimer?: number;

  // Stealth & Vision
  inBush: boolean;
  currentBushId: string | null;
  revealedTimer: number; // If attacked or dashed recently, revealed for short duration

  // Status
  isAlive: boolean;
  damageFlashTimer: number;
  eliminations: number;
  damageDealt: number;
  respawnTimer?: number;
  outOfCombatTimer: number; // Curación progresiva: seconds since last damage dealt/taken
  regenTickTimer?: number;

  // Animation States (running, recoil/shooting, tilt)
  runCycle?: number;
  recoilTimer?: number;
  recoilAngle?: number;

  // AI specifics
  aiState?: 'SEEK' | 'KITE' | 'ENGAGE' | 'SUPPORT' | 'COVER' | 'DODGE';
  targetId?: string | null;
  aiThinkTimer?: number;
  navWaypoint?: Vector2D | null;
}

export interface Projectile {
  id: string;
  ownerId: string;
  team: TeamId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  maxDistance: number;
  distanceTraveled: number;
  color: string;
  isSuper: boolean;
  shapeType: ShapeType;

  // Special mechanics
  canBounce?: boolean;
  bouncesLeft?: number;
  isExplosive?: boolean;
  explosionRadius?: number;
  isHoming?: boolean;

  // Lobbed / Artillery & Splitting mechanics
  isLobbed?: boolean;
  startX?: number;
  startY?: number;
  targetX?: number;
  targetY?: number;
  flightDuration?: number;
  flightTimer?: number;
  splitsOnEnd?: boolean;
  splitCount?: number;
  hasSplit?: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  scale: number;
}

export interface Particle {
  id?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  alpha: number;
  shape?: 'circle' | 'square' | 'spark';
}

export interface BattleBackgroundDef {
  id: HeroId;
  name: string;
  theme: string;
  gradient: string;
  borderColor: string;
  accentColor: string;
  badgeIcon: string;
  pattern: 'cyber' | 'shield' | 'nebula' | 'prism' | 'thunder' | 'blast' | 'eclipse' | 'comet' | 'colossus' | 'vortex';
}

export const BATTLE_BACKGROUNDS: Record<HeroId, BattleBackgroundDef> = {
  pulsar: {
    id: 'pulsar',
    name: 'Ciberespacio Neón',
    theme: 'Matriz Digital & Rayos Láser',
    gradient: 'from-cyan-950 via-sky-900 to-blue-950',
    borderColor: 'border-sky-400',
    accentColor: '#38bdf8',
    badgeIcon: '⚡',
    pattern: 'cyber',
  },
  bastion: {
    id: 'bastion',
    name: 'Fortaleza de Hierro',
    theme: 'Blindaje Pesado & Remaches',
    gradient: 'from-emerald-950 via-slate-900 to-teal-950',
    borderColor: 'border-emerald-400',
    accentColor: '#34d399',
    badgeIcon: '🛡️',
    pattern: 'shield',
  },
  nova: {
    id: 'nova',
    name: 'Nebulosa Estelar',
    theme: 'Polvo Cósmico & Constelaciones',
    gradient: 'from-purple-950 via-indigo-900 to-fuchsia-950',
    borderColor: 'border-purple-400',
    accentColor: '#c084fc',
    badgeIcon: '✨',
    pattern: 'nebula',
  },
  prisma: {
    id: 'prisma',
    name: 'Refracción Espectral',
    theme: 'Cristal Polifacético & Arcoíris',
    gradient: 'from-rose-950 via-purple-900 to-pink-950',
    borderColor: 'border-pink-400',
    accentColor: '#f472b6',
    badgeIcon: '💎',
    pattern: 'prism',
  },
  volt: {
    id: 'volt',
    name: 'Tormenta de Rayos',
    theme: 'Alto Voltaje & Arcos Eléctricos',
    gradient: 'from-amber-950 via-yellow-900 to-slate-900',
    borderColor: 'border-amber-400',
    accentColor: '#fbbf24',
    badgeIcon: '⚡',
    pattern: 'thunder',
  },
  boom: {
    id: 'boom',
    name: 'Arsenal Demoledor',
    theme: 'Fundición Ígnea & Detonaciones',
    gradient: 'from-red-950 via-orange-950 to-amber-950',
    borderColor: 'border-orange-500',
    accentColor: '#fb923c',
    badgeIcon: '💥',
    pattern: 'blast',
  },
  eclipse: {
    id: 'eclipse',
    name: 'Luna Umbría',
    theme: 'Obsidiana Silenciosa & Niebla',
    gradient: 'from-slate-950 via-purple-950 to-zinc-950',
    borderColor: 'border-violet-500',
    accentColor: '#a78bfa',
    badgeIcon: '🌙',
    pattern: 'eclipse',
  },
  cometa: {
    id: 'cometa',
    name: 'Surco Cósmico',
    theme: 'Estela Helada & Velocidad Luz',
    gradient: 'from-blue-950 via-sky-950 to-indigo-950',
    borderColor: 'border-blue-400',
    accentColor: '#60a5fa',
    badgeIcon: '☄️',
    pattern: 'comet',
  },
  titan: {
    id: 'titan',
    name: 'Coloso Ancestral',
    theme: 'Roca Volcánica & Glifos Dorados',
    gradient: 'from-stone-950 via-amber-950 to-orange-950',
    borderColor: 'border-yellow-600',
    accentColor: '#eab308',
    badgeIcon: '👑',
    pattern: 'colossus',
  },
  vortex: {
    id: 'vortex',
    name: 'Horizonte de Sucesos',
    theme: 'Singularidad & Gravedad Infinita',
    gradient: 'from-fuchsia-950 via-violet-950 to-purple-950',
    borderColor: 'border-fuchsia-500',
    accentColor: '#d946ef',
    badgeIcon: '🌀',
    pattern: 'vortex',
  },
};

export interface KnockoutParticipant {
  id: string;
  heroId: HeroId;
  name: string;
  team: TeamId;
  isPlayer: boolean;
  isAlive: boolean;
  hp: number;
  maxHp: number;
  title?: string;
  badge?: string;
  backgroundId?: HeroId;
  category?: HeroCategory;
  rarity?: HeroRarity;
}

export type GameMode = '3v3' | '1v1' | 'ctf';

export interface FlagState {
  team: TeamId;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  isCarried: boolean;
  carrierId: string | null;
  isDropped: boolean;
  dropTimer: number;
}

export interface TrophyReward {
  trophiesRequired: number;
  coins: number;
  kronus: number;
  title: string;
}

export const TROPHY_ROAD_REWARDS: TrophyReward[] = [
  { trophiesRequired: 15, coins: 80, kronus: 15, title: 'Iniciación Táctica' },
  { trophiesRequired: 30, coins: 120, kronus: 20, title: 'Primer Ascenso' },
  { trophiesRequired: 50, coins: 180, kronus: 30, title: 'Rango Luchador' },
  { trophiesRequired: 75, coins: 220, kronus: 35, title: 'Cofre de Asalto' },
  { trophiesRequired: 100, coins: 300, kronus: 50, title: 'Veterano de Hierro' },
  { trophiesRequired: 150, coins: 400, kronus: 60, title: 'Dominio de Arena' },
  { trophiesRequired: 200, coins: 500, kronus: 75, title: 'Baluarte Cuántico' },
  { trophiesRequired: 250, coins: 600, kronus: 90, title: 'Élite Geométrica' },
  { trophiesRequired: 300, coins: 800, kronus: 120, title: 'Maestro Supremo' },
  { trophiesRequired: 400, coins: 1000, kronus: 160, title: 'Gran Campeón' },
  { trophiesRequired: 500, coins: 1500, kronus: 250, title: 'Leyenda Viva' },
];

export interface KnockoutRoundResult {
  roundNumber: number;
  winnerTeam: TeamId | 'draw';
  blueAlive: number;
  redAlive: number;
}

export interface MatchStats {
  durationSeconds: number;
  result: 'VICTORY' | 'DEFEAT' | 'DRAW';
  playerHeroId: HeroId;
  playerKills: number;
  playerDamage: number;
  blueAlive: number;
  redAlive: number;
  coinsEarned: number;
  kronusEarned?: number;
  // Game Mode
  gameMode?: GameMode;
  // Knockout Best-of-3 Series Stats
  blueRoundsWon: number;
  redRoundsWon: number;
  totalRounds: number;
  rounds: KnockoutRoundResult[];
  participants: KnockoutParticipant[];
}

export interface UserProgress {
  coins: number;
  kronus?: number;             // Premium currency for unlocking heroes
  trophies?: number;
  claimedTrophyRewards?: number[]; // IDs/milestones claimed
  selectedMode?: GameMode;
  playerTag?: string;
  avatarIcon?: string;
  selectedBackground?: HeroId;  // Equipped Brawl Stars style battle card background
  unlockedHeroes: HeroId[];
  heroUpgrades: Record<HeroId, {
    hpLevel: number;      // 1 to 5
    damageLevel: number;  // 1 to 5
    speedLevel: number;   // 1 to 5
  }>;
  selectedHero: HeroId;
  autoAimEnabled: boolean;
  soundEnabled: boolean;
  matchesPlayed: number;
  wins: number;
  losses: number;
}
