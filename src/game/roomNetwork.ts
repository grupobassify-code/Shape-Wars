/**
 * Shape Wars - Room Network & Peer-to-Peer Manager
 * Powers real-time online multiplayer rooms via WebRTC DataChannels (PeerJS)
 * with instant local BroadcastChannel fallback so room codes work anywhere:
 * published static websites, full-stack servers, mobile web browsers, and cross-tab duels.
 */

import Peer, { DataConnection } from 'peerjs';
import { HeroId } from './types';
import { sounds } from './sound';

export interface RoomPlayer {
  id: string;
  name: string;
  tag: string;
  heroId: HeroId;
  trophies: number;
  isHost: boolean;
  isReady: boolean;
  avatarUrl?: string;
  ping?: number;
}

export type RoomMode = '1v1' | 'knockout';

export interface RoomState {
  code: string;
  mode: RoomMode;
  host: RoomPlayer;
  guest: RoomPlayer | null;
  status: 'WAITING' | 'READY' | 'STARTING' | 'IN_GAME';
  countdown?: number;
}

export interface NetworkPlayerInput {
  moveX: number;
  moveY: number;
  aimAngle: number;
  isAttacking: boolean;
  superTriggered?: boolean;
  gadgetTriggered?: boolean;
  seq: number;
  timestamp: number;
}

export interface NetworkCharacterSync {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  energy: number;
  aimAngle: number;
  facingAngle: number;
  isAlive: boolean;
  inBush: boolean;
  isDashing: boolean;
  shieldActive: boolean;
  gadgetCharges: number;
  outOfCombatTimer: number;
}

export interface NetworkProjectileSync {
  id: string;
  ownerId: string;
  team: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
}

export interface NetworkWorldSnapshot {
  timestamp: number;
  roundTimer: number;
  blueScore: number;
  redScore: number;
  roundState: string;
  roundWinnerTeam: string | null;
  characters: NetworkCharacterSync[];
  projectiles: NetworkProjectileSync[];
}

export interface RoomCallbacks {
  onRoomUpdate?: (room: RoomState) => void;
  onPlayerJoined?: (player: RoomPlayer) => void;
  onPlayerLeft?: (playerTag: string) => void;
  onMatchStarting?: (countdown: number) => void;
  onMatchStart?: (config: {
    mode: RoomMode;
    hostHero: HeroId;
    guestHero: HeroId;
    isHost: boolean;
    seed: number;
  }) => void;
  onRemoteInput?: (input: NetworkPlayerInput) => void;
  onWorldSnapshot?: (snapshot: NetworkWorldSnapshot) => void;
  onConnectionStatus?: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message: string, ping?: number) => void;
  onError?: (error: string) => void;
}

type PacketType =
  | 'ROOM_JOIN'
  | 'ROOM_INFO'
  | 'PLAYER_READY'
  | 'HERO_CHANGE'
  | 'MODE_CHANGE'
  | 'MATCH_STARTING'
  | 'MATCH_START'
  | 'GAME_INPUT'
  | 'GAME_SNAPSHOT'
  | 'PING'
  | 'PONG'
  | 'LEAVE_ROOM';

interface NetworkPacket {
  id: string;
  type: PacketType;
  senderId: string;
  roomCode: string;
  payload: any;
  timestamp: number;
}

/**
 * Generates an uppercase 6-character room code, e.g. "SW-8492" or "SW-K7B3"
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SW-${rand}`;
}

/**
 * Formats user room code input into standard uppercase SW-XXXX representation
 */
export function sanitizeRoomCode(raw: string): string {
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('SW') && clean.length > 2) {
    return `SW-${clean.slice(2)}`;
  }
  if (clean.length > 4) {
    return clean;
  }
  return `SW-${clean}`;
}

export class RoomNetworkManager {
  public isHost: boolean = false;
  public roomCode: string = '';
  public localPlayer: RoomPlayer;
  public currentRoom: RoomState | null = null;

  private peer: Peer | null = null;
  private peerConn: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private callbacks: RoomCallbacks;
  private processedPacketIds = new Set<string>();
  private pingInterval: any = null;
  private lastPingSentTime: number = 0;
  private currentPing: number = 18;
  private isDestroyed: boolean = false;
  private peerId: string = '';

  constructor(localPlayer: RoomPlayer, callbacks: RoomCallbacks = {}) {
    this.localPlayer = { ...localPlayer };
    this.callbacks = callbacks;
  }

  public updateLocalPlayer(partial: Partial<RoomPlayer>) {
    this.localPlayer = { ...this.localPlayer, ...partial };
    if (this.currentRoom) {
      if (this.isHost) {
        this.currentRoom.host = { ...this.currentRoom.host, ...partial };
      } else if (this.currentRoom.guest?.id === this.localPlayer.id) {
        this.currentRoom.guest = { ...this.currentRoom.guest, ...partial };
      }
      this.callbacks.onRoomUpdate?.(this.currentRoom);
      this.sendPacket('HERO_CHANGE', {
        playerId: this.localPlayer.id,
        heroId: this.localPlayer.heroId,
        isReady: this.localPlayer.isReady,
      });
    }
  }

  /**
   * HOST: Creates a room, sets up WebRTC listener + BroadcastChannel
   */
  public async createRoom(preferredCode?: string, mode: RoomMode = '1v1'): Promise<string> {
    this.isHost = true;
    this.roomCode = preferredCode ? sanitizeRoomCode(preferredCode) : generateRoomCode();
    this.localPlayer.isHost = true;
    this.localPlayer.isReady = true;

    this.currentRoom = {
      code: this.roomCode,
      mode,
      host: { ...this.localPlayer },
      guest: null,
      status: 'WAITING',
    };

    this.initBroadcastChannel();
    await this.initPeerHost();

    this.callbacks.onRoomUpdate?.(this.currentRoom);
    this.callbacks.onConnectionStatus?.('connected', `Sala ${this.roomCode} creada y en línea`);
    return this.roomCode;
  }

  /**
   * GUEST: Joins an existing room by code
   */
  public async joinRoom(code: string): Promise<boolean> {
    this.isHost = false;
    this.roomCode = sanitizeRoomCode(code);
    this.localPlayer.isHost = false;
    this.localPlayer.isReady = false;

    this.initBroadcastChannel();
    this.callbacks.onConnectionStatus?.('connecting', `Conectando a la sala ${this.roomCode}...`);

    // Broadcast immediate join request locally
    this.sendPacket('ROOM_JOIN', { player: this.localPlayer });

    // Connect via PeerJS WebRTC
    return new Promise((resolve) => {
      this.initPeerGuest((success) => {
        if (success) {
          this.callbacks.onConnectionStatus?.('connected', `Conectado a la sala ${this.roomCode}`, this.currentPing);
          this.sendPacket('ROOM_JOIN', { player: this.localPlayer });
          resolve(true);
        } else {
          // If PeerJS failed or timed out, but local broadcast might have responded
          if (this.currentRoom && this.currentRoom.guest) {
            resolve(true);
          } else {
            this.callbacks.onConnectionStatus?.('error', `No se encontró la sala ${this.roomCode}. Verifica el código.`);
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * Set ready state (for Guest) or start match (for Host)
   */
  public toggleReady(): boolean {
    if (this.isHost) {
      if (this.currentRoom?.guest && this.currentRoom.guest.isReady) {
        this.startMatchCountdown();
        return true;
      }
      return false;
    } else {
      const newReady = !this.localPlayer.isReady;
      this.localPlayer.isReady = newReady;
      if (this.currentRoom?.guest) {
        this.currentRoom.guest.isReady = newReady;
        this.callbacks.onRoomUpdate?.(this.currentRoom);
      }
      this.sendPacket('PLAYER_READY', {
        playerId: this.localPlayer.id,
        isReady: newReady,
      });
      sounds.playPlayerReady();
      return newReady;
    }
  }

  /**
   * Host changes room mode (1v1 vs 3v3 Knockout)
   */
  public setRoomMode(mode: RoomMode) {
    if (!this.isHost || !this.currentRoom) return;
    this.currentRoom.mode = mode;
    this.callbacks.onRoomUpdate?.(this.currentRoom);
    this.sendPacket('MODE_CHANGE', { mode });
  }

  /**
   * Host triggers synchronized match start
   */
  public startMatchCountdown() {
    if (!this.isHost || !this.currentRoom || !this.currentRoom.guest) return;

    this.currentRoom.status = 'STARTING';
    this.currentRoom.countdown = 3;
    this.callbacks.onRoomUpdate?.(this.currentRoom);

    const seed = Date.now();
    this.sendPacket('MATCH_STARTING', { countdown: 3, seed });

    let count = 3;
    sounds.playCountdownTick();
    this.callbacks.onMatchStarting?.(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        sounds.playCountdownTick();
        if (this.currentRoom) {
          this.currentRoom.countdown = count;
          this.callbacks.onRoomUpdate?.(this.currentRoom);
        }
        this.callbacks.onMatchStarting?.(count);
      } else {
        clearInterval(interval);
        sounds.playFightStart();
        if (this.currentRoom) {
          this.currentRoom.status = 'IN_GAME';
          this.callbacks.onRoomUpdate?.(this.currentRoom);
        }

        const matchConfig = {
          mode: this.currentRoom!.mode,
          hostHero: this.currentRoom!.host.heroId,
          guestHero: this.currentRoom!.guest!.heroId,
          isHost: true,
          seed,
        };

        this.sendPacket('MATCH_START', matchConfig);
        this.callbacks.onMatchStart?.(matchConfig);
      }
    }, 900);
  }

  /**
   * Send game input from Guest to Host
   */
  public sendPlayerInput(input: NetworkPlayerInput) {
    this.sendPacket('GAME_INPUT', input, true);
  }

  /**
   * Send world snapshot from Host to Guest
   */
  public sendWorldSnapshot(snapshot: NetworkWorldSnapshot) {
    this.sendPacket('GAME_SNAPSHOT', snapshot, true);
  }

  /**
   * Initialize local BroadcastChannel for zero-latency same-device/cross-tab connectivity
   */
  private initBroadcastChannel() {
    try {
      const channelName = `sw_room_${this.cleanCode(this.roomCode)}`;
      this.broadcastChannel = new BroadcastChannel(channelName);
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && typeof event.data === 'object') {
          this.handlePacket(event.data as NetworkPacket);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment, using WebRTC only', e);
    }
  }

  /**
   * Initialize PeerJS Host listener
   */
  private async initPeerHost(): Promise<void> {
    return new Promise((resolve) => {
      const hostPeerId = `sw-rm-${this.cleanCode(this.roomCode).toLowerCase()}`;
      this.peerId = hostPeerId;

      try {
        const peer = new Peer(hostPeerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        this.peer = peer;

        peer.on('open', (id) => {
          this.callbacks.onConnectionStatus?.('connected', `Servidor P2P listo: ${id}`);
          resolve();
        });

        peer.on('connection', (conn) => {
          this.setupConnection(conn);
        });

        peer.on('error', (err) => {
          console.warn('PeerJS Host warning:', err.type, err.message);
          // If ID is already taken (e.g. host refreshed), try fallback peer ID
          if (err.type === 'unavailable-id') {
            const fallbackId = `sw-rm-${this.cleanCode(this.roomCode).toLowerCase()}-${Math.floor(Math.random() * 900 + 100)}`;
            const altPeer = new Peer(fallbackId, {
              config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
            });
            this.peer = altPeer;
            altPeer.on('open', () => resolve());
            altPeer.on('connection', (c) => this.setupConnection(c));
          } else {
            resolve();
          }
        });
      } catch (e) {
        console.error('Failed to initialize PeerJS host:', e);
        resolve();
      }
    });
  }

  /**
   * Initialize PeerJS Guest connector
   */
  private initPeerGuest(onComplete: (success: boolean) => void) {
    const targetHostPeerId = `sw-rm-${this.cleanCode(this.roomCode).toLowerCase()}`;
    let resolved = false;

    try {
      const guestPeer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer = guestPeer;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Check if local broadcast channel connected already
          if (this.currentRoom && this.currentRoom.guest) {
            onComplete(true);
          } else {
            onComplete(false);
          }
        }
      }, 7000);

      guestPeer.on('open', () => {
        try {
          const conn = guestPeer.connect(targetHostPeerId, { reliable: true });
          this.setupConnection(conn);

          conn.on('open', () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              onComplete(true);
            }
          });
        } catch {
          // Ignore
        }
      });

      guestPeer.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          // Fall back to broadcast channel if active
          onComplete(this.currentRoom !== null && this.currentRoom.guest !== null);
        }
      });
    } catch {
      if (!resolved) {
        resolved = true;
        onComplete(this.currentRoom !== null && this.currentRoom.guest !== null);
      }
    }
  }

  private setupConnection(conn: DataConnection) {
    this.peerConn = conn;

    conn.on('open', () => {
      this.startPingLoop();

      if (this.isHost && this.currentRoom) {
        this.sendPacket('ROOM_INFO', { room: this.currentRoom });
      } else {
        this.sendPacket('ROOM_JOIN', { player: this.localPlayer });
      }
    });

    conn.on('data', (data) => {
      if (data && typeof data === 'object') {
        this.handlePacket(data as NetworkPacket);
      }
    });

    conn.on('close', () => {
      this.handlePeerDisconnect();
    });

    conn.on('error', (err) => {
      console.warn('Peer connection error:', err);
    });
  }

  private startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.lastPingSentTime = performance.now();
      this.sendPacket('PING', { time: this.lastPingSentTime });
    }, 2500);
  }

  private handlePeerDisconnect() {
    if (this.currentRoom) {
      if (this.isHost) {
        const guestTag = this.currentRoom.guest?.tag || 'Rival';
        this.currentRoom.guest = null;
        this.currentRoom.status = 'WAITING';
        this.callbacks.onRoomUpdate?.(this.currentRoom);
        this.callbacks.onPlayerLeft?.(guestTag);
        this.callbacks.onConnectionStatus?.('connected', 'El rival se ha desconectado. Esperando nuevo retador...');
      } else {
        this.callbacks.onConnectionStatus?.('disconnected', 'Conexión con el anfitrión cerrada.');
      }
    }
  }

  /**
   * Sends packet via both PeerJS WebRTC DataConnection and BroadcastChannel
   */
  private sendPacket(type: PacketType, payload: any, unthrottled: boolean = false) {
    if (this.isDestroyed) return;

    const packet: NetworkPacket = {
      id: `${this.localPlayer.id}-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      senderId: this.localPlayer.id,
      roomCode: this.roomCode,
      payload,
      timestamp: Date.now(),
    };

    // 1. Send via WebRTC Peer
    if (this.peerConn && this.peerConn.open) {
      try {
        this.peerConn.send(packet);
      } catch (e) {
        console.warn('Error sending packet via WebRTC DataConnection:', e);
      }
    }

    // 2. Send via BroadcastChannel (local cross-tab)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(packet);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Inbound Packet Handler
   */
  private handlePacket(packet: NetworkPacket) {
    if (packet.senderId === this.localPlayer.id) return; // Don't process self
    if (this.cleanCode(packet.roomCode) !== this.cleanCode(this.roomCode)) return;

    // Fast deduplication for reliable room events
    if (packet.type !== 'GAME_INPUT' && packet.type !== 'GAME_SNAPSHOT') {
      if (this.processedPacketIds.has(packet.id)) return;
      this.processedPacketIds.add(packet.id);
      if (this.processedPacketIds.size > 200) {
        // prune older ids
        const arr = Array.from(this.processedPacketIds);
        this.processedPacketIds = new Set(arr.slice(arr.length - 100));
      }
    }

    switch (packet.type) {
      case 'ROOM_JOIN': {
        const guestPlayer = packet.payload.player as RoomPlayer;
        if (this.isHost && this.currentRoom) {
          guestPlayer.isHost = false;
          guestPlayer.isReady = false;
          this.currentRoom.guest = guestPlayer;
          this.currentRoom.status = 'READY';
          sounds.playPlayerJoin();
          this.callbacks.onPlayerJoined?.(guestPlayer);
          this.callbacks.onRoomUpdate?.(this.currentRoom);

          // Reply with authoritative room info
          this.sendPacket('ROOM_INFO', { room: this.currentRoom });
        }
        break;
      }

      case 'ROOM_INFO': {
        const room = packet.payload.room as RoomState;
        this.currentRoom = room;
        // Make sure local player matches guest slot
        if (!this.isHost && this.currentRoom.guest) {
          this.localPlayer.isReady = this.currentRoom.guest.isReady;
        }
        this.callbacks.onRoomUpdate?.(this.currentRoom);
        break;
      }

      case 'PLAYER_READY': {
        const { isReady } = packet.payload;
        if (this.currentRoom?.guest) {
          this.currentRoom.guest.isReady = isReady;
          sounds.playPlayerReady();
          this.callbacks.onRoomUpdate?.(this.currentRoom);
        }
        break;
      }

      case 'HERO_CHANGE': {
        const { playerId, heroId, isReady } = packet.payload;
        if (this.currentRoom) {
          if (this.currentRoom.host.id === playerId) {
            this.currentRoom.host.heroId = heroId;
          } else if (this.currentRoom.guest && this.currentRoom.guest.id === playerId) {
            this.currentRoom.guest.heroId = heroId;
            if (isReady !== undefined) {
              this.currentRoom.guest.isReady = isReady;
            }
          }
          this.callbacks.onRoomUpdate?.(this.currentRoom);
        }
        break;
      }

      case 'MODE_CHANGE': {
        if (!this.isHost && this.currentRoom) {
          this.currentRoom.mode = packet.payload.mode;
          this.callbacks.onRoomUpdate?.(this.currentRoom);
        }
        break;
      }

      case 'MATCH_STARTING': {
        const countdown = packet.payload.countdown;
        if (this.currentRoom) {
          this.currentRoom.status = 'STARTING';
          this.currentRoom.countdown = countdown;
          this.callbacks.onRoomUpdate?.(this.currentRoom);
        }
        sounds.playCountdownTick();
        this.callbacks.onMatchStarting?.(countdown);
        break;
      }

      case 'MATCH_START': {
        const config = packet.payload;
        if (this.currentRoom) {
          this.currentRoom.status = 'IN_GAME';
          this.callbacks.onRoomUpdate?.(this.currentRoom);
        }
        sounds.playFightStart();
        this.callbacks.onMatchStart?.({
          ...config,
          isHost: this.isHost,
        });
        break;
      }

      case 'GAME_INPUT': {
        if (this.isHost) {
          this.callbacks.onRemoteInput?.(packet.payload as NetworkPlayerInput);
        }
        break;
      }

      case 'GAME_SNAPSHOT': {
        if (!this.isHost) {
          this.callbacks.onWorldSnapshot?.(packet.payload as NetworkWorldSnapshot);
        }
        break;
      }

      case 'PING': {
        this.sendPacket('PONG', { reqTime: packet.payload.time });
        break;
      }

      case 'PONG': {
        const now = performance.now();
        const rtt = Math.max(1, Math.round(now - packet.payload.reqTime));
        this.currentPing = rtt;
        if (this.currentRoom) {
          if (this.isHost && this.currentRoom.guest) {
            this.currentRoom.guest.ping = rtt;
          } else if (!this.isHost) {
            this.currentRoom.host.ping = rtt;
          }
        }
        this.callbacks.onConnectionStatus?.('connected', 'Conexión activa', rtt);
        break;
      }

      case 'LEAVE_ROOM': {
        this.handlePeerDisconnect();
        break;
      }
    }
  }

  private cleanCode(c: string): string {
    return c.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  public leaveRoom() {
    this.sendPacket('LEAVE_ROOM', { playerId: this.localPlayer.id });
    this.destroy();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore
      }
      this.broadcastChannel = null;
    }
    if (this.peerConn) {
      try {
        this.peerConn.close();
      } catch {
        // Ignore
      }
      this.peerConn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }
    this.currentRoom = null;
  }
}
