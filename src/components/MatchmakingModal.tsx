/**
 * Shape Wars - Matchmaking Radar Modal
 * Displays an authentic competitive matchmaking queue with live radar scanner,
 * ping stats, server status, and instant cancel option.
 */

import React, { useEffect, useState } from 'react';
import { HeroId, HERO_DEFINITIONS, GameMode, RARITY_CONFIG, CATEGORY_CONFIG } from '../game/types';
import { UserProgress } from '../game/storage';
import { ShapeIcon } from './ShapeIcon';
import { sounds } from '../game/sound';
import { X, Wifi, Globe, Trophy, Shield, Swords, Flame, Sparkles } from 'lucide-react';
import { getRankTitle } from '../game/onlinePlayers';

interface MatchmakingModalProps {
  progress: UserProgress;
  mode: GameMode;
  statusMessage: string;
  isFound: boolean;
  onCancel: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  progress,
  mode,
  statusMessage,
  isFound,
  onCancel,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const selectedHeroId: HeroId = progress.selectedHero || 'pulsar';
  const heroDef = HERO_DEFINITIONS[selectedHeroId] || HERO_DEFINITIONS.pulsar;
  const rarity = RARITY_CONFIG[heroDef.rarity];
  const category = CATEGORY_CONFIG[heroDef.category];
  const trophies = progress.trophies || 0;
  const rankTitle = getRankTitle(trophies);

  // Queue timer & subtle radar sound pulse
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const current = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(current);
    }, 500);

    // Initial audio ping
    sounds.playRadarPing();
    const soundInterval = setInterval(() => {
      if (!isFound) {
        sounds.playRadarPing();
      }
    }, 2200);

    return () => {
      clearInterval(interval);
      clearInterval(soundInterval);
    };
  }, [isFound]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-between p-3 sm:p-8 select-none animate-fadeIn overflow-y-auto overflow-x-hidden max-w-full min-w-0">
      {/* Background radial effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

      {/* ======================================================== */}
      {/* TOP BAR: SERVER STATUS & CANCEL BUTTON                   */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-2xl flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-xs font-mono font-bold text-slate-300">
            Servidor LATAM · 24 ms
          </span>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">1,842 en línea</span>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onCancel();
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 hover:border-rose-400 text-rose-200 text-xs font-black tracking-wider uppercase transition-all cursor-pointer shadow-lg active:scale-95 group"
        >
          <X className="w-4 h-4 text-rose-400 group-hover:rotate-90 transition-transform duration-200" />
          <span>Cancelar</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* CENTER: ANIMATED RADAR SCANNER & MATCHMAKING METRICS     */}
      {/* ======================================================== */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        {/* Radar Ring Visual */}
        <div className="relative w-56 h-56 sm:w-68 sm:h-68 flex items-center justify-center">
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full border-2 border-sky-500/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]" />
          {/* Middle circle */}
          <div className="absolute inset-8 rounded-full border border-sky-400/25" />
          {/* Inner circle */}
          <div className="absolute inset-16 rounded-full border border-sky-400/20" />
          {/* Crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-500/20" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-500/20" />

          {/* Rotating Scanner Cone */}
          <div className="absolute inset-0 rounded-full overflow-hidden animate-spin [animation-duration:3s]">
            <div className="w-1/2 h-1/2 bg-gradient-to-br from-sky-400/35 to-transparent rounded-tl-full origin-bottom-right" />
          </div>

          {/* Center Pulsing Orb */}
          <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isFound
              ? 'bg-gradient-to-tr from-emerald-500 to-green-400 scale-110 shadow-[0_0_35px_rgba(52,211,153,0.8)]'
              : 'bg-gradient-to-tr from-sky-600 to-indigo-700 shadow-[0_0_25px_rgba(56,189,248,0.5)]'
          }`}>
            <ShapeIcon heroId={selectedHeroId} size={38} glow={true} />
          </div>

          {/* Simulated Nearby Detected Players (Pings) */}
          <div className="absolute top-8 right-12 w-3 h-3 rounded-full bg-sky-400/70 animate-ping" />
          <div className="absolute bottom-12 left-10 w-2.5 h-2.5 rounded-full bg-indigo-400/60 animate-pulse" />
          <div className="absolute top-20 left-8 w-2 h-2 rounded-full bg-emerald-400/60 animate-ping [animation-delay:1s]" />
        </div>

        {/* Status Callout & Mode Indicator */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
            {mode === '1v1' ? (
              <>
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Duelo de Honor 1v1</span>
              </>
            ) : mode === 'ctf' ? (
              <>
                <span className="text-sm">🚩</span>
                <span>Captura la Bandera</span>
              </>
            ) : (
              <>
                <Swords className="w-3.5 h-3.5 text-sky-400" />
                <span>Batalla por Equipos 3v3</span>
              </>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-display text-white tracking-wide">
            {isFound ? '¡OPONENTE ENCONTRADO!' : 'BUSCANDO JUGADOR...'}
          </h2>

          <p className="text-xs sm:text-sm text-sky-300/80 font-medium mt-1">
            {statusMessage}
          </p>
        </div>

        {/* Live Stopwatch & Estimated Time */}
        <div className="mt-4 flex items-center gap-6 px-6 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tiempo en cola
            </span>
            <span className="text-xl font-black font-mono text-white tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-slate-700/80" />
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tiempo estimado
            </span>
            <span className="text-xl font-black font-mono text-amber-300 tabular-nums">
              ~00:05
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM: LOCAL PLAYER COMBATANT CARD                      */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border-2 border-sky-400/60 rounded-3xl p-3.5 sm:p-4 shadow-[0_0_25px_rgba(56,189,248,0.25)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 border-2 border-white/40 flex items-center justify-center shrink-0 shadow-md">
            <ShapeIcon heroId={selectedHeroId} size={30} glow={true} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black font-display text-white">
                Comandante (Tú)
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                {progress.playerTag || '#SHAPE101'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              {/* Rarity & Category badges */}
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${rarity.bgColor} ${rarity.textColor} border ${rarity.borderColor}`}>
                {rarity.label}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {category.label}
              </span>
            </div>
          </div>
        </div>

        {/* Trophies & Rank */}
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end text-amber-300 font-black font-mono text-sm sm:text-base">
            <Trophy className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{trophies}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
            {rankTitle}
          </span>
        </div>
      </div>
    </div>
  );
};
