/**
 * Shape Wars - Match Result Modal (Best-of-3 Knockout Series Summary)
 */

import React from 'react';
import { MatchStats, HERO_DEFINITIONS } from '../game/types';
import { ShapeIcon } from './ShapeIcon';
import { HeroPortrait } from './HeroPortrait';
import { Trophy, Skull, Equal, RotateCcw, Home, Coins, Clock, Swords } from 'lucide-react';
import { sounds } from '../game/sound';
import { OnlinePlayerProfile } from '../game/onlinePlayers';

interface MatchResultModalProps {
  stats: MatchStats;
  rival?: OnlinePlayerProfile | null;
  onRematch: () => void;
  onReturnToMenu: () => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  stats,
  rival,
  onRematch,
  onReturnToMenu,
}) => {
  const isVictory = stats.result === 'VICTORY';
  const isDefeat = stats.result === 'DEFEAT';

  const mins = Math.floor(stats.durationSeconds / 60);
  const secs = stats.durationSeconds % 60;
  const durationStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const def = HERO_DEFINITIONS[stats.playerHeroId];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn overflow-y-auto overflow-x-hidden max-w-full">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-4 sm:gap-5 text-center min-w-0 max-h-[92vh] overflow-y-auto overflow-x-hidden">
        {/* Banner / Result Icon */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg border-2 ${
              isVictory
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-8 ring-amber-400/10'
                : isDefeat
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 ring-8 ring-rose-500/10'
                : 'bg-sky-500/20 border-sky-400 text-sky-300 ring-8 ring-sky-400/10'
            }`}
          >
            {isVictory ? (
              <Trophy className="w-10 h-10 animate-bounce" />
            ) : isDefeat ? (
              <Skull className="w-10 h-10" />
            ) : (
              <Equal className="w-10 h-10" />
            )}
          </div>

          <h2
            className={`text-3xl font-black font-display tracking-tight mt-1 ${
              isVictory ? 'text-amber-300' : isDefeat ? 'text-rose-400' : 'text-sky-300'
            }`}
          >
            {isVictory ? '¡VICTORIA!' : isDefeat ? 'DERROTA' : 'EMPATE'}
          </h2>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
            <span>
              {stats.gameMode === '1v1'
                ? '⚔️ Duelo 1v1'
                : stats.gameMode === 'ctf'
                ? '🚩 Captura la Bandera'
                : '👥 Noqueo 3v3'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {isVictory
              ? stats.gameMode === 'ctf'
                ? '¡Tu escuadrón capturó la bandera y se alzó con la gloria!'
                : '¡Dominaste la arena y triunfaste en el combate!'
              : isDefeat
              ? stats.gameMode === 'ctf'
                ? 'El rival capturó la bandera primero. ¡Ajusta tu táctica y prueba de nuevo!'
                : 'El rival se impuso en el combate. ¡Prueba otra estrategia!'
              : 'El combate ha concluido en empate.'}
          </p>

          {rival && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/70 rounded-xl border border-slate-800 text-xs w-full mt-1">
              <span className="text-slate-400 font-bold">Rival enfrente:</span>
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="text-sm">{rival.flag}</span>
                <span className="text-rose-400 font-display">{rival.name}</span>
                <span className="text-[10px] text-amber-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {rival.clan}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Knockout Round / CTF Capture Breakdown */}
        <div className="bg-slate-850/90 rounded-2xl p-3 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 text-xs font-black">
            <span className="text-sky-400 flex items-center gap-1.5">
              <span>AZUL ({stats.blueRoundsWon ?? (isVictory ? 2 : 0)})</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400">
              {stats.gameMode === 'ctf' ? 'BANDERAS CAPTURADAS' : 'SERIE AL MEJOR DE 3'}
            </span>
            <span className="text-rose-400 flex items-center gap-1.5">
              <span>({stats.redRoundsWon ?? (isDefeat ? 2 : 0)}) ROJO</span>
            </span>
          </div>

          {stats.gameMode === 'ctf' ? (
            <div className="flex items-center justify-center gap-6 py-2.5 bg-slate-900/60 rounded-xl border border-slate-800 text-sm font-black font-mono">
              <span className="text-sky-400">🔵 {stats.blueRoundsWon} Capturas</span>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400">🔴 {stats.redRoundsWon} Capturas</span>
            </div>
          ) : (
            /* Round Cards */
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((rndNum) => {
                const rndData = stats.rounds ? stats.rounds.find((r) => r.roundNumber === rndNum) : null;
                const isPlayed = !!rndData;
                const isBlueWin = rndData?.winnerTeam === 'blue';
                const isRedWin = rndData?.winnerTeam === 'red';

                return (
                  <div
                    key={rndNum}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      !isPlayed
                        ? 'bg-slate-900/40 border-slate-800/50 opacity-40'
                        : isBlueWin
                        ? 'bg-sky-500/15 border-sky-400/60 text-sky-300'
                        : isRedWin
                        ? 'bg-rose-500/15 border-rose-500/60 text-rose-300'
                        : 'bg-amber-500/15 border-amber-400/60 text-amber-300'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                      Ronda {rndNum}
                    </span>
                    <span className="text-xs font-black mt-0.5">
                      {!isPlayed
                        ? '—'
                        : isBlueWin
                        ? 'Azul Ganó'
                        : isRedWin
                        ? 'Rojo Ganó'
                        : 'Empate'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-2 bg-slate-850/80 p-3 rounded-2xl border border-slate-800">
          <div className="flex flex-col items-center p-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              Tiempo
            </span>
            <span className="text-sm font-mono font-black text-white mt-1 tabular-nums">{durationStr}</span>
          </div>

          <div className="flex flex-col items-center p-1 border-x border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Swords className="w-3 h-3 text-rose-400" />
              Bajas
            </span>
            <span className="text-sm font-mono font-black text-white mt-1 tabular-nums">{stats.playerKills}</span>
          </div>

          <div className="flex flex-col items-center p-1 border-r border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              Copas
            </span>
            <span className={`text-sm font-mono font-black mt-1 tabular-nums ${isVictory ? 'text-amber-300' : isDefeat ? 'text-rose-400' : 'text-slate-300'}`}>
              {isVictory ? '+8' : isDefeat ? '-3' : '+2'}
            </span>
          </div>

          <div className="flex flex-col items-center p-1 border-r border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              Monedas
            </span>
            <span className="text-sm font-mono font-black text-amber-300 mt-1 tabular-nums">+{stats.coinsEarned}</span>
          </div>

          <div className="flex flex-col items-center p-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
              <span>💎</span>
              Kronus
            </span>
            <span className="text-sm font-mono font-black text-purple-300 mt-1 tabular-nums">
              +{isVictory ? (stats.gameMode === 'ctf' ? 10 : 5) : 0}
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-850/50 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
              <HeroPortrait heroId={stats.playerHeroId} shapeSize={26} glow={true} className="w-full h-full" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block">{def.name}</span>
              <span className="text-[10px] text-slate-400">Daño total infligido: {stats.playerDamage}</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-sky-400">Escuadrón Azul</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={() => {
              onRematch();
              sounds.playClick();
            }}
            className="flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Revancha (Bo3)</span>
          </button>

          <button
            onClick={() => {
              onReturnToMenu();
              sounds.playClick();
            }}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <Home className="w-4 h-4" />
            <span>Menú Principal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
