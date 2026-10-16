/**
 * Shape Wars - Upgrades & Progression Screen
 */

import React, { useState } from 'react';
import { HeroId, HERO_DEFINITIONS, ALL_HERO_IDS } from '../game/types';
import {
  UserProgress,
  upgradeHeroStat,
  MAX_UPGRADE_LEVEL,
  UPGRADE_COSTS,
  getStatBonusMultiplier,
} from '../game/storage';
import { ShapeIcon } from './ShapeIcon';
import { HeroPortrait } from './HeroPortrait';
import { Heart, Swords, Zap, Coins, ChevronUp, Lock } from 'lucide-react';
import { sounds } from '../game/sound';

interface UpgradesScreenProps {
  progress: UserProgress;
  onUpdateProgress: (progress: UserProgress) => void;
}

export const UpgradesScreen: React.FC<UpgradesScreenProps> = ({ progress, onUpdateProgress }) => {
  const [selectedHeroId, setSelectedHeroId] = useState<HeroId>(progress.selectedHero);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const heroList: HeroId[] = ALL_HERO_IDS;
  const activeDef = HERO_DEFINITIONS[selectedHeroId];
  const isUnlocked = progress.unlockedHeroes.includes(selectedHeroId);

  const heroUpgrades = progress.heroUpgrades[selectedHeroId] || { hpLevel: 1, damageLevel: 1, speedLevel: 1 };

  const handleUpgrade = (stat: 'hp' | 'damage' | 'speed') => {
    setErrorMsg(null);
    if (!isUnlocked) {
      setErrorMsg('Debes desbloquear este guerrero antes de mejorar sus atributos.');
      sounds.playHit();
      return;
    }

    const res = upgradeHeroStat(progress, selectedHeroId, stat);
    if (res.success) {
      sounds.playVictory();
      onUpdateProgress(res.progress);
    } else {
      setErrorMsg(res.message || 'No tienes suficientes monedas');
      sounds.playHit();
    }
  };

  const renderStatCard = (
    label: string,
    statKey: 'hp' | 'damage' | 'speed',
    level: number,
    baseValue: number,
    unit: string,
    Icon: React.ComponentType<{ className?: string }>,
    accentClass: string
  ) => {
    const isMax = level >= MAX_UPGRADE_LEVEL;
    const nextLevel = level + 1;
    const cost = UPGRADE_COSTS[nextLevel] || 0;
    const canAfford = progress.coins >= cost;

    const currentVal = Math.round(baseValue * getStatBonusMultiplier(level));
    const nextVal = Math.round(baseValue * getStatBonusMultiplier(nextLevel));
    const gain = nextVal - currentVal;

    return (
      <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg bg-slate-800 border border-slate-700 ${accentClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm font-display">{label}</h3>
              <span className="text-xs text-slate-400">
                Nivel {level} de {MAX_UPGRADE_LEVEL}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-lg font-black font-mono text-white tabular-nums">{currentVal}</span>
            <span className="text-xs text-slate-500 ml-1">{unit}</span>
          </div>
        </div>

        {/* Level Pips */}
        <div className="flex items-center gap-1.5 w-full">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <div
              key={lvl}
              className={`h-2 flex-1 rounded-full transition-all ${
                lvl <= level ? 'bg-sky-400' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Upgrade Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          {!isMax ? (
            <>
              <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono">
                <ChevronUp className="w-3.5 h-3.5" />
                <span>+{gain} {unit}</span>
              </div>

              <button
                onClick={() => handleUpgrade(statKey)}
                disabled={!isUnlocked || !canAfford}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  !isUnlocked || !canAfford
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
                    : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-md'
                }`}
              >
                <Coins className="w-3 h-3 text-slate-950" />
                <span>{cost} M</span>
              </button>
            </>
          ) : (
            <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider w-full text-center py-1">
              NIVEL MÁXIMO ALCANZADO
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 animate-fadeIn min-w-0 max-w-full overflow-x-hidden">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white">Laboratorio de Mejoras</h1>
          <p className="text-sm text-slate-400 mt-1">
            Aumenta permanentemente la salud, daño y velocidad de tus guerreros usando monedas de combate.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 px-4 py-2 rounded-xl text-amber-300 font-mono text-sm self-start">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-bold tabular-nums">{progress.coins} Monedas</span>
        </div>
      </div>

      {/* Hero Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {heroList.map((id) => {
          const def = HERO_DEFINITIONS[id];
          const isSelected = selectedHeroId === id;
          const unlocked = progress.unlockedHeroes.includes(id);

          return (
            <button
              key={id}
              onClick={() => {
                setSelectedHeroId(id);
                setErrorMsg(null);
                sounds.playClick();
              }}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-850 border-sky-400 shadow-md ring-2 ring-sky-400/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                <HeroPortrait heroId={id} shapeSize={26} glow={isSelected} className="w-full h-full" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm truncate font-display">{def.name}</span>
                  {!unlocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                </div>
                <span className="text-[11px] text-slate-400 truncate block">{def.shape}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hero Header & Upgrade Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0 flex items-center justify-center">
              <HeroPortrait heroId={selectedHeroId} shapeSize={44} glow={true} className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black font-display text-white">{activeDef.name}</h2>
                <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  {activeDef.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{activeDef.title}</p>
            </div>
          </div>

          {!isUnlocked && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-amber-300 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Bloqueado ({activeDef.unlockCost} Monedas)</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* 3 Stat Upgrade Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderStatCard(
            'Salud Máxima',
            'hp',
            heroUpgrades.hpLevel,
            activeDef.baseHp,
            'PS',
            Heart,
            'text-emerald-400'
          )}
          {renderStatCard(
            'Poder de Ataque',
            'damage',
            heroUpgrades.damageLevel,
            activeDef.baseDamage,
            'dmg',
            Swords,
            'text-rose-400'
          )}
          {renderStatCard(
            'Velocidad de Desplazamiento',
            'speed',
            heroUpgrades.speedLevel,
            activeDef.baseSpeed,
            'u/s',
            Zap,
            'text-amber-400'
          )}
        </div>
      </div>
    </div>
  );
};
