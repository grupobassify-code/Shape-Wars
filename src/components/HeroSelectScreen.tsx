/**
 * Shape Wars - Hero Selection Screen
 */

import React, { useState } from 'react';
import { HeroId, HERO_DEFINITIONS, ALL_HERO_IDS } from '../game/types';
import { UserProgress, unlockHero, getStatBonusMultiplier } from '../game/storage';
import { ShapeIcon } from './ShapeIcon';
import { Shield, Zap, Lock, Check, Coins, Swords, Gauge, Crosshair, Sparkles } from 'lucide-react';
import { sounds } from '../game/sound';

interface HeroSelectScreenProps {
  progress: UserProgress;
  onUpdateProgress: (progress: UserProgress) => void;
  onStartCombatWithHero: (heroId: HeroId) => void;
}

export const HeroSelectScreen: React.FC<HeroSelectScreenProps> = ({
  progress,
  onUpdateProgress,
  onStartCombatWithHero,
}) => {
  const [selectedHeroId, setSelectedHeroId] = useState<HeroId>(progress.selectedHero);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const heroList: HeroId[] = ALL_HERO_IDS;
  const activeDef = HERO_DEFINITIONS[selectedHeroId];
  const isUnlocked = progress.unlockedHeroes.includes(selectedHeroId);
  const isEquipped = progress.selectedHero === selectedHeroId;

  const upgrades = progress.heroUpgrades[selectedHeroId] || { hpLevel: 1, damageLevel: 1, speedLevel: 1 };
  const hpBonus = getStatBonusMultiplier(upgrades.hpLevel);
  const dmgBonus = getStatBonusMultiplier(upgrades.damageLevel);
  const speedBonus = getStatBonusMultiplier(upgrades.speedLevel);

  const currentHp = Math.round(activeDef.baseHp * hpBonus);
  const currentDamage = Math.round(activeDef.baseDamage * dmgBonus);
  const currentSpeed = Math.round(activeDef.baseSpeed * speedBonus);

  const handleUnlock = () => {
    setErrorMsg(null);
    const cost = activeDef.kronusCost || 50;
    const res = unlockHero(progress, selectedHeroId);
    if (res.success) {
      sounds.playVictory();
      onUpdateProgress(res.progress);
    } else {
      setErrorMsg(res.message || `Necesitas ${cost} Kronus para desbloquear a este guerrero. ¡Gana más en el Camino de Trofeos o victorias!`);
      sounds.playHit();
    }
  };

  const handleEquip = () => {
    if (!isUnlocked) return;
    const updated: UserProgress = {
      ...progress,
      selectedHero: selectedHeroId,
    };
    sounds.playClick();
    onUpdateProgress(updated);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 animate-fadeIn min-w-0 max-w-full overflow-x-hidden">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-white">Guerreros Geométricos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Selecciona a tu combatiente para liderar a tu escuadrón en la arena de Shape Wars.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <div className="flex items-center gap-2 bg-purple-950/70 border border-purple-500/40 px-3.5 py-2 rounded-xl text-purple-300 font-mono text-sm shadow-md">
            <span className="text-purple-400">💎</span>
            <span className="font-bold tabular-nums">{progress.kronus || 0} Kronus</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-amber-300 font-mono text-sm shadow-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold tabular-nums">{progress.coins} Monedas</span>
          </div>
        </div>
      </div>

      {/* Grid: Hero Cards Roster & Hero Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: 10 Hero Cards */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 max-h-[680px] overflow-y-auto pr-2">
          {heroList.map((id) => {
            const def = HERO_DEFINITIONS[id];
            const unlocked = progress.unlockedHeroes.includes(id);
            const isSelected = selectedHeroId === id;
            const isCurrentMain = progress.selectedHero === id;

            return (
              <div
                key={id}
                onClick={() => {
                  setSelectedHeroId(id);
                  setErrorMsg(null);
                  sounds.playClick();
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-850 border-sky-400 ring-2 ring-sky-400/20 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 flex items-center justify-center">
                    <img
                      src={def.avatarUrl}
                      alt={def.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white font-display text-base">{def.name}</span>
                      {isCurrentMain && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                          En uso
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{def.role}</span>
                  </div>
                </div>

                <div>
                  {!unlocked ? (
                    <div className="flex items-center gap-1 text-xs text-purple-300 font-mono font-bold bg-purple-950/70 border border-purple-500/40 px-2 py-1 rounded">
                      <Lock className="w-3 h-3 text-purple-400" />
                      <span>{def.kronusCost || 50} 💎</span>
                    </div>
                  ) : (
                    <Check className={`w-4 h-4 ${isCurrentMain ? 'text-sky-400' : 'text-slate-500'}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Hero Spotlight & Detailed Stats */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-xl">
          {/* Hero Header */}
          <div className="flex items-center gap-5 border-b border-slate-800 pb-6">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-inner shrink-0 relative flex items-center justify-center">
              <img
                src={activeDef.avatarUrl}
                alt={activeDef.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black font-display text-white">{activeDef.name}</h2>
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  {activeDef.shape}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-400 mt-0.5">{activeDef.title}</p>
              <p className="text-xs text-sky-400 font-medium mt-1">{activeDef.role}</p>
            </div>
          </div>

          {/* Core Combat Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Salud</span>
              <span className="text-xl font-extrabold font-mono text-white mt-1 tabular-nums">
                {currentHp} <span className="text-xs text-slate-500 font-normal">PS</span>
              </span>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div style={{ width: `${(currentHp / 190) * 100}%` }} className="h-full bg-emerald-400 rounded-full" />
              </div>
            </div>

            <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Daño</span>
              <span className="text-xl font-extrabold font-mono text-white mt-1 tabular-nums">
                {currentDamage} <span className="text-xs text-slate-500 font-normal">impacto</span>
              </span>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div style={{ width: `${(currentDamage / 30) * 100}%` }} className="h-full bg-rose-400 rounded-full" />
              </div>
            </div>

            <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-3 flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Velocidad</span>
              <span className="text-xl font-extrabold font-mono text-white mt-1 tabular-nums">
                {currentSpeed} <span className="text-xs text-slate-500 font-normal">u/s</span>
              </span>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div style={{ width: `${(currentSpeed / 270) * 100}%` }} className="h-full bg-amber-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-850/40 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>Cadencia: <strong className="text-white">{activeDef.attackCooldown}s</strong></span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-sky-400" />
              <span>Alcance: <strong className="text-white">{activeDef.range} u</strong></span>
            </div>
          </div>

          {/* Attack, Super & Gadget Details */}
          <div className="flex flex-col gap-2.5">
            <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                Ataque Básico
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dispara proyectiles con {currentDamage} de daño por impacto a una distancia de {activeDef.range} unidades cada {activeDef.attackCooldown} segundos.
              </p>
            </div>

            <div className="bg-slate-850/60 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Habilidad Especial: {activeDef.superName}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeDef.superDescription}
              </p>
            </div>

            {/* Potenciador Card */}
            <div className="bg-slate-850/60 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Potenciador: {activeDef.gadget.name}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Ilimitado (Recarga {activeDef.gadget.cooldown}s)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeDef.gadget.description}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Actions: Equip / Unlock / Play */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {!isUnlocked ? (
              <button
                onClick={handleUnlock}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 hover:from-purple-500 hover:to-indigo-500 active:scale-98 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-300/40"
              >
                <Lock className="w-4 h-4" />
                <span>Desbloquear por {activeDef.kronusCost || 50} Kronus 💎</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleEquip}
                  className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isEquipped
                      ? 'bg-slate-800 border border-sky-400 text-sky-300 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-750 text-white border border-slate-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isEquipped ? 'Equipado Actualmente' : 'Equipar como Principal'}</span>
                </button>

                <button
                  onClick={() => {
                    handleEquip();
                    onStartCombatWithHero(selectedHeroId);
                  }}
                  className="flex-1 py-3 px-5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Swords className="w-4 h-4" />
                  <span>Jugar con {activeDef.name}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
