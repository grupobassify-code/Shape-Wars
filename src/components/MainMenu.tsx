/**
 * Shape Wars - Brawl Stars Style Main Menu & Lobby Screen
 * Features:
 * - Center Brawler 3D-effect showcase with active stats & power level
 * - Big yellow Brawl Stars style "JUGAR" button with pulse
 * - Mode Selector card (3v3 Noqueo vs 1v1 Duelo)
 * - Profile button with trophies count, rank, and tag
 * - Characters / Brawlers ("Personajes") selection quick bar
 * - Upgrades & Settings tabs
 */

import React from 'react';
import { UserProgress } from '../game/storage';
import { HeroId, HERO_DEFINITIONS, GameMode, TROPHY_ROAD_REWARDS } from '../game/types';
import { ShapeIcon } from './ShapeIcon';
import { HeroPortrait } from './HeroPortrait';
import { Swords, Users, Wrench, Settings, Play, Trophy, Shield, Zap, Sparkles, ChevronRight, User, Layers, Flame, Flag, Gift, ShieldCheck } from 'lucide-react';
import { sounds } from '../game/sound';

interface MainMenuProps {
  progress: UserProgress;
  onStartCombat: () => void;
  onNavigate: (tab: 'heroes' | 'upgrades' | 'settings') => void;
  onOpenModeSelect: () => void;
  onOpenProfile: () => void;
  onOpenTrophyRoad: () => void;
  onOpenPrivacy?: () => void;
  onOpenRoomLobby?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  progress,
  onStartCombat,
  onNavigate,
  onOpenModeSelect,
  onOpenProfile,
  onOpenTrophyRoad,
  onOpenPrivacy,
  onOpenRoomLobby,
}) => {
  const selectedHeroId: HeroId = progress.selectedHero || 'pulsar';
  const currentHero = HERO_DEFINITIONS[selectedHeroId] || HERO_DEFINITIONS.pulsar;
  const currentMode: GameMode = progress.selectedMode || '3v3';
  const upgrades = progress.heroUpgrades[selectedHeroId] || { hpLevel: 1, damageLevel: 1, speedLevel: 1 };
  const powerLevel = Math.round((upgrades.hpLevel + upgrades.damageLevel + upgrades.speedLevel) / 3);

  const trophies = progress.trophies || 0;
  const avatarId: HeroId = (progress.avatarIcon as HeroId) || selectedHeroId;

  // Find next Trophy Road milestone
  const nextMilestone = TROPHY_ROAD_REWARDS.find((r) => !progress.claimedTrophyRewards?.includes(r.trophiesRequired)) || TROPHY_ROAD_REWARDS[TROPHY_ROAD_REWARDS.length - 1];
  const progressToNext = Math.min(100, Math.round((trophies / nextMilestone.trophiesRequired) * 100));

  return (
    <div className="w-full max-w-full overflow-x-hidden mx-auto px-2.5 sm:px-6 py-2.5 sm:py-6 flex flex-col justify-between min-h-full gap-3 sm:gap-6 animate-fadeIn select-none min-w-0">
      {/* ======================================================== */}
      {/* TOP ROW: USER PROFILE CARD & TROPHY ROAD ROADMAP BAR    */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 w-full max-w-full min-w-0">
        <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
          {/* Left: Profile Card Button */}
          <button
            onClick={() => {
              onOpenProfile();
              sounds.playClick();
            }}
            className="flex items-center gap-2.5 p-1.5 sm:p-2 pr-3 sm:pr-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-sky-400 hover:bg-slate-850/90 transition-all cursor-pointer shadow-lg group backdrop-blur-md min-w-0"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 border border-white/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.4)] group-hover:scale-105 transition-transform">
              <ShapeIcon heroId={avatarId} size={22} glow={true} />
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-black font-display text-white group-hover:text-sky-300 transition-colors truncate">
                  Comandante
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-1 py-0.2 rounded border border-slate-800 shrink-0">
                  {progress.playerTag || '#SHAPE101'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold">Ver Perfil</span>
              </div>
            </div>
          </button>

          {/* Mode Tag on mobile */}
          <button
            onClick={() => {
              onOpenModeSelect();
              sounds.playClick();
            }}
            className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition-all cursor-pointer shadow-md shrink-0"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                currentMode === '1v1'
                  ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  : currentMode === 'ctf'
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-sky-400 shadow-[0_0_6px_#38bdf8]'
              }`}
            />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
              {currentMode === '1v1' ? '1v1' : currentMode === 'ctf' ? '🚩' : '3v3'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Center: Interactive Trophy Road Progression Banner */}
        <button
          onClick={() => {
            onOpenTrophyRoad();
            sounds.playClick();
          }}
          className="w-full sm:flex-1 max-w-md flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/90 border border-amber-400/40 hover:border-amber-400 hover:bg-amber-950/60 transition-all cursor-pointer shadow-lg group min-w-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300 shadow-sm group-hover:scale-105 transition-transform">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-400" />
          </div>

          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-amber-300 uppercase tracking-wider flex items-center gap-1 font-display text-[11px] sm:text-xs truncate">
                Camino de Trofeos
              </span>
              <span className="text-amber-200 font-mono text-[10px] sm:text-xs shrink-0">
                {trophies} / {nextMilestone.trophiesRequired} 🏆
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-full overflow-hidden mt-1 sm:mt-1.5 border border-slate-700/60">
              <div
                style={{ width: `${progressToNext}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-300"
              />
            </div>

            <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 mt-1 font-medium">
              <span className="truncate">Siguiente: +{nextMilestone.coins} 💰 +{nextMilestone.kronus} 💎</span>
              <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-1">Reclamar →</span>
            </div>
          </div>
        </button>

        {/* Right: Quick Mode Tag Indicator (desktop/tablet) */}
        <button
          onClick={() => {
            onOpenModeSelect();
            sounds.playClick();
          }}
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition-all cursor-pointer shadow-md shrink-0"
        >
          <div
            className={`w-3 h-3 rounded-full ${
              currentMode === '1v1'
                ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                : currentMode === 'ctf'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                : 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
            }`}
          />
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            {currentMode === '1v1' ? 'Duelo 1v1' : currentMode === 'ctf' ? 'Bandera 🚩' : 'Noqueo 3v3'}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* CENTER STAGE: BRAWL STARS MAIN CHARACTER SHOWCASE        */}
      {/* ======================================================== */}
      <div className="relative flex-1 flex flex-col items-center justify-center my-1 sm:my-4 min-h-[160px] max-w-full overflow-hidden">
        {/* Holographic Arena Pedestal Light Disc */}
        <div className="absolute w-60 h-60 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-sky-500/10 via-purple-500/10 to-amber-500/5 blur-2xl pointer-events-none" />
        <div className="absolute w-44 h-10 sm:w-72 sm:h-16 rounded-[100%] bg-sky-500/15 blur-md bottom-10 sm:bottom-12 pointer-events-none border border-sky-400/20" />

        {/* Hero Character Frame */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Avatar / Portrait Showcase */}
          <div className="relative group cursor-pointer" onClick={() => onNavigate('heroes')}>
            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-3xl overflow-hidden border-3 border-sky-400/60 shadow-[0_0_35px_rgba(56,189,248,0.35)] bg-slate-900/90 relative flex items-center justify-center group-hover:scale-105 transition-all duration-300">
              <HeroPortrait
                heroId={selectedHeroId}
                avatarUrl={currentHero.avatarUrl}
                alt={currentHero.name}
                glow={true}
                shapeSize={52}
                className="w-full h-full"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 pointer-events-none" />

                {/* Floating Power Level Tag */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-lg bg-amber-500/90 border border-amber-300 text-slate-950 font-black text-[10px] sm:text-[11px] font-mono shadow-md flex items-center gap-1 z-10">
                  <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                  <span>NIVEL {powerLevel}</span>
                </div>
              </HeroPortrait>
            </div>

            {/* Change Hero prompt overlay pill */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-transform group-hover:scale-110">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Cambiar Personaje</span>
            </div>
          </div>

          {/* Hero Name & Title */}
          <div className="text-center mt-5">
            <h1 className="text-2xl sm:text-4xl font-black font-display text-white tracking-tight drop-shadow-md">
              {currentHero.name}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-sky-400 mt-0.5">
              {currentHero.title} • <span className="text-slate-400">{currentHero.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM CLUSTER: BRAWL STARS MODE CARD & BIG PLAY BUTTON  */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2.5 sm:gap-4 w-full max-w-full min-w-0">
        {/* Left: Quick Access Navigation Tabs - 5 compact items that never overflow */}
        <div className="grid grid-cols-5 sm:flex sm:flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-2 w-full lg:w-auto min-w-0">
          {/* Private Room / Code Join Button */}
          <button
            onClick={() => {
              if (onOpenRoomLobby) {
                onOpenRoomLobby();
              }
              sounds.playClick();
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-4 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border border-indigo-500/60 hover:border-indigo-400 hover:bg-indigo-900/60 text-indigo-200 hover:text-white text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.25)] group relative min-w-0 overflow-hidden"
          >
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
              </span>
              <Users className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
            </div>
            <span className="truncate">Salas</span>
          </button>

          <button
            onClick={() => {
              onNavigate('heroes');
              sounds.playClick();
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-4 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-sky-400/60 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md group min-w-0 overflow-hidden"
          >
            <Users className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate">Héroes</span>
          </button>

          <button
            onClick={() => {
              onNavigate('upgrades');
              sounds.playClick();
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-4 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-400/60 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md group min-w-0 overflow-hidden"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate">Mejoras</span>
          </button>

          <button
            onClick={() => {
              onNavigate('settings');
              sounds.playClick();
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-4 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-600 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md group min-w-0 overflow-hidden"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate">Ajustes</span>
          </button>

          <button
            onClick={() => {
              if (onOpenPrivacy) {
                onOpenPrivacy();
              } else {
                onNavigate('settings');
              }
              sounds.playClick();
            }}
            title="Políticas de Privacidad"
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3.5 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 text-slate-400 hover:text-sky-300 text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md group min-w-0 overflow-hidden"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate">Legal</span>
          </button>
        </div>

        {/* Right: Mode Selector Box & Massive Play Button */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 w-full lg:w-auto min-w-0">
          {/* Mode Selector Box (Brawl Stars Style) */}
          <button
            onClick={() => {
              onOpenModeSelect();
              sounds.playClick();
            }}
            className={`flex-1 sm:flex-initial flex items-center gap-2.5 sm:gap-3 p-2 sm:px-4 sm:py-3 rounded-2xl border-2 transition-all cursor-pointer shadow-xl text-left min-w-0 overflow-hidden ${
              currentMode === '1v1'
                ? 'bg-rose-950/40 border-rose-500/70 hover:border-rose-400 hover:bg-rose-900/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                : currentMode === 'ctf'
                ? 'bg-emerald-950/40 border-emerald-400/70 hover:border-emerald-300 hover:bg-emerald-900/50 shadow-[0_0_20px_rgba(52,211,153,0.25)]'
                : 'bg-sky-950/40 border-sky-500/70 hover:border-sky-400 hover:bg-sky-900/50 shadow-[0_0_20px_rgba(14,165,233,0.25)]'
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                currentMode === '1v1'
                  ? 'bg-rose-500/25 border-rose-400 text-rose-300'
                  : currentMode === 'ctf'
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                  : 'bg-sky-500/25 border-sky-400 text-sky-300'
              }`}
            >
              {currentMode === '1v1' ? (
                <Swords className="w-4 h-4 sm:w-6 sm:h-6" />
              ) : currentMode === 'ctf' ? (
                <span className="text-lg sm:text-2xl">🚩</span>
              ) : (
                <Users className="w-4 h-4 sm:w-6 sm:h-6" />
              )}
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399] shrink-0" />
                <span className="text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 truncate">
                  En Línea • Matchmaking Activo
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-black font-display text-white truncate">
                {currentMode === '1v1' ? 'Duelo de Honor 1v1' : currentMode === 'ctf' ? 'Captura la Bandera' : 'Batalla por Equipos 3v3'}
              </h3>
              <span className="text-[9.5px] sm:text-[11px] font-bold text-amber-300 block truncate">
                {currentMode === '1v1'
                  ? 'Emparejamiento 1v1 • Rival por Copas'
                  : currentMode === 'ctf'
                  ? '2 Banderas • Reaparición'
                  : 'Emparejamiento 3v3 • 6 Jugadores'}
              </span>
            </div>

            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-1 shrink-0" />
          </button>

          {/* Brawl Stars Iconic Yellow "JUGAR" Button */}
          <button
            onClick={() => {
              onStartCombat();
              sounds.playClick();
            }}
            className="py-2.5 sm:py-4 px-6 sm:px-10 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 active:scale-95 text-slate-950 font-black font-display text-base sm:text-xl tracking-wider uppercase rounded-2xl shadow-[0_0_25px_rgba(251,191,36,0.5)] border-2 border-yellow-200 transition-all flex items-center justify-center gap-2 cursor-pointer group shrink-0"
          >
            <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-slate-950 text-slate-950" />
            <span className="drop-shadow-sm">JUGAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
