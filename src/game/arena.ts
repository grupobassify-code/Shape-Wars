/**
 * Shape Wars - Arena Geometry, Grid System & Horizontal Knockout Layout
 * 
 * Dimensions: 2400 x 1350 units
 * Grid System: 48 x 48 unit cells (50 cols x 28 rows ~ 2400 x 1344)
 * Supports tile types: empty, wall, pillar, bush, spawn_blue, spawn_red.
 * Provides tactical navigation waypoints, cover barriers, choke points, and flank lanes.
 */

import {
  RectWall,
  BushZone,
  Vector2D,
  JumpPad,
  SpeedPad,
  HealthStation,
  PowerOrb,
  SpikeTrap,
} from './types';

export const ARENA_WIDTH = 2400;
export const ARENA_HEIGHT = 1350;
export const CELL_SIZE = 48;
export const GRID_COLS = Math.floor(ARENA_WIDTH / CELL_SIZE); // 50 cols
export const GRID_ROWS = Math.floor(ARENA_HEIGHT / CELL_SIZE); // 28 rows

export type CellTerrain = 'floor' | 'wall' | 'pillar' | 'bush' | 'spawn_blue' | 'spawn_red';

export interface GridCell {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  terrain: CellTerrain;
  isWalkable: boolean;
  blocksProjectiles: boolean;
  providesStealth: boolean;
  hasObstacle: boolean;
}

// Outer perimeter borders (width 40px)
const BORDER_THICKNESS = 40;

// Arena boundary walls & internal cover blocks
export const ARENA_WALLS: RectWall[] = [
  // Outer perimeter borders
  { x: 0, y: 0, w: ARENA_WIDTH, h: BORDER_THICKNESS, type: 'wall' }, // Top
  { x: 0, y: ARENA_HEIGHT - BORDER_THICKNESS, w: ARENA_WIDTH, h: BORDER_THICKNESS, type: 'wall' }, // Bottom
  { x: 0, y: 0, w: BORDER_THICKNESS, h: ARENA_HEIGHT, type: 'wall' }, // Left
  { x: ARENA_WIDTH - BORDER_THICKNESS, y: 0, w: BORDER_THICKNESS, h: ARENA_HEIGHT, type: 'wall' }, // Right

  // Center structure: Octagonal / Dual core pillars (x: 1200 is center)
  { x: 1130, y: 440, w: 140, h: 140, type: 'pillar' }, // Center core North
  { x: 1130, y: 770, w: 140, h: 140, type: 'pillar' }, // Center core South

  // Center dividing horizontal cover walls
  { x: 1040, y: 645, w: 120, h: 50, type: 'wall' },
  { x: 1240, y: 645, w: 120, h: 50, type: 'wall' },

  // Top lane & Bottom lane strategic choke pillars
  { x: 1140, y: 150, w: 120, h: 60, type: 'pillar' },
  { x: 1140, y: 1140, w: 120, h: 60, type: 'pillar' },

  // West (Blue) intermediate defensive barriers & choke blocks
  { x: 620, y: 280, w: 180, h: 48, type: 'wall' },
  { x: 620, y: 1020, w: 180, h: 48, type: 'wall' },
  { x: 780, y: 550, w: 48, h: 250, type: 'pillar' }, // Mid choke column

  // East (Red) intermediate defensive barriers & choke blocks
  { x: 1600, y: 280, w: 180, h: 48, type: 'wall' },
  { x: 1600, y: 1020, w: 180, h: 48, type: 'wall' },
  { x: 1572, y: 550, w: 48, h: 250, type: 'pillar' }, // Mid choke column

  // Base protective bastions (near spawns)
  { x: 380, y: 450, w: 50, h: 160, type: 'pillar' },
  { x: 380, y: 740, w: 50, h: 160, type: 'pillar' },

  { x: 1970, y: 450, w: 50, h: 160, type: 'pillar' },
  { x: 1970, y: 740, w: 50, h: 160, type: 'pillar' },

  // Flank corner angle covers
  { x: 380, y: 180, w: 120, h: 48, type: 'wall' },
  { x: 380, y: 1120, w: 120, h: 48, type: 'wall' },
  { x: 1900, y: 180, w: 120, h: 48, type: 'wall' },
  { x: 1900, y: 1120, w: 120, h: 48, type: 'wall' },
];

// Tactical bushes offering camouflage & ambushes
export const ARENA_BUSHES: BushZone[] = [
  // Flanking North and South highways
  { id: 'bush-north-c', x: 980, y: 60, w: 440, h: 90 },
  { id: 'bush-south-c', x: 980, y: 1200, w: 440, h: 90 },

  // Base approach river bushes
  { id: 'bush-blue-mid', x: 480, y: 570, w: 110, h: 210 },
  { id: 'bush-red-mid', x: 1810, y: 570, w: 110, h: 210 },

  // Center river clusters (Upper & Lower)
  { id: 'bush-center-upper', x: 1060, y: 310, w: 280, h: 110 },
  { id: 'bush-center-lower', x: 1060, y: 930, w: 280, h: 110 },

  // Flank ambush pockets
  { id: 'bush-nw-flank', x: 740, y: 160, w: 140, h: 110 },
  { id: 'bush-sw-flank', x: 740, y: 1080, w: 140, h: 110 },
  { id: 'bush-ne-flank', x: 1520, y: 160, w: 140, h: 110 },
  { id: 'bush-se-flank', x: 1520, y: 1080, w: 140, h: 110 },

  // Mid-lane pocket ambushes
  { id: 'bush-mid-west', x: 860, y: 620, w: 110, h: 110 },
  { id: 'bush-mid-east', x: 1430, y: 620, w: 110, h: 110 },
];

/**
 * ========================================================
 * MAÑAS Y MECÁNICAS TÁCTICAS DEL TERRENO DE COMBATE
 * ========================================================
 */

// 1. Trampolines Cuánticos (Jump Pads) - Catapultan sobre muros con onda expansiva
export const ARENA_JUMP_PADS: JumpPad[] = [
  // Blue North Flank -> launches over wall into upper-mid river
  { id: 'jump-blue-north', x: 490, y: 175, w: 68, h: 68, targetX: 950, targetY: 260, cooldownTimer: 0, rechargeDuration: 5.5 },
  // Blue South Flank -> launches over wall into lower-mid river
  { id: 'jump-blue-south', x: 490, y: 1105, w: 68, h: 68, targetX: 950, targetY: 1040, cooldownTimer: 0, rechargeDuration: 5.5 },
  // Red North Flank -> launches over wall into upper-mid river
  { id: 'jump-red-north', x: 1840, y: 175, w: 68, h: 68, targetX: 1450, targetY: 260, cooldownTimer: 0, rechargeDuration: 5.5 },
  // Red South Flank -> launches over wall into lower-mid river
  { id: 'jump-red-south', x: 1840, y: 1105, w: 68, h: 68, targetX: 1450, targetY: 1040, cooldownTimer: 0, rechargeDuration: 5.5 },
];

// 2. Cintas de Hiper-Velocidad (Speed Pads / Turbo-Tiles) - Impulso cinético +60%
export const ARENA_SPEED_PADS: SpeedPad[] = [
  // North Highway: West-to-East dash strip
  { id: 'speed-n-east', x: 700, y: 75, w: 110, h: 60, directionAngle: 0, boostMultiplier: 1.6, boostDuration: 2.2 },
  // North Highway: East-to-West dash strip
  { id: 'speed-n-west', x: 1590, y: 75, w: 110, h: 60, directionAngle: Math.PI, boostMultiplier: 1.6, boostDuration: 2.2 },
  // South Highway: West-to-East dash strip
  { id: 'speed-s-east', x: 700, y: 1215, w: 110, h: 60, directionAngle: 0, boostMultiplier: 1.6, boostDuration: 2.2 },
  // South Highway: East-to-West dash strip
  { id: 'speed-s-west', x: 1590, y: 1215, w: 110, h: 60, directionAngle: Math.PI, boostMultiplier: 1.6, boostDuration: 2.2 },
];

// 3. Estaciones de Nanorobots de Curación Rápida (Healing Stations)
export const ARENA_HEALTH_STATIONS: HealthStation[] = [
  // North-Center pylon
  { id: 'heal-north-c', x: 1200, y: 220, radius: 46, healRate: 16, pulseTimer: 0 },
  // South-Center pylon
  { id: 'heal-south-c', x: 1200, y: 1130, radius: 46, healRate: 16, pulseTimer: 0 },
];

// 4. Orbes de Super-Carga Cuántica (Power Orbs) - Centro neurálgico
export const ARENA_POWER_ORBS: PowerOrb[] = [
  { id: 'power-orb-center', x: 1200, y: 675, radius: 24, energyBoost: 40, isAvailable: true, respawnTimer: 0, pulseCycle: 0 },
];

// 5. Trampas Criogénicas / Púas Gravitatorias Ocultas en Arbustos
export const ARENA_SPIKE_TRAPS: SpikeTrap[] = [
  // Hidden in mid west ambush bush
  { id: 'trap-mid-w', x: 915, y: 675, radius: 26, damage: 24, isArmed: true, rearmTimer: 0 },
  // Hidden in mid east ambush bush
  { id: 'trap-mid-e', x: 1485, y: 675, radius: 26, damage: 24, isArmed: true, rearmTimer: 0 },
  // Hidden in North Highway center bush
  { id: 'trap-north-c', x: 1200, y: 105, radius: 26, damage: 24, isArmed: true, rearmTimer: 0 },
  // Hidden in South Highway center bush
  { id: 'trap-south-c', x: 1200, y: 1245, radius: 26, damage: 24, isArmed: true, rearmTimer: 0 },
];

export interface SpawnConfig {
  blueTeamSpawns: Vector2D[];
  redTeamSpawns: Vector2D[];
}

export const ARENA_SPAWNS: SpawnConfig = {
  blueTeamSpawns: [
    { x: 220, y: 675 }, // Center (Player)
    { x: 220, y: 490 }, // Top ally
    { x: 220, y: 860 }, // Bottom ally
  ],
  redTeamSpawns: [
    { x: 2180, y: 675 }, // Center
    { x: 2180, y: 490 }, // Top enemy
    { x: 2180, y: 860 }, // Bottom enemy
  ],
};

// Strategic navigation waypoints for bot route-finding
export const NAV_WAYPOINTS: Vector2D[] = [
  // Blue side base & lane roots
  { x: 260, y: 675 },
  { x: 380, y: 340 },
  { x: 380, y: 1010 },

  // West intermediate lanes
  { x: 620, y: 675 },
  { x: 620, y: 200 },
  { x: 620, y: 1150 },
  { x: 860, y: 420 },
  { x: 860, y: 930 },

  // Center lane approaches
  { x: 1040, y: 675 },
  { x: 1200, y: 240 },
  { x: 1200, y: 675 },
  { x: 1200, y: 1110 },
  { x: 1360, y: 675 },

  // East intermediate lanes
  { x: 1540, y: 420 },
  { x: 1540, y: 930 },
  { x: 1780, y: 675 },
  { x: 1780, y: 200 },
  { x: 1780, y: 1150 },

  // Red side base & lane roots
  { x: 2020, y: 340 },
  { x: 2020, y: 1010 },
  { x: 2140, y: 675 },
];

/**
 * Grid System Construction
 * Generates the 2D grid matrix of cells with terrain classifications,
 * collision properties, projectile blocking, and stealth.
 */
export function buildArenaGrid(): GridCell[][] {
  const grid: GridCell[][] = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      const cellX = c * CELL_SIZE;
      const cellY = r * CELL_SIZE;
      const centerX = cellX + CELL_SIZE / 2;
      const centerY = cellY + CELL_SIZE / 2;

      let terrain: CellTerrain = 'floor';
      let isWalkable = true;
      let blocksProjectiles = false;
      let providesStealth = false;
      let hasObstacle = false;

      // Check walls & pillars
      for (const w of ARENA_WALLS) {
        if (
          centerX >= w.x &&
          centerX <= w.x + w.w &&
          centerY >= w.y &&
          centerY <= w.y + w.h
        ) {
          terrain = w.type === 'pillar' ? 'pillar' : 'wall';
          isWalkable = false;
          blocksProjectiles = true;
          hasObstacle = true;
          break;
        }
      }

      // Check bushes
      if (isWalkable) {
        for (const b of ARENA_BUSHES) {
          if (
            centerX >= b.x &&
            centerX <= b.x + b.w &&
            centerY >= b.y &&
            centerY <= b.y + b.h
          ) {
            terrain = 'bush';
            providesStealth = true;
            break;
          }
        }
      }

      row.push({
        col: c,
        row: r,
        x: cellX,
        y: cellY,
        w: CELL_SIZE,
        h: CELL_SIZE,
        terrain,
        isWalkable,
        blocksProjectiles,
        providesStealth,
        hasObstacle,
      });
    }
    grid.push(row);
  }

  return grid;
}
