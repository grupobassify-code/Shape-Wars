/**
 * Shape Wars - Top Navigation Bar
 * Follows the 3-zone Top Bar Contract from the Frontend Design Guidelines
 */

import React from 'react';
import { Volume2, VolumeX, Coins, Swords } from 'lucide-react';
import { sounds } from '../game/sound';

interface HeaderBarProps {
  currentTab: 'menu' | 'combat' | 'heroes' | 'upgrades' | 'settings';
  onSelectTab: (tab: 'menu' | 'combat' | 'heroes' | 'upgrades' | 'settings') => void;
  coins: number;
  kronus?: number;
  trophies?: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStartCombat: () => void;
  onOpenProfile?: () => void;
  onOpenTrophyRoad?: () => void;
  isInCombat: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentTab,
  onSelectTab,
  coins,
  kronus = 0,
  trophies = 0,
  soundEnabled,
  onToggleSound,
  onStartCombat,
  onOpenProfile,
  onOpenTrophyRoad,
  isInCombat,
}) => {
  return (
    <header className="w-full max-w-full overflow-hidden flex items-center justify-between gap-1.5 sm:gap-6 px-2.5 sm:px-6 py-2 sm:py-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md z-40 select-none shrink-0 min-w-0">
      {/* Zone 1: Brand Wordmark */}
      <div
        onClick={() => {
          if (!isInCombat) onSelectTab('menu');
        }}
        className="flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0 group min-w-0"
      >
        <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-sky-400 rotate-45 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
        <span className="text-sm sm:text-xl font-extrabold tracking-tight font-display text-white group-hover:text-sky-400 transition-colors truncate">
          Shape Wars
        </span>
      </div>

      {/* Zone 2: Navigation Links (desktop & tablet) */}
      <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-slate-300">
        <button
          onClick={() => onSelectTab('menu')}
          disabled={isInCombat}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            currentTab === 'menu' ? 'text-sky-400 border-b-2 border-sky-400 pb-0.5' : 'text-slate-400'
          }`}
        >
          Inicio
        </button>
        <button
          onClick={() => onSelectTab('heroes')}
          disabled={isInCombat}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            currentTab === 'heroes' ? 'text-sky-400 border-b-2 border-sky-400 pb-0.5' : 'text-slate-400'
          }`}
        >
          Personajes
        </button>
        <button
          onClick={() => onSelectTab('upgrades')}
          disabled={isInCombat}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            currentTab === 'upgrades' ? 'text-sky-400 border-b-2 border-sky-400 pb-0.5' : 'text-slate-400'
          }`}
        >
          Mejoras
        </button>
        <button
          onClick={() => onSelectTab('settings')}
          disabled={isInCombat}
          className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
            currentTab === 'settings' ? 'text-sky-400 border-b-2 border-sky-400 pb-0.5' : 'text-slate-400'
          }`}
        >
          Ajustes
        </button>
      </nav>

      {/* Zone 3: Currency & Primary Action */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0 min-w-0">
        {/* Trophies Badge - Opens Trophy Road */}
        <button
          onClick={() => {
            if (onOpenTrophyRoad) {
              onOpenTrophyRoad();
            } else if (onOpenProfile) {
              onOpenProfile();
            }
            sounds.playClick();
          }}
          className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-amber-500/15 border border-amber-400/40 rounded-lg text-amber-300 text-[10px] sm:text-xs font-bold font-mono hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm group shrink-0"
          title="Ver Camino de Trofeos"
        >
          <span className="text-amber-400 font-bold group-hover:scale-110 transition-transform">🏆</span>
          <span className="tabular-nums font-black">{trophies}</span>
        </button>

        {/* Kronus Badge */}
        <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-purple-950/70 border border-purple-500/40 rounded-lg text-purple-300 text-[10px] sm:text-xs font-bold font-mono shadow-sm shrink-0" title="Kronus: Moneda para desbloquear héroes">
          <span className="text-purple-400 text-xs">💎</span>
          <span className="tabular-nums">{kronus}</span>
        </div>

        {/* Coins Badge */}
        <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-amber-300 text-[10px] sm:text-xs font-bold font-mono shrink-0" title="Monedas: Para mejoras de estadísticas">
          <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <span className="tabular-nums">{coins}</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            onToggleSound();
            sounds.playClick();
          }}
          className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title={soundEnabled ? 'Silenciar audio' : 'Activar audio'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />}
        </button>

        {/* Primary CTA Button (visible on md+) */}
        {!isInCombat && (
          <button
            onClick={() => {
              onStartCombat();
              sounds.playClick();
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-sky-500 hover:bg-sky-400 active:bg-sky-600 rounded-md shadow-md transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Jugar</span>
          </button>
        )}
      </div>
    </header>
  );
};
