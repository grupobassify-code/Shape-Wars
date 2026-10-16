/**
 * Shape Wars - Knockout Combat HUD
 * 
 * Displays:
 * - 3v3 Knockout Best-of-3 Series score (Rounds won per team, current round)
 * - Alive indicators for all 6 participants with individual mini-portraits and health state
 * - Center match clock
 * - Auto-aim and quick pause controls
 * - Zero intrusive data cards blocking the central battlefield.
 */

import React from 'react';
import { HeroId, KnockoutParticipant, HERO_DEFINITIONS, FlagState, GameMode } from '../game/types';
import { Crosshair, Pause, Play, RotateCcw, Shield, Swords, Trophy, Zap, Sparkles, Flag } from 'lucide-react';
import { sounds } from '../game/sound';
import { ShapeIcon } from './ShapeIcon';
import { HeroPortrait } from './HeroPortrait';

interface CombatHUDProps {
  timer: number;
  blueAlive: number;
  redAlive: number;
  playerHp: number;
  playerMaxHp: number;
  playerEnergy: number;
  isSuperReady: boolean;
  playerHeroId: HeroId;
  autoAimActive: boolean;
  autoAimTargetName: string | null;
  playerGadgetCharges: number;
  playerGadgetCooldown: number;
  isPaused: boolean;
  // Knockout Best-of-3 props
  currentRound?: number;
  blueRoundsWon?: number;
  redRoundsWon?: number;
  roundState?: 'ROUND_ACTIVE' | 'ROUND_INTERMISSION' | 'MATCH_OVER';
  roundTransitionTimer?: number;
  participants?: KnockoutParticipant[];
  isSpectating?: boolean;
  spectatedAllyName?: string | null;
  // CTF Mode props
  blueFlag?: FlagState | null;
  redFlag?: FlagState | null;
  blueScore?: number;
  redScore?: number;
  gameMode?: GameMode;
  activeModifierAlert?: string | null;
  poisonGasDistance?: number;
  isSuddenDeathActive?: boolean;
  powerOrbAvailable?: boolean;
  onTogglePause: () => void;
  onForfeit: () => void;
  onToggleAutoAim: () => void;
  onTriggerGadget: () => void;
  onTriggerSuper?: () => void;
  onCycleSpectate?: () => void;
}

export const CombatHUD: React.FC<CombatHUDProps> = ({
  timer,
  blueAlive,
  redAlive,
  playerHp,
  playerMaxHp,
  playerEnergy,
  isSuperReady,
  playerHeroId,
  autoAimActive,
  autoAimTargetName,
  playerGadgetCharges,
  playerGadgetCooldown,
  isPaused,
  currentRound = 1,
  blueRoundsWon = 0,
  redRoundsWon = 0,
  roundState = 'ROUND_ACTIVE',
  roundTransitionTimer = 0,
  participants = [],
  isSpectating = false,
  spectatedAllyName = null,
  blueFlag = null,
  redFlag = null,
  blueScore = 0,
  redScore = 0,
  gameMode = '3v3',
  activeModifierAlert = null,
  poisonGasDistance = 0,
  isSuddenDeathActive = false,
  powerOrbAvailable = true,
  onTogglePause,
  onForfeit,
  onToggleAutoAim,
  onTriggerGadget,
  onTriggerSuper,
  onCycleSpectate,
}) => {
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const blueParticipants = participants.filter((p) => p.team === 'blue');
  const redParticipants = participants.filter((p) => p.team === 'red');
  const isCTF = gameMode === 'ctf';

  return (
    <div className="absolute inset-0 max-w-full overflow-hidden pointer-events-none z-20 flex flex-col justify-between p-1.5 sm:p-4 select-none">
      {/* Top Banner: Knockout / CTF Scoreboard, Clock & Series Indicator */}
      <div className="flex flex-col items-center w-full max-w-6xl mx-auto gap-1.5 pointer-events-auto min-w-0 px-1">
        <div className="flex items-center justify-between w-full gap-1 sm:gap-2 min-w-0">
        {/* Blue Team Roster & Rounds/Flags */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-sky-500/40 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-1 sm:py-1.5 backdrop-blur-md shadow-xl min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-sky-400 truncate">Azul</span>
              {/* CTF Flag status or Round Victory Stars */}
              {isCTF ? (
                <span className={`text-[8px] sm:text-[10px] font-black font-mono px-1 sm:px-1.5 py-0.2 rounded border ${
                  blueFlag?.isCarried
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : blueFlag?.isDropped
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                }`}>
                  {blueFlag?.isCarried ? '¡ROBADA!' : blueFlag?.isDropped ? 'SUELO' : 'BASE'}
                </span>
              ) : (
                <div className="flex items-center gap-0.5 sm:gap-1 ml-0.5 sm:ml-1 shrink-0">
                  {[0, 1].map((rIdx) => (
                    <div
                      key={rIdx}
                      className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-sky-400 transition-all ${
                        rIdx < blueRoundsWon
                          ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,1)]'
                          : 'bg-slate-800 opacity-30'
                      }`}
                      title={`Ronda ${rIdx + 1} ganada por Azul`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Blue 3-Hero Participant Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
              {blueParticipants.length > 0
                ? blueParticipants.map((p) => (
                    <div
                      key={p.id}
                      className={`relative flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg overflow-hidden border transition-all shrink-0 ${
                        p.isAlive
                          ? p.isPlayer
                            ? 'bg-sky-500/25 border-sky-400 ring-1 sm:ring-2 ring-sky-400/40'
                            : 'bg-slate-800/80 border-sky-500/50'
                          : 'bg-slate-900/60 border-slate-700/40 grayscale opacity-40'
                      }`}
                      title={`${p.name}: ${p.isAlive ? `${p.hp}/${p.maxHp} HP` : 'Eliminado'}`}
                    >
                      <HeroPortrait heroId={p.heroId} shapeSize={12} className="w-full h-full" />
                      {!p.isAlive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-md sm:rounded-lg text-rose-500 font-black text-[10px] z-10">
                          ✕
                        </div>
                      )}
                    </div>
                  ))
                : [0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-sky-400/60 transition-all shrink-0 ${
                        idx < blueAlive ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-slate-800 opacity-40'
                      }`}
                    />
                  ))}
            </div>
          </div>
          <span className="text-base sm:text-xl font-black font-mono text-white tabular-nums ml-1 sm:ml-2 shrink-0">
            {isCTF ? `${blueScore} 🚩` : blueAlive}
          </span>
        </div>

        {/* Center: Mode Indicator & Match Timer */}
        <div className="flex flex-col items-center bg-slate-900/95 border border-slate-700/80 rounded-xl sm:rounded-2xl px-2 sm:px-4 py-1 sm:py-1.5 backdrop-blur-md shadow-xl min-w-0 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-amber-400">
            {isCTF ? <Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" /> : <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            <span className="truncate">
              {isCTF
                ? `BANDERA`
                : (participants && participants.length <= 2)
                ? '1v1 • R' + currentRound + '/3'
                : '3v3 • R' + currentRound + '/3'}
            </span>
          </div>
          <span
            className={`text-base sm:text-2xl font-black font-mono tracking-tight tabular-nums leading-tight ${
              timer <= 20 ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}
          >
            {timeFormatted}
          </span>
          <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 tracking-wider truncate">
            {isCTF
              ? `META: 2 🚩`
              : roundState === 'ROUND_INTERMISSION'
              ? `${Math.ceil(roundTransitionTimer)}s`
              : 'ELIMINACIÓN'}
          </span>
        </div>

        {/* Red Team Roster & Rounds/Flags */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-rose-500/40 rounded-xl sm:rounded-2xl px-2 sm:px-3 py-1 sm:py-1.5 backdrop-blur-md shadow-xl min-w-0">
          <span className="text-base sm:text-xl font-black font-mono text-white tabular-nums mr-1 sm:mr-2 shrink-0">
            {isCTF ? `🚩 ${redScore}` : redAlive}
          </span>
          <div className="flex flex-col items-end min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* CTF Flag status or Round Victory Stars */}
              {isCTF ? (
                <span className={`text-[8px] sm:text-[10px] font-black font-mono px-1 sm:px-1.5 py-0.2 rounded border ${
                  redFlag?.isCarried
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : redFlag?.isDropped
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                }`}>
                  {redFlag?.isCarried ? '¡ROBADA!' : redFlag?.isDropped ? 'SUELO' : 'BASE'}
                </span>
              ) : (
                <div className="flex items-center gap-0.5 sm:gap-1 mr-0.5 sm:mr-1 shrink-0">
                  {[0, 1].map((rIdx) => (
                    <div
                      key={rIdx}
                      className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-rose-400 transition-all ${
                        rIdx < redRoundsWon
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]'
                          : 'bg-slate-800 opacity-30'
                      }`}
                      title={`Ronda ${rIdx + 1} ganada por Rojo`}
                    />
                  ))}
                </div>
              )}
              <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-wider text-rose-400 truncate">Rojo</span>
            </div>

            {/* Red 3-Hero Participant Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
              {redParticipants.length > 0
                ? redParticipants.map((p) => (
                    <div
                      key={p.id}
                      className={`relative flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg overflow-hidden border transition-all shrink-0 ${
                        p.isAlive
                          ? 'bg-slate-800/80 border-rose-500/50'
                          : 'bg-slate-900/60 border-slate-700/40 grayscale opacity-40'
                      }`}
                      title={`${p.name}: ${p.isAlive ? `${p.hp}/${p.maxHp} HP` : 'Eliminado'}`}
                    >
                      <HeroPortrait heroId={p.heroId} shapeSize={12} className="w-full h-full" />
                      {!p.isAlive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-md sm:rounded-lg text-rose-500 font-black text-[10px] z-10">
                          ✕
                        </div>
                      )}
                    </div>
                  ))
                : [0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-rose-400/60 transition-all shrink-0 ${
                        idx < redAlive ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-slate-800 opacity-40'
                      }`}
                    />
                  ))}
            </div>
          </div>
        </div>

        {/* Top Right Quick Controls: Auto-Aim switch & Pause */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Auto-Aim Toggle Switch */}
          <button
            onClick={() => {
              onToggleAutoAim();
              sounds.playClick();
            }}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer backdrop-blur-md shadow-md flex items-center gap-1.5 sm:gap-2 active:scale-95 ${
              autoAimActive
                ? 'bg-amber-500/25 border-amber-400 text-amber-300 ring-2 ring-amber-400/20'
                : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Interruptor de Auto-apuntado [F]"
          >
            <Crosshair className={`w-3.5 h-3.5 ${autoAimActive ? 'text-amber-400' : 'text-slate-500'}`} />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[8px] text-slate-400 font-semibold leading-tight">AUTO-APUNTADO [F]</span>
              <span className={`text-[10px] font-black ${autoAimActive ? 'text-amber-300' : 'text-slate-400'}`}>
                {autoAimActive ? (autoAimTargetName ? `FIJADO` : 'ACTIVADO') : 'DESACTIVADO'}
              </span>
            </div>
          </button>

          {/* Pause Button */}
          <button
            onClick={() => {
              onTogglePause();
              sounds.playClick();
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900/85 border border-slate-700 text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all shadow-md flex items-center justify-center shrink-0"
            title="Pausar partida [ESC]"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Active Modifier Warning Alert (e.g. Niebla Tóxica, Muerte Súbita) */}
      {activeModifierAlert && (
        <div className="pointer-events-none animate-bounce flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/95 border border-amber-300 text-white font-black text-[11px] sm:text-xs shadow-[0_0_20px_rgba(244,63,94,0.7)] backdrop-blur-md">
          <span className="text-sm">⚡</span>
          <span>{activeModifierAlert}</span>
        </div>
      )}

      {/* Tactical Mañas & Arena Modifiers Strip */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-full px-1 py-0.5 pointer-events-none">
        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/80 text-[9px] sm:text-[10px] font-bold text-sky-300 flex items-center gap-1 shrink-0">
          <span>🌀</span> Trampolines
        </span>
        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/80 text-[9px] sm:text-[10px] font-bold text-amber-300 flex items-center gap-1 shrink-0">
          <span>⚡</span> Cintas Turbo
        </span>
        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/80 text-[9px] sm:text-[10px] font-bold text-emerald-300 flex items-center gap-1 shrink-0">
          <span>🌿</span> Trampas
        </span>
        <span className={`px-2 py-0.5 rounded-md border text-[9px] sm:text-[10px] font-bold flex items-center gap-1 shrink-0 ${
          powerOrbAvailable
            ? 'bg-sky-500/20 border-sky-400 text-sky-200'
            : 'bg-slate-900/80 border-slate-800 text-slate-500'
        }`}>
          <span>💎</span> {powerOrbAvailable ? 'Orbe Listo' : 'Orbe Recargando'}
        </span>
        {poisonGasDistance > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/25 border border-rose-500 text-[9px] sm:text-[10px] font-black text-rose-300 flex items-center gap-1 shrink-0 animate-pulse">
            <span>☣</span> Niebla Tóxica
          </span>
        )}
        {isSuddenDeathActive && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-400 text-[9px] sm:text-[10px] font-black text-amber-300 flex items-center gap-1 shrink-0 animate-pulse">
            <span>⚔️</span> Muerte Súbita (+35% Daño)
          </span>
        )}
      </div>
    </div>

      {/* Spectator Mode Indicator when Player is Eliminated */}
      {isSpectating && spectatedAllyName && (
        <div className="mx-auto mt-2 pointer-events-auto flex items-center gap-3 bg-slate-900/95 border border-sky-500/50 rounded-2xl px-4 py-2 backdrop-blur-md shadow-2xl">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-black tracking-widest uppercase text-amber-400">
              MODO ESPECTADOR • HAS SIDO NOQUEADO
            </span>
            <span className="text-xs font-bold text-white">
              Observando a: <span className="text-sky-300 font-black">{spectatedAllyName}</span>
            </span>
          </div>
          {onCycleSpectate && (
            <button
              onClick={() => {
                onCycleSpectate();
                sounds.playClick();
              }}
              className="ml-2 px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400 text-sky-300 text-xs font-bold cursor-pointer transition-all active:scale-95"
            >
              Cambiar Aliado [Espacio]
            </button>
          )}
        </div>
      )}

      {/* Bottom Center: Player Status, Health Bar, Super & Gadget Cards */}
      {!isSpectating && (
        <div className="mx-auto pointer-events-auto flex items-center gap-2 sm:gap-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 sm:px-3 sm:py-2 backdrop-blur-md shadow-2xl mb-1 max-w-[92vw] overflow-x-auto">
          {/* Hero Portrait & Health */}
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700/60">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400 flex items-center justify-center">
              <ShapeIcon heroId={playerHeroId} size={18} />
            </div>
            <div className="flex flex-col min-w-[90px] sm:min-w-[110px]">
              <div className="flex items-center justify-between text-[10px] font-black tracking-tight">
                <span className="text-white">{HERO_DEFINITIONS[playerHeroId]?.name || 'Héroe'}</span>
                <span className="text-sky-300 font-mono">{playerHp}/{playerMaxHp}</span>
              </div>
              {/* HP Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (playerHp / (playerMaxHp || 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Super Status Card */}
          <button
            type="button"
            onClick={() => {
              if (isSuperReady && onTriggerSuper) {
                onTriggerSuper();
                sounds.playClick();
              }
            }}
            disabled={!isSuperReady}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-left ${
              isSuperReady
                ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/30 cursor-pointer shadow-[0_0_15px_rgba(251,191,36,0.5)] active:scale-95 animate-pulse'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 opacity-80 cursor-default'
            }`}
            title={`${HERO_DEFINITIONS[playerHeroId]?.superName}: ${HERO_DEFINITIONS[playerHeroId]?.superDescription}`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSuperReady ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-black uppercase text-amber-400/80">SÚPER [E]</span>
                <span className={`text-[10px] font-black ${isSuperReady ? 'text-amber-300' : 'text-slate-400'}`}>
                  {isSuperReady ? '¡LISTO!' : `${Math.round(playerEnergy)}%`}
                </span>
              </div>
              <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-150 ${isSuperReady ? 'bg-amber-400' : 'bg-sky-500'}`}
                  style={{ width: `${Math.min(100, playerEnergy)}%` }}
                />
              </div>
            </div>
          </button>

          {/* Potenciador Status Card (Ilimitado - Se recarga con el tiempo) */}
          <button
            type="button"
            onClick={() => {
              if (playerGadgetCooldown <= 0 && onTriggerGadget) {
                onTriggerGadget();
                sounds.playClick();
              }
            }}
            disabled={playerGadgetCooldown > 0}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-left ${
              playerGadgetCooldown <= 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/30 cursor-pointer active:scale-95'
                : 'bg-slate-950/60 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
            title={`${HERO_DEFINITIONS[playerHeroId]?.gadget?.name}: ${HERO_DEFINITIONS[playerHeroId]?.gadget?.description}`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${playerGadgetCooldown <= 0 ? 'bg-emerald-500 text-white shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-800 text-slate-500'}`}>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-emerald-400/80">POTENCIADOR [Q]</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-black font-mono text-white">
                  {playerGadgetCooldown > 0 ? `${playerGadgetCooldown.toFixed(1)}s` : 'LISTO (∞)'}
                </span>
                {/* Unlimited recharge pulse indicator */}
                <div className={`w-2 h-2 rounded-full ${playerGadgetCooldown <= 0 ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-slate-700'}`} />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Screen middle and center are completely unobstructed for full battle visibility */}

      {/* Pause Modal */}
      {isPaused && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col gap-5 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-sky-400">
                <Pause className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold font-display text-white">Partida Pausada</h2>
              <p className="text-xs text-slate-400">Modo Noqueo 3v3 — Ronda {currentRound} de 3</p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  onTogglePause();
                  sounds.playClick();
                }}
                className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Play className="w-4 h-4" />
                <span>Reanudar Combate</span>
              </button>

              <button
                onClick={() => {
                  onForfeit();
                  sounds.playClick();
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Rendirse / Salir al Menú</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
