/**
 * Shape Wars - 1v1 / 3v3 Versus Screen (Cara a Cara)
 * Brawl Stars style showdown face-off with custom hero cards, rarity plates,
 * rank badges, audio countdown, and high-impact collision animation.
 */

import React, { useEffect, useState } from 'react';
import { HeroId, HERO_DEFINITIONS, GameMode, RARITY_CONFIG, CATEGORY_CONFIG } from '../game/types';
import { OnlinePlayerProfile, getRankTitle } from '../game/onlinePlayers';
import { UserProgress } from '../game/storage';
import { ShapeIcon } from './ShapeIcon';
import { sounds } from '../game/sound';
import { Trophy, Swords, Flame, Shield, Zap, Sparkles } from 'lucide-react';

interface VersusScreenProps {
  progress: UserProgress;
  rival: OnlinePlayerProfile;
  mode: GameMode;
  onFinish: () => void;
}

export const VersusScreen: React.FC<VersusScreenProps> = ({
  progress,
  rival,
  mode,
  onFinish,
}) => {
  const [countdown, setCountdown] = useState<number>(3);
  const [hasStartedFight, setHasStartedFight] = useState(false);

  const playerHeroId: HeroId = progress.selectedHero || 'pulsar';
  const playerDef = HERO_DEFINITIONS[playerHeroId] || HERO_DEFINITIONS.pulsar;
  const playerRarity = RARITY_CONFIG[playerDef.rarity];
  const playerCategory = CATEGORY_CONFIG[playerDef.category];
  const playerTrophies = progress.trophies || 0;
  const playerRankTitle = getRankTitle(playerTrophies);

  const rivalDef = HERO_DEFINITIONS[rival.heroId] || HERO_DEFINITIONS.volt;
  const rivalRarity = RARITY_CONFIG[rivalDef.rarity];
  const rivalCategory = CATEGORY_CONFIG[rivalDef.category];

  useEffect(() => {
    // Initial impact sound
    sounds.playMatchFound();

    // 3.. 2.. 1.. COMBATE countdown
    const timer1 = setTimeout(() => {
      sounds.playCountdownTick();
      setCountdown(2);
    }, 1000);

    const timer2 = setTimeout(() => {
      sounds.playCountdownTick();
      setCountdown(1);
    }, 2000);

    const timer3 = setTimeout(() => {
      sounds.playFightStart();
      setCountdown(0);
      setHasStartedFight(true);
    }, 2800);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-3 sm:p-8 select-none overflow-y-auto overflow-x-hidden max-w-full min-w-0 animate-fadeIn">
      {/* Background split battle-field colors */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-sky-950/60 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-rose-950/60 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      {/* ======================================================== */}
      {/* TOP HEADER: MODE BADGE & ARENA TITLE                     */}
      {/* ======================================================== */}
      <div className="relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 shadow-lg text-xs font-black uppercase tracking-widest text-slate-200">
          {mode === '1v1' ? (
            <>
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Duelo de Honor 1v1</span>
            </>
          ) : (
            <>
              <Swords className="w-4 h-4 text-sky-400" />
              <span>Batalla por Equipos</span>
            </>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black font-display text-white mt-2">
          ¡ENCUENTRO CLASIFICATORIO EN LÍNEA!
        </h1>
      </div>

      {/* ======================================================== */}
      {/* CENTER: 1v1 FACE-OFF CARDS WITH VS EMBLEM                */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6 my-auto">
        {/* ==================== LEFT CARD: BLUE PLAYER ==================== */}
        <div className="w-full md:w-5/12 bg-slate-900/90 border-3 border-sky-400/80 rounded-3xl p-5 shadow-[0_0_35px_rgba(56,189,248,0.35)] relative overflow-hidden transition-transform duration-300 transform md:-translate-x-2">
          {/* Subtle blue corner ambient */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇲🇽</span>
              <div>
                <span className="text-xs font-black text-sky-400 uppercase tracking-wider block">
                  TU EQUIPO
                </span>
                <span className="text-base font-black font-display text-white">
                  Comandante
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {progress.playerTag || '#SHAPE101'}
              </span>
              <div className="text-[11px] font-bold text-emerald-400 mt-0.5">
                ● 24 ms
              </div>
            </div>
          </div>

          {/* Hero Portrait & Badges */}
          <div className="flex items-center gap-4 my-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 border-2 border-white/40 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
              <img
                src={playerDef.avatarUrl}
                alt={playerDef.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <div className="text-lg sm:text-xl font-black font-display text-white">
                {playerDef.name}
              </div>
              <div className="text-xs text-sky-300 font-semibold">
                {playerDef.title}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${playerRarity.bgColor} ${playerRarity.textColor} border ${playerRarity.borderColor}`}>
                  {playerRarity.label}
                </span>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {playerCategory.label}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Stats: Trophies & Rank */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-300 font-black font-mono text-base">
              <Trophy className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>{playerTrophies} 🏆</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {playerRankTitle}
            </span>
          </div>
        </div>

        {/* ==================== CENTER VS BADGE & COUNTDOWN ==================== */}
        <div className="flex flex-col items-center justify-center shrink-0 z-20">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 border-4 border-yellow-200 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.6)] animate-pulse">
            <span className="text-2xl sm:text-3xl font-black font-display text-slate-950 italic tracking-tighter">
              VS
            </span>
          </div>

          {/* Countdown indicator */}
          <div className="mt-3 text-center">
            {countdown > 0 ? (
              <div className="text-3xl sm:text-4xl font-black font-display text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-bounce">
                {countdown}
              </div>
            ) : (
              <div className="text-2xl sm:text-3xl font-black font-display text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]">
                ¡COMBATE!
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT CARD: RED OPPONENT ==================== */}
        <div className="w-full md:w-5/12 bg-slate-900/90 border-3 border-rose-500/80 rounded-3xl p-5 shadow-[0_0_35px_rgba(244,63,94,0.35)] relative overflow-hidden transition-transform duration-300 transform md:translate-x-2">
          {/* Subtle rose corner ambient */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{rival.flag}</span>
              <div>
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider block">
                  RIVAL EN LÍNEA
                </span>
                <span className="text-base font-black font-display text-white">
                  {rival.name}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {rival.clan}
              </span>
              <div className="text-[11px] font-bold text-emerald-400 mt-0.5">
                ● {rival.pingMs} ms
              </div>
            </div>
          </div>

          {/* Hero Portrait & Badges */}
          <div className="flex items-center gap-4 my-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 border-2 border-white/40 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden">
              <img
                src={rivalDef.avatarUrl}
                alt={rivalDef.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <div className="text-lg sm:text-xl font-black font-display text-white">
                {rivalDef.name}
              </div>
              <div className="text-xs text-rose-300 font-semibold">
                {rivalDef.title}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${rivalRarity.bgColor} ${rivalRarity.textColor} border ${rivalRarity.borderColor}`}>
                  {rivalRarity.label}
                </span>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {rivalCategory.label}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Stats: Trophies & Rank */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-300 font-black font-mono text-base">
              <Trophy className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>{rival.trophies} 🏆</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {rival.rankTitle}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM FOOTER: SERVER & CONNECTION INFO                  */}
      {/* ======================================================== */}
      <div className="relative z-10 text-center text-xs text-slate-500 font-mono">
        Servidor Conectado: {rival.serverRegion} • Protocolo de Baja Latencia
      </div>
    </div>
  );
};
