/**
 * Shape Wars - Brawl Stars Style Battle Cards Match Intro
 * 
 * Displays:
 * - 3-second cinematic presentation showcasing all players & rivals cards
 * - Customized Brawler Profile Backgrounds with unique patterns and themes
 * - Mastery winged badges and titles on each card
 * - Bottom countdown: "La partida empieza en 3... 2... 1..."
 * - Matches the visual design of the Brawl Stars battle intro reference image
 */

import React, { useState, useEffect } from 'react';
import { HeroId, KnockoutParticipant, HERO_DEFINITIONS, BATTLE_BACKGROUNDS, GameMode } from '../game/types';
import { ShapeIcon } from './ShapeIcon';
import { Crown, Sparkles, Swords, Flame, Flag, Trophy, Shield, Zap, FastForward } from 'lucide-react';
import { sounds } from '../game/sound';

interface BattleCardsIntroProps {
  participants: KnockoutParticipant[];
  gameMode: GameMode;
  playerHeroId: HeroId;
  playerBackgroundId?: HeroId;
  onFinish: () => void;
}

export const BattleCardsIntro: React.FC<BattleCardsIntroProps> = ({
  participants,
  gameMode,
  playerHeroId,
  playerBackgroundId,
  onFinish,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [isClosing, setIsClosing] = useState(false);

  // Group participants by team
  const blueTeam = participants.filter((p) => p.team === 'blue');
  const redTeam = participants.filter((p) => p.team === 'red');

  // If participants list is somehow empty yet, ensure at least player and rival exist
  const safeBlueTeam: KnockoutParticipant[] = blueTeam.length > 0 ? blueTeam : [
    {
      id: 'char-player',
      heroId: playerHeroId,
      name: 'Comandante',
      team: 'blue',
      isPlayer: true,
      isAlive: true,
      hp: 100,
      maxHp: 100,
      title: 'Comandante Supremo',
      badge: '👑',
      backgroundId: playerBackgroundId || playerHeroId,
    },
  ];

  const safeRedTeam: KnockoutParticipant[] = redTeam.length > 0 ? redTeam : [
    {
      id: 'char-enemy-1',
      heroId: 'volt',
      name: 'Rival Volt',
      team: 'red',
      isPlayer: false,
      isAlive: true,
      hp: 85,
      maxHp: 85,
      title: 'As de la Tormenta',
      badge: '🔥',
      backgroundId: 'volt',
    },
  ];

  // 3-second countdown timer
  useEffect(() => {
    sounds.playClick();

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleComplete();
          return 0;
        }
        sounds.playClick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleComplete = () => {
    setIsClosing(true);
    sounds.playVictory();
    setTimeout(() => {
      onFinish();
    }, 350);
  };

  const getModeTitle = () => {
    switch (gameMode) {
      case '1v1':
        return '¡Duelo solitario a muerte!';
      case 'ctf':
        return '¡Captura la bandera enemiga!';
      case '3v3':
      default:
        return '¡Derrota al escuadrón rival!';
    }
  };

  const renderCard = (p: KnockoutParticipant, isEnemy: boolean) => {
    const bgHeroId = (p.isPlayer && playerBackgroundId) ? playerBackgroundId : (p.backgroundId || p.heroId);
    const bgDef = BATTLE_BACKGROUNDS[bgHeroId] || BATTLE_BACKGROUNDS.pulsar;
    const heroDef = HERO_DEFINITIONS[p.heroId] || HERO_DEFINITIONS.pulsar;

    return (
      <div
        key={p.id}
        className={`relative flex flex-col justify-between w-26 sm:w-36 md:w-44 h-40 sm:h-52 md:h-56 rounded-2xl border-2 transition-transform duration-300 transform hover:scale-105 shadow-2xl overflow-hidden select-none shrink-0 ${
          isEnemy
            ? 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
            : 'border-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
        }`}
      >
        {/* Background Gradient & Dynamic Thematic Pattern */}
        <div className={`absolute inset-0 bg-gradient-to-b ${bgDef.gradient} opacity-95`} />

        {/* Custom Decorative Patterns based on Hero Theme */}
        {bgDef.pattern === 'cyber' && (
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
        )}
        {bgDef.pattern === 'thunder' && (
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[linear-gradient(45deg,#facc15_10%,transparent_10%,transparent_50%,#facc15_50%,#facc15_60%,transparent_60%)] [background-size:16px_16px]" />
        )}
        {bgDef.pattern === 'shield' && (
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(0deg,#10b981_1px,transparent_1px),linear-gradient(90deg,#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
        )}
        {bgDef.pattern === 'blast' && (
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(ellipse_at_top,#f97316_0%,transparent_70%)]" />
        )}
        {bgDef.pattern === 'nebula' && (
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,#c084fc_0%,transparent_60%)]" />
        )}
        {bgDef.pattern === 'prism' && (
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[linear-gradient(135deg,#f472b6_25%,transparent_25%,transparent_50%,#38bdf8_50%,#38bdf8_75%,transparent_75%)] [background-size:20px_20px]" />
        )}
        {bgDef.pattern === 'eclipse' && (
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_center,#6b21a8_10%,transparent_70%)]" />
        )}
        {bgDef.pattern === 'comet' && (
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[linear-gradient(135deg,#38bdf8_10%,transparent_40%)]" />
        )}
        {bgDef.pattern === 'colossus' && (
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#eab308_2px,transparent_2px)] [background-size:18px_18px]" />
        )}
        {bgDef.pattern === 'vortex' && (
          <div className="absolute inset-0 opacity-35 pointer-events-none bg-[conic-gradient(at_center,#d946ef,transparent,#a855f7)]" />
        )}

        {/* TOP MASTERY CROWN WINGED EMBLEM (Brawl Stars Reference Feature) */}
        <div className="relative z-10 pt-2 flex items-center justify-center">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/85 border border-white/20 shadow-lg backdrop-blur-xs">
            <span className="text-xs">{bgDef.badgeIcon || (isEnemy ? '🔥' : '👑')}</span>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 font-display">
              {p.isPlayer ? 'MAESTRÍA' : 'NIVEL PRO'}
            </span>
            <span className="text-xs">{p.badge || (p.isPlayer ? '👑' : '⭐')}</span>
          </div>
        </div>

        {/* CENTER BRAWLER PORTRAIT / SHAPE */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center group-hover:scale-110 transition-transform">
            {/* Glowing Backdrop Ring */}
            <div
              style={{ backgroundColor: bgDef.accentColor }}
              className="absolute w-16 h-16 rounded-full blur-md opacity-40 animate-pulse"
            />
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/70 border border-white/30 flex items-center justify-center shadow-xl">
              <ShapeIcon heroId={p.heroId} size={32} glow={true} />
            </div>
          </div>
          <span className="text-[11px] sm:text-xs font-black font-display text-white mt-1.5 uppercase tracking-wide drop-shadow-md">
            {heroDef.name}
          </span>
        </div>

        {/* BOTTOM METADATA BAR (Player Name + Title + Pins) */}
        <div className="relative z-10 px-2 py-1.5 bg-slate-950/90 border-t border-white/10 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-black font-display text-white truncate max-w-[90px]">
              {p.isPlayer ? 'Comandante' : p.name.replace(/^(Rival|Bot Aliado)\s*/, '')}
            </span>
            {p.isPlayer && (
              <span className="text-[8px] font-black uppercase tracking-wider bg-sky-500 text-slate-950 px-1 py-0.2 rounded font-mono shadow-xs">
                TÚ
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[8px] text-slate-400 font-bold truncate max-w-[95px]">
              {p.title || (isEnemy ? 'Rival Peligroso' : 'Aliado de Élite')}
            </span>
            <span className="text-[8px] font-mono font-bold text-amber-400">
              {bgDef.badgeIcon}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={handleComplete}
      className={`fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-2.5 sm:p-6 transition-opacity duration-300 cursor-pointer overflow-y-auto overflow-x-hidden max-w-full ${
        isClosing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Top Banner: Mode Indicator */}
      <div className="w-full flex items-center justify-between max-w-5xl min-w-0">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 sm:px-4 py-1.5 rounded-2xl shadow-lg">
          {gameMode === 'ctf' ? (
            <Flag className="w-4 h-4 text-emerald-400" />
          ) : gameMode === '1v1' ? (
            <Flame className="w-4 h-4 text-rose-400" />
          ) : (
            <Swords className="w-4 h-4 text-sky-400" />
          )}
          <span className="text-xs font-black uppercase tracking-widest text-white font-display">
            {gameMode === '1v1' ? 'DUELO 1v1' : gameMode === 'ctf' ? 'CAPTURA LA BANDERA' : 'NOQUEO 3v3'}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleComplete();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-md shrink-0"
        >
          <span>Saltar</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CENTER: BATTLE CARDS GRID (Two Rows exactly like Brawl Stars) */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-6 w-full max-w-5xl my-auto min-w-0">
        {/* ROW 1: ENEMY SQUAD (RIVALS) */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 max-w-full">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-rose-400 font-display">
            <span>EQUIPO RIVAL</span>
            <div className="w-6 sm:w-8 h-0.5 bg-rose-500 rounded-full" />
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-5 flex-wrap max-w-full">
            {safeRedTeam.map((p) => renderCard(p, true))}
          </div>
        </div>

        {/* ROW 2: ALLY SQUAD (PLAYER & ALLIES) */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 max-w-full">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-sky-400 font-display">
            <span>TU EQUIPO</span>
            <div className="w-6 sm:w-8 h-0.5 bg-sky-400 rounded-full" />
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-5 flex-wrap max-w-full">
            {safeBlueTeam.map((p) => renderCard(p, false))}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Mode Description & Giant Countdown Timer */}
      <div className="w-full max-w-5xl flex items-end justify-between">
        <div className="text-left">
          <h3 className="text-base sm:text-xl font-black font-display text-white tracking-wide">
            {getModeTitle()}
          </h3>
          <p className="text-xs text-slate-400">
            {gameMode === 'ctf'
              ? 'Lleva la bandera enemiga a tu base para anotar. ¡2 puntos para ganar!'
              : 'Elimina a todos los rivales de la arena para asegurar la victoria.'}
          </p>
        </div>

        {/* Big Stylized Brawl Stars Countdown */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="text-right">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
              La partida empieza en
            </span>
          </div>
          <span className="text-3xl sm:text-4xl font-black font-display text-amber-400 animate-pulse drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
            {secondsLeft > 0 ? secondsLeft : '¡YA!'}
          </span>
        </div>
      </div>
    </div>
  );
};
