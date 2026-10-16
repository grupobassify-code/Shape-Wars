/**
 * Shape Wars - Matchmaking Manager
 * Orchestrates online matchmaking queue lifecycle, ping checks,
 * rival resolution, and seamless transition into the Versus intro.
 */

import { OnlinePlayerProfile, generateMatchRival, generateTeamCompositions } from './onlinePlayers';
import { HeroId, GameMode } from './types';

export type MatchmakingState = 'SEARCHING' | 'FOUND' | 'VERSUS' | 'CANCELLED';

export interface MatchmakingCallbacks {
  onStatusChange: (status: MatchmakingState, message: string) => void;
  onMatchFound: (rival: OnlinePlayerProfile, allies?: OnlinePlayerProfile[], otherRivals?: OnlinePlayerProfile[]) => void;
  onVersusStart: () => void;
  onMatchReady: () => void;
}

export class Matchmaker {
  private state: MatchmakingState = 'CANCELLED';
  private timerId: ReturnType<typeof setInterval> | null = null;
  private versusTimerId: ReturnType<typeof setTimeout> | null = null;
  private startTime: number = 0;
  private estimatedDuration: number = 4.5; // realistic 4 to 6 seconds queue
  private rival: OnlinePlayerProfile | null = null;
  private allies: OnlinePlayerProfile[] = [];
  private otherRivals: OnlinePlayerProfile[] = [];

  constructor(
    private playerTrophies: number,
    private playerHeroId: HeroId,
    private mode: GameMode,
    private callbacks: MatchmakingCallbacks
  ) {}

  public start(): void {
    this.cancel();
    this.state = 'SEARCHING';
    this.startTime = Date.now();
    // Random realistic wait between 3.5s and 6.0s
    this.estimatedDuration = 3.5 + Math.random() * 2.5;

    this.callbacks.onStatusChange('SEARCHING', 'Buscando combatiente en tu rango de copas...');

    this.timerId = setInterval(() => {
      const elapsed = (Date.now() - this.startTime) / 1000;

      if (elapsed > 1.2 && elapsed < 2.5) {
        this.callbacks.onStatusChange('SEARCHING', 'Verificando latencia en servidor regional...');
      } else if (elapsed >= 2.5 && elapsed < this.estimatedDuration) {
        this.callbacks.onStatusChange('SEARCHING', '¡Rival encontrado! Sincronizando datos...');
      } else if (elapsed >= this.estimatedDuration) {
        this.finishMatchmaking();
      }
    }, 250);
  }

  private finishMatchmaking(): void {
    if (this.state !== 'SEARCHING') return;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.state = 'FOUND';
    if (this.mode === '1v1') {
      this.rival = generateMatchRival(this.playerTrophies, this.playerHeroId);
      this.callbacks.onMatchFound(this.rival);
    } else {
      const team = generateTeamCompositions(this.playerTrophies, this.playerHeroId);
      this.allies = team.allies;
      this.otherRivals = team.rivals;
      this.rival = team.rivals[0];
      this.callbacks.onMatchFound(this.rival, this.allies, this.otherRivals);
    }

    this.callbacks.onStatusChange('FOUND', '¡Partida confirmada!');

    // Transition to Versus screen after brief impact beat (0.8s)
    this.versusTimerId = setTimeout(() => {
      if (this.state !== 'FOUND') return;
      this.state = 'VERSUS';
      this.callbacks.onVersusStart();

      // Versus screen runs for 3.2s, then signals ready to jump directly into combat arena
      setTimeout(() => {
        if (this.state === 'VERSUS') {
          this.callbacks.onMatchReady();
        }
      }, 3400);
    }, 800);
  }

  public cancel(): void {
    this.state = 'CANCELLED';
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.versusTimerId) {
      clearTimeout(this.versusTimerId);
      this.versusTimerId = null;
    }
  }

  public getState(): MatchmakingState {
    return this.state;
  }

  public getRival(): OnlinePlayerProfile | null {
    return this.rival;
  }
}
