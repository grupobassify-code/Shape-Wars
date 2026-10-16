/**
 * Shape Wars - AI Battle Loading Screen (Brawl Stars Style)
 * 
 * Features:
 * - Epic "VS" matchup screen showcasing player's hero vs rivals
 * - AI Tactical Intelligence Briefing powered by Gemini AI with instantaneous strategic fallback
 * - Animated loading progress bar with audio cues
 * - Seamless transition directly into combat
 */

import React, { useState, useEffect } from 'react';
import { HeroId, HERO_DEFINITIONS, GameMode } from '../game/types';
import { ShapeIcon } from './ShapeIcon';
import { HeroPortrait } from './HeroPortrait';
import { Bot, Sparkles, Swords, Trophy, Shield, Zap, Flame, Flag, Play } from 'lucide-react';
import { sounds } from '../game/sound';

interface AILoadingScreenProps {
  playerHeroId: HeroId;
  selectedMode: GameMode;
  rivalHeroes: HeroId[];
  onLoadingComplete: () => void;
}

// Built-in tactical intelligence matrix for instant and resilient matchmaking advice
const TACTICAL_TIPS: Record<HeroId, string> = {
  pulsar: 'Usa tu ráfaga para castigar desde cobertura. Tu Súper de Dispersión rompe formaciones enemigas.',
  bastion: 'Aprovecha tu baluarte pesado para absorber castigo en puntos de control o cubriendo al portador de la bandera.',
  nova: 'Mantén proximidad con aliados para activar tu Pulso Reparador y restaurar salud al instante.',
  prisma: 'Dispara en abanico desde distancias seguras. Cada fragmento que impacte cargará tu Súper rápidamente.',
  volt: 'Flanquea por la hierba alta usando tu alta velocidad base. Sorprende al enemigo antes de que puedan apuntar.',
  boom: 'Tus proyectiles explosivos tienen área de impacto: dispara a grupos o a los pedestales de bandera.',
  eclipse: 'La invisibilidad es tu mayor ventaja en 1v1 y CTF. Roba la bandera enemiga mientras estás en sigilo.',
  cometa: 'Tu proyectil penetrante atraviesa múltiples enemigos. Excelente para limpiar pasillos estrechos.',
  titan: 'Tu masa pesada te hace inmune a empujes. Lidera la carga contra las defensas enemigas.',
  vortex: 'Atrae a los enemigos hacia tu agujero negro para dejarlos vulnerables al fuego concentrado de tu equipo.',
};

const MODE_DESCRIPTIONS: Record<GameMode, { title: string; subtitle: string; icon: any; color: string }> = {
  '3v3': {
    title: 'BATALLA POR EQUIPOS 3v3',
    subtitle: 'Mejor de 3 rondas sin reaparición. Derrota a todo el escuadrón rival.',
    icon: Swords,
    color: 'from-sky-500 to-indigo-600',
  },
  '1v1': {
    title: 'DUELO DE HONOR 1v1',
    subtitle: 'Enfrentamiento cara a cara. Puntería pura y reflejos tácticos.',
    icon: Flame,
    color: 'from-rose-500 to-amber-600',
  },
  'ctf': {
    title: 'CAPTURA LA BANDERA',
    subtitle: 'Arrebata la bandera rival y llévala a tu pedestal. 2 capturas para ganar.',
    icon: Flag,
    color: 'from-amber-500 to-emerald-600',
  },
};

export const AILoadingScreen: React.FC<AILoadingScreenProps> = ({
  playerHeroId,
  selectedMode,
  rivalHeroes,
  onLoadingComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Analizando composiciones de héroes...');
  const [briefing, setBriefing] = useState<string>(() => {
    const tip = TACTICAL_TIPS[playerHeroId] || 'Posiciónate con astucia y aprovecha los arbustos para emboscadas.';
    return `IA TÁCTICA: ${tip}`;
  });

  const playerHero = HERO_DEFINITIONS[playerHeroId] || HERO_DEFINITIONS.pulsar;
  const primaryRivalId = rivalHeroes[0] || 'volt';
  const primaryRival = HERO_DEFINITIONS[primaryRivalId] || HERO_DEFINITIONS.volt;
  const modeInfo = MODE_DESCRIPTIONS[selectedMode] || MODE_DESCRIPTIONS['3v3'];
  const ModeIcon = modeInfo.icon;

  // Request Gemini API Match Briefing in background
  useEffect(() => {
    let isCancelled = false;

    async function fetchAIBriefing() {
      try {
        const rivalNames = rivalHeroes.map((id) => HERO_DEFINITIONS[id]?.name || id);
        const res = await fetch('/api/match-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerHero: playerHero.name,
            rivalHeroes: rivalNames,
            mode: modeInfo.title,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.briefing) {
            setBriefing(`IA TÁCTICA: ${data.briefing.trim()}`);
          }
        }
      } catch (err) {
        // Fallback already preloaded
      }
    }

    fetchAIBriefing();
    return () => {
      isCancelled = true;
    };
  }, [playerHero.name, rivalHeroes, modeInfo.title]);

  // Loading progress sequence
  useEffect(() => {
    const startTime = Date.now();
    const duration = 2600; // 2.6 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 35) {
        setLoadingText('Sincronizando IA táctica de bots...');
      } else if (pct < 70) {
        setLoadingText('Cargando arena de combate y arbustos...');
      } else if (pct < 95) {
        setLoadingText('Desplegando combatientes en base...');
      } else {
        setLoadingText('¡LISTO PARA EL COMBATE!');
      }

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          sounds.playSuper(playerHeroId);
          onLoadingComplete();
        }, 200);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onLoadingComplete, playerHeroId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-3 sm:p-8 select-none overflow-y-auto overflow-x-hidden max-w-full min-w-0 animate-fadeIn">
      {/* Background radial glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

      {/* ======================================================== */}
      {/* TOP: MODE BADGE & MAP INFO                               */}
      {/* ======================================================== */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${modeInfo.color} text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border border-white/20`}>
          <ModeIcon className="w-4 h-4" />
          <span>{modeInfo.title}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black font-display text-white mt-2">
          Arena Geométrica Central
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {modeInfo.subtitle}
        </p>
      </div>

      {/* ======================================================== */}
      {/* CENTER: SPLIT BRAWL STARS "VS" MATCHUP SHOWCASE          */}
      {/* ======================================================== */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-14 my-auto w-full max-w-5xl mx-auto">
        {/* Blue Side: Player Team */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right group">
          <div className="relative">
            {/* Glowing avatar frame */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-4 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.5)] bg-slate-900 relative">
              <HeroPortrait
                heroId={playerHero.id}
                avatarUrl={playerHero.avatarUrl}
                alt={playerHero.name}
                glow={true}
                shapeSize={54}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-black text-[10px] uppercase font-mono z-10">
                  TÚ
                </div>
              </HeroPortrait>
            </div>
          </div>

          <div className="mt-3">
            <span className="text-xs font-black uppercase tracking-wider text-sky-400">
              Equipo Azul
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
              {playerHero.name}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {playerHero.title}
            </p>
          </div>
        </div>

        {/* Center Animated "VS" Shield */}
        <div className="relative flex flex-col items-center justify-center shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 border-2 border-white/40 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.6)] rotate-3 animate-pulse">
            <span className="text-2xl sm:text-3xl font-black font-display text-white italic drop-shadow-md">
              VS
            </span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mt-2 font-mono">
            {selectedMode === '1v1' ? 'DUELO 1v1' : '3 CONTRA 3'}
          </div>
        </div>

        {/* Red Side: Opponents / Rival */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left group">
          <div className="relative">
            {/* Glowing avatar frame */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-4 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.5)] bg-slate-900 relative">
              <HeroPortrait
                heroId={primaryRival.id}
                avatarUrl={primaryRival.avatarUrl}
                alt={primaryRival.name}
                glow={true}
                shapeSize={54}
                className="w-full h-full"
                imgClassName="w-full h-full object-cover scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-rose-950/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] uppercase font-mono z-10">
                  RIVAL
                </div>
              </HeroPortrait>
            </div>
          </div>

          <div className="mt-3">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400">
              Equipo Rojo
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
              {primaryRival.name}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {primaryRival.title}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM: AI TACTICAL INTELLIGENCE BRIEFING & PROGRESS BAR */}
      {/* ======================================================== */}
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col gap-3">
        {/* Gemini Tactical Intelligence Box */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-400/30 backdrop-blur-md shadow-2xl flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3 text-sky-400" />
                IA TÁCTICA GEMINI • ANÁLISIS DE COMBATE
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-1 leading-relaxed">
              {briefing}
            </p>
          </div>
        </div>

        {/* Loading Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1">
            <span className="text-sky-300 animate-pulse">{loadingText}</span>
            <span>{progress}%</span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-400 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.8)] transition-all duration-75"
            />
          </div>
        </div>

        {/* Skip Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={() => {
              sounds.playClick();
              onLoadingComplete();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <span>Comenzar ya</span>
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
