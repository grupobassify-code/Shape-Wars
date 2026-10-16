/**
 * Shape Wars - Authoritative Simulation & Render Engine
 */

import {
  CharacterState,
  HeroId,
  HeroDefinition,
  HERO_DEFINITIONS,
  ALL_HERO_IDS,
  Projectile,
  Particle,
  FloatingText,
  MatchStats,
  UserProgress,
  Vector2D,
  DeployedTurret,
  DeployedBarrier,
  DeployedMine,
  DeployedDecoy,
  DeployedVortex,
  DeployedMeteor,
  KnockoutParticipant,
  KnockoutRoundResult,
  FlagState,
  GameMode,
  JumpPad,
  SpeedPad,
  HealthStation,
  PowerOrb,
  SpikeTrap,
} from './types';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  ARENA_WALLS,
  ARENA_BUSHES,
  ARENA_SPAWNS,
  ARENA_JUMP_PADS,
  ARENA_SPEED_PADS,
  ARENA_HEALTH_STATIONS,
  ARENA_POWER_ORBS,
  ARENA_SPIKE_TRAPS,
} from './arena';
import {
  distance,
  distanceSq,
  resolveCircleWallCollision,
  resolveCharacterSeparation,
  circleHitsRect,
  hasLineOfSight,
  clamp,
} from './physics';
import { getContainingBush, isCharacterVisibleTo } from './visibility';
import { updateBotAI } from './ai';
import { sounds } from './sound';
import { getStatBonusMultiplier } from './storage';
import { OnlinePlayerProfile } from './onlinePlayers';
import { RoomNetworkManager, NetworkPlayerInput, NetworkWorldSnapshot } from './roomNetwork';
import { ARENA_TEXTURES } from '../assets/heroAvatars';

export interface KnockoutUIState {
  timer: number;
  blueAlive: number;
  redAlive: number;
  playerHp: number;
  playerMaxHp: number;
  playerEnergy: number;
  isSuperReady: boolean;
  autoAimActive: boolean;
  autoAimTargetName: string | null;
  playerGadgetCharges: number;
  playerGadgetCooldown: number;
  gadgetName: string;
  // Knockout Best-of-3 Series Fields
  currentRound: number;
  blueRoundsWon: number;
  redRoundsWon: number;
  roundState: 'ROUND_ACTIVE' | 'ROUND_INTERMISSION' | 'MATCH_OVER';
  roundWinnerTeam: 'blue' | 'red' | 'draw' | null;
  roundTransitionTimer: number;
  participants: KnockoutParticipant[];
  cameraWorldPos: Vector2D;
  isSpectating: boolean;
  spectatedAllyName: string | null;
  // Capture the Flag fields
  blueFlag?: FlagState | null;
  redFlag?: FlagState | null;
  blueScore?: number;
  redScore?: number;
  gameMode?: GameMode;
  // Mañas & Arena Modifiers
  activeModifierAlert?: string | null;
  poisonGasDistance?: number;
  isSuddenDeathActive?: boolean;
  powerOrbAvailable?: boolean;
}

export interface EngineCallbacks {
  onMatchEnd: (stats: MatchStats) => void;
  onStateUpdate?: (data: KnockoutUIState) => void;
}

export interface EngineOptions {
  onlineRival?: OnlinePlayerProfile | null;
  onlineAllies?: OnlinePlayerProfile[];
  onlineRivals?: OnlinePlayerProfile[];
  roomNetwork?: RoomNetworkManager | null;
  roomRole?: 'host' | 'client' | null;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;
  private progress: UserProgress;

  // Game Loop
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private matchEnded: boolean = false;

  // Knockout Best-of-3 Series State
  private currentRound: number = 1;
  private blueRoundsWon: number = 0;
  private redRoundsWon: number = 0;
  private roundState: 'ROUND_ACTIVE' | 'ROUND_INTERMISSION' | 'MATCH_OVER' = 'ROUND_ACTIVE';
  private roundWinnerTeam: 'blue' | 'red' | 'draw' | null = null;
  private roundTransitionTimer: number = 0;
  private roundHistory: KnockoutRoundResult[] = [];

  // Capture the Flag (CTF) State
  private blueFlag: FlagState | null = null;
  private redFlag: FlagState | null = null;
  private blueScore: number = 0;
  private redScore: number = 0;

  // Match State
  private matchTimer: number = 90; // 90 seconds per round
  private matchDuration: number = 0;
  private characters: CharacterState[] = [];
  private turrets: DeployedTurret[] = [];
  private barriers: DeployedBarrier[] = [];
  private mines: DeployedMine[] = [];
  private decoys: DeployedDecoy[] = [];
  private vortexes: DeployedVortex[] = [];
  private meteors: DeployedMeteor[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  // Interactive Arena Mechanics & Mañas (Trampolines, Cintas Turbo, Orbes, Trampas, Niebla)
  private jumpPads: JumpPad[] = [];
  private speedPads: SpeedPad[] = [];
  private healthStations: HealthStation[] = [];
  private powerOrbs: PowerOrb[] = [];
  private spikeTraps: SpikeTrap[] = [];
  private poisonGasDistance: number = 0;
  private poisonAlertTriggered: boolean = false;
  private suddenDeathAlertTriggered: boolean = false;
  private activeModifierAlert: string | null = null;
  private modifierAlertTimer: number = 0;
  private ctfRadarTimer: number = 0;

  // Player Input State
  private playerMoveInput: Vector2D = { x: 0, y: 0 };
  private playerMousePos: Vector2D = { x: 1200, y: 675 }; // World coords
  private isMouseDown: boolean = false;
  private autoAimActive: boolean = true;
  private lockedAutoAimTarget: CharacterState | null = null;
  private joystickAimInput: { x: number; y: number; isAiming: boolean; isSuper?: boolean } | null = null;
  private spectateAllyIndex: number = 0;

  // Dynamic Follow Camera & Viewport
  private cameraX: number = 1200; // World coords center
  private cameraY: number = 675;
  private cameraTargetX: number = 1200;
  private cameraTargetY: number = 675;
  private viewportWidth: number = 1600; // Visible world units width
  private viewportHeight: number = 900; // Visible world units height
  private cameraZoom: number = 1;
  private screenScale: number = 1;
  private screenOffsetX: number = 0;
  private screenOffsetY: number = 0;

  // Viewport & Scale (legacy fallback aliases)
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  // AI-Generated Visual Assets (Arena & Obstacles - 2D Pixel Art)
  private floorImg: HTMLImageElement | null = null;
  private wallImg: HTMLImageElement | null = null;
  private pillarImg: HTMLImageElement | null = null;
  private bushImg: HTMLImageElement | null = null;
  private wallPattern: CanvasPattern | null = null;
  private bushPattern: CanvasPattern | null = null;
  private onlineRival: OnlinePlayerProfile | null = null;
  private onlineAllies: OnlinePlayerProfile[] = [];
  private onlineRivals: OnlinePlayerProfile[] = [];
  private roomNetwork: RoomNetworkManager | null = null;
  private roomRole: 'host' | 'client' | null = null;
  private lastRemoteInput: NetworkPlayerInput | null = null;
  private snapshotBroadcastTimer: number = 0;
  private clientInputSeq: number = 0;
  private clientInputThrottle: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    progress: UserProgress,
    callbacks: EngineCallbacks,
    options?: EngineOptions
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D context');
    this.ctx = context;
    this.progress = progress;
    this.callbacks = callbacks;
    this.autoAimActive = progress.autoAimEnabled;

    if (options) {
      this.onlineRival = options.onlineRival || null;
      this.onlineAllies = options.onlineAllies || [];
      this.onlineRivals = options.onlineRivals || [];
      this.roomNetwork = options.roomNetwork || null;
      this.roomRole = options.roomRole || null;
    }

    this.loadArenaAssets();
    this.initMatch();
    this.handleResize();
  }

  private loadArenaAssets(): void {
    const floor = new Image();
    floor.onload = () => {
      this.floorImg = floor;
    };
    floor.onerror = (e) => {
      console.warn('Could not load floor texture, fallback active', e);
    };
    floor.src = ARENA_TEXTURES.floor;
    if (floor.complete && floor.naturalWidth > 0) {
      this.floorImg = floor;
    }

    const wall = new Image();
    wall.onload = () => {
      this.wallImg = wall;
      try {
        this.wallPattern = this.ctx.createPattern(wall, 'repeat');
      } catch {
        // Fallback
      }
    };
    wall.onerror = (e) => {
      console.warn('Could not load wall texture, fallback active', e);
    };
    wall.src = ARENA_TEXTURES.wall;
    if (wall.complete && wall.naturalWidth > 0) {
      this.wallImg = wall;
      try {
        this.wallPattern = this.ctx.createPattern(wall, 'repeat');
      } catch {
        // Fallback
      }
    }

    const pillar = new Image();
    pillar.onload = () => {
      this.pillarImg = pillar;
    };
    pillar.onerror = (e) => {
      console.warn('Could not load pillar texture, fallback active', e);
    };
    pillar.src = ARENA_TEXTURES.pillar;
    if (pillar.complete && pillar.naturalWidth > 0) {
      this.pillarImg = pillar;
    }

    const bush = new Image();
    bush.onload = () => {
      this.bushImg = bush;
      try {
        this.bushPattern = this.ctx.createPattern(bush, 'repeat');
      } catch {
        // Fallback
      }
    };
    bush.onerror = (e) => {
      console.warn('Could not load bush texture, fallback active', e);
    };
    bush.src = ARENA_TEXTURES.bush;
    if (bush.complete && bush.naturalWidth > 0) {
      this.bushImg = bush;
      try {
        this.bushPattern = this.ctx.createPattern(bush, 'repeat');
      } catch {
        // Fallback
      }
    }
  }

  public initMatch(): void {
    // Reset Best-of-3 Series
    this.currentRound = 1;
    this.blueRoundsWon = 0;
    this.redRoundsWon = 0;
    this.roundState = 'ROUND_ACTIVE';
    this.roundWinnerTeam = null;
    this.roundTransitionTimer = 0;
    this.roundHistory = [];

    this.matchDuration = 0;
    this.matchEnded = false;
    this.isPaused = false;

    // Pick consistent character compositions based on Game Mode (3v3 or 1v1)
    const mode = this.progress.selectedMode || '3v3';
    const playerHeroId = this.progress.selectedHero;
    const otherHeroes = ALL_HERO_IDS.filter((h) => h !== playerHeroId);
    const shuffled = [...otherHeroes].sort(() => Math.random() - 0.5);

    if (this.roomNetwork && this.roomRole) {
      // Room Code Match: Local player vs Real Online Peer
      const room = this.roomNetwork.currentRoom;
      const isHost = this.roomRole === 'host';
      const myHeroId = isHost ? (room?.host.heroId || playerHeroId) : (room?.guest?.heroId || playerHeroId);
      const opponentHeroId = isHost ? (room?.guest?.heroId || 'volt') : (room?.host.heroId || 'volt');
      const opponentName = isHost
        ? (room?.guest ? `⚡ ${room.guest.name} (${room.guest.tag})` : '⚡ Rival en Sala')
        : (room ? `👑 ${room.host.name} (${room.host.tag})` : '👑 Anfitrión');

      this.characters = [
        // Local Player (Host: Blue, Guest: Red)
        this.createCharacter(
          'char-player',
          myHeroId,
          isHost ? 'blue' : 'red',
          true,
          false,
          isHost ? ARENA_SPAWNS.blueTeamSpawns[0] : ARENA_SPAWNS.redTeamSpawns[0],
          'Jugador (Tú)'
        ),
        // Real Remote Opponent
        this.createCharacter(
          'char-enemy-1',
          opponentHeroId,
          isHost ? 'red' : 'blue',
          false,
          false,
          isHost ? ARENA_SPAWNS.redTeamSpawns[0] : ARENA_SPAWNS.blueTeamSpawns[0],
          opponentName
        ),
      ];

      // Wire real-time in-game networking listeners
      if (isHost) {
        (this.roomNetwork as any)['callbacks'].onRemoteInput = (input: NetworkPlayerInput) => {
          this.lastRemoteInput = input;
        };
      } else {
        (this.roomNetwork as any)['callbacks'].onWorldSnapshot = (snapshot: NetworkWorldSnapshot) => {
          this.applyWorldSnapshot(snapshot);
        };
      }
    } else if (mode === '1v1') {
      // 1v1 DUEL: Only the Player (Blue) vs 1 Boss Rival (Red)
      const rivalHero = this.onlineRival?.heroId || shuffled[0] || 'volt';
      const rivalName = this.onlineRival ? `${this.onlineRival.flag} ${this.onlineRival.name}` : `Rival (${HERO_DEFINITIONS[rivalHero].name})`;
      this.characters = [
        // Blue Team (Player) - Centered spawn
        this.createCharacter('char-player', playerHeroId, 'blue', true, false, ARENA_SPAWNS.blueTeamSpawns[0], 'Jugador (Tú)'),

        // Red Team (Rival) - Centered spawn
        this.createCharacter('char-enemy-1', rivalHero, 'red', false, true, ARENA_SPAWNS.redTeamSpawns[0], rivalName),
      ];
    } else {
      // 3v3 KNOCKOUT: 3 Blue vs 3 Red
      const ally1Hero = this.onlineAllies[0]?.heroId || shuffled[0] || 'bastion';
      const ally2Hero = this.onlineAllies[1]?.heroId || shuffled[1] || 'nova';
      const ally1Name = this.onlineAllies[0] ? `${this.onlineAllies[0].flag} ${this.onlineAllies[0].name}` : `Aliado (${HERO_DEFINITIONS[ally1Hero].name})`;
      const ally2Name = this.onlineAllies[1] ? `${this.onlineAllies[1].flag} ${this.onlineAllies[1].name}` : `Aliado (${HERO_DEFINITIONS[ally2Hero].name})`;

      const enemy1Hero = this.onlineRivals[0]?.heroId || shuffled[2] || 'volt';
      const enemy2Hero = this.onlineRivals[1]?.heroId || shuffled[3] || 'prisma';
      const enemy3Hero = this.onlineRivals[2]?.heroId || shuffled[4] || 'boom';

      const enemy1Name = this.onlineRivals[0] ? `${this.onlineRivals[0].flag} ${this.onlineRivals[0].name}` : `Rival ${HERO_DEFINITIONS[enemy1Hero].name}`;
      const enemy2Name = this.onlineRivals[1] ? `${this.onlineRivals[1].flag} ${this.onlineRivals[1].name}` : `Rival ${HERO_DEFINITIONS[enemy2Hero].name}`;
      const enemy3Name = this.onlineRivals[2] ? `${this.onlineRivals[2].flag} ${this.onlineRivals[2].name}` : `Rival ${HERO_DEFINITIONS[enemy3Hero].name}`;

      this.characters = [
        // Blue Team (Allies)
        this.createCharacter('char-player', playerHeroId, 'blue', true, false, ARENA_SPAWNS.blueTeamSpawns[0], 'Jugador (Tú)'),
        this.createCharacter('char-ally-1', ally1Hero, 'blue', false, true, ARENA_SPAWNS.blueTeamSpawns[1], ally1Name),
        this.createCharacter('char-ally-2', ally2Hero, 'blue', false, true, ARENA_SPAWNS.blueTeamSpawns[2], ally2Name),

        // Red Team (Enemies)
        this.createCharacter('char-enemy-1', enemy1Hero, 'red', false, true, ARENA_SPAWNS.redTeamSpawns[0], enemy1Name),
        this.createCharacter('char-enemy-2', enemy2Hero, 'red', false, true, ARENA_SPAWNS.redTeamSpawns[1], enemy2Name),
        this.createCharacter('char-enemy-3', enemy3Hero, 'red', false, true, ARENA_SPAWNS.redTeamSpawns[2], enemy3Name),
      ];
    }

    if (mode === 'ctf') {
      this.blueScore = 0;
      this.redScore = 0;
      this.blueFlag = {
        team: 'blue',
        baseX: 220,
        baseY: 675,
        x: 220,
        y: 675,
        isCarried: false,
        carrierId: null,
        isDropped: false,
        dropTimer: 0,
      };
      this.redFlag = {
        team: 'red',
        baseX: 2180,
        baseY: 675,
        x: 2180,
        y: 675,
        isCarried: false,
        carrierId: null,
        isDropped: false,
        dropTimer: 0,
      };
    } else {
      this.blueFlag = null;
      this.redFlag = null;
    }

    this.initRoundState();
  }

  /**
   * Initializes or resets state for a specific Knockout round.
   * Resets HP to full, clears projectiles and temporary gadgets, and resets positions to spawns.
   */
  private initRoundState(): void {
    this.matchTimer = 90; // 90 seconds round timer
    this.roundState = 'ROUND_ACTIVE';
    this.roundWinnerTeam = null;
    this.roundTransitionTimer = 0;

    // Clear battlefield transient entities
    this.turrets = [];
    this.barriers = [];
    this.mines = [];
    this.decoys = [];
    this.vortexes = [];
    this.meteors = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.lockedAutoAimTarget = null;

    // Reset interactive arena elements and game mode mañas
    this.jumpPads = ARENA_JUMP_PADS.map((p) => ({ ...p }));
    this.speedPads = ARENA_SPEED_PADS.map((p) => ({ ...p }));
    this.healthStations = ARENA_HEALTH_STATIONS.map((p) => ({ ...p }));
    this.powerOrbs = ARENA_POWER_ORBS.map((p) => ({ ...p }));
    this.spikeTraps = ARENA_SPIKE_TRAPS.map((p) => ({ ...p }));
    this.poisonGasDistance = 0;
    this.poisonAlertTriggered = false;
    this.suddenDeathAlertTriggered = false;
    this.activeModifierAlert = null;
    this.modifierAlertTimer = 0;
    this.ctfRadarTimer = 0;

    // Reset characters: restore HP, reset cooldowns, place at team spawns
    let blueSpawnCount = 0;
    let redSpawnCount = 0;

    for (let i = 0; i < this.characters.length; i++) {
      const char = this.characters[i];
      const def = HERO_DEFINITIONS[char.heroId];
      char.isAlive = true;
      char.hp = char.maxHp;
      char.energy = Math.min(char.energy, 50); // Retain partial super charge between rounds!
      char.cooldownTimer = 0;
      char.gadgetCharges = def.gadget.maxCharges; // Reset to hero-defined maximum uses
      char.gadgetCooldownTimer = 0;
      char.speedBoostTimer = 0;
      char.barrierTimer = 0;
      char.stealthTimer = 0;
      char.bounceAttackCharges = 0;
      char.guardianDroneTimer = 0;
      char.titanStabilityTimer = 0;
      char.slowTimer = 0;
      char.isDashing = false;
      char.dashTimer = 0;
      char.hasHitInDash.clear();
      char.shieldActive = false;
      char.shieldTimer = 0;
      char.isAirborne = false;
      char.jumpTimer = 0;
      char.jumpHeightZ = 0;
      char.boostPadTimer = 0;
      char.spikeSlowTimer = 0;
      char.inBush = false;
      char.currentBushId = null;
      char.revealedTimer = 0;
      char.damageFlashTimer = 0;
      char.vx = 0;
      char.vy = 0;

      // Assign valid spawn position based on each team's respective count
      if (char.team === 'blue') {
        const spawnIdx = blueSpawnCount % ARENA_SPAWNS.blueTeamSpawns.length;
        const spawnPos = ARENA_SPAWNS.blueTeamSpawns[spawnIdx] || ARENA_SPAWNS.blueTeamSpawns[0];
        char.x = spawnPos.x;
        char.y = spawnPos.y;
        char.facingAngle = 0;
        char.aimAngle = 0;
        blueSpawnCount++;
      } else {
        const spawnIdx = redSpawnCount % ARENA_SPAWNS.redTeamSpawns.length;
        const spawnPos = ARENA_SPAWNS.redTeamSpawns[spawnIdx] || ARENA_SPAWNS.redTeamSpawns[0];
        char.x = spawnPos.x;
        char.y = spawnPos.y;
        char.facingAngle = Math.PI;
        char.aimAngle = Math.PI;
        redSpawnCount++;
      }
    }

    // Center camera on player
    const player = this.getPlayer();
    if (player) {
      this.cameraX = player.x;
      this.cameraY = player.y;
      this.cameraTargetX = player.x;
      this.cameraTargetY = player.y;
    }

    if (this.blueFlag) {
      this.blueFlag.x = this.blueFlag.baseX;
      this.blueFlag.y = this.blueFlag.baseY;
      this.blueFlag.isCarried = false;
      this.blueFlag.carrierId = null;
      this.blueFlag.isDropped = false;
      this.blueFlag.dropTimer = 0;
    }
    if (this.redFlag) {
      this.redFlag.x = this.redFlag.baseX;
      this.redFlag.y = this.redFlag.baseY;
      this.redFlag.isCarried = false;
      this.redFlag.carrierId = null;
      this.redFlag.isDropped = false;
      this.redFlag.dropTimer = 0;
    }

    const mode = this.progress.selectedMode || '3v3';
    const roundAnnouncement = mode === 'ctf' ? '¡CAPTURA LA BANDERA!' : mode === '1v1' ? `¡DUELO 1v1 - RONDA ${this.currentRound}!` : `¡RONDA ${this.currentRound}!`;
    this.addFloatingText(this.cameraX, this.cameraY - 40, roundAnnouncement, '#38bdf8');
  }

  private createCharacter(
    id: string,
    heroId: HeroId,
    team: 'blue' | 'red',
    isPlayer: boolean,
    isBot: boolean,
    spawnPos: Vector2D,
    name: string
  ): CharacterState {
    const def = HERO_DEFINITIONS[heroId];
    const upgrades = this.progress.heroUpgrades[heroId] || { hpLevel: 1, damageLevel: 1, speedLevel: 1 };

    // Apply upgrade bonus if this is player's hero or ally
    const hpBonus = isPlayer ? getStatBonusMultiplier(upgrades.hpLevel) : 1;
    const dmgBonus = isPlayer ? getStatBonusMultiplier(upgrades.damageLevel) : 1;
    const speedBonus = isPlayer ? getStatBonusMultiplier(upgrades.speedLevel) : 1;

    const maxHp = Math.round(def.baseHp * hpBonus);
    const speed = Math.round(def.baseSpeed * speedBonus);
    const damage = Math.round(def.baseDamage * dmgBonus);

    // Initial radius depends on archetype
    let radius = 22;
    if (def.shape === 'shield') radius = 27; // Titan is heavy colossus
    else if (def.shape === 'square') radius = 25; // Bastion is chunkier
    else if (def.shape === 'octagon') radius = 24; // Boom is heavy demolisher
    else if (def.shape === 'triangle') radius = 20; // Volt is sleeker
    else if (def.shape === 'crescent') radius = 19; // Eclipse is razor shadow assassin

    return {
      id,
      heroId,
      name,
      team,
      isPlayer,
      isBot,
      shape: def.shape,

      x: spawnPos.x,
      y: spawnPos.y,
      vx: 0,
      vy: 0,
      radius,
      facingAngle: team === 'blue' ? 0 : Math.PI,
      aimAngle: team === 'blue' ? 0 : Math.PI,

      hp: maxHp,
      maxHp,
      speed,
      damage,
      attackCooldown: def.attackCooldown,
      range: def.range,
      cooldownTimer: 0,

      energy: 0,
      maxEnergy: 100,

      gadgetCharges: def.gadget.maxCharges,
      gadgetCooldownTimer: 0,
      speedBoostTimer: 0,
      barrierTimer: 0,

      stealthTimer: 0,
      bounceAttackCharges: 0,
      guardianDroneTimer: 0,
      titanStabilityTimer: 0,
      slowTimer: 0,

      isDashing: false,
      dashDuration: 0.32,
      dashTimer: 0,
      dashVx: 0,
      dashVy: 0,
      dashDamage: 38,
      hasHitInDash: new Set<string>(),

      shieldActive: false,
      shieldTimer: 0,
      shieldDamageReduction: 0.65,

      inBush: false,
      currentBushId: null,
      revealedTimer: 0,

      isAlive: true,
      damageFlashTimer: 0,
      eliminations: 0,
      damageDealt: 0,
      outOfCombatTimer: 5.0,
      regenTickTimer: 0,

      runCycle: 0,
      recoilTimer: 0,
      recoilAngle: 0,

      aiState: 'SEEK',
      aiThinkTimer: Math.random() * 0.3,
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (!paused) {
      this.lastTime = performance.now();
    }
  }

  public togglePause(): boolean {
    this.setPaused(!this.isPaused);
    return this.isPaused;
  }

  public handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement?.getBoundingClientRect() || {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Viewport dimensions in world units (responsive field of view)
    // Target showing approx 1200 - 1500 world units width on standard screens
    const targetWorldWidth = 1400;
    this.screenScale = (rect.width * dpr) / targetWorldWidth;
    this.viewportWidth = this.canvas.width / this.screenScale;
    this.viewportHeight = this.canvas.height / this.screenScale;

    // Keep legacy fallback scale synced
    this.scale = this.screenScale;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  // Convert screen coordinates to world coordinates considering dynamic camera
  public screenToWorld(screenX: number, screenY: number): Vector2D {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const canvasPixelX = (screenX - rect.left) * dpr;
    const canvasPixelY = (screenY - rect.top) * dpr;

    // Canvas center corresponds to cameraX, cameraY
    const halfCanvasW = this.canvas.width / 2;
    const halfCanvasH = this.canvas.height / 2;

    const worldX = this.cameraX + (canvasPixelX - halfCanvasW) / this.screenScale;
    const worldY = this.cameraY + (canvasPixelY - halfCanvasH) / this.screenScale;

    return { x: worldX, y: worldY };
  }

  // Convert world coordinates to screen/canvas coordinates
  public worldToScreen(worldX: number, worldY: number): Vector2D {
    const halfCanvasW = this.canvas.width / 2;
    const halfCanvasH = this.canvas.height / 2;
    return {
      x: halfCanvasW + (worldX - this.cameraX) * this.screenScale,
      y: halfCanvasH + (worldY - this.cameraY) * this.screenScale,
    };
  }

  // Input Handlers
  public setPlayerMoveInput(x: number, y: number): void {
    const len = Math.hypot(x, y);
    if (len > 1) {
      this.playerMoveInput = { x: x / len, y: y / len };
    } else {
      this.playerMoveInput = { x, y };
    }

    if (this.roomNetwork && this.roomRole === 'client') {
      this.sendClientInput();
    }
  }

  public setPlayerMousePos(screenX: number, screenY: number): void {
    this.playerMousePos = this.screenToWorld(screenX, screenY);
  }

  public setPlayerMouseDown(down: boolean): void {
    this.isMouseDown = down;
    if (down) {
      this.triggerPlayerAttack();
    }
    if (this.roomNetwork && this.roomRole === 'client') {
      this.sendClientInput();
    }
  }

  public setPlayerAimJoystick(x: number, y: number, isAiming: boolean, isSuper: boolean = false): void {
    const len = Math.hypot(x, y);
    if (len > 0.05) {
      this.joystickAimInput = { x, y, isAiming, isSuper };
      const player = this.getPlayer();
      if (player && isAiming) {
        player.aimAngle = Math.atan2(y, x);
        player.facingAngle = player.aimAngle;
      }
    } else {
      this.joystickAimInput = isAiming ? { x, y, isAiming, isSuper } : null;
    }
  }

  public releaseAttackJoystick(x: number, y: number, wasDragged: boolean): void {
    const player = this.getPlayer();
    if (!player || !player.isAlive || this.matchEnded || this.isPaused) {
      this.joystickAimInput = null;
      return;
    }

    if (wasDragged && Math.hypot(x, y) > 0.15) {
      // Manual aim release
      player.aimAngle = Math.atan2(y, x);
      player.facingAngle = player.aimAngle;
      this.tryPerformAttack(player);
    } else {
      // Tap release: if auto-aim target exists, target them
      if (this.autoAimActive && this.lockedAutoAimTarget) {
        player.aimAngle = Math.atan2(
          this.lockedAutoAimTarget.y - player.y,
          this.lockedAutoAimTarget.x - player.x
        );
        player.facingAngle = player.aimAngle;
      }
      this.tryPerformAttack(player);
    }

    this.joystickAimInput = null;
    if (this.roomNetwork && this.roomRole === 'client') {
      this.sendClientInput(true, false, false);
    }
  }

  public releaseSuperJoystick(x: number, y: number, wasDragged: boolean): void {
    const player = this.getPlayer();
    if (!player || !player.isAlive || this.matchEnded || this.isPaused) {
      this.joystickAimInput = null;
      return;
    }

    if (wasDragged && Math.hypot(x, y) > 0.15) {
      player.aimAngle = Math.atan2(y, x);
      player.facingAngle = player.aimAngle;
    } else if (this.autoAimActive && this.lockedAutoAimTarget) {
      player.aimAngle = Math.atan2(
        this.lockedAutoAimTarget.y - player.y,
        this.lockedAutoAimTarget.x - player.x
      );
      player.facingAngle = player.aimAngle;
    }

    this.tryPerformSuper(player);
    this.joystickAimInput = null;
    if (this.roomNetwork && this.roomRole === 'client') {
      this.sendClientInput(true, true, false);
    }
  }

  public triggerPlayerAttack(): void {
    const player = this.getPlayer();
    if (!player || !player.isAlive || this.roundState !== 'ROUND_ACTIVE' || this.matchEnded || this.isPaused) return;
    this.tryPerformAttack(player);
    if (this.roomNetwork && this.roomRole === 'client') {
      this.sendClientInput(true, false, false);
    }
  }

  public triggerPlayerSuper(): void {
    const player = this.getPlayer();
    if (!player || !player.isAlive || this.roundState !== 'ROUND_ACTIVE' || this.matchEnded || this.isPaused) return;
    this.tryPerformSuper(player);
    if (this.roomNetwork && this.roomRole === 'client') {
      this.sendClientInput(true, true, false);
    }
  }

  public triggerPlayerGadget(): void {
    const player = this.getPlayer();
    if (!player || !player.isAlive || this.roundState !== 'ROUND_ACTIVE' || this.matchEnded || this.isPaused) return;
    this.tryPerformGadget(player);
    if (this.roomNetwork && this.roomRole === 'client') {
      this.sendClientInput(true, false, true);
    }
  }

  // Room Networking Synchronization
  private sendClientInput(force: boolean = false, isSuper: boolean = false, isGadget: boolean = false): void {
    if (!this.roomNetwork || this.roomRole !== 'client') return;
    const player = this.getPlayer();
    if (!player) return;

    this.clientInputSeq++;
    this.roomNetwork.sendPlayerInput({
      moveX: this.playerMoveInput.x,
      moveY: this.playerMoveInput.y,
      aimAngle: player.aimAngle,
      isAttacking: this.isMouseDown,
      superTriggered: isSuper,
      gadgetTriggered: isGadget,
      seq: this.clientInputSeq,
      timestamp: Date.now(),
    });
  }

  private broadcastNetworkSnapshot(): void {
    if (!this.roomNetwork || this.roomRole !== 'host') return;

    const charSyncs = this.characters.map((c) => ({
      id: c.id,
      x: Math.round(c.x),
      y: Math.round(c.y),
      vx: Math.round(c.vx),
      vy: Math.round(c.vy),
      hp: Math.round(c.hp),
      maxHp: c.maxHp,
      energy: Math.round(c.energy),
      aimAngle: Math.round(c.aimAngle * 100) / 100,
      facingAngle: Math.round(c.facingAngle * 100) / 100,
      isAlive: c.isAlive,
      inBush: c.inBush,
      isDashing: c.isDashing,
      shieldActive: c.shieldActive,
      gadgetCharges: c.gadgetCharges,
      outOfCombatTimer: Math.round((c.outOfCombatTimer || 0) * 10) / 10,
    }));

    const projSyncs = this.projectiles.slice(0, 25).map((p) => ({
      id: p.id,
      ownerId: p.ownerId,
      team: p.team,
      x: Math.round(p.x),
      y: Math.round(p.y),
      vx: Math.round(p.vx),
      vy: Math.round(p.vy),
      color: p.color,
      radius: p.radius,
    }));

    this.roomNetwork.sendWorldSnapshot({
      timestamp: Date.now(),
      roundTimer: Math.round(this.matchTimer),
      blueScore: this.blueScore,
      redScore: this.redScore,
      roundState: this.roundState,
      roundWinnerTeam: this.roundWinnerTeam,
      characters: charSyncs,
      projectiles: projSyncs,
    });
  }

  private applyWorldSnapshot(snapshot: NetworkWorldSnapshot): void {
    if (!snapshot || !snapshot.characters) return;

    this.matchTimer = snapshot.roundTimer;
    this.blueScore = snapshot.blueScore;
    this.redScore = snapshot.redScore;
    if (snapshot.roundState) {
      this.roundState = snapshot.roundState as any;
    }
    if (snapshot.roundWinnerTeam !== undefined) {
      this.roundWinnerTeam = snapshot.roundWinnerTeam as any;
    }

    for (const remoteChar of snapshot.characters) {
      let targetChar: CharacterState | undefined;
      if (remoteChar.id === 'char-player') {
        targetChar = this.characters.find((c) => c.id === 'char-enemy-1');
      } else if (remoteChar.id === 'char-enemy-1') {
        targetChar = this.characters.find((c) => c.id === 'char-player');
      }

      if (targetChar) {
        targetChar.hp = remoteChar.hp;
        targetChar.maxHp = remoteChar.maxHp;
        targetChar.energy = remoteChar.energy;
        targetChar.isAlive = remoteChar.isAlive;
        targetChar.inBush = remoteChar.inBush;
        targetChar.shieldActive = remoteChar.shieldActive;
        targetChar.gadgetCharges = remoteChar.gadgetCharges;
        targetChar.outOfCombatTimer = remoteChar.outOfCombatTimer;

        if (targetChar.id === 'char-enemy-1') {
          targetChar.aimAngle = remoteChar.aimAngle;
          targetChar.facingAngle = remoteChar.facingAngle;
          targetChar.x = targetChar.x * 0.3 + remoteChar.x * 0.7;
          targetChar.y = targetChar.y * 0.3 + remoteChar.y * 0.7;
          targetChar.vx = remoteChar.vx;
          targetChar.vy = remoteChar.vy;
        } else {
          // If self position drifted too far from host simulation, correct it
          const dx = remoteChar.x - targetChar.x;
          const dy = remoteChar.y - targetChar.y;
          if (dx * dx + dy * dy > 1600) {
            targetChar.x = targetChar.x * 0.6 + remoteChar.x * 0.4;
            targetChar.y = targetChar.y * 0.6 + remoteChar.y * 0.4;
          }
        }
      }
    }
  }

  public toggleAutoAim(): boolean {
    this.autoAimActive = !this.autoAimActive;
    return this.autoAimActive;
  }

  public setAutoAim(active: boolean): void {
    this.autoAimActive = active;
  }

  public isAutoAimEnabled(): boolean {
    return this.autoAimActive;
  }

  public getPlayer(): CharacterState | undefined {
    return this.characters.find((c) => c.isPlayer);
  }

  // Main Loop
  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Prevent lag-induced giant leaps when tab is in background
    const dt = Math.min(rawDt, 0.05);

    if (!this.isPaused && !this.matchEnded) {
      this.update(dt);
    }

    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.matchDuration += dt;

    // Handle Round Intermission Countdown between rounds
    if (this.roundState === 'ROUND_INTERMISSION') {
      this.roundTransitionTimer -= dt;
      this.updateFX(dt);
      this.updateCamera(dt);

      if (this.roundTransitionTimer <= 0) {
        this.currentRound += 1;
        this.initRoundState();
      }

      this.notifyStateUpdate();
      return;
    }

    if (this.roundState === 'ROUND_ACTIVE') {
      this.matchTimer -= dt;

      // Check timer limit
      if (this.matchTimer <= 0) {
        this.matchTimer = 0;
        this.checkEndConditions(true);
        this.updateCamera(dt);
        this.notifyStateUpdate();
        return;
      }
    }

    // Update characters
    this.updateCharacters(dt);

    // Update deployable turrets & abilities
    this.updateTurrets(dt);
    this.updateBarriers(dt);
    this.updateMines(dt);
    this.updateDecoys(dt);
    this.updateVortexes(dt);
    this.updateMeteors(dt);

    // Update projectiles
    this.updateProjectiles(dt);

    // Update floating texts and particles
    this.updateFX(dt);

    // Update Camera Follow System
    this.updateCamera(dt);

    // Update Capture the Flag (CTF) mechanics
    this.updateCTF(dt);

    // Update interactive arena mechanics & mode mañas (Trampolines, Cintas, Orbes, Púas, Niebla)
    this.updateArenaMechanics(dt);

    if (this.modifierAlertTimer > 0) {
      this.modifierAlertTimer -= dt;
      if (this.modifierAlertTimer <= 0) {
        this.activeModifierAlert = null;
      }
    }

    // Check eliminations & victory
    this.checkEndConditions(false);

    // Notify UI listener
    this.notifyStateUpdate();
  }

  /**
   * Smooth dynamic camera tracking the player character with forward movement lead
   * Clamps strictly inside horizontal arena bounds [0, ARENA_WIDTH] x [0, ARENA_HEIGHT]
   */
  private updateCamera(dt: number): void {
    const player = this.getPlayer();
    let targetX = this.cameraX;
    let targetY = this.cameraY;

    if (player && player.isAlive) {
      // Dynamic lead in movement/facing direction (up to 120 units forward)
      const moveMagnitude = Math.hypot(this.playerMoveInput.x, this.playerMoveInput.y);
      let leadX = 0;
      let leadY = 0;

      if (moveMagnitude > 0.1) {
        leadX = this.playerMoveInput.x * 110;
        leadY = this.playerMoveInput.y * 70;
      } else {
        leadX = Math.cos(player.aimAngle) * 70;
        leadY = Math.sin(player.aimAngle) * 50;
      }

      targetX = player.x + leadX;
      targetY = player.y + leadY;
    } else {
      // Spectator mode: follow selected surviving teammate
      const spectated = this.getSpectatedAlly();
      if (spectated) {
        targetX = spectated.x;
        targetY = spectated.y;
      }
    }

    // Camera half-extents in world units
    const halfW = (this.viewportWidth || 1400) / 2;
    const halfH = (this.viewportHeight || 800) / 2;

    // Strict clamping within arena boundaries so outer voids are never exposed
    const minCamX = halfW;
    const maxCamX = Math.max(halfW, ARENA_WIDTH - halfW);
    const minCamY = halfH;
    const maxCamY = Math.max(halfH, ARENA_HEIGHT - halfH);

    this.cameraTargetX = clamp(targetX, minCamX, maxCamX);
    this.cameraTargetY = clamp(targetY, minCamY, maxCamY);

    // Smooth exponential decay / lerp tracking without jitter
    const lerpFactor = Math.min(1.0, 7.5 * dt);
    this.cameraX += (this.cameraTargetX - this.cameraX) * lerpFactor;
    this.cameraY += (this.cameraTargetY - this.cameraY) * lerpFactor;
  }

  /**
   * Allows the player to switch camera view between surviving teammates when knocked out
   */
  public cycleSpectateTarget(): void {
    const player = this.getPlayer();
    if (player && player.isAlive) return;

    const aliveAllies = this.characters.filter((c) => c.team === 'blue' && c.isAlive && !c.isPlayer);
    if (aliveAllies.length > 0) {
      this.spectateAllyIndex = (this.spectateAllyIndex + 1) % aliveAllies.length;
    }
  }

  public getSpectatedAlly(): CharacterState | null {
    const player = this.getPlayer();
    if (player && player.isAlive) return null;

    const aliveAllies = this.characters.filter((c) => c.team === 'blue' && c.isAlive && !c.isPlayer);
    if (aliveAllies.length === 0) return null;
    return aliveAllies[this.spectateAllyIndex % aliveAllies.length] || null;
  }

  private mapParticipant(c: CharacterState): KnockoutParticipant {
    const isMaster = (this.progress.trophies || 0) >= 300;
    return {
      id: c.id,
      heroId: c.heroId,
      name: c.isPlayer ? 'Comandante' : c.name,
      team: c.team,
      isPlayer: c.isPlayer,
      isAlive: c.isAlive,
      hp: c.hp,
      maxHp: c.maxHp,
      title: c.isPlayer
        ? (isMaster ? 'Leyenda Geométrica' : 'Comandante Supremo')
        : c.team === 'blue'
        ? 'Aliado Táctico'
        : 'As de la Arena',
      badge: c.isPlayer ? '👑' : c.team === 'blue' ? '⭐' : '🔥',
      backgroundId: c.isPlayer
        ? (this.progress.selectedBackground || this.progress.selectedHero || 'pulsar')
        : c.heroId,
    };
  }

  private notifyStateUpdate(): void {
    if (!this.callbacks.onStateUpdate) return;

    const player = this.getPlayer();
    const blueAlive = this.characters.filter((c) => c.team === 'blue' && c.isAlive).length;
    const redAlive = this.characters.filter((c) => c.team === 'red' && c.isAlive).length;
    const spectated = this.getSpectatedAlly();

    const participants: KnockoutParticipant[] = this.characters.map((c) => this.mapParticipant(c));

    this.callbacks.onStateUpdate({
      timer: Math.ceil(this.matchTimer),
      blueAlive,
      redAlive,
      playerHp: player?.hp || 0,
      playerMaxHp: player?.maxHp || 100,
      playerEnergy: player?.energy || 0,
      isSuperReady: (player?.energy || 0) >= 100,
      autoAimActive: this.autoAimActive,
      autoAimTargetName: this.lockedAutoAimTarget?.name || null,
      playerGadgetCharges: player?.gadgetCharges || 0,
      playerGadgetCooldown: Math.max(0, player?.gadgetCooldownTimer || 0),
      gadgetName: player ? HERO_DEFINITIONS[player.heroId].gadget.name : '',
      currentRound: this.currentRound,
      blueRoundsWon: this.blueRoundsWon,
      redRoundsWon: this.redRoundsWon,
      roundState: this.roundState,
      roundWinnerTeam: this.roundWinnerTeam,
      roundTransitionTimer: Math.max(0, this.roundTransitionTimer),
      participants,
      cameraWorldPos: { x: this.cameraX, y: this.cameraY },
      isSpectating: Boolean(!player?.isAlive && spectated),
      spectatedAllyName: spectated?.name || null,
      blueFlag: this.blueFlag,
      redFlag: this.redFlag,
      blueScore: this.blueScore,
      redScore: this.redScore,
      gameMode: this.progress.selectedMode || '3v3',
      activeModifierAlert: this.activeModifierAlert,
      poisonGasDistance: this.poisonGasDistance,
      isSuddenDeathActive: this.progress.selectedMode === '1v1' && this.matchTimer <= 45,
      powerOrbAvailable: this.powerOrbs.some((o) => o.isAvailable),
    });
  }

  private updateCharacters(dt: number): void {
    const player = this.getPlayer();

    // 1. Resolve Player Inputs & Auto-Aim Toggle Switch
    if (player && player.isAlive) {
      let autoTarget: CharacterState | null = null;

      if (this.autoAimActive) {
        // Camera visible frustum in world coordinates
        const halfW = (this.viewportWidth || 1400) / 2;
        const halfH = (this.viewportHeight || 800) / 2;
        const camLeft = this.cameraX - halfW - 40;
        const camRight = this.cameraX + halfW + 40;
        const camTop = this.cameraY - halfH - 40;
        const camBottom = this.cameraY + halfH + 40;

        const isEnemyInCamera = (e: CharacterState) =>
          e.x >= camLeft && e.x <= camRight && e.y >= camTop && e.y <= camBottom;

        // Effective max auto-aim acquisition range (based on character range)
        const maxRange = player.range * 1.05;

        // Helper to validate if an enemy is a viable target
        const isValidTarget = (enemy: CharacterState, toleranceRange: number) => {
          if (!enemy.isAlive || enemy.team !== 'red') return false;
          // Must be visible according to tactical vision engine (bush camouflage, timers, LOS)
          if (!isCharacterVisibleTo(enemy, player, ARENA_WALLS)) return false;
          // Must be within camera view (cannot auto-target off-screen enemies)
          if (!isEnemyInCamera(enemy)) return false;
          // Direct physical trajectory unobstructed by arena walls
          if (!hasLineOfSight(player.x, player.y, enemy.x, enemy.y, ARENA_WALLS)) return false;
          // Within effective attack range
          const d = distance(player.x, player.y, enemy.x, enemy.y);
          return d <= toleranceRange;
        };

        // Hysteresis: Retain current target if it remains valid (gives a generous 100-unit stickiness bonus)
        const prevTarget = this.lockedAutoAimTarget;
        if (prevTarget && isValidTarget(prevTarget, player.range * 1.15)) {
          autoTarget = prevTarget;
        }

        // Search among all living enemies for best tactical target
        const enemies = this.characters.filter((c) => c.team === 'red' && c.isAlive);
        let bestScore = autoTarget
          ? (distance(player.x, player.y, autoTarget.x, autoTarget.y) + (autoTarget.hp / autoTarget.maxHp) * 60) - 120 // Hysteresis bonus so target doesn't flicker
          : 999999;

        for (const enemy of enemies) {
          if (!isValidTarget(enemy, maxRange)) continue;

          const distToEnemy = distance(player.x, player.y, enemy.x, enemy.y);
          // Tactical score: balance distance with low-HP priority
          const hpWeight = (enemy.hp / enemy.maxHp) * 80;
          const score = distToEnemy + hpWeight;

          if (score < bestScore) {
            bestScore = score;
            autoTarget = enemy;
          }
        }
      }
      this.lockedAutoAimTarget = autoTarget;

      // Determine Aim Angle:
      // 1. If player is actively dragging the Aim Joystick, prioritize joystick aim!
      if (
        this.joystickAimInput &&
        this.joystickAimInput.isAiming &&
        Math.hypot(this.joystickAimInput.x, this.joystickAimInput.y) > 0.05
      ) {
        player.aimAngle = Math.atan2(this.joystickAimInput.y, this.joystickAimInput.x);
        player.facingAngle = player.aimAngle;
      } else if (this.autoAimActive && autoTarget) {
        // 2. If Auto-Aim is enabled AND a valid target exists, lock onto it
        player.aimAngle = Math.atan2(autoTarget.y - player.y, autoTarget.x - player.x);
        player.facingAngle = player.aimAngle;
      } else {
        // 3. Otherwise, use precise manual pointer aim
        player.aimAngle = Math.atan2(this.playerMousePos.y - player.y, this.playerMousePos.x - player.x);
        player.facingAngle = player.aimAngle;
      }

      // Movement vector calculation (speed boost, stealth, and slow factored in)
      let effectiveSpeed = player.speed;
      if (player.speedBoostTimer > 0) {
        effectiveSpeed *= 1.55;
      }
      if (player.boostPadTimer && player.boostPadTimer > 0) {
        effectiveSpeed *= 1.60;
      }
      if (player.stealthTimer > 0) {
        effectiveSpeed *= 1.50;
      }
      if (player.slowTimer > 0) {
        effectiveSpeed *= 0.55;
      }
      if (player.spikeSlowTimer && player.spikeSlowTimer > 0) {
        effectiveSpeed *= 0.55;
      }

      if (!player.isDashing) {
        player.vx = this.playerMoveInput.x * effectiveSpeed;
        player.vy = this.playerMoveInput.y * effectiveSpeed;
      }

      // Continuous firing if mouse is held down
      if (this.isMouseDown) {
        this.tryPerformAttack(player);
      }
    }

    // 2. Update Bots AI
    for (const char of this.characters) {
      if (!char.isPlayer && char.isAlive) {
        if (this.roomNetwork && char.id === 'char-enemy-1') {
          // Controlled by remote human peer via WebRTC / BroadcastChannel!
          continue;
        }

        const decision = updateBotAI(char, this.characters, ARENA_WALLS, dt);

        let botSpeed = char.speed;
        if (char.speedBoostTimer > 0) {
          botSpeed *= 1.55;
        }
        if (char.boostPadTimer && char.boostPadTimer > 0) {
          botSpeed *= 1.60;
        }
        if (char.stealthTimer > 0) {
          botSpeed *= 1.50;
        }
        if (char.slowTimer > 0) {
          botSpeed *= 0.55;
        }
        if (char.spikeSlowTimer && char.spikeSlowTimer > 0) {
          botSpeed *= 0.55;
        }

        if (!char.isDashing) {
          // If in CTF mode, check bot's flag objective
          if (this.progress.selectedMode === 'ctf' && this.blueFlag && this.redFlag) {
            const isCarryingEnemyFlag = (char.team === 'blue' && this.redFlag.carrierId === char.id) ||
                                        (char.team === 'red' && this.blueFlag.carrierId === char.id);
            if (isCarryingEnemyFlag) {
              // Priority 1: SPRINT TO OWN BASE STAND TO SCORE!
              const homeBase = char.team === 'blue'
                ? { x: this.blueFlag.baseX, y: this.blueFlag.baseY }
                : { x: this.redFlag.baseX, y: this.redFlag.baseY };
              const toBaseAngle = Math.atan2(homeBase.y - char.y, homeBase.x - char.x);
              char.vx = Math.cos(toBaseAngle) * botSpeed;
              char.vy = Math.sin(toBaseAngle) * botSpeed;
              char.aimAngle = toBaseAngle;
            } else {
              char.vx = decision.moveDir.x * botSpeed;
              char.vy = decision.moveDir.y * botSpeed;
            }
          } else {
            char.vx = decision.moveDir.x * botSpeed;
            char.vy = decision.moveDir.y * botSpeed;
          }
        }
        char.aimAngle = decision.aimAngle;

        if (decision.wantsGadget) {
          this.tryPerformGadget(char);
        } else if (decision.wantsSuper) {
          this.tryPerformSuper(char);
        } else if (decision.wantsAttack) {
          this.tryPerformAttack(char);
        }
      }
    }

    // 2b. If Host in room match, process remote rival inputs and broadcast world snapshot
    if (this.roomNetwork && this.roomRole === 'host') {
      const remoteRival = this.characters.find((c) => c.id === 'char-enemy-1');
      if (remoteRival && remoteRival.isAlive && this.lastRemoteInput) {
        let rivalSpeed = remoteRival.speed;
        if (remoteRival.speedBoostTimer > 0) rivalSpeed *= 1.55;
        if (remoteRival.boostPadTimer && remoteRival.boostPadTimer > 0) rivalSpeed *= 1.60;
        if (remoteRival.stealthTimer > 0) rivalSpeed *= 1.50;
        if (remoteRival.slowTimer > 0) rivalSpeed *= 0.55;
        if (remoteRival.spikeSlowTimer && remoteRival.spikeSlowTimer > 0) rivalSpeed *= 0.55;

        if (!remoteRival.isDashing) {
          remoteRival.vx = this.lastRemoteInput.moveX * rivalSpeed;
          remoteRival.vy = this.lastRemoteInput.moveY * rivalSpeed;
        }
        remoteRival.aimAngle = this.lastRemoteInput.aimAngle;
        remoteRival.facingAngle = this.lastRemoteInput.aimAngle;

        if (this.lastRemoteInput.gadgetTriggered) {
          this.tryPerformGadget(remoteRival);
          this.lastRemoteInput.gadgetTriggered = false;
        }
        if (this.lastRemoteInput.superTriggered) {
          this.tryPerformSuper(remoteRival);
          this.lastRemoteInput.superTriggered = false;
        }
        if (this.lastRemoteInput.isAttacking) {
          this.tryPerformAttack(remoteRival);
        }
      }

      this.snapshotBroadcastTimer += dt;
      if (this.snapshotBroadcastTimer >= 0.033) {
        this.snapshotBroadcastTimer = 0;
        this.broadcastNetworkSnapshot();
      }
    }

    // 2c. If Client in room match, periodically send inputs to host
    if (this.roomNetwork && this.roomRole === 'client') {
      this.clientInputThrottle += dt;
      if (this.clientInputThrottle >= 0.03) {
        this.clientInputThrottle = 0;
        this.sendClientInput();
      }
    }

    // 3. Physics integration, Timers & Collisions
    for (const char of this.characters) {
      if (!char.isAlive) {
        // Handle CTF respawn countdown
        if (this.progress.selectedMode === 'ctf' && (char.respawnTimer || 0) > 0) {
          char.respawnTimer = (char.respawnTimer || 0) - dt;
          if (char.respawnTimer <= 0) {
            char.isAlive = true;
            char.hp = char.maxHp;
            char.shieldActive = true;
            char.shieldTimer = 1.8; // Invulnerability shield upon respawn
            char.shieldDamageReduction = 0.85;
            const spawns = char.team === 'blue' ? ARENA_SPAWNS.blueTeamSpawns : ARENA_SPAWNS.redTeamSpawns;
            const sp = spawns[Math.floor(Math.random() * spawns.length)];
            char.x = sp.x;
            char.y = sp.y;
            char.vx = 0;
            char.vy = 0;
            this.addFloatingText(char.x, char.y - 35, '¡REAPARICIÓN!', '#22c55e');
          }
        }
        continue;
      }

      // Cooldown timer
      if (char.cooldownTimer > 0) {
        char.cooldownTimer -= dt;
      }

      // Gadget / Potenciador cooldown timer
      if (char.gadgetCooldownTimer > 0) {
        char.gadgetCooldownTimer -= dt;
      }

      // Curación progresiva con el tiempo (después de 3.0s fuera de combate)
      if (char.isAlive) {
        char.outOfCombatTimer = (char.outOfCombatTimer || 0) + dt;
        if (char.outOfCombatTimer >= 3.0 && char.hp < char.maxHp) {
          char.regenTickTimer = (char.regenTickTimer || 0) + dt;
          if (char.regenTickTimer >= 1.0) {
            char.regenTickTimer = 0;
            // Regenera 13% de vida máxima por segundo
            const healAmount = Math.max(8, Math.round(char.maxHp * 0.13));
            const oldHp = char.hp;
            char.hp = Math.min(char.maxHp, char.hp + healAmount);
            const actualHealed = char.hp - oldHp;

            if (actualHealed > 0) {
              this.addFloatingText(char.x, char.y - 25, `+${actualHealed}`, '#22c55e');

              // Partículas verdes de sanación natural
              for (let i = 0; i < 4; i++) {
                this.addParticle({
                  x: char.x + (Math.random() - 0.5) * char.radius * 1.5,
                  y: char.y + (Math.random() - 0.5) * char.radius,
                  vx: (Math.random() - 0.5) * 15,
                  vy: -25 - Math.random() * 20,
                  radius: 3.5,
                  color: '#4ade80',
                  life: 0.45,
                  maxLife: 0.45,
                  alpha: 0.9,
                  shape: 'spark',
                });
              }

              if (char.isPlayer) {
                sounds.playHeal();
              }
            }
          }
        } else {
          char.regenTickTimer = 0;
        }
      }

      // Speed boost timer (Volt gadget)
      if (char.speedBoostTimer > 0) {
        char.speedBoostTimer -= dt;
        if (Math.random() < 0.35) {
          this.addParticle({
            x: char.x + (Math.random() - 0.5) * 12,
            y: char.y + (Math.random() - 0.5) * 12,
            vx: -char.vx * 0.1,
            vy: -char.vy * 0.1,
            radius: 3.5,
            color: '#facc15',
            life: 0.2,
            maxLife: 0.2,
            alpha: 0.9,
            shape: 'spark',
          });
        }
      }

      // Stealth timer (Eclipse super)
      if (char.stealthTimer > 0) {
        char.stealthTimer -= dt;
        if (Math.random() < 0.4) {
          this.addParticle({
            x: char.x + (Math.random() - 0.5) * 16,
            y: char.y + (Math.random() - 0.5) * 16,
            vx: -char.vx * 0.1,
            vy: -char.vy * 0.1,
            radius: 4,
            color: '#a78bfa',
            life: 0.25,
            maxLife: 0.25,
            alpha: 0.6,
          });
        }
      }

      // Guardian drone timer (Cometa gadget)
      if (char.guardianDroneTimer > 0) {
        char.guardianDroneTimer -= dt;
        if (Math.random() < 0.35) {
          const orbitAngle = this.matchDuration * 6;
          this.addParticle({
            x: char.x + Math.cos(orbitAngle) * (char.radius + 12),
            y: char.y + Math.sin(orbitAngle) * (char.radius + 12),
            vx: 0,
            vy: 0,
            radius: 3.5,
            color: '#2dd4bf',
            life: 0.2,
            maxLife: 0.2,
            alpha: 0.9,
          });
        }
      }

      // Titan stability timer (Titan gadget)
      if (char.titanStabilityTimer > 0) {
        char.titanStabilityTimer -= dt;
        if (Math.random() < 0.3) {
          this.addParticle({
            x: char.x + (Math.random() - 0.5) * 20,
            y: char.y + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: 15,
            radius: 3,
            color: '#f97316',
            life: 0.25,
            maxLife: 0.25,
            alpha: 0.8,
            shape: 'square',
          });
        }
      }

      // Gravity slow timer (Vortex gadget)
      if (char.slowTimer > 0) {
        char.slowTimer -= dt;
        if (Math.random() < 0.3) {
          this.addParticle({
            x: char.x + (Math.random() - 0.5) * 14,
            y: char.y + (Math.random() - 0.5) * 14,
            vx: 0,
            vy: -20,
            radius: 3,
            color: '#e879f9',
            life: 0.2,
            maxLife: 0.2,
            alpha: 0.7,
          });
        }
      }

      // Boost pad timer (Cintas turbo)
      if ((char.boostPadTimer || 0) > 0) {
        char.boostPadTimer = Math.max(0, (char.boostPadTimer || 0) - dt);
        if (Math.random() < 0.35) {
          this.addParticle({
            x: char.x + (Math.random() - 0.5) * 14,
            y: char.y + (Math.random() - 0.5) * 14,
            vx: -char.vx * 0.1,
            vy: -char.vy * 0.1,
            radius: 3,
            color: '#38bdf8',
            life: 0.2,
            maxLife: 0.2,
            alpha: 0.85,
            shape: 'spark',
          });
        }
      }

      // Spike slow timer (Trampas de púas)
      if ((char.spikeSlowTimer || 0) > 0) {
        char.spikeSlowTimer = Math.max(0, (char.spikeSlowTimer || 0) - dt);
        if (Math.random() < 0.25) {
          this.addParticle({
            x: char.x + (Math.random() - 0.5) * 12,
            y: char.y + (Math.random() - 0.5) * 12,
            vx: 0,
            vy: 15,
            radius: 2.5,
            color: '#f43f5e',
            life: 0.2,
            maxLife: 0.2,
            alpha: 0.8,
          });
        }
      }

      // Recoil timer from shooting
      if ((char.recoilTimer || 0) > 0) {
        char.recoilTimer = Math.max(0, (char.recoilTimer || 0) - dt);
      }

      // Barrier timer (Bastion gadget)
      if (char.barrierTimer > 0) {
        char.barrierTimer -= dt;
      }

      // Damage flash
      if (char.damageFlashTimer > 0) {
        char.damageFlashTimer -= dt;
      }

      // Revealed timer
      if (char.revealedTimer > 0) {
        char.revealedTimer -= dt;
      }

      // Shield timer (Bastion)
      if (char.shieldActive) {
        char.shieldTimer -= dt;
        if (char.shieldTimer <= 0) {
          char.shieldActive = false;
        }
      }

      // Dash physics (Volt)
      if (char.isDashing) {
        char.dashTimer -= dt;
        char.x += char.dashVx * dt;
        char.y += char.dashVy * dt;

        // Dash trail particle
        this.addParticle({
          x: char.x + (Math.random() - 0.5) * 12,
          y: char.y + (Math.random() - 0.5) * 12,
          vx: -char.dashVx * 0.1,
          vy: -char.dashVy * 0.1,
          radius: 8,
          color: HERO_DEFINITIONS[char.heroId].accentColor,
          life: 0.25,
          maxLife: 0.25,
          alpha: 0.7,
        });

        // Dash contact damage against opponents
        for (const other of this.characters) {
          if (other.isAlive && other.team !== char.team && !char.hasHitInDash.has(other.id)) {
            const d = distance(char.x, char.y, other.x, other.y);
            if (d <= char.radius + other.radius + 6) {
              char.hasHitInDash.add(other.id);
              this.applyDamage(other, char.dashDamage, char);
              this.addFloatingText(other.x, other.y - 20, `-${char.dashDamage}`, '#facc15');
              sounds.playHit();
              if (char.isAlive) {
                char.energy = Math.min(100, char.energy + 8);
              }

              // Spawn collision sparks
              for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = 120 + Math.random() * 140;
                this.addParticle({
                  x: other.x,
                  y: other.y,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  radius: 3,
                  color: '#facc15',
                  life: 0.35,
                  maxLife: 0.35,
                  alpha: 1,
                  shape: 'spark',
                });
              }
            }
          }
        }

        // Wall collision during dash stops dash!
        for (const wall of ARENA_WALLS) {
          const res = resolveCircleWallCollision(char.x, char.y, char.radius, wall);
          if (res.collided) {
            char.x = res.x;
            char.y = res.y;
            char.isDashing = false; // Stop dash on wall impact!
            break;
          }
        }

        if (char.dashTimer <= 0) {
          char.isDashing = false;
        }
      } else {
        // Airborne jump pad trajectory is processed in updateArenaMechanics
        if (char.isAirborne) {
          continue;
        }

        // Standard movement
        char.x += char.vx * dt;
        char.y += char.vy * dt;

        const currentSpeed = Math.hypot(char.vx, char.vy);

        // Run animation cycle & running dust particles
        if (currentSpeed > 15) {
          char.facingAngle = Math.atan2(char.vy, char.vx);
          char.runCycle = ((char.runCycle || 0) + dt * (currentSpeed / 18)) % (Math.PI * 2);

          // Running dust / footstep particles behind character
          if (Math.random() < 0.28) {
            const moveAngle = Math.atan2(char.vy, char.vx);
            const dustDist = char.radius * 0.9;
            const dustX = char.x - Math.cos(moveAngle) * dustDist + (Math.random() - 0.5) * 6;
            const dustY = char.y - Math.sin(moveAngle) * dustDist + (Math.random() - 0.5) * 6;
            this.addParticle({
              x: dustX,
              y: dustY,
              vx: -Math.cos(moveAngle) * (20 + Math.random() * 25) + (Math.random() - 0.5) * 15,
              vy: -Math.sin(moveAngle) * (20 + Math.random() * 25) + (Math.random() - 0.5) * 15,
              radius: 2.5 + Math.random() * 2,
              color: char.inBush ? '#34d399' : 'rgba(148, 163, 184, 0.45)',
              life: 0.22,
              maxLife: 0.22,
              alpha: 0.5,
              shape: 'circle',
            });
          }
        } else {
          char.facingAngle = char.aimAngle;
          // Smoothly return runCycle to 0
          if (char.runCycle && char.runCycle !== 0) {
            char.runCycle = 0;
          }
        }

        // Wall collisions
        for (const wall of ARENA_WALLS) {
          const res = resolveCircleWallCollision(char.x, char.y, char.radius, wall);
          if (res.collided) {
            char.x = res.x;
            char.y = res.y;
          }
        }
      }

      // Bush detection
      const bush = getContainingBush(char.x, char.y, ARENA_BUSHES);
      char.inBush = bush !== null;
      char.currentBushId = bush ? bush.id : null;
    }

    // 4. Character vs Character soft separation
    for (let i = 0; i < this.characters.length; i++) {
      for (let j = i + 1; j < this.characters.length; j++) {
        resolveCharacterSeparation(this.characters[i], this.characters[j]);
      }
    }
  }

  private tryPerformAttack(char: CharacterState): void {
    if (!char.isAlive || char.cooldownTimer > 0 || char.isDashing) return;

    const def = HERO_DEFINITIONS[char.heroId];
    char.cooldownTimer = def.attackCooldown;
    char.revealedTimer = 1.2; // Attacking breaks stealth for 1.2s
    char.outOfCombatTimer = 0; // Attacking resets natural out-of-combat health regeneration

    // Shooting Animation: Trigger cannon recoil & muzzle flash
    char.recoilTimer = 0.16; // 160ms recoil animation
    char.recoilAngle = char.aimAngle;

    // Muzzle flash particle at cannon tip
    const barrelLength = char.radius + 8;
    const muzzleX = char.x + Math.cos(char.aimAngle) * barrelLength;
    const muzzleY = char.y + Math.sin(char.aimAngle) * barrelLength;
    this.addParticle({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(char.aimAngle) * 50,
      vy: Math.sin(char.aimAngle) * 50,
      radius: 6,
      color: '#ffffff',
      life: 0.1,
      maxLife: 0.1,
      alpha: 1,
      shape: 'spark',
    });
    this.addParticle({
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(char.aimAngle) * 30,
      vy: Math.sin(char.aimAngle) * 30,
      radius: 8,
      color: def.accentColor,
      life: 0.12,
      maxLife: 0.12,
      alpha: 0.8,
    });

    sounds.playShoot(char.heroId);

    if (char.heroId === 'prisma') {
      // PRISMA: Shoots 3 crystalline fragments in fan spread (-0.18, 0, +0.18 rad)
      const shouldBounce = char.bounceAttackCharges > 0;
      if (shouldBounce) {
        char.bounceAttackCharges -= 1;
        this.addFloatingText(char.x, char.y - 22, '¡REBOTE!', '#67e8f9');
      }

      const spreadOffsets = [-0.18, 0, 0.18];
      spreadOffsets.forEach((offset) => {
        const angle = char.aimAngle + offset;
        const speed = def.projectileSpeed;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const spawnDist = char.radius + def.projectileRadius + 2;

        this.projectiles.push({
          id: `proj-prisma-${Date.now()}-${Math.random()}`,
          ownerId: char.id,
          team: char.team,
          x: char.x + Math.cos(angle) * spawnDist,
          y: char.y + Math.sin(angle) * spawnDist,
          vx,
          vy,
          radius: def.projectileRadius,
          damage: char.damage,
          maxDistance: def.range,
          distanceTraveled: 0,
          color: def.projectileColor,
          isSuper: false,
          shapeType: 'diamond',
          canBounce: shouldBounce,
          bouncesLeft: shouldBounce ? 1 : 0,
        });
      });
      return;
    }

    if (char.heroId === 'boom') {
      // BOOM: Area damage bomb with projectile travel time and explosive detonation
      const speed = def.projectileSpeed;
      const vx = Math.cos(char.aimAngle) * speed;
      const vy = Math.sin(char.aimAngle) * speed;
      const spawnDist = char.radius + def.projectileRadius + 2;

      this.projectiles.push({
        id: `proj-boom-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: char.x + Math.cos(char.aimAngle) * spawnDist,
        y: char.y + Math.sin(char.aimAngle) * spawnDist,
        vx,
        vy,
        radius: def.projectileRadius,
        damage: char.damage,
        maxDistance: def.range,
        distanceTraveled: 0,
        color: def.projectileColor,
        isSuper: false,
        shapeType: 'octagon',
        isExplosive: true,
        explosionRadius: 55,
      });
      return;
    }

    if (char.heroId === 'eclipse') {
      // ECLIPSE: Twin fast crescent razor blades
      const offsets = [-0.07, 0.07];
      offsets.forEach((offset) => {
        const angle = char.aimAngle + offset;
        const speed = def.projectileSpeed;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const spawnDist = char.radius + def.projectileRadius + 2;

        this.projectiles.push({
          id: `proj-eclipse-${Date.now()}-${Math.random()}`,
          ownerId: char.id,
          team: char.team,
          x: char.x + Math.cos(angle) * spawnDist,
          y: char.y + Math.sin(angle) * spawnDist,
          vx,
          vy,
          radius: def.projectileRadius,
          damage: Math.round(char.damage * 0.6),
          maxDistance: def.range,
          distanceTraveled: 0,
          color: def.projectileColor,
          isSuper: false,
          shapeType: 'crescent',
        });
      });
      return;
    }

    if (char.heroId === 'cometa') {
      // COMETA: Guided celestial star projectile
      const speed = def.projectileSpeed;
      const vx = Math.cos(char.aimAngle) * speed;
      const vy = Math.sin(char.aimAngle) * speed;
      const spawnDist = char.radius + def.projectileRadius + 2;

      this.projectiles.push({
        id: `proj-cometa-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: char.x + Math.cos(char.aimAngle) * spawnDist,
        y: char.y + Math.sin(char.aimAngle) * spawnDist,
        vx,
        vy,
        radius: def.projectileRadius,
        damage: char.damage,
        maxDistance: def.range,
        distanceTraveled: 0,
        color: def.projectileColor,
        isSuper: false,
        shapeType: 'star',
        isHoming: true,
      });
      return;
    }

    if (char.heroId === 'titan') {
      // TITAN: Heavy short range crushing slam
      const speed = def.projectileSpeed;
      const vx = Math.cos(char.aimAngle) * speed;
      const vy = Math.sin(char.aimAngle) * speed;
      const spawnDist = char.radius + def.projectileRadius + 2;

      this.projectiles.push({
        id: `proj-titan-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: char.x + Math.cos(char.aimAngle) * spawnDist,
        y: char.y + Math.sin(char.aimAngle) * spawnDist,
        vx,
        vy,
        radius: def.projectileRadius,
        damage: char.damage,
        maxDistance: def.range,
        distanceTraveled: 0,
        color: def.projectileColor,
        isSuper: false,
        shapeType: 'shield',
      });
      return;
    }

    if (char.heroId === 'vortex') {
      // VORTEX: Gravitational orb
      const speed = def.projectileSpeed;
      const vx = Math.cos(char.aimAngle) * speed;
      const vy = Math.sin(char.aimAngle) * speed;
      const spawnDist = char.radius + def.projectileRadius + 2;

      this.projectiles.push({
        id: `proj-vortex-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: char.x + Math.cos(char.aimAngle) * spawnDist,
        y: char.y + Math.sin(char.aimAngle) * spawnDist,
        vx,
        vy,
        radius: def.projectileRadius,
        damage: char.damage,
        maxDistance: def.range,
        distanceTraveled: 0,
        color: def.projectileColor,
        isSuper: false,
        shapeType: 'pentagon',
      });
      return;
    }

    // Standard Projectile (Pulsar, Volt, Bastion, Nova)
    const speed = def.projectileSpeed;
    const vx = Math.cos(char.aimAngle) * speed;
    const vy = Math.sin(char.aimAngle) * speed;

    const spawnDist = char.radius + def.projectileRadius + 2;
    const projX = char.x + Math.cos(char.aimAngle) * spawnDist;
    const projY = char.y + Math.sin(char.aimAngle) * spawnDist;

    this.projectiles.push({
      id: `proj-${Date.now()}-${Math.random()}`,
      ownerId: char.id,
      team: char.team,
      x: projX,
      y: projY,
      vx,
      vy,
      radius: def.projectileRadius,
      damage: char.damage,
      maxDistance: def.range,
      distanceTraveled: 0,
      color: def.projectileColor,
      isSuper: false,
      shapeType: def.shape,
    });

    // Muzzle flash particle
    this.addParticle({
      x: projX,
      y: projY,
      vx: vx * 0.05,
      vy: vy * 0.05,
      radius: 6,
      color: '#ffffff',
      life: 0.12,
      maxLife: 0.12,
      alpha: 1,
    });
  }

  private tryPerformSuper(char: CharacterState): void {
    if (!char.isAlive || char.energy < 100 || char.isDashing || this.roundState !== 'ROUND_ACTIVE' || this.matchEnded || this.isPaused) return;

    char.energy = 0;
    char.revealedTimer = 1.5;
    char.outOfCombatTimer = 0; // Casting super resets natural regeneration
    char.recoilTimer = 0.24; // 240ms super casting recoil
    char.recoilAngle = char.aimAngle;

    // Super casting shockwave burst ring
    this.addParticle({
      x: char.x,
      y: char.y,
      vx: 0,
      vy: 0,
      radius: char.radius + 14,
      color: '#facc15',
      life: 0.2,
      maxLife: 0.2,
      alpha: 0.9,
    });

    const def = HERO_DEFINITIONS[char.heroId];
    sounds.playSuper(char.heroId);

    if (char.heroId === 'pulsar') {
      // 5-projectile fan spread
      const spreadAngles = [-0.28, -0.14, 0, 0.14, 0.28];
      const fanDamage = 15;

      spreadAngles.forEach((offset) => {
        const angle = char.aimAngle + offset;
        const speed = def.projectileSpeed * 1.1;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        this.projectiles.push({
          id: `super-pulsar-${Date.now()}-${Math.random()}`,
          ownerId: char.id,
          team: char.team,
          x: char.x + Math.cos(angle) * (char.radius + 10),
          y: char.y + Math.sin(angle) * (char.radius + 10),
          vx,
          vy,
          radius: 9,
          damage: fanDamage,
          maxDistance: def.range * 1.15,
          distanceTraveled: 0,
          color: '#38bdf8',
          isSuper: true,
          shapeType: 'circle',
        });
      });

      this.addFloatingText(char.x, char.y - 30, '¡RÁFAGA PENTA!', '#38bdf8');
    } else if (char.heroId === 'volt') {
      // High-speed piercing dash
      char.isDashing = true;
      char.dashTimer = 0.32;
      char.hasHitInDash.clear();
      const dashSpeed = 680;
      char.dashVx = Math.cos(char.aimAngle) * dashSpeed;
      char.dashVy = Math.sin(char.aimAngle) * dashSpeed;

      this.addFloatingText(char.x, char.y - 30, '¡EMBESTIDA!', '#facc15');
    } else if (char.heroId === 'bastion') {
      // Adamantine Shield (65% damage reduction for 4.5s)
      char.shieldActive = true;
      char.shieldTimer = 4.5;
      this.addFloatingText(char.x, char.y - 30, '¡ESCUDO ACTIVO!', '#34d399');

      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 35,
          y: char.y + Math.sin(a) * 35,
          vx: Math.cos(a) * 40,
          vy: Math.sin(a) * 40,
          radius: 4,
          color: '#34d399',
          life: 0.4,
          maxLife: 0.4,
          alpha: 0.9,
        });
      }
    } else if (char.heroId === 'nova') {
      // Healing pulse to all allies within 220 units
      const healRadius = 220;
      const healAmount = 42;
      const allies = this.characters.filter(
        (c) => c.isAlive && c.team === char.team && distance(char.x, char.y, c.x, c.y) <= healRadius
      );

      allies.forEach((ally) => {
        const prevHp = ally.hp;
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
        const healedActual = ally.hp - prevHp;
        if (healedActual > 0) {
          this.addFloatingText(ally.x, ally.y - 25, `+${healedActual} PS`, '#c084fc');
        }

        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          this.addParticle({
            x: ally.x + Math.cos(a) * 20,
            y: ally.y + Math.sin(a) * 20,
            vx: Math.cos(a) * 30,
            vy: -40,
            radius: 3,
            color: '#c084fc',
            life: 0.5,
            maxLife: 0.5,
            alpha: 1,
          });
        }
      });

      this.addFloatingText(char.x, char.y - 30, '¡REGENERACIÓN!', '#c084fc');
    } else if (char.heroId === 'prisma') {
      // PRISMA: Barrera Refractaria (deploys crystal barrier blocking enemy projectiles)
      const dist = char.radius + 32;
      let bx = char.x + Math.cos(char.aimAngle) * dist;
      let by = char.y + Math.sin(char.aimAngle) * dist;

      for (const wall of ARENA_WALLS) {
        const res = resolveCircleWallCollision(bx, by, 20, wall);
        if (res.collided) {
          bx = res.x;
          by = res.y;
        }
      }
      bx = clamp(bx, 60, ARENA_WIDTH - 60);
      by = clamp(by, 60, ARENA_HEIGHT - 60);

      this.barriers.push({
        id: `barrier-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: bx,
        y: by,
        angle: char.aimAngle,
        w: 75,
        h: 20,
        hp: 70,
        maxHp: 70,
        duration: 5.0,
        timeRemaining: 5.0,
      });

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.addParticle({
          x: bx + Math.cos(a) * 25,
          y: by + Math.sin(a) * 25,
          vx: Math.cos(a) * 30,
          vy: Math.sin(a) * 30,
          radius: 3.5,
          color: '#67e8f9',
          life: 0.35,
          maxLife: 0.35,
          alpha: 0.9,
          shape: 'spark',
        });
      }

      this.addFloatingText(bx, by - 25, '¡BARRERA REFRACTARIA!', '#67e8f9');
    } else if (char.heroId === 'boom') {
      // BOOM: Bombardeo de Racimo (cascading cluster bombings in target area)
      const targetDist = Math.min(char.range * 1.1, 260);
      let targetX = char.x + Math.cos(char.aimAngle) * targetDist;
      let targetY = char.y + Math.sin(char.aimAngle) * targetDist;
      targetX = clamp(targetX, 60, ARENA_WIDTH - 60);
      targetY = clamp(targetY, 60, ARENA_HEIGHT - 60);

      const clusterOffsets = [
        { x: 0, y: 0, delay: 0.2 },
        { x: -35, y: -25, delay: 0.4 },
        { x: 35, y: -15, delay: 0.6 },
        { x: 5, y: 35, delay: 0.8 },
      ];

      clusterOffsets.forEach((off, idx) => {
        this.meteors.push({
          id: `cluster-${Date.now()}-${idx}`,
          ownerId: char.id,
          team: char.team,
          x: char.x,
          y: char.y,
          targetX: targetX + off.x,
          targetY: targetY + off.y,
          radius: 50,
          delay: off.delay,
          damage: 24,
          exploded: false,
        });
      });

      this.addFloatingText(char.x, char.y - 30, '¡BOMBARDEO!', '#fb923c');
    } else if (char.heroId === 'eclipse') {
      // ECLIPSE: Paso Sombrío (stealth + speed boost, hard to detect)
      char.stealthTimer = 3.2;
      char.revealedTimer = 0;
      char.x += Math.cos(char.aimAngle) * 35;
      char.y += Math.sin(char.aimAngle) * 35;

      for (const wall of ARENA_WALLS) {
        const res = resolveCircleWallCollision(char.x, char.y, char.radius, wall);
        if (res.collided) {
          char.x = res.x;
          char.y = res.y;
        }
      }
      char.x = clamp(char.x, char.radius + 40, ARENA_WIDTH - char.radius - 40);
      char.y = clamp(char.y, char.radius + 40, ARENA_HEIGHT - char.radius - 40);

      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 20,
          y: char.y + Math.sin(a) * 20,
          vx: Math.cos(a) * 50,
          vy: Math.sin(a) * 50,
          radius: 4,
          color: '#a78bfa',
          life: 0.4,
          maxLife: 0.4,
          alpha: 0.8,
        });
      }

      this.addFloatingText(char.x, char.y - 30, '¡PASO SOMBRÍO!', '#a78bfa');
    } else if (char.heroId === 'cometa') {
      // COMETA: Lluvia de Meteoros (orbital energy strikes that reveal area)
      const targetDist = Math.min(char.range * 1.15, 290);
      let targetX = char.x + Math.cos(char.aimAngle) * targetDist;
      let targetY = char.y + Math.sin(char.aimAngle) * targetDist;
      targetX = clamp(targetX, 60, ARENA_WIDTH - 60);
      targetY = clamp(targetY, 60, ARENA_HEIGHT - 60);

      const strikes = [
        { x: 0, y: 0, delay: 0.18 },
        { x: -40, y: 25, delay: 0.38 },
        { x: 35, y: -30, delay: 0.58 },
        { x: -20, y: -35, delay: 0.78 },
      ];

      strikes.forEach((s, idx) => {
        this.meteors.push({
          id: `meteor-${Date.now()}-${idx}`,
          ownerId: char.id,
          team: char.team,
          x: char.x,
          y: char.y,
          targetX: targetX + s.x,
          targetY: targetY + s.y,
          radius: 55,
          delay: s.delay,
          damage: 30,
          exploded: false,
        });
      });

      this.addFloatingText(char.x, char.y - 30, '¡LLUVIA ESTELAR!', '#2dd4bf');
    } else if (char.heroId === 'titan') {
      // TITAN: Onda Tectónica (massive radial shockwave pushing enemies)
      const shockRadius = 180;
      const shockDamage = 35;
      let hitEnemies = 0;

      for (const other of this.characters) {
        if (other.isAlive && other.team !== char.team) {
          const d = distance(char.x, char.y, other.x, other.y);
          if (d <= shockRadius) {
            if (!hasLineOfSight(char.x, char.y, other.x, other.y, ARENA_WALLS)) continue;
            this.applyDamage(other, shockDamage, char);
            hitEnemies++;

            if ((other.titanStabilityTimer || 0) <= 0) {
              const angle = Math.atan2(other.y - char.y, other.x - char.x);
              const pushDist = 180 * (1 - d / shockRadius) + 70;
              other.x += Math.cos(angle) * pushDist;
              other.y += Math.sin(angle) * pushDist;

              for (const wall of ARENA_WALLS) {
                const res = resolveCircleWallCollision(other.x, other.y, other.radius, wall);
                if (res.collided) {
                  other.x = res.x;
                  other.y = res.y;
                }
              }
              other.x = clamp(other.x, other.radius + 40, ARENA_WIDTH - other.radius - 40);
              other.y = clamp(other.y, other.radius + 40, ARENA_HEIGHT - other.radius - 40);
            }
          }
        }
      }

      if (hitEnemies > 0 && char.isAlive) {
        char.energy = Math.min(100, char.energy + hitEnemies * 8);
      }

      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 30,
          y: char.y + Math.sin(a) * 30,
          vx: Math.cos(a) * 280,
          vy: Math.sin(a) * 280,
          radius: 5,
          color: '#f97316',
          life: 0.45,
          maxLife: 0.45,
          alpha: 1,
          shape: 'square',
        });
      }

      this.addFloatingText(char.x, char.y - 30, '¡ONDA TECTÓNICA!', '#f97316');
    } else if (char.heroId === 'vortex') {
      // VORTEX: Singularidad Gravitatoria (black hole pulling enemies into center)
      const targetDist = Math.min(char.range * 1.1, 260);
      let vx = char.x + Math.cos(char.aimAngle) * targetDist;
      let vy = char.y + Math.sin(char.aimAngle) * targetDist;
      vx = clamp(vx, 70, ARENA_WIDTH - 70);
      vy = clamp(vy, 70, ARENA_HEIGHT - 70);

      this.vortexes.push({
        id: `vortex-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: vx,
        y: vy,
        radius: 145,
        duration: 3.5,
        timeRemaining: 3.5,
        pulseTimer: 0.5,
        damage: 7,
      });

      this.addFloatingText(vx, vy - 25, '¡SINGULARIDAD!', '#e879f9');
    }
  }

  private tryPerformGadget(char: CharacterState): void {
    if (!char.isAlive || char.gadgetCooldownTimer > 0 || char.isDashing || this.roundState !== 'ROUND_ACTIVE' || this.matchEnded || this.isPaused) return;

    // Unlimited gadgets: charges do not deplete, recharge strictly based on cooldown timer
    char.gadgetCooldownTimer = HERO_DEFINITIONS[char.heroId].gadget.cooldown;
    char.revealedTimer = 1.2;

    sounds.playGadget(char.heroId);

    if (char.heroId === 'pulsar') {
      // Deploy Mini-Turret
      const deployDist = char.radius + 24;
      let tx = char.x + Math.cos(char.aimAngle) * deployDist;
      let ty = char.y + Math.sin(char.aimAngle) * deployDist;

      for (const wall of ARENA_WALLS) {
        const res = resolveCircleWallCollision(tx, ty, 16, wall);
        if (res.collided) {
          tx = res.x;
          ty = res.y;
        }
      }
      tx = clamp(tx, 55, ARENA_WIDTH - 55);
      ty = clamp(ty, 55, ARENA_HEIGHT - 55);

      this.turrets.push({
        id: `turret-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: tx,
        y: ty,
        hp: 45,
        maxHp: 45,
        radius: 16,
        duration: 9.0,
        timeRemaining: 9.0,
        range: 240,
        damage: 10,
        attackCooldown: 0.8,
        cooldownTimer: 0.35,
        aimAngle: char.aimAngle,
        damageFlashTimer: 0,
      });

      this.addFloatingText(tx, ty - 24, '¡MINI-TORRETA!', '#38bdf8');
    } else if (char.heroId === 'volt') {
      // Speed Boost
      char.speedBoostTimer = 2.8;
      this.addFloatingText(char.x, char.y - 25, '¡IMPULSO!', '#facc15');
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 20,
          y: char.y + Math.sin(a) * 20,
          vx: Math.cos(a) * 50,
          vy: Math.sin(a) * 50,
          radius: 3,
          color: '#facc15',
          life: 0.3,
          maxLife: 0.3,
          alpha: 1,
          shape: 'spark',
        });
      }
    } else if (char.heroId === 'bastion') {
      // Fortified Barrier
      char.barrierTimer = 3.5;
      this.addFloatingText(char.x, char.y - 25, '¡BARRERA!', '#34d399');
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 25,
          y: char.y + Math.sin(a) * 25,
          vx: Math.cos(a) * 20,
          vy: Math.sin(a) * 20,
          radius: 4,
          color: '#34d399',
          life: 0.4,
          maxLife: 0.4,
          alpha: 0.8,
          shape: 'square',
        });
      }
    } else if (char.heroId === 'nova') {
      // Repair Pulse
      const healRadius = 210;
      const healAmount = 30;
      const allies = this.characters.filter(
        (c) => c.isAlive && c.team === char.team && distance(char.x, char.y, c.x, c.y) <= healRadius
      );

      allies.forEach((ally) => {
        const prevHp = ally.hp;
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
        const healedActual = ally.hp - prevHp;
        if (healedActual > 0) {
          this.addFloatingText(ally.x, ally.y - 20, `+${healedActual} PS`, '#34d399');
        }
      });
      this.addFloatingText(char.x, char.y - 25, '¡REPARACIÓN!', '#c084fc');
    } else if (char.heroId === 'prisma') {
      // Rebote Prismático: Next attacks bounce once
      char.bounceAttackCharges = 2;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 24,
          y: char.y + Math.sin(a) * 24,
          vx: Math.cos(a) * 40,
          vy: Math.sin(a) * 40,
          radius: 3,
          color: '#67e8f9',
          life: 0.3,
          maxLife: 0.3,
          alpha: 0.9,
          shape: 'spark',
        });
      }
      this.addFloatingText(char.x, char.y - 25, '¡REBOTE CARGADO!', '#67e8f9');
    } else if (char.heroId === 'boom') {
      // Mina Táctica: Proximity mine placed
      this.mines.push({
        id: `mine-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        x: char.x,
        y: char.y,
        radius: 50,
        damage: 35,
        duration: 14.0,
        timeRemaining: 14.0,
        triggered: false,
        armTimer: 0.6,
      });
      this.addFloatingText(char.x, char.y - 25, '¡MINA DESPLEGADA!', '#fb923c');
    } else if (char.heroId === 'eclipse') {
      // Señuelo Umbrío: Distraction decoy
      const angle = char.aimAngle;
      this.decoys.push({
        id: `decoy-${Date.now()}-${Math.random()}`,
        ownerId: char.id,
        team: char.team,
        heroId: char.heroId,
        name: `Señuelo (${char.name})`,
        x: char.x + Math.cos(angle) * 24,
        y: char.y + Math.sin(angle) * 24,
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 120,
        radius: char.radius,
        hp: 40,
        maxHp: 40,
        duration: 6.0,
        timeRemaining: 6.0,
        aimAngle: angle,
        damageFlashTimer: 0,
      });
      this.addFloatingText(char.x, char.y - 25, '¡SEÑUELO DESPLEGADO!', '#a78bfa');
    } else if (char.heroId === 'cometa') {
      // Dron Guardián: Protects closest ally or self
      let targetAlly: CharacterState = char;
      let minAllyDist = 220;

      for (const ally of this.characters) {
        if (ally.isAlive && ally.team === char.team && ally.id !== char.id) {
          const d = distance(char.x, char.y, ally.x, ally.y);
          if (d < minAllyDist) {
            minAllyDist = d;
            targetAlly = ally;
          }
        }
      }

      targetAlly.guardianDroneTimer = 4.5;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.addParticle({
          x: targetAlly.x + Math.cos(a) * 22,
          y: targetAlly.y + Math.sin(a) * 22,
          vx: Math.cos(a) * 45,
          vy: Math.sin(a) * 45,
          radius: 3,
          color: '#2dd4bf',
          life: 0.35,
          maxLife: 0.35,
          alpha: 1,
        });
      }
      this.addFloatingText(targetAlly.x, targetAlly.y - 25, '¡DRON GUARDIÁN!', '#2dd4bf');
    } else if (char.heroId === 'titan') {
      // Estabilizador Pesado: Knockback immunity + 30% damage reduction
      char.titanStabilityTimer = 4.0;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 28,
          y: char.y + Math.sin(a) * 28,
          vx: 0,
          vy: 20,
          radius: 4,
          color: '#f97316',
          life: 0.4,
          maxLife: 0.4,
          alpha: 0.9,
          shape: 'square',
        });
      }
      this.addFloatingText(char.x, char.y - 25, '¡ESTABILIZADOR ACTIVO!', '#f97316');
    } else if (char.heroId === 'vortex') {
      // Pulso de Inversión: Radial repulsion + slow
      const pulseRadius = 140;
      for (const other of this.characters) {
        if (other.isAlive && other.team !== char.team) {
          const d = distance(char.x, char.y, other.x, other.y);
            if (d <= pulseRadius) {
            if (!hasLineOfSight(char.x, char.y, other.x, other.y, ARENA_WALLS)) continue;
            other.slowTimer = 2.5;
            if ((other.titanStabilityTimer || 0) <= 0) {
              const angle = Math.atan2(other.y - char.y, other.x - char.x);
              other.x += Math.cos(angle) * 75;
              other.y += Math.sin(angle) * 75;

              for (const wall of ARENA_WALLS) {
                const res = resolveCircleWallCollision(other.x, other.y, other.radius, wall);
                if (res.collided) {
                  other.x = res.x;
                  other.y = res.y;
                }
              }
              other.x = clamp(other.x, other.radius + 40, ARENA_WIDTH - other.radius - 40);
              other.y = clamp(other.y, other.radius + 40, ARENA_HEIGHT - other.radius - 40);
            }
            this.addFloatingText(other.x, other.y - 20, 'RALENTIZADO', '#e879f9');
          }
        }
      }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        this.addParticle({
          x: char.x + Math.cos(a) * 25,
          y: char.y + Math.sin(a) * 25,
          vx: Math.cos(a) * 120,
          vy: Math.sin(a) * 120,
          radius: 3.5,
          color: '#e879f9',
          life: 0.35,
          maxLife: 0.35,
          alpha: 0.9,
        });
      }
      this.addFloatingText(char.x, char.y - 25, '¡PULSO DE INVERSIÓN!', '#e879f9');
    }
  }

  private updateTurrets(dt: number): void {
    const remainingTurrets: DeployedTurret[] = [];

    for (const turret of this.turrets) {
      turret.timeRemaining -= dt;
      if (turret.cooldownTimer > 0) turret.cooldownTimer -= dt;
      if (turret.damageFlashTimer > 0) turret.damageFlashTimer -= dt;

      if (turret.timeRemaining <= 0 || turret.hp <= 0) {
        // Explode turret
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.addParticle({
            x: turret.x,
            y: turret.y,
            vx: Math.cos(a) * 60,
            vy: Math.sin(a) * 60,
            radius: 3,
            color: '#38bdf8',
            life: 0.3,
            maxLife: 0.3,
            alpha: 0.8,
            shape: 'square',
          });
        }
        continue;
      }

      // Find closest visible enemy
      const enemies = this.characters.filter((c) => c.isAlive && c.team !== turret.team);
      let target: CharacterState | null = null;
      let minDist = turret.range;

      for (const enemy of enemies) {
        if (!isCharacterVisibleTo(enemy, { team: turret.team, isAlive: true } as CharacterState)) continue;
        if (!hasLineOfSight(turret.x, turret.y, enemy.x, enemy.y, ARENA_WALLS)) continue;

        const d = distance(turret.x, turret.y, enemy.x, enemy.y);
        if (d < minDist) {
          minDist = d;
          target = enemy;
        }
      }

      if (target) {
        turret.aimAngle = Math.atan2(target.y - turret.y, target.x - turret.x);

        if (turret.cooldownTimer <= 0) {
          turret.cooldownTimer = turret.attackCooldown;
          const vx = Math.cos(turret.aimAngle) * 480;
          const vy = Math.sin(turret.aimAngle) * 480;

          this.projectiles.push({
            id: `proj-turret-${Date.now()}-${Math.random()}`,
            ownerId: turret.ownerId,
            team: turret.team,
            x: turret.x + Math.cos(turret.aimAngle) * (turret.radius + 6),
            y: turret.y + Math.sin(turret.aimAngle) * (turret.radius + 6),
            vx,
            vy,
            radius: 5,
            damage: turret.damage,
            maxDistance: turret.range,
            distanceTraveled: 0,
            color: '#38bdf8',
            isSuper: false,
            shapeType: 'circle',
          });

          sounds.playShoot('pulsar');
        }
      }

      remainingTurrets.push(turret);
    }

    this.turrets = remainingTurrets;
  }

  private updateProjectiles(dt: number): void {
    const remaining: Projectile[] = [];

    for (const proj of this.projectiles) {
      // 0. Homing guidance (Cometa)
      if (proj.isHoming) {
        let bestTarget: { x: number; y: number } | null = null;
        let minDist = 240;

        for (const char of this.characters) {
          if (char.isAlive && char.team !== proj.team) {
            const d = distance(proj.x, proj.y, char.x, char.y);
            if (d < minDist) {
              minDist = d;
              bestTarget = char;
            }
          }
        }

        // Also home on enemy decoys
        for (const decoy of this.decoys) {
          if (decoy.team !== proj.team) {
            const d = distance(proj.x, proj.y, decoy.x, decoy.y);
            if (d < minDist) {
              minDist = d;
              bestTarget = decoy;
            }
          }
        }

        if (bestTarget) {
          const currentAngle = Math.atan2(proj.vy, proj.vx);
          const targetAngle = Math.atan2(bestTarget.y - proj.y, bestTarget.x - proj.x);
          let diff = targetAngle - currentAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          const turnRate = 3.8 * dt;
          const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
          const spd = Math.hypot(proj.vx, proj.vy);
          proj.vx = Math.cos(newAngle) * spd;
          proj.vy = Math.sin(newAngle) * spd;
        }
      }

      const stepDist = Math.hypot(proj.vx, proj.vy) * dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.distanceTraveled += stepDist;

      // 1. Exceed range
      if (proj.distanceTraveled >= proj.maxDistance) {
        if (proj.isExplosive) {
          this.triggerExplosion(proj.x, proj.y, proj.explosionRadius ?? 55, proj.damage, proj.team, proj.ownerId);
        } else {
          this.addParticle({
            x: proj.x,
            y: proj.y,
            vx: 0,
            vy: 0,
            radius: 4,
            color: proj.color,
            life: 0.15,
            maxLife: 0.15,
            alpha: 0.6,
          });
        }
        continue;
      }

      // 2. Wall collision (stops projectile or bounces)
      let hitWall = false;
      for (const wall of ARENA_WALLS) {
        if (circleHitsRect(proj.x, proj.y, proj.radius, wall)) {
          if (proj.canBounce && (proj.bouncesLeft ?? 0) > 0) {
            proj.bouncesLeft = (proj.bouncesLeft ?? 1) - 1;

            const overlapLeft = Math.abs(wall.x - (proj.x + proj.radius));
            const overlapRight = Math.abs(wall.x + wall.w - (proj.x - proj.radius));
            const overlapTop = Math.abs(wall.y - (proj.y + proj.radius));
            const overlapBottom = Math.abs(wall.y + wall.h - (proj.y - proj.radius));
            const minX = Math.min(overlapLeft, overlapRight);
            const minY = Math.min(overlapTop, overlapBottom);

            if (minX < minY) {
              proj.vx = -proj.vx;
            } else {
              proj.vy = -proj.vy;
            }

            proj.x += proj.vx * dt * 1.5;
            proj.y += proj.vy * dt * 1.5;

            // Bounce sparks
            for (let i = 0; i < 6; i++) {
              const a = Math.random() * Math.PI * 2;
              this.addParticle({
                x: proj.x,
                y: proj.y,
                vx: Math.cos(a) * 90,
                vy: Math.sin(a) * 90,
                radius: 3,
                color: '#67e8f9',
                life: 0.2,
                maxLife: 0.2,
                alpha: 1,
                shape: 'spark',
              });
            }
            sounds.playShoot('prisma');
            hitWall = false;
            break;
          }

          hitWall = true;
          if (proj.isExplosive) {
            this.triggerExplosion(proj.x, proj.y, proj.explosionRadius ?? 55, proj.damage, proj.team, proj.ownerId);
          } else {
            for (let i = 0; i < 4; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 40 + Math.random() * 80;
              this.addParticle({
                x: proj.x,
                y: proj.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                radius: 2,
                color: proj.color,
                life: 0.2,
                maxLife: 0.2,
                alpha: 0.8,
                shape: 'spark',
              });
            }
          }
          break;
        }
      }
      if (hitWall) continue;

      // 3. Enemy Barrier collision (Prisma Super)
      let hitBarrier = false;
      for (const barrier of this.barriers) {
        if (barrier.team !== proj.team) {
          const d = distance(proj.x, proj.y, barrier.x, barrier.y);
          if (d <= barrier.w * 0.5 + proj.radius) {
            barrier.hp -= proj.damage;
            hitBarrier = true;
            if (proj.isExplosive) {
              this.triggerExplosion(proj.x, proj.y, proj.explosionRadius ?? 55, proj.damage, proj.team, proj.ownerId);
            }
            this.addFloatingText(barrier.x, barrier.y - 15, `-${proj.damage}`, '#67e8f9');
            sounds.playHit();
            break;
          }
        }
      }
      if (hitBarrier) continue;

      // 4. Enemy Decoy collision (Eclipse Gadget)
      let hitDecoy = false;
      for (const decoy of this.decoys) {
        if (decoy.team !== proj.team) {
          const d = distance(proj.x, proj.y, decoy.x, decoy.y);
          if (d <= decoy.radius + proj.radius) {
            decoy.hp -= proj.damage;
            decoy.damageFlashTimer = 0.12;
            hitDecoy = true;
            if (proj.isExplosive) {
              this.triggerExplosion(proj.x, proj.y, proj.explosionRadius ?? 55, proj.damage, proj.team, proj.ownerId);
            }
            this.addFloatingText(decoy.x, decoy.y - 18, `-${proj.damage}`, '#a78bfa');
            sounds.playHit();
            break;
          }
        }
      }
      if (hitDecoy) continue;

      // 5. Turret collision
      let hitTurret: DeployedTurret | null = null;
      for (const turret of this.turrets) {
        if (turret.team === proj.team) continue;
        const dSq = distanceSq(proj.x, proj.y, turret.x, turret.y);
        const hitRad = turret.radius + proj.radius;
        if (dSq <= hitRad * hitRad) {
          hitTurret = turret;
          break;
        }
      }

      if (hitTurret) {
        hitTurret.hp -= proj.damage;
        hitTurret.damageFlashTimer = 0.12;
        this.addFloatingText(hitTurret.x, hitTurret.y - 18, `-${proj.damage}`, '#f87171');
        sounds.playHit();
        if (proj.isExplosive) {
          this.triggerExplosion(proj.x, proj.y, proj.explosionRadius ?? 55, proj.damage, proj.team, proj.ownerId);
        }
        continue;
      }

      // 6. Character collision (single damage application or area explosion)
      let hitTarget: CharacterState | null = null;
      for (const char of this.characters) {
        if (!char.isAlive || char.team === proj.team || char.isAirborne) continue;

        const dSq = distanceSq(proj.x, proj.y, char.x, char.y);
        const hitRadius = char.radius + proj.radius;
        if (dSq <= hitRadius * hitRadius) {
          hitTarget = char;
          break;
        }
      }

      if (hitTarget) {
        const owner = this.characters.find((c) => c.id === proj.ownerId);

        if (proj.isExplosive) {
          this.triggerExplosion(proj.x, proj.y, proj.explosionRadius ?? 55, proj.damage, proj.team, proj.ownerId);
        } else {
          this.applyDamage(hitTarget, proj.damage, owner);
          sounds.playHit();

          if (owner && owner.isAlive) {
            const energyGain = proj.isSuper ? 8 : 22;
            owner.energy = Math.min(100, owner.energy + energyGain);
          }

          for (let i = 0; i < 6; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 60 + Math.random() * 120;
            this.addParticle({
              x: proj.x,
              y: proj.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              radius: 3,
              color: proj.color,
              life: 0.25,
              maxLife: 0.25,
              alpha: 1,
              shape: 'spark',
            });
          }
        }

        continue; // Projectile consumed
      }

      // Gentle projectile trail particle
      if (Math.random() < 0.35) {
        this.addParticle({
          x: proj.x,
          y: proj.y,
          vx: -proj.vx * 0.05,
          vy: -proj.vy * 0.05,
          radius: proj.radius * 0.6,
          color: proj.color,
          life: 0.15,
          maxLife: 0.15,
          alpha: 0.5,
        });
      }

      remaining.push(proj);
    }

    this.projectiles = remaining;
  }

  private triggerExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    sourceTeam: 'blue' | 'red',
    ownerId: string
  ): void {
    const owner = this.characters.find((c) => c.id === ownerId);
    sounds.playHit();

    for (const char of this.characters) {
      if (char.isAlive && char.team !== sourceTeam) {
        const d = distance(x, y, char.x, char.y);
        if (d <= radius + char.radius) {
          if (!hasLineOfSight(x, y, char.x, char.y, ARENA_WALLS)) continue;
          this.applyDamage(char, damage, owner);
          if (owner && owner.isAlive) {
            owner.energy = Math.min(100, owner.energy + 14);
          }
        }
      }
    }

    // Explosion visual effects
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const spd = 60 + Math.random() * 130;
      this.addParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 4,
        color: '#fb923c',
        life: 0.35,
        maxLife: 0.35,
        alpha: 1,
        shape: 'square',
      });
    }
  }

  private updateBarriers(dt: number): void {
    const remaining: DeployedBarrier[] = [];
    for (const b of this.barriers) {
      b.timeRemaining -= dt;
      if (b.timeRemaining > 0 && b.hp > 0) {
        remaining.push(b);
      } else {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.addParticle({
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * 60,
            vy: Math.sin(a) * 60,
            radius: 3,
            color: '#67e8f9',
            life: 0.3,
            maxLife: 0.3,
            alpha: 0.8,
            shape: 'spark',
          });
        }
      }
    }
    this.barriers = remaining;
  }

  private updateMines(dt: number): void {
    const remaining: DeployedMine[] = [];
    for (const m of this.mines) {
      m.timeRemaining -= dt;
      if (m.armTimer > 0) m.armTimer -= dt;

      if (m.timeRemaining <= 0) continue;

      let triggered = false;
      if (m.armTimer <= 0) {
        for (const char of this.characters) {
          if (char.isAlive && char.team !== m.team) {
            const d = distance(m.x, m.y, char.x, char.y);
            if (d <= m.radius) {
              triggered = true;
              break;
            }
          }
        }
      }

      if (triggered) {
        sounds.playSuper('boom');
        const owner = this.characters.find((c) => c.id === m.ownerId);
        for (const char of this.characters) {
          if (char.isAlive && char.team !== m.team) {
            const d = distance(m.x, m.y, char.x, char.y);
            if (d <= 75) {
              this.applyDamage(char, m.damage, owner);
            }
          }
        }
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.addParticle({
            x: m.x,
            y: m.y,
            vx: Math.cos(a) * 140,
            vy: Math.sin(a) * 140,
            radius: 4.5,
            color: '#fb923c',
            life: 0.4,
            maxLife: 0.4,
            alpha: 1,
            shape: 'square',
          });
        }
        this.addFloatingText(m.x, m.y - 20, '¡BOOM!', '#fb923c');
        continue;
      }

      remaining.push(m);
    }
    this.mines = remaining;
  }

  private updateDecoys(dt: number): void {
    const remaining: DeployedDecoy[] = [];
    for (const d of this.decoys) {
      d.timeRemaining -= dt;
      if (d.damageFlashTimer > 0) d.damageFlashTimer -= dt;

      if (d.timeRemaining <= 0 || d.hp <= 0) {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          this.addParticle({
            x: d.x,
            y: d.y,
            vx: Math.cos(a) * 50,
            vy: Math.sin(a) * 50,
            radius: 3,
            color: '#a78bfa',
            life: 0.3,
            maxLife: 0.3,
            alpha: 0.8,
          });
        }
        continue;
      }

      d.x += d.vx * dt;
      d.y += d.vy * dt;

      for (const wall of ARENA_WALLS) {
        const res = resolveCircleWallCollision(d.x, d.y, d.radius, wall);
        if (res.collided) {
          d.x = res.x;
          d.y = res.y;
          d.vx = -d.vx * 0.5;
          d.vy = -d.vy * 0.5;
        }
      }

      remaining.push(d);
    }
    this.decoys = remaining;
  }

  private updateVortexes(dt: number): void {
    const remaining: DeployedVortex[] = [];
    for (const v of this.vortexes) {
      v.timeRemaining -= dt;
      v.pulseTimer -= dt;

      if (v.timeRemaining <= 0) continue;

      const shouldTick = v.pulseTimer <= 0;
      if (shouldTick) v.pulseTimer = 0.5;

      for (const char of this.characters) {
        if (char.isAlive && char.team !== v.team) {
          const d = distance(v.x, v.y, char.x, char.y);
          if (d <= v.radius && d > 10) {
            const pullForce = 130 * (1 - d / v.radius) * dt;
            const angle = Math.atan2(v.y - char.y, v.x - char.x);
            char.x += Math.cos(angle) * pullForce;
            char.y += Math.sin(angle) * pullForce;

            if (shouldTick) {
              const owner = this.characters.find((c) => c.id === v.ownerId);
              this.applyDamage(char, v.damage, owner);
            }
          }
        }
      }

      if (Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * (v.radius - 30);
        this.addParticle({
          x: v.x + Math.cos(a) * dist,
          y: v.y + Math.sin(a) * dist,
          vx: -Math.cos(a) * 90,
          vy: -Math.sin(a) * 90,
          radius: 3,
          color: '#e879f9',
          life: 0.3,
          maxLife: 0.3,
          alpha: 0.8,
        });
      }

      remaining.push(v);
    }
    this.vortexes = remaining;
  }

  private updateMeteors(dt: number): void {
    const remaining: DeployedMeteor[] = [];
    for (const m of this.meteors) {
      m.delay -= dt;
      if (m.delay <= 0 && !m.exploded) {
        m.exploded = true;
        sounds.playSuper('boom');

        for (const char of this.characters) {
          if (char.isAlive && char.team !== m.team) {
            const d = distance(m.targetX, m.targetY, char.x, char.y);
            if (d <= m.radius) {
              const owner = this.characters.find((c) => c.id === m.ownerId);
              this.applyDamage(char, m.damage, owner);
              char.revealedTimer = 3.5;
            }
          }
        }

        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          const spd = 60 + Math.random() * 120;
          this.addParticle({
            x: m.targetX,
            y: m.targetY,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            radius: 4,
            color: '#2dd4bf',
            life: 0.4,
            maxLife: 0.4,
            alpha: 1,
            shape: 'spark',
          });
        }
        this.addFloatingText(m.targetX, m.targetY - 25, '¡IMPACTO!', '#2dd4bf');
        continue;
      }

      if (!m.exploded) {
        remaining.push(m);
      }
    }
    this.meteors = remaining;
  }

  private applyDamage(target: CharacterState, baseDamage: number, attacker?: CharacterState): void {
    if (!target.isAlive) return;

    let finalDamage = baseDamage;

    // Bastion Iron Shield protection (-65%)
    if (target.shieldActive) {
      finalDamage = Math.max(1, Math.round(baseDamage * (1 - target.shieldDamageReduction)));
      this.addFloatingText(target.x, target.y - 35, 'PROTEGIDO', '#34d399');
    }

    // Bastion Reactive Barrier (Gadget, -45%)
    if (target.barrierTimer > 0) {
      finalDamage = Math.max(1, Math.round(finalDamage * 0.55));
      this.addFloatingText(target.x, target.y - 35, 'BARRERA', '#34d399');
    }

    // Cometa Guardian Drone damage reduction (-35%)
    if (target.guardianDroneTimer > 0) {
      finalDamage = Math.max(1, Math.round(finalDamage * 0.65));
      this.addFloatingText(target.x, target.y - 35, 'DRON ESCUDO', '#2dd4bf');
    }

    // Titan Heavy Stabilizer damage reduction (-30%)
    if (target.titanStabilityTimer > 0) {
      finalDamage = Math.max(1, Math.round(finalDamage * 0.70));
      this.addFloatingText(target.x, target.y - 35, 'ESTABILIZADO', '#f97316');
    }

    // Maña del Modo: Muerte Súbita en 1v1 (+35% de Daño Crítico tras 45s)
    if (this.progress.selectedMode === '1v1' && this.matchTimer <= 45) {
      finalDamage = Math.round(finalDamage * 1.35);
      if (attacker && attacker.isPlayer) {
        this.addFloatingText(target.x, target.y - 45, '¡CRÍTICO!', '#f43f5e');
      }
    }

    // Maña del Modo: Escudo Cinético de Portador de Bandera en CTF (-20% daño)
    if (this.progress.selectedMode === 'ctf' && (this.blueFlag?.carrierId === target.id || this.redFlag?.carrierId === target.id)) {
      finalDamage = Math.max(1, Math.round(finalDamage * 0.80));
      this.addFloatingText(target.x, target.y - 35, 'ESCUDO BANDERA', '#38bdf8');
    }

    target.hp -= finalDamage;
    target.damageFlashTimer = 0.12;
    target.revealedTimer = 1.0; // Taking hit briefly exposes in bush
    target.outOfCombatTimer = 0; // Taking damage resets natural regeneration timer
    target.regenTickTimer = 0;

    // Record attacker stats
    if (attacker) {
      attacker.damageDealt += finalDamage;
      attacker.outOfCombatTimer = 0; // Dealing damage resets regeneration timer
    }

    // Floating damage text
    const textCol = target.team === 'blue' ? '#f87171' : '#facc15';
    this.addFloatingText(target.x, target.y - 20, `-${finalDamage}`, textCol);

    // Elimination check
    if (target.hp <= 0) {
      target.hp = 0;
      target.isAlive = false;
      target.isDashing = false;
      target.shieldActive = false;

      // Capture the Flag: Drop carried flag on elimination
      if (this.blueFlag?.carrierId === target.id) {
        this.blueFlag.isCarried = false;
        this.blueFlag.carrierId = null;
        this.blueFlag.isDropped = true;
        this.blueFlag.dropTimer = 15;
        this.blueFlag.x = target.x;
        this.blueFlag.y = target.y;
        this.addFloatingText(target.x, target.y - 55, '¡BANDERA SOLTADA!', '#38bdf8');
      }
      if (this.redFlag?.carrierId === target.id) {
        this.redFlag.isCarried = false;
        this.redFlag.carrierId = null;
        this.redFlag.isDropped = true;
        this.redFlag.dropTimer = 15;
        this.redFlag.x = target.x;
        this.redFlag.y = target.y;
        this.addFloatingText(target.x, target.y - 55, '¡BANDERA SOLTADA!', '#ef4444');
      }

      // CTF respawn delay
      if (this.progress.selectedMode === 'ctf') {
        target.respawnTimer = 4.0;
      }

      if (attacker) {
        attacker.eliminations += 1;
      }

      sounds.playElimination();

      // Death explosion shards
      const def = HERO_DEFINITIONS[target.heroId];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + (Math.random() - 0.5);
        const spd = 80 + Math.random() * 200;
        this.addParticle({
          x: target.x,
          y: target.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          radius: 3 + Math.random() * 4,
          color: i % 2 === 0 ? def.accentColor : '#ffffff',
          life: 0.6 + Math.random() * 0.3,
          maxLife: 0.9,
          alpha: 1,
          shape: 'square',
        });
      }

      this.addFloatingText(target.x, target.y - 40, 'ELIMINADO', '#ef4444');
    }
  }

  private updateFX(dt: number): void {
    // Particles
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      return p.life > 0;
    });

    // Floating texts
    this.floatingTexts = this.floatingTexts.filter((t) => {
      t.life -= dt;
      t.y += t.vy * dt;
      return t.life > 0;
    });
  }

  private addParticle(p: Particle): void {
    if (this.particles.length > 200) {
      this.particles.shift(); // Evita sobrecarga de partículas
    }
    this.particles.push(p);
  }

  private addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      id: `float-${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
      color,
      life: 0.85,
      maxLife: 0.85,
      vy: -40,
      scale: 1,
    });
  }

  private checkEndConditions(timeOut: boolean): void {
    if (this.matchEnded || this.roundState !== 'ROUND_ACTIVE') return;

    // Capture the Flag (CTF) resolution
    if (this.progress.selectedMode === 'ctf') {
      let ctfWinner: 'blue' | 'red' | 'draw' | null = null;
      if (this.blueScore >= 2) {
        ctfWinner = 'blue';
      } else if (this.redScore >= 2) {
        ctfWinner = 'red';
      } else if (timeOut) {
        if (this.blueScore > this.redScore) ctfWinner = 'blue';
        else if (this.redScore > this.blueScore) ctfWinner = 'red';
        else ctfWinner = 'draw';
      }

      if (ctfWinner) {
        this.matchEnded = true;
        this.roundState = 'MATCH_OVER';
        const finalResult = ctfWinner === 'blue' ? 'VICTORY' : ctfWinner === 'red' ? 'DEFEAT' : 'DRAW';
        if (finalResult === 'VICTORY') {
          sounds.playVictory();
          this.addFloatingText(this.cameraX, this.cameraY - 50, '¡VICTORIA EN CAPTURA LA BANDERA!', '#38bdf8');
        } else if (finalResult === 'DEFEAT') {
          sounds.playDefeat();
          this.addFloatingText(this.cameraX, this.cameraY - 50, '¡DERROTA EN CAPTURA LA BANDERA!', '#ef4444');
        } else {
          this.addFloatingText(this.cameraX, this.cameraY - 50, '¡EMPATE!', '#facc15');
        }

        const player = this.getPlayer();
        const participants: KnockoutParticipant[] = this.characters.map((c) => this.mapParticipant(c));

        this.callbacks.onMatchEnd({
          durationSeconds: Math.round(this.matchDuration),
          result: finalResult,
          playerHeroId: this.progress.selectedHero,
          playerKills: player?.eliminations || 0,
          playerDamage: player?.damageDealt || 0,
          blueAlive: this.characters.filter((c) => c.team === 'blue' && c.isAlive).length,
          redAlive: this.characters.filter((c) => c.team === 'red' && c.isAlive).length,
          coinsEarned: 0,
          gameMode: 'ctf',
          blueRoundsWon: this.blueScore,
          redRoundsWon: this.redScore,
          totalRounds: 1,
          rounds: [],
          participants,
        });
      }
      return;
    }

    const blueSurvivors = this.characters.filter((c) => c.team === 'blue' && c.isAlive);
    const redSurvivors = this.characters.filter((c) => c.team === 'red' && c.isAlive);

    let roundWinner: 'blue' | 'red' | 'draw' | null = null;

    if (blueSurvivors.length === 0 && redSurvivors.length === 0) {
      roundWinner = 'draw';
    } else if (redSurvivors.length === 0) {
      roundWinner = 'blue';
    } else if (blueSurvivors.length === 0) {
      roundWinner = 'red';
    } else if (timeOut) {
      // Time-out tie break: count alive members, then compare aggregate health
      if (blueSurvivors.length > redSurvivors.length) {
        roundWinner = 'blue';
      } else if (redSurvivors.length > blueSurvivors.length) {
        roundWinner = 'red';
      } else {
        const blueHp = blueSurvivors.reduce((acc, c) => acc + c.hp, 0);
        const redHp = redSurvivors.reduce((acc, c) => acc + c.hp, 0);
        if (blueHp > redHp) roundWinner = 'blue';
        else if (redHp > blueHp) roundWinner = 'red';
        else roundWinner = 'draw';
      }
    }

    if (!roundWinner) return;

    // Record round result
    this.roundWinnerTeam = roundWinner;
    if (roundWinner === 'blue') {
      this.blueRoundsWon += 1;
      sounds.playVictory();
      this.addFloatingText(this.cameraX, this.cameraY - 50, '¡RONDA GANADA!', '#38bdf8');
    } else if (roundWinner === 'red') {
      this.redRoundsWon += 1;
      sounds.playDefeat();
      this.addFloatingText(this.cameraX, this.cameraY - 50, '¡RONDA PERDIDA!', '#ef4444');
    } else {
      this.addFloatingText(this.cameraX, this.cameraY - 50, '¡RONDA EN EMPATE!', '#facc15');
    }

    this.roundHistory.push({
      roundNumber: this.currentRound,
      winnerTeam: roundWinner,
      blueAlive: blueSurvivors.length,
      redAlive: redSurvivors.length,
    });

    // Best of 3 check: does any team have 2 wins, or max 3 rounds reached?
    const blueWonSeries = this.blueRoundsWon >= 2;
    const redWonSeries = this.redRoundsWon >= 2;
    const seriesCompleted = blueWonSeries || redWonSeries || this.currentRound >= 3;

    if (seriesCompleted) {
      this.matchEnded = true;
      this.roundState = 'MATCH_OVER';

      let finalResult: 'VICTORY' | 'DEFEAT' | 'DRAW' = 'DRAW';
      if (this.blueRoundsWon > this.redRoundsWon) {
        finalResult = 'VICTORY';
      } else if (this.redRoundsWon > this.blueRoundsWon) {
        finalResult = 'DEFEAT';
      }

      const player = this.getPlayer();
      const participants: KnockoutParticipant[] = this.characters.map((c) => this.mapParticipant(c));

      const stats: MatchStats = {
        durationSeconds: Math.round(this.matchDuration),
        result: finalResult,
        playerHeroId: this.progress.selectedHero,
        playerKills: player?.eliminations || 0,
        playerDamage: player?.damageDealt || 0,
        blueAlive: blueSurvivors.length,
        redAlive: redSurvivors.length,
        coinsEarned: 0, // Calculated in App reward handler
        gameMode: this.progress.selectedMode || '3v3',
        blueRoundsWon: this.blueRoundsWon,
        redRoundsWon: this.redRoundsWon,
        totalRounds: this.currentRound,
        rounds: [...this.roundHistory],
        participants,
      };

      this.callbacks.onMatchEnd(stats);
    } else {
      // Enter brief intermission (2.8 seconds) before starting next round
      this.roundState = 'ROUND_INTERMISSION';
      this.roundTransitionTimer = 2.8;
    }
  }

  // ==========================================
  // RENDER PIPELINE WITH DYNAMIC FOLLOW CAMERA & CULLING
  // ==========================================
  private render(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.save();
    // 1. Clear outer screen
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // 2. Camera Viewport Transformation:
    // Translate screen center to canvas center, apply uniform screenScale, then offset by camera world position
    const halfCanvasW = width / 2;
    const halfCanvasH = height / 2;
    ctx.translate(halfCanvasW, halfCanvasH);
    ctx.scale(this.screenScale, this.screenScale);
    ctx.translate(-this.cameraX, -this.cameraY);

    // Calculate visible world viewport bounds for culling
    const viewLeft = this.cameraX - (halfCanvasW / this.screenScale) - 60;
    const viewRight = this.cameraX + (halfCanvasW / this.screenScale) + 60;
    const viewTop = this.cameraY - (halfCanvasH / this.screenScale) - 60;
    const viewBottom = this.cameraY + (halfCanvasH / this.screenScale) + 60;

    // 1. Draw Arena Floor
    this.drawArenaFloor(ctx);

    // 2. Draw Walls & Pillars
    this.drawWalls(ctx, viewLeft, viewRight, viewTop, viewBottom);

    // 3. Draw Bushes
    this.drawBushes(ctx, viewLeft, viewRight, viewTop, viewBottom);

    // 3.5. Draw Interactive Arena Mechanics & Mañas (Trampolines, Cintas, Orbes, Púas, Estaciones)
    this.drawArenaMechanics(ctx, viewLeft, viewRight, viewTop, viewBottom);

    // 4. Draw Deployables & Battlefield Structures (Culled)
    this.drawMines(ctx, viewLeft, viewRight, viewTop, viewBottom);
    this.drawVortexes(ctx, viewLeft, viewRight, viewTop, viewBottom);
    this.drawMeteors(ctx, viewLeft, viewRight, viewTop, viewBottom);
    this.drawBarriers(ctx, viewLeft, viewRight, viewTop, viewBottom);
    this.drawTurrets(ctx, viewLeft, viewRight, viewTop, viewBottom);
    this.drawDecoys(ctx, viewLeft, viewRight, viewTop, viewBottom);

    // 4.5. Draw CTF Flags & Pedestals
    this.drawCTFFlags(ctx);

    // 5. Draw Characters (Alive, with Camera-Frustum and Stealth-Vision Culling)
    for (const char of this.characters) {
      if (char.isAlive) {
        // Culling: omit rendering if completely outside camera viewport
        if (
          char.x + char.radius >= viewLeft &&
          char.x - char.radius <= viewRight &&
          char.y + char.radius >= viewTop &&
          char.y - char.radius <= viewBottom
        ) {
          this.drawCharacter(ctx, char);
        }
      }
    }

    // 6. Draw Projectiles (Culled)
    this.drawProjectiles(ctx, viewLeft, viewRight, viewTop, viewBottom);

    // 7. Draw Particles (Culled)
    this.drawParticles(ctx, viewLeft, viewRight, viewTop, viewBottom);

    // 8. Draw Floating Texts (Culled)
    this.drawFloatingTexts(ctx, viewLeft, viewRight, viewTop, viewBottom);

    // 9. Draw Player Aim Indicator / Reticle
    this.drawPlayerAimReticle(ctx);

    // 9.5. Draw Poison Gas Encroachment Overlay (World space)
    this.drawPoisonGasOverlay(ctx);

    ctx.restore();

    // 10. Draw Screen-Space Overlays: Round Intermission & Victory/Defeat Banner
    this.drawScreenSpaceHUD(ctx, width, height);

    // 11. Draw CTF Compass Distance Indicators on Screen Margins
    this.drawFlagCompassIndicators(ctx, width, height);
  }

  private drawArenaFloor(ctx: CanvasRenderingContext2D): void {
    if (this.floorImg && this.floorImg.complete && this.floorImg.naturalWidth > 0) {
      // 1. AI-Generated Sci-Fi Battleground Arena Floor
      ctx.drawImage(this.floorImg, 0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // Subtle atmospheric overlay for character contrast
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    } else {
      // Procedural Fallback Floor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      ctx.beginPath();
      for (let x = 0; x <= ARENA_WIDTH; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
      }
      for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
      }
      ctx.stroke();
    }

    // Dynamic Central Battlefield Energy Ring
    const pulseAlpha = 0.18 + Math.sin(this.matchDuration * 2.2) * 0.08;
    ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 180, 0, Math.PI * 2);
    ctx.stroke();

    // Midfield Dividing Laser Line
    ctx.setLineDash([8, 12]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ARENA_WIDTH / 2, 30);
    ctx.lineTo(ARENA_WIDTH / 2, ARENA_HEIGHT - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Base Spawn Highlights (Blue Base left at x: 220, y: 675; Red Base right at x: 2180, y: 675)
    const blueGrad = ctx.createRadialGradient(220, 675, 30, 220, 675, 200);
    blueGrad.addColorStop(0, 'rgba(14, 165, 233, 0.40)');
    blueGrad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
    ctx.fillStyle = blueGrad;
    ctx.beginPath();
    ctx.arc(220, 675, 200, 0, Math.PI * 2);
    ctx.fill();

    const redGrad = ctx.createRadialGradient(2180, 675, 30, 2180, 675, 200);
    redGrad.addColorStop(0, 'rgba(239, 68, 68, 0.40)');
    redGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    ctx.fillStyle = redGrad;
    ctx.beginPath();
    ctx.arc(2180, 675, 200, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWalls(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const wall of ARENA_WALLS) {
      // Frustum culling: skip if outside visible bounds
      if (
        wall.x + wall.w < vLeft ||
        wall.x > vRight ||
        wall.y + wall.h < vTop ||
        wall.y > vBottom
      ) {
        continue;
      }

      // 1. Ambient Flat 2D Drop Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(wall.x + 4, wall.y + 4, wall.w, wall.h);

      if (wall.type === 'pillar') {
        // AI-Generated 2D Pixel Art Strategic Pillar Obstacle
        if (this.pillarImg && this.pillarImg.complete && this.pillarImg.naturalWidth > 0) {
          ctx.save();
          // Draw crisp 2D pixel pillar
          ctx.drawImage(this.pillarImg, wall.x, wall.y, wall.w, wall.h);

          // Glowing Cyber Pixel Edge
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
          ctx.restore();
        } else {
          // Fallback Pillar
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        }
      } else {
        // AI-Generated 2D Pixel Art Reinforced Barrier Wall Block
        if (this.wallImg && this.wallImg.complete && this.wallImg.naturalWidth > 0) {
          ctx.save();
          if (this.wallPattern) {
            ctx.fillStyle = this.wallPattern;
            ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
          } else {
            ctx.drawImage(
              this.wallImg,
              0,
              0,
              this.wallImg.naturalWidth,
              this.wallImg.naturalHeight,
              wall.x,
              wall.y,
              wall.w,
              wall.h
            );
          }

          // Luminous 2D Cyber Trim
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.lineWidth = 2;
          ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

          // Tech Corner Rivets
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(wall.x + 2, wall.y + 2, 4, 4);
          ctx.fillRect(wall.x + wall.w - 6, wall.y + 2, 4, 4);
          ctx.fillRect(wall.x + 2, wall.y + wall.h - 6, 4, 4);
          ctx.fillRect(wall.x + wall.w - 6, wall.y + wall.h - 6, 4, 4);
          ctx.restore();
        } else {
          // Fallback Wall
          ctx.fillStyle = '#182234';
          ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
        }
      }
    }
  }

  private drawBushes(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const bush of ARENA_BUSHES) {
      if (
        bush.x + bush.w < vLeft ||
        bush.x > vRight ||
        bush.y + bush.h < vTop ||
        bush.y > vBottom
      ) {
        continue;
      }

      ctx.save();

      // Soft Ambient Shadow under Foliage Canopy
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bush.x + 3, bush.y + 3, bush.w, bush.h, 10);
      } else {
        ctx.rect(bush.x + 3, bush.y + 3, bush.w, bush.h);
      }
      ctx.fill();

      // AI-Generated 2D Pixel Art Tactical Leaves Foliage ("Hojas Pixel Art")
      if (this.bushImg && this.bushImg.complete && this.bushImg.naturalWidth > 0) {
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bush.x, bush.y, bush.w, bush.h, 10);
        } else {
          ctx.rect(bush.x, bush.y, bush.w, bush.h);
        }
        ctx.clip();

        // Foliage texture fill
        if (this.bushPattern) {
          ctx.fillStyle = this.bushPattern;
          ctx.fillRect(bush.x, bush.y, bush.w, bush.h);
        } else {
          ctx.drawImage(this.bushImg, bush.x, bush.y, bush.w, bush.h);
        }

        // Bioluminescent Emerald Tint Overlay
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.fillRect(bush.x, bush.y, bush.w, bush.h);
      } else {
        // Fallback Bush
        ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.fillRect(bush.x, bush.y, bush.w, bush.h);
      }

      // Glowing Tactical Pixel Foliage Perimeter
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bush.x, bush.y, bush.w, bush.h, 10);
      } else {
        ctx.rect(bush.x, bush.y, bush.w, bush.h);
      }
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawBarriers(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const b of this.barriers) {
      if (b.x + b.w / 2 < vLeft || b.x - b.w / 2 > vRight || b.y + b.h / 2 < vTop || b.y - b.h / 2 > vBottom) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle + Math.PI / 2);

      // Crystalline Glow
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.fillRect(-b.w / 2 - 4, -b.h / 2 - 4, b.w + 8, b.h + 8);

      // Refractive Barrier Body
      const grad = ctx.createLinearGradient(-b.w / 2, 0, b.w / 2, 0);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.5, '#67e8f9');
      grad.addColorStop(1, '#0891b2');

      ctx.fillStyle = grad;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);

      // Shimmer Border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);

      // Health bar
      const hpR = clamp(b.hp / b.maxHp, 0, 1);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(-b.w / 2, -b.h / 2 - 6, b.w * hpR, 3);

      ctx.restore();
    }
  }

  private drawMines(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const m of this.mines) {
      if (m.x + m.radius < vLeft || m.x - m.radius > vRight || m.y + m.radius < vTop || m.y - m.radius > vBottom) continue;
      ctx.save();
      ctx.translate(m.x, m.y);

      // Faint trigger zone radius
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Mine base
      ctx.fillStyle = '#431407';
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pulsing center sensor
      const pulse = Math.sin(this.matchDuration * 12) > 0;
      ctx.fillStyle = pulse ? '#ef4444' : '#fb923c';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawVortexes(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const v of this.vortexes) {
      if (v.x + v.radius < vLeft || v.x - v.radius > vRight || v.y + v.radius < vTop || v.y - v.radius > vBottom) continue;
      ctx.save();
      ctx.translate(v.x, v.y);

      // Accretion disk glow
      const rot = this.matchDuration * 4;
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, v.radius);
      grad.addColorStop(0, 'rgba(192, 38, 211, 0.55)');
      grad.addColorStop(0.7, 'rgba(147, 51, 234, 0.25)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, v.radius, 0, Math.PI * 2);
      ctx.fill();

      // Spiral gravity arms
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.6)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const offset = (i * Math.PI * 2) / 3 + rot;
        ctx.beginPath();
        for (let r = 15; r <= v.radius; r += 10) {
          const a = offset + (r / v.radius) * 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (r === 15) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Event horizon core
      ctx.fillStyle = '#0f051d';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawMeteors(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const m of this.meteors) {
      if (m.exploded) continue;
      if (m.targetX + m.radius < vLeft || m.targetX - m.radius > vRight || m.targetY + m.radius < vTop || m.targetY - m.radius > vBottom) continue;
      ctx.save();
      ctx.translate(m.targetX, m.targetY);

      // Outer warning zone
      const ratio = clamp(m.delay / 0.8, 0, 1);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inward targeting reticle ring
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius * ratio, 0, Math.PI * 2);
      ctx.stroke();

      // Center crosshair
      ctx.fillStyle = '#5eead4';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawDecoys(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const d of this.decoys) {
      if (d.x + d.radius < vLeft || d.x - d.radius > vRight || d.y + d.radius < vTop || d.y - d.radius > vBottom) continue;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.aimAngle);

      // Holographic scanline glitch
      const isHit = d.damageFlashTimer > 0;
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = isHit ? '#ffffff' : '#c084fc';
      ctx.fillStyle = isHit ? '#ffffff' : 'rgba(168, 85, 247, 0.25)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);

      // Crescent silhouette for Eclipse decoy
      ctx.beginPath();
      ctx.arc(0, 0, d.radius, -Math.PI * 0.65, Math.PI * 0.65, false);
      ctx.arc(d.radius * 0.35, 0, d.radius * 0.75, Math.PI * 0.55, -Math.PI * 0.55, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      // Decoy overhead label
      ctx.restore();
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a78bfa';
      ctx.fillText('SEÑUELO', 0, -d.radius - 8);

      ctx.restore();
    }
  }

  private drawTurrets(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const turret of this.turrets) {
      if (turret.x + turret.radius < vLeft || turret.x - turret.radius > vRight || turret.y + turret.radius < vTop || turret.y - turret.radius > vBottom) continue;
      ctx.save();
      ctx.translate(turret.x, turret.y);

      const isHit = turret.damageFlashTimer > 0;

      // Base shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 3, turret.radius, 0, Math.PI * 2);
      ctx.fill();

      // Octagonal base
      ctx.fillStyle = isHit ? '#ffffff' : turret.team === 'blue' ? '#0284c7' : '#b91c1c';
      ctx.strokeStyle = isHit ? '#ffffff' : turret.team === 'blue' ? '#38bdf8' : '#f87171';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, turret.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Turret rotating barrel
      ctx.save();
      ctx.rotate(turret.aimAngle);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -3, turret.radius + 7, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(turret.radius + 3, -4, 4, 8);
      ctx.restore();

      // Core dome
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, turret.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Duration countdown ring
      const timeRatio = clamp(turret.timeRemaining / turret.duration, 0, 1);
      ctx.strokeStyle = turret.team === 'blue' ? 'rgba(56, 189, 248, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, turret.radius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timeRatio);
      ctx.stroke();

      // Mini Health bar
      const barW = 28;
      const barH = 3;
      const barY = -turret.radius - 8;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(-barW / 2, barY, barW, barH);
      const hpR = clamp(turret.hp / turret.maxHp, 0, 1);
      ctx.fillStyle = turret.team === 'blue' ? '#38bdf8' : '#ef4444';
      ctx.fillRect(-barW / 2, barY, barW * hpR, barH);

      ctx.restore();
    }
  }

  private drawCharacter(ctx: CanvasRenderingContext2D, char: CharacterState): void {
    // 3v3 Shared Vision: Allies are always visible; enemies are visible if ANY living Blue teammate can see them
    if (char.team === 'red') {
      const livingBlueAllies = this.characters.filter((c) => c.team === 'blue' && c.isAlive);
      const isVisibleToBlue = livingBlueAllies.some((ally) => isCharacterVisibleTo(char, ally));

      // If enemy is concealed in bush, behind occluding walls, or out of team vision range, do not render
      if (!isVisibleToBlue) {
        return;
      }
    }

    ctx.save();
    ctx.translate(char.x, char.y);

    // Semi-transparency if inside bush
    if (char.inBush) {
      ctx.globalAlpha = 0.55;
    }

    // Eclipse Stealth Ghost Cloak
    if (char.stealthTimer > 0) {
      ctx.globalAlpha = 0.35;
    }

    // Hit flash
    const isHitFlashing = char.damageFlashTimer > 0;
    const def = HERO_DEFINITIONS[char.heroId];

    // Character Ground Shadow (scales down as character rises airborne)
    const jumpZ = char.jumpHeightZ || 0;
    const shadowScale = Math.max(0.35, 1 - jumpZ / 130);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, char.radius * 0.4, char.radius * shadowScale, (char.radius * 0.6) * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Airborne flight lift
    if (jumpZ > 0) {
      ctx.translate(0, -jumpZ);
      const jumpScale = 1 + (jumpZ / 320);
      ctx.scale(jumpScale, jumpScale);
    }

    // Shield Aura (Bastion Super)
    if (char.shieldActive) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
      ctx.fill();
    }

    // Reactive Barrier Aura (Bastion Gadget)
    if (char.barrierTimer > 0) {
      ctx.strokeStyle = '#6ee7b7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Electronic Speed Boost Aura (Volt Gadget)
    if (char.speedBoostTimer > 0) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Titan Heavy Stabilizer Aura (Titan Gadget)
    if (char.titanStabilityTimer > 0) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 7, 0, Math.PI * 2);
      ctx.stroke();

      // Corner heavy anchors
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const ax = Math.cos(a) * (char.radius + 7);
        const ay = Math.sin(a) * (char.radius + 7);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(ax - 3, ay - 3, 6, 6);
      }
    }

    // Guardian Drone (Cometa Gadget)
    if (char.guardianDroneTimer > 0) {
      const droneAngle = this.matchDuration * 5;
      const dx = Math.cos(droneAngle) * (char.radius + 14);
      const dy = Math.sin(droneAngle) * (char.radius + 14);

      // Light beam
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx, dy);
      ctx.stroke();

      // Orbiting drone
      ctx.fillStyle = '#2dd4bf';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Gravity Slow Aura (Vortex Pulso)
    if (char.slowTimer > 0) {
      ctx.strokeStyle = '#c026d3';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Prismatic Bounce Glow (Prisma Gadget)
    if (char.bounceAttackCharges > 0) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Auto-aim target highlight ring
    if (this.lockedAutoAimTarget && this.lockedAutoAimTarget.id === char.id) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Recoil kickback calculation
    const recoilProgress = (char.recoilTimer || 0) / 0.16;
    const recoilDistance = recoilProgress * 7; // Up to 7px kickback

    // Aim indicator cannon / nose with shooting recoil animation & muzzle glow
    ctx.save();
    ctx.rotate(char.aimAngle);
    // Draw cannon with recoil kickback
    const cannonBaseX = char.radius * 0.5 - recoilDistance;
    const cannonLen = char.radius * 0.8;
    ctx.fillStyle = isHitFlashing ? '#ffffff' : '#334155';
    ctx.fillRect(cannonBaseX, -4, cannonLen, 8);
    // Cannon border/accent
    ctx.strokeStyle = isHitFlashing ? '#ffffff' : (char.team === 'blue' ? '#38bdf8' : '#f87171');
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cannonBaseX, -4, cannonLen, 8);

    // If recently shot (recoil active), draw bright muzzle barrel flash
    if (recoilProgress > 0.4) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cannonBaseX + cannonLen - 2, -5, 5, 10);
    }
    ctx.restore();

    // Shape Body with Running Bobbing, Squash-and-Stretch & Tilt Animation
    ctx.save();

    // Running bobbing offset and squash/stretch
    const isMoving = Math.hypot(char.vx, char.vy) > 15;
    let runBobY = 0;
    let runScaleX = 1;
    let runScaleY = 1;
    let runTilt = 0;

    if (isMoving && char.runCycle !== undefined) {
      runBobY = Math.sin(char.runCycle * 2) * 2.2; // Vertical step bounce
      runScaleX = 1 + Math.cos(char.runCycle * 2) * 0.08; // Squash and stretch
      runScaleY = 1 - Math.cos(char.runCycle * 2) * 0.08;
      runTilt = Math.sin(char.runCycle) * 0.12; // Dynamic stride tilt (body lean)
    }

    ctx.translate(0, runBobY);
    ctx.rotate(char.facingAngle + runTilt);
    ctx.scale(runScaleX, runScaleY);

    ctx.fillStyle = isHitFlashing ? '#ffffff' : char.team === 'blue' ? def.primaryColor : '#dc2626';
    ctx.strokeStyle = isHitFlashing ? '#ffffff' : char.team === 'blue' ? def.accentColor : '#f87171';
    ctx.lineWidth = 3;

    if (char.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, char.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner core
      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      ctx.arc(0, 0, char.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (char.shape === 'triangle') {
      const r = char.radius * 1.25;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.7, -r * 0.8);
      ctx.lineTo(-r * 0.7, r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      ctx.moveTo(r * 0.3, 0);
      ctx.lineTo(-r * 0.3, -r * 0.4);
      ctx.lineTo(-r * 0.3, r * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (char.shape === 'square') {
      const half = char.radius * 0.9;
      ctx.beginPath();
      ctx.rect(-half, -half, half * 2, half * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.fillRect(-half * 0.5, -half * 0.5, half, half);
    } else if (char.shape === 'hexagon') {
      const r = char.radius;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = Math.cos(a) * r;
        const hy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = Math.cos(a) * (r * 0.45);
        const hy = Math.sin(a) * (r * 0.45);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (char.shape === 'diamond') {
      // Prisma
      const r = char.radius * 1.15;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(0, -r * 0.85);
      ctx.lineTo(-r, 0);
      ctx.lineTo(0, r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      ctx.moveTo(r * 0.4, 0);
      ctx.lineTo(0, -r * 0.35);
      ctx.lineTo(-r * 0.4, 0);
      ctx.lineTo(0, r * 0.35);
      ctx.closePath();
      ctx.fill();
    } else if (char.shape === 'octagon') {
      // Boom
      const r = char.radius;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 8;
        const ox = Math.cos(a) * r;
        const oy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 - Math.PI / 8;
        const ox = Math.cos(a) * (r * 0.45);
        const oy = Math.sin(a) * (r * 0.45);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (char.shape === 'crescent') {
      // Eclipse
      const r = char.radius * 1.05;
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI * 0.65, Math.PI * 0.65, false);
      ctx.arc(r * 0.35, 0, r * 0.75, Math.PI * 0.55, -Math.PI * 0.55, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      ctx.arc(-r * 0.25, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (char.shape === 'star') {
      // Cometa
      const r = char.radius * 1.15;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? r : r * 0.48;
        const a = (i * Math.PI) / 4;
        const sx = Math.cos(a) * rad;
        const sy = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (char.shape === 'shield') {
      // Titan
      const r = char.radius * 1.05;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.8);
      ctx.lineTo(r * 0.85, -r * 0.8);
      ctx.lineTo(r * 0.85, 0);
      ctx.quadraticCurveTo(r * 0.85, r * 0.85, 0, r * 1.05);
      ctx.quadraticCurveTo(-r * 0.85, r * 0.85, -r * 0.85, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.fillRect(-r * 0.35, -r * 0.45, r * 0.7, r * 0.7);
    } else if (char.shape === 'pentagon') {
      // Vortex
      const r = char.radius;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isHitFlashing ? '#ffffff' : def.darkColor;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(a) * (r * 0.45);
        const py = Math.sin(a) * (r * 0.45);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Overhead Health & Energy Bars
    const barWidth = 44;
    const barHeight = 5;
    const barY = -char.radius - 18;

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // HP Fill
    const hpRatio = clamp(char.hp / char.maxHp, 0, 1);
    const hpColor = char.team === 'blue' ? (char.isPlayer ? '#38bdf8' : '#60a5fa') : '#ef4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);

    // HP border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

    // Energy Mini-Bar (Gold when full with pulsing glow)
    const energyY = barY + barHeight + 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(-barWidth / 2, energyY, barWidth, 3);

    const isFullEnergy = char.energy >= 100;
    const energyRatio = clamp(char.energy / char.maxEnergy, 0, 1);
    
    if (isFullEnergy) {
      const pulse = 1 + Math.sin(this.matchDuration * 8) * 0.15;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-barWidth / 2, energyY - 0.5, barWidth, 4);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1 * pulse;
      ctx.strokeRect(-barWidth / 2, energyY - 0.5, barWidth, 4);
    } else {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-barWidth / 2, energyY, barWidth * energyRatio, 3);
    }

    // Potenciador Recharge / Ready overhead indicator
    const pipsY = energyY + 5;
    const isGadgetReady = (char.gadgetCooldownTimer || 0) <= 0;
    if (isGadgetReady) {
      // Glow dot indicating Potenciador is armed & ready
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(0, pipsY + 1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Mini recharging progress bar
      const cd = def.gadget.cooldown;
      const progress = Math.max(0, 1 - (char.gadgetCooldownTimer || 0) / cd);
      const miniW = 18;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-miniW / 2, pipsY, miniW, 2.5);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-miniW / 2, pipsY, miniW * progress, 2.5);
    }

    // Name Label
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = char.isPlayer ? '#38bdf8' : '#e2e8f0';
    ctx.fillText(char.name, 0, barY - 4);

    // Capture the Flag: Draw carried flag on character's back
    const isCarryingBlue = this.blueFlag?.carrierId === char.id;
    const isCarryingRed = this.redFlag?.carrierId === char.id;
    if (isCarryingBlue || isCarryingRed) {
      const flagCol = isCarryingBlue ? '#38bdf8' : '#ef4444';
      const wave = Math.sin(this.matchDuration * 10) * 3;
      ctx.save();
      // Glowing aura circle
      ctx.strokeStyle = flagCol;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, char.radius + 10, 0, Math.PI * 2);
      ctx.stroke();

      // Flag pole
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -char.radius - 32, 4, 34);
      // Gold Finial
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -char.radius - 33, 4, 0, Math.PI * 2);
      ctx.fill();
      // Flag banner
      ctx.fillStyle = flagCol;
      ctx.beginPath();
      ctx.moveTo(2, -char.radius - 32);
      ctx.lineTo(24 + wave, -char.radius - 23);
      ctx.lineTo(2, -char.radius - 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const proj of this.projectiles) {
      if (proj.x + proj.radius < vLeft || proj.x - proj.radius > vRight || proj.y + proj.radius < vTop || proj.y - proj.radius > vBottom) continue;
      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Glow halo
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 1.5, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35;
      ctx.fill();

      // Core projectile
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const p of this.particles) {
      if (p.x + p.radius < vLeft || p.x - p.radius > vRight || p.y + p.radius < vTop || p.y - p.radius > vBottom) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'square') {
        ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, vLeft: number, vRight: number, vTop: number, vBottom: number): void {
    for (const t of this.floatingTexts) {
      if (t.x < vLeft || t.x > vRight || t.y < vTop || t.y > vBottom) continue;
      ctx.save();
      const alpha = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  /**
   * Draws screen-space announcements (intermission between Knockout rounds, series score, round banner)
   */
  private drawScreenSpaceHUD(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.roundState === 'ROUND_INTERMISSION') {
      ctx.save();
      // Backdrop vignette
      ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 - 30;

      // Banner card
      const bannerW = Math.min(460, width - 40);
      const bannerH = 140;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = this.roundWinnerTeam === 'blue' ? '#38bdf8' : this.roundWinnerTeam === 'red' ? '#ef4444' : '#facc15';
      ctx.lineWidth = 2.5;

      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(centerX - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH, 18);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(centerX - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);
        ctx.strokeRect(centerX - bannerW / 2, centerY - bannerH / 2, bannerW, bannerH);
      }

      // Round Title
      ctx.font = '900 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = this.roundWinnerTeam === 'blue' ? '#38bdf8' : this.roundWinnerTeam === 'red' ? '#ef4444' : '#facc15';
      const roundResultText =
        this.roundWinnerTeam === 'blue'
          ? `¡EQUIPO AZUL GANA LA RONDA ${this.currentRound}!`
          : this.roundWinnerTeam === 'red'
          ? `¡EQUIPO ROJO GANA LA RONDA ${this.currentRound}!`
          : `¡RONDA ${this.currentRound} EN EMPATE!`;
      ctx.fillText(roundResultText, centerX, centerY - 20);

      // Series Score
      ctx.font = '700 15px Outfit, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(
        `SERIE AL MEJOR DE 3:  AZUL ${this.blueRoundsWon} - ${this.redRoundsWon} ROJO`,
        centerX,
        centerY + 12
      );

      // Countdown to next round
      ctx.font = 'bold 12px Outfit, monospace';
      ctx.fillStyle = '#94a3b8';
      const secsLeft = Math.max(1, Math.ceil(this.roundTransitionTimer));
      ctx.fillText(`Preparando Ronda ${this.currentRound + 1} en ${secsLeft}s...`, centerX, centerY + 40);

      ctx.restore();
    }
  }

  private drawPlayerAimReticle(ctx: CanvasRenderingContext2D): void {
    const player = this.getPlayer();
    if (!player || !player.isAlive || this.matchEnded) return;

    const isJoystickAiming = this.joystickAimInput?.isAiming ?? false;
    const isSuperAiming = isJoystickAiming && Boolean(this.joystickAimInput?.isSuper);
    const def = HERO_DEFINITIONS[player.heroId];

    // Determine aim distance based on super vs basic attack
    const aimDist = isSuperAiming
      ? player.heroId === 'pulsar'
        ? 520
        : player.heroId === 'volt'
        ? 340
        : player.heroId === 'bastion'
        ? 220
        : player.heroId === 'prisma'
        ? 150
        : player.heroId === 'titan'
        ? 180
        : player.heroId === 'boom'
        ? 260
        : player.heroId === 'cometa'
        ? 290
        : player.heroId === 'vortex'
        ? 260
        : 280
      : Math.min(player.range, 320);

    const targetX = player.x + Math.cos(player.aimAngle) * aimDist;
    const targetY = player.y + Math.sin(player.aimAngle) * aimDist;

    ctx.save();

    if (isSuperAiming) {
      // ==========================================
      // SUPER AIM JOYSTICK TRAJECTORY (Radiant Gold)
      // ==========================================
      const pulse = 1 + Math.sin(this.matchDuration * 8) * 0.12;

      // 1. Radiant Gold Trajectory Corridor
      const superGrad = ctx.createLinearGradient(player.x, player.y, targetX, targetY);
      superGrad.addColorStop(0, 'rgba(250, 204, 21, 0.65)');
      superGrad.addColorStop(1, 'rgba(245, 158, 11, 0.15)');

      ctx.strokeStyle = superGrad;
      ctx.lineWidth = 22 * pulse;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // 2. High-contrast golden laser dashed line
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Super Reticle Head with Dual Rings
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 20 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 28 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Center Gold Star / Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
      ctx.fill();

      // 5. Hero-Specific Super Targeting Visuals
      if (player.heroId === 'volt') {
        // Dash Arrowhead
        const arrowAngle = player.aimAngle;
        const arrowSize = 26;
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(
          targetX + Math.cos(arrowAngle) * arrowSize,
          targetY + Math.sin(arrowAngle) * arrowSize
        );
        ctx.lineTo(
          targetX + Math.cos(arrowAngle + 2.5) * arrowSize,
          targetY + Math.sin(arrowAngle + 2.5) * arrowSize
        );
        ctx.lineTo(
          targetX + Math.cos(arrowAngle - 2.5) * arrowSize,
          targetY + Math.sin(arrowAngle - 2.5) * arrowSize
        );
        ctx.closePath();
        ctx.fill();
      } else if (player.heroId === 'bastion') {
        // Protective Shield Dome Radius
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 110, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.heroId === 'nova') {
        // Healing Pulse Zone
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 220, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.heroId === 'prisma') {
        // Barrier outline preview
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(player.aimAngle + Math.PI / 2);
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 3;
        ctx.strokeRect(-38, -10, 76, 20);
        ctx.restore();
      } else if (player.heroId === 'boom') {
        // Cluster AoE Bombardment Ring
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 65, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.heroId === 'eclipse') {
        // Shadow leap zone
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.heroId === 'cometa') {
        // Orbital Strike Impact Zone
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 70, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.heroId === 'titan') {
        // Radial Seismic Shockwave Zone
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 180, 0, Math.PI * 2);
        ctx.stroke();
      } else if (player.heroId === 'vortex') {
        // Gravitational Singularity Pull Field
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 145, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 6. Glowing text badge
      ctx.font = '900 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('★ SÚPER APUNTADO ★', targetX, targetY - 32);

    } else if (isJoystickAiming) {
      // ==========================================
      // ATTACK AIM JOYSTICK TRAJECTORY (Cyan / Hero)
      // ==========================================
      const grad = ctx.createLinearGradient(player.x, player.y, targetX, targetY);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // 2. High-contrast dashed laser line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Hero-specific basic attack previews
      if (player.heroId === 'prisma') {
        // Show 3 fan spread paths
        const fanOffsets = [-0.18, 0.18];
        fanOffsets.forEach((fo) => {
          const fx = player.x + Math.cos(player.aimAngle + fo) * aimDist;
          const fy = player.y + Math.sin(player.aimAngle + fo) * aimDist;
          ctx.strokeStyle = 'rgba(103, 232, 249, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(player.x, player.y);
          ctx.lineTo(fx, fy);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      } else if (player.heroId === 'boom') {
        // Show bomb landing AoE circle
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 45, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Aiming reticle ring at tip
      ctx.strokeStyle = def.accentColor || '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // 5. Center bullseye dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
      ctx.fill();

      // 6. Hero attack range boundary arc
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, aimDist, player.aimAngle - 0.35, player.aimAngle + 0.35);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Standard laser line
      ctx.strokeStyle =
        this.autoAimActive && this.lockedAutoAimTarget
          ? 'rgba(250, 204, 21, 0.5)'
          : 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair dot
      ctx.fillStyle = this.autoAimActive && this.lockedAutoAimTarget ? '#facc15' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==========================================
  // CAPTURE THE FLAG (CTF) GAMEPLAY & RENDERING
  // ==========================================
  private updateCTF(dt: number): void {
    if (this.progress.selectedMode !== 'ctf') return;
    if (!this.blueFlag || !this.redFlag) return;

    // 1. Update Blue Flag Carrier
    if (this.blueFlag.isCarried) {
      const carrier = this.characters.find((c) => c.id === this.blueFlag!.carrierId);
      if (carrier && carrier.isAlive) {
        this.blueFlag.x = carrier.x;
        this.blueFlag.y = carrier.y;

        // Particle trail
        if (Math.random() < 0.4) {
          this.addParticle({
            x: carrier.x,
            y: carrier.y - 12,
            vx: -carrier.vx * 0.1,
            vy: -carrier.vy * 0.1,
            radius: 3,
            color: '#38bdf8',
            life: 0.25,
            maxLife: 0.25,
            alpha: 0.8,
          });
        }

        // Check if Red carrier brought Blue Flag to Red Base
        const distToBase = distance(carrier.x, carrier.y, this.redFlag.baseX, this.redFlag.baseY);
        if (distToBase < 70) {
          // RED TEAM SCORES!
          this.redScore += 1;
          this.blueFlag.isCarried = false;
          this.blueFlag.carrierId = null;
          this.blueFlag.isDropped = false;
          this.blueFlag.x = this.blueFlag.baseX;
          this.blueFlag.y = this.blueFlag.baseY;

          sounds.playDefeat();
          this.addFloatingText(this.cameraX, this.cameraY - 60, `¡¡PUNTO PARA EQUIPO ROJO!! (${this.blueScore} - ${this.redScore})`, '#ef4444');

          if (this.redScore >= 2) {
            this.checkEndConditions(false);
          }
        }
      } else {
        this.blueFlag.isCarried = false;
        this.blueFlag.carrierId = null;
        this.blueFlag.isDropped = true;
        this.blueFlag.dropTimer = 15;
      }
    } else if (this.blueFlag.isDropped) {
      this.blueFlag.dropTimer -= dt;
      if (this.blueFlag.dropTimer <= 0) {
        this.blueFlag.isDropped = false;
        this.blueFlag.x = this.blueFlag.baseX;
        this.blueFlag.y = this.blueFlag.baseY;
        this.addFloatingText(this.cameraX, this.cameraY - 40, 'Bandera Azul devuelta a base', '#38bdf8');
      }
    }

    // 2. Update Red Flag Carrier
    if (this.redFlag.isCarried) {
      const carrier = this.characters.find((c) => c.id === this.redFlag!.carrierId);
      if (carrier && carrier.isAlive) {
        this.redFlag.x = carrier.x;
        this.redFlag.y = carrier.y;

        // Particle trail
        if (Math.random() < 0.4) {
          this.addParticle({
            x: carrier.x,
            y: carrier.y - 12,
            vx: -carrier.vx * 0.1,
            vy: -carrier.vy * 0.1,
            radius: 3,
            color: '#ef4444',
            life: 0.25,
            maxLife: 0.25,
            alpha: 0.8,
          });
        }

        // Check if Blue carrier brought Red Flag to Blue Base
        const distToBase = distance(carrier.x, carrier.y, this.blueFlag.baseX, this.blueFlag.baseY);
        if (distToBase < 70) {
          // BLUE TEAM SCORES!
          this.blueScore += 1;
          this.redFlag.isCarried = false;
          this.redFlag.carrierId = null;
          this.redFlag.isDropped = false;
          this.redFlag.x = this.redFlag.baseX;
          this.redFlag.y = this.redFlag.baseY;

          sounds.playVictory();
          this.addFloatingText(this.cameraX, this.cameraY - 60, `¡¡PUNTO PARA EQUIPO AZUL!! (${this.blueScore} - ${this.redScore})`, '#38bdf8');

          if (this.blueScore >= 2) {
            this.checkEndConditions(false);
          }
        }
      } else {
        this.redFlag.isCarried = false;
        this.redFlag.carrierId = null;
        this.redFlag.isDropped = true;
        this.redFlag.dropTimer = 15;
      }
    } else if (this.redFlag.isDropped) {
      this.redFlag.dropTimer -= dt;
      if (this.redFlag.dropTimer <= 0) {
        this.redFlag.isDropped = false;
        this.redFlag.x = this.redFlag.baseX;
        this.redFlag.y = this.redFlag.baseY;
        this.addFloatingText(this.cameraX, this.cameraY - 40, 'Bandera Roja devuelta a base', '#ef4444');
      }
    }

    // 3. Proximity Pickups & Returns
    for (const char of this.characters) {
      if (!char.isAlive) continue;

      // Blue Flag interaction
      if (!this.blueFlag.isCarried) {
        const d = distance(char.x, char.y, this.blueFlag.x, this.blueFlag.y);
        if (d < char.radius + 30) {
          if (char.team === 'red') {
            // Enemy takes blue flag
            this.blueFlag.isCarried = true;
            this.blueFlag.carrierId = char.id;
            this.blueFlag.isDropped = false;
            sounds.playHit();
            this.addFloatingText(char.x, char.y - 45, '¡Bandera Azul Robada!', '#ef4444');
          } else if (char.team === 'blue' && this.blueFlag.isDropped) {
            // Friendly recovers dropped blue flag
            this.blueFlag.isDropped = false;
            this.blueFlag.x = this.blueFlag.baseX;
            this.blueFlag.y = this.blueFlag.baseY;
            sounds.playShield();
            this.addFloatingText(char.x, char.y - 45, '¡Bandera Azul Recuperada!', '#38bdf8');
          }
        }
      }

      // Red Flag interaction
      if (!this.redFlag.isCarried) {
        const d = distance(char.x, char.y, this.redFlag.x, this.redFlag.y);
        if (d < char.radius + 30) {
          if (char.team === 'blue') {
            // Friendly takes red flag
            this.redFlag.isCarried = true;
            this.redFlag.carrierId = char.id;
            this.redFlag.isDropped = false;
            sounds.playVictory();
            this.addFloatingText(char.x, char.y - 45, char.isPlayer ? '¡TIENES LA BANDERA! ¡CORRE A BASE!' : '¡Bandera Roja Robada!', '#38bdf8');
          } else if (char.team === 'red' && this.redFlag.isDropped) {
            // Enemy recovers dropped red flag
            this.redFlag.isDropped = false;
            this.redFlag.x = this.redFlag.baseX;
            this.redFlag.y = this.redFlag.baseY;
            sounds.playShield();
            this.addFloatingText(char.x, char.y - 45, '¡Bandera Roja Recuperada!', '#ef4444');
          }
        }
      }
    }
  }

  private drawCTFFlags(ctx: CanvasRenderingContext2D): void {
    if (this.progress.selectedMode !== 'ctf') return;
    if (!this.blueFlag || !this.redFlag) return;

    // Draw Blue Base Pedestal
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.blueFlag.baseX, this.blueFlag.baseY, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.restore();

    // Draw Red Base Pedestal
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.redFlag.baseX, this.redFlag.baseY, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.restore();

    // Draw Blue Flag if on ground
    if (!this.blueFlag.isCarried) {
      this.drawSingleFlag(ctx, this.blueFlag.x, this.blueFlag.y, 'blue', this.blueFlag.isDropped);
    }

    // Draw Red Flag if on ground
    if (!this.redFlag.isCarried) {
      this.drawSingleFlag(ctx, this.redFlag.x, this.redFlag.y, 'red', this.redFlag.isDropped);
    }
  }

  private drawSingleFlag(ctx: CanvasRenderingContext2D, x: number, y: number, team: 'blue' | 'red', isDropped: boolean): void {
    const wave = Math.sin(this.matchDuration * 8) * 4;
    const flagColor = team === 'blue' ? '#38bdf8' : '#ef4444';

    ctx.save();
    ctx.translate(x, y);

    // Glowing ground aura
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = team === 'blue' ? 'rgba(56, 189, 248, 0.28)' : 'rgba(239, 68, 68, 0.28)';
    ctx.fill();

    // Pole
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-2, -36, 4, 38);

    // Golden Pole Finial
    ctx.beginPath();
    ctx.arc(0, -38, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Flag Pennant
    ctx.beginPath();
    ctx.moveTo(2, -36);
    ctx.lineTo(26 + wave, -26);
    ctx.lineTo(2, -16);
    ctx.closePath();
    ctx.fillStyle = flagColor;
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (isDropped) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EN SUELO', 0, -44);
    }

    ctx.restore();
  }

  private drawFlagCompassIndicators(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.progress.selectedMode !== 'ctf') return;
    if (!this.blueFlag || !this.redFlag) return;

    const player = this.getPlayer();
    if (!player) return;

    const halfCanvasW = width / 2;
    const halfCanvasH = height / 2;

    const flagsToTrack = [
      { flag: this.blueFlag, label: 'AZUL', color: '#38bdf8' },
      { flag: this.redFlag, label: 'ROJO', color: '#ef4444' },
    ];

    for (const { flag, label, color } of flagsToTrack) {
      const fx = flag.x;
      const fy = flag.y;

      const screenX = (fx - this.cameraX) * this.screenScale + halfCanvasW;
      const screenY = (fy - this.cameraY) * this.screenScale + halfCanvasH;

      const margin = 50;
      const isOffScreen = screenX < margin || screenX > width - margin || screenY < margin || screenY > height - margin;

      if (isOffScreen) {
        const angle = Math.atan2(fy - this.cameraY, fx - this.cameraX);
        const clampX = Math.max(margin, Math.min(width - margin, halfCanvasW + Math.cos(angle) * (halfCanvasW - margin)));
        const clampY = Math.max(margin, Math.min(height - margin, halfCanvasH + Math.sin(angle) * (halfCanvasH - margin)));

        const distMeters = Math.round(distance(player.x, player.y, fx, fy) / 10);

        ctx.save();
        ctx.translate(clampX, clampY);

        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-6, -8);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.rotate(-angle);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🚩 ${label} ${distMeters}m`, 0, 16);

        ctx.restore();
      }
    }
  }

  // ========================================================
  // INTERACTIVE ARENA MECHANICS & GAME MODE MAÑAS
  // ========================================================
  private updateArenaMechanics(dt: number): void {
    // 1. Update Airborne Characters (Jump Pads Flight Trajectory)
    for (const char of this.characters) {
      if (!char.isAlive) continue;

      if (char.isAirborne && char.jumpTimer !== undefined && char.jumpDuration !== undefined) {
        char.jumpTimer -= dt;
        const progress = clamp(1 - (char.jumpTimer / char.jumpDuration), 0, 1);

        const startX = char.jumpStartX || char.x;
        const startY = char.jumpStartY || char.y;
        const targetX = char.jumpTargetX || char.x;
        const targetY = char.jumpTargetY || char.y;

        char.x = startX + (targetX - startX) * progress;
        char.y = startY + (targetY - startY) * progress;
        char.jumpHeightZ = Math.sin(progress * Math.PI) * 85;

        // Airborne particle trail
        if (Math.random() < 0.4) {
          this.addParticle({
            x: char.x + (Math.random() - 0.5) * 14,
            y: char.y + (Math.random() - 0.5) * 14,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            radius: 4,
            color: '#38bdf8',
            life: 0.25,
            maxLife: 0.25,
            alpha: 0.8,
            shape: 'spark',
          });
        }

        // Landing!
        if (char.jumpTimer <= 0) {
          char.isAirborne = false;
          char.jumpHeightZ = 0;
          char.x = targetX;
          char.y = targetY;

          this.addFloatingText(char.x, char.y - 35, '¡IMPACTO SÍSMICO!', '#38bdf8');
          sounds.playShield();

          // Shockwave particles
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const spd = 140 + Math.random() * 80;
            this.addParticle({
              x: char.x,
              y: char.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              radius: 4,
              color: '#38bdf8',
              life: 0.35,
              maxLife: 0.35,
              alpha: 0.9,
              shape: 'spark',
            });
          }

          // Damage & knockback enemies within 130 units
          for (const enemy of this.characters) {
            if (enemy.isAlive && enemy.team !== char.team && !enemy.isAirborne) {
              const d = distance(char.x, char.y, enemy.x, enemy.y);
              if (d < 130) {
                this.applyDamage(enemy, 22, char);
                const kbAngle = Math.atan2(enemy.y - char.y, enemy.x - char.x);
                enemy.x += Math.cos(kbAngle) * 60;
                enemy.y += Math.sin(kbAngle) * 60;
                this.addFloatingText(enemy.x, enemy.y - 20, '-22 SÍSMICO', '#38bdf8');
              }
            }
          }
        }
      }
    }

    // 2. Jump Pads Activation
    for (const pad of this.jumpPads) {
      if (pad.cooldownTimer > 0) {
        pad.cooldownTimer = Math.max(0, pad.cooldownTimer - dt);
      } else {
        for (const char of this.characters) {
          if (!char.isAlive || char.isAirborne || char.isDashing) continue;

          if (
            char.x >= pad.x &&
            char.x <= pad.x + pad.w &&
            char.y >= pad.y &&
            char.y <= pad.y + pad.h
          ) {
            pad.cooldownTimer = pad.rechargeDuration;
            char.isAirborne = true;
            char.jumpStartX = char.x;
            char.jumpStartY = char.y;
            char.jumpTargetX = pad.targetX;
            char.jumpTargetY = pad.targetY;
            char.jumpDuration = 0.85;
            char.jumpTimer = 0.85;
            char.jumpHeightZ = 0;

            sounds.playJumpPad();
            this.addFloatingText(char.x, char.y - 30, '¡SALTO CUÁNTICO!', '#38bdf8');

            for (let i = 0; i < 12; i++) {
              const a = Math.random() * Math.PI * 2;
              const spd = 60 + Math.random() * 80;
              this.addParticle({
                x: char.x,
                y: char.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                radius: 3.5,
                color: '#38bdf8',
                life: 0.28,
                maxLife: 0.28,
                alpha: 0.9,
              });
            }
            break;
          }
        }
      }
    }

    // 3. Speed Boost Pads (Turbo-Tiles)
    for (const pad of this.speedPads) {
      for (const char of this.characters) {
        if (!char.isAlive || char.isAirborne) continue;

        if (
          char.x >= pad.x &&
          char.x <= pad.x + pad.w &&
          char.y >= pad.y &&
          char.y <= pad.y + pad.h
        ) {
          if (!char.boostPadTimer || char.boostPadTimer <= 0.2) {
            char.boostPadTimer = pad.boostDuration;
            if (char.isPlayer) {
              sounds.playSpeedBoost();
              this.addFloatingText(char.x, char.y - 25, '¡TURBO-ACELERACIÓN!', '#38bdf8');
            }
          }
        }
      }
    }

    // 4. Healing Stations
    for (const hs of this.healthStations) {
      hs.pulseTimer = (hs.pulseTimer + dt) % 1.0;
      for (const char of this.characters) {
        if (!char.isAlive || char.isAirborne) continue;

        const d = distance(char.x, char.y, hs.x, hs.y);
        if (d <= hs.radius) {
          if (char.hp < char.maxHp) {
            char.hp = Math.min(char.maxHp, char.hp + hs.healRate * dt);
            if (Math.random() < 0.2) {
              this.addParticle({
                x: char.x + (Math.random() - 0.5) * 16,
                y: char.y + (Math.random() - 0.5) * 16,
                vx: 0,
                vy: -30,
                radius: 3,
                color: '#22c55e',
                life: 0.3,
                maxLife: 0.3,
                alpha: 0.8,
                shape: 'spark',
              });
            }
          }
        }
      }
    }

    // 5. Power Orbs (Center Diamond Super Crystal)
    for (const orb of this.powerOrbs) {
      if (!orb.isAvailable) {
        orb.respawnTimer -= dt;
        if (orb.respawnTimer <= 0) {
          orb.isAvailable = true;
          this.addFloatingText(orb.x, orb.y - 30, '¡ORBE DE PODER REAPARECIDO!', '#38bdf8');
          sounds.playPowerOrb();
        }
      } else {
        orb.pulseCycle = (orb.pulseCycle + dt * 3) % (Math.PI * 2);
        for (const char of this.characters) {
          if (!char.isAlive || char.isAirborne) continue;

          const d = distance(char.x, char.y, orb.x, orb.y);
          if (d <= orb.radius + char.radius) {
            orb.isAvailable = false;
            orb.respawnTimer = 20;
            char.energy = Math.min(100, char.energy + orb.energyBoost);
            char.speedBoostTimer = 2.5;

            sounds.playPowerOrb();
            this.addFloatingText(char.x, char.y - 35, `¡SÚPER ENERGÍA +${orb.energyBoost}%!`, '#38bdf8');

            for (let i = 0; i < 14; i++) {
              const a = Math.random() * Math.PI * 2;
              const spd = 70 + Math.random() * 100;
              this.addParticle({
                x: orb.x,
                y: orb.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                radius: 3.5,
                color: '#38bdf8',
                life: 0.35,
                maxLife: 0.35,
                alpha: 0.95,
                shape: 'spark',
              });
            }
            break;
          }
        }
      }
    }

    // 6. Spike Traps in Bushes
    for (const trap of this.spikeTraps) {
      if (!trap.isArmed) {
        trap.rearmTimer -= dt;
        if (trap.rearmTimer <= 0) {
          trap.isArmed = true;
        }
      } else {
        for (const char of this.characters) {
          if (!char.isAlive || char.isAirborne) continue;

          const d = distance(char.x, char.y, trap.x, trap.y);
          if (d <= trap.radius + char.radius * 0.4) {
            trap.isArmed = false;
            trap.rearmTimer = 14;
            char.spikeSlowTimer = 2.2;
            char.revealedTimer = 2.8;

            this.applyDamage(char, trap.damage);
            sounds.playTrapSnap();
            this.addFloatingText(char.x, char.y - 35, '¡TRAMPA DE PÚAS!', '#f43f5e');

            for (let i = 0; i < 10; i++) {
              const a = Math.random() * Math.PI * 2;
              const spd = 50 + Math.random() * 90;
              this.addParticle({
                x: trap.x,
                y: trap.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                radius: 3,
                color: '#f43f5e',
                life: 0.3,
                maxLife: 0.3,
                alpha: 0.9,
              });
            }
            break;
          }
        }
      }
    }

    // 7. Mode-Specific Gimmick: 3v3 Poison Cloud Encroachment
    if ((this.progress.selectedMode === '3v3' || !this.progress.selectedMode) && this.roundState === 'ROUND_ACTIVE') {
      if (this.matchTimer <= 32) {
        this.poisonGasDistance = (32 - this.matchTimer) * 20;

        if (!this.poisonAlertTriggered) {
          this.poisonAlertTriggered = true;
          this.activeModifierAlert = '⚠️ ¡NIEBLA VENENOSA CERRÁNDOSE!';
          this.modifierAlertTimer = 4.0;
          sounds.playWarningAlert();
        }

        const gasDist = this.poisonGasDistance;
        for (const char of this.characters) {
          if (!char.isAlive || char.isAirborne) continue;

          const inGas =
            char.x < gasDist ||
            char.x > ARENA_WIDTH - gasDist ||
            char.y < gasDist ||
            char.y > ARENA_HEIGHT - gasDist;

          if (inGas) {
            char.hp = Math.max(0, char.hp - 12 * dt);
            char.damageFlashTimer = 0.08;
            if (char.hp <= 0) {
              char.isAlive = false;
              this.addFloatingText(char.x, char.y - 25, '¡ELIMINADO POR NIEBLA!', '#22c55e');
            } else if (Math.random() < 0.18) {
              this.addParticle({
                x: char.x + (Math.random() - 0.5) * 16,
                y: char.y + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 20,
                vy: -35,
                radius: 4,
                color: '#22c55e',
                life: 0.3,
                maxLife: 0.3,
                alpha: 0.8,
              });
            }
          }
        }
      }
    }

    // 8. Mode-Specific Gimmick: 1v1 Sudden Death
    if (this.progress.selectedMode === '1v1' && this.roundState === 'ROUND_ACTIVE') {
      if (this.matchTimer <= 45 && !this.suddenDeathAlertTriggered) {
        this.suddenDeathAlertTriggered = true;
        this.activeModifierAlert = '⚡ ¡MUERTE SÚBITA! DAÑO CRÍTICO +35%';
        this.modifierAlertTimer = 4.0;
        sounds.playWarningAlert();
      }
    }

    // 9. Mode-Specific Gimmick: CTF Radar Ping for Flag Carrier
    if (this.progress.selectedMode === 'ctf' && (this.blueFlag?.isCarried || this.redFlag?.isCarried)) {
      this.ctfRadarTimer += dt;
      if (this.ctfRadarTimer >= 2.0) {
        this.ctfRadarTimer = 0;
        const carriedFlags = [this.blueFlag, this.redFlag].filter((f) => f && f.isCarried);
        for (const f of carriedFlags) {
          if (!f) continue;
          const carrier = this.characters.find((c) => c.id === f.carrierId);
          if (carrier && carrier.isAlive) {
            carrier.revealedTimer = 1.6;
            sounds.playRadarPing();
            this.addFloatingText(carrier.x, carrier.y - 45, '📡 ¡RADAR BANDERA!', f.team === 'blue' ? '#38bdf8' : '#ef4444');
          }
        }
      }
    }
  }

  private drawArenaMechanics(
    ctx: CanvasRenderingContext2D,
    viewLeft: number,
    viewRight: number,
    viewTop: number,
    viewBottom: number
  ): void {
    // 1. Draw Jump Pads (Trampolines Cuánticos)
    for (const pad of this.jumpPads) {
      if (
        pad.x + pad.w < viewLeft ||
        pad.x > viewRight ||
        pad.y + pad.h < viewTop ||
        pad.y > viewBottom
      ) {
        continue;
      }

      ctx.save();
      const cx = pad.x + pad.w / 2;
      const cy = pad.y + pad.h / 2;

      // Base plate
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = pad.cooldownTimer > 0 ? '#475569' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 12);
      ctx.fill();
      ctx.stroke();

      // Launch Angle towards target
      const angle = Math.atan2(pad.targetY - cy, pad.targetX - cx);

      // Glowing animated chevron arrows
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const animOffset = (this.matchDuration * 4) % 1;
      const arrowAlpha = pad.cooldownTimer > 0 ? 0.3 : 0.8 + Math.sin(this.matchDuration * 5) * 0.2;

      ctx.fillStyle = pad.cooldownTimer > 0 ? '#64748b' : `rgba(56, 189, 248, ${arrowAlpha})`;
      for (let i = -1; i <= 1; i++) {
        const ox = (i + animOffset) * 12;
        ctx.beginPath();
        ctx.moveTo(ox + 6, 0);
        ctx.lineTo(ox - 6, -10);
        ctx.lineTo(ox - 2, 0);
        ctx.lineTo(ox - 6, 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Cooldown indicator ring
      if (pad.cooldownTimer > 0) {
        const ratio = pad.cooldownTimer / pad.rechargeDuration;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, pad.w * 0.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 2. Draw Speed Boost Pads (Turbo-Tiles)
    for (const pad of this.speedPads) {
      if (
        pad.x + pad.w < viewLeft ||
        pad.x > viewRight ||
        pad.y + pad.h < viewTop ||
        pad.y > viewBottom
      ) {
        continue;
      }

      ctx.save();
      const cx = pad.x + pad.w / 2;
      const cy = pad.y + pad.h / 2;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pad.x, pad.y, pad.w, pad.h, 8);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(pad.directionAngle);

      const pulse = (this.matchDuration * 5) % 1;
      ctx.fillStyle = '#facc15';
      for (let i = -2; i <= 2; i++) {
        const ox = (i + pulse) * 16;
        ctx.beginPath();
        ctx.moveTo(ox + 6, 0);
        ctx.lineTo(ox - 6, -8);
        ctx.lineTo(ox - 2, 0);
        ctx.lineTo(ox - 6, 8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      ctx.restore();
    }

    // 3. Draw Healing Stations (Estaciones de Nanorobots)
    for (const hs of this.healthStations) {
      if (
        hs.x + hs.radius < viewLeft ||
        hs.x - hs.radius > viewRight ||
        hs.y + hs.radius < viewTop ||
        hs.y - hs.radius > viewBottom
      ) {
        continue;
      }

      ctx.save();
      // Pulsing green aura
      const pulseR = hs.radius + Math.sin(this.matchDuration * 3) * 6;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, pulseR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center cross pod
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Medical Plus Symbol
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hs.x - 3, hs.y - 10, 6, 20);
      ctx.fillRect(hs.x - 10, hs.y - 3, 20, 6);

      ctx.restore();
    }

    // 4. Draw Power Orbs (Centro Neurálgico)
    for (const orb of this.powerOrbs) {
      if (
        orb.x + orb.radius + 30 < viewLeft ||
        orb.x - orb.radius - 30 > viewRight ||
        orb.y + orb.radius + 30 < viewTop ||
        orb.y - orb.radius - 30 > viewBottom
      ) {
        continue;
      }

      ctx.save();
      const hoverY = orb.y + Math.sin(this.matchDuration * 4) * 6;

      if (orb.isAvailable) {
        // Glowing cyan aura
        const glowRadius = orb.radius + 12 + Math.sin(orb.pulseCycle) * 4;
        const grad = ctx.createRadialGradient(orb.x, hoverY, 4, orb.x, hoverY, glowRadius);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
        grad.addColorStop(0.6, 'rgba(14, 165, 233, 0.4)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, hoverY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Spinning 4-point Diamond Crystal
        ctx.save();
        ctx.translate(orb.x, hoverY);
        ctx.rotate(this.matchDuration * 2);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -orb.radius);
        ctx.lineTo(orb.radius * 0.7, 0);
        ctx.lineTo(0, orb.radius);
        ctx.lineTo(-orb.radius * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      } else {
        // Respawning hologram ring
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(orb.respawnTimer)}s`, orb.x, orb.y + 4);
      }

      ctx.restore();
    }

    // 5. Draw Spike Traps in Bushes
    for (const trap of this.spikeTraps) {
      if (
        trap.x + trap.radius < viewLeft ||
        trap.x - trap.radius > viewRight ||
        trap.y + trap.radius < viewTop ||
        trap.y - trap.radius > viewBottom
      ) {
        continue;
      }

      ctx.save();
      ctx.translate(trap.x, trap.y);

      // Metal base plate
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = trap.isArmed ? '#ef4444' : '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, trap.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sharp steel teeth around perimeter
      ctx.fillStyle = trap.isArmed ? '#f87171' : '#475569';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (trap.radius - 2), Math.sin(a) * (trap.radius - 2));
        ctx.lineTo(Math.cos(a + 0.2) * (trap.radius - 8), Math.sin(a + 0.2) * (trap.radius - 8));
        ctx.lineTo(Math.cos(a - 0.2) * (trap.radius - 8), Math.sin(a - 0.2) * (trap.radius - 8));
        ctx.closePath();
        ctx.fill();
      }

      // Center warning core
      ctx.fillStyle = trap.isArmed ? '#ef4444' : '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawPoisonGasOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.poisonGasDistance <= 0) return;

    const d = this.poisonGasDistance;
    ctx.save();

    // Toxic green translucent boundary blocks
    ctx.fillStyle = 'rgba(22, 101, 52, 0.45)';

    // Top band
    ctx.fillRect(0, 0, ARENA_WIDTH, d);
    // Bottom band
    ctx.fillRect(0, ARENA_HEIGHT - d, ARENA_WIDTH, d);
    // Left band
    ctx.fillRect(0, d, d, ARENA_HEIGHT - d * 2);
    // Right band
    ctx.fillRect(ARENA_WIDTH - d, d, d, ARENA_HEIGHT - d * 2);

    // Glowing radioactive boundary line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 12;

    ctx.strokeRect(d, d, ARENA_WIDTH - d * 2, ARENA_HEIGHT - d * 2);

    // Toxic smoke hazard warning text along inner boundary
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#86efac';
    ctx.font = 'black 12px monospace';
    ctx.textAlign = 'center';

    const innerCenterY = ARENA_HEIGHT / 2;
    ctx.fillText('☣ ZONA DE NIEBLA TÓXICA ☣', ARENA_WIDTH / 2, Math.max(30, d - 10));

    ctx.restore();
  }
}
