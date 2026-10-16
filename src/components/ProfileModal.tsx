/**
 * Shape Wars - Player Profile Modal (Brawl Stars Style)
 * 
 * Features:
 * - Battle Card Live Preview with customizable Brawler Background & Mastery Wings
 * - Brawler Backgrounds Selector ("Fondos de Batalla"): Unlocks with each character!
 * - Avatar Icons Selector
 * - Trophies, Rank, Win rate and matches stats
 */

import React, { useState } from 'react';
import { UserProgress } from '../game/storage';
import { HeroId, HERO_DEFINITIONS, ALL_HERO_IDS, BATTLE_BACKGROUNDS, BattleBackgroundDef } from '../game/types';
import { ShapeIcon } from './ShapeIcon';
import { HeroPortrait } from './HeroPortrait';
import { Trophy, Swords, Shield, Zap, X, Award, Flame, Check, Sparkles, Lock, Layers } from 'lucide-react';
import { sounds } from '../game/sound';

interface ProfileModalProps {
  progress: UserProgress;
  onClose: () => void;
  onUpdateProgress: (updated: UserProgress) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  progress,
  onClose,
  onUpdateProgress,
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'backgrounds' | 'avatars'>('card');
  const [selectedAvatar, setSelectedAvatar] = useState<HeroId>(
    (progress.avatarIcon as HeroId) || progress.selectedHero || 'pulsar'
  );
  const [selectedBg, setSelectedBg] = useState<HeroId>(
    progress.selectedBackground || progress.selectedHero || 'pulsar'
  );

  const selectedHeroDef = HERO_DEFINITIONS[progress.selectedHero] || HERO_DEFINITIONS.pulsar;
  const currentBgDef = BATTLE_BACKGROUNDS[selectedBg] || BATTLE_BACKGROUNDS.pulsar;

  const totalMatches = progress.matchesPlayed || 0;
  const wins = progress.wins || 0;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const trophies = progress.trophies || 0;

  // Rank title according to trophies
  const getRankInfo = (t: number) => {
    if (t >= 500) return { title: 'Leyenda Geométrica', color: 'text-amber-400', badge: '👑' };
    if (t >= 300) return { title: 'Maestro de la Arena', color: 'text-purple-400', badge: '💎' };
    if (t >= 150) return { title: 'Veterano Táctico', color: 'text-sky-400', badge: '⭐' };
    if (t >= 50) return { title: 'Luchador Promesa', color: 'text-emerald-400', badge: '🔥' };
    return { title: 'Recluta Neón', color: 'text-slate-400', badge: '⚡' };
  };

  const rank = getRankInfo(trophies);

  const handleSelectAvatar = (heroId: HeroId) => {
    setSelectedAvatar(heroId);
    const updated: UserProgress = {
      ...progress,
      avatarIcon: heroId,
    };
    onUpdateProgress(updated);
    sounds.playClick();
  };

  const handleSelectBackground = (bgId: HeroId) => {
    if (!progress.unlockedHeroes.includes(bgId)) return;
    setSelectedBg(bgId);
    const updated: UserProgress = {
      ...progress,
      selectedBackground: bgId,
    };
    onUpdateProgress(updated);
    sounds.playVictory();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn select-none overflow-y-auto overflow-x-hidden max-w-full">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] min-w-0">
        {/* Header Ribbon / Banner */}
        <div className="relative px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-between border-b border-white/10 shrink-0 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-950/40 border border-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <ShapeIcon heroId={selectedAvatar} size={26} glow={true} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black font-display text-white tracking-wide">Comandante</h2>
                <span className="text-[10px] font-mono font-bold text-sky-200 bg-black/30 px-2 py-0.5 rounded-md">
                  {progress.playerTag || '#SHAPE101'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[11px] font-extrabold uppercase tracking-wider ${rank.color}`}>
                  {rank.title} {rank.badge}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              sounds.playClick();
            }}
            className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation (Tarjeta, Fondos, Iconos) */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('card')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === 'card'
                ? 'bg-slate-900 text-sky-400 border-slate-700 shadow-md'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Tarjeta de Batalla
          </button>
          <button
            onClick={() => setActiveTab('backgrounds')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer border-t border-x flex items-center gap-1.5 ${
              activeTab === 'backgrounds'
                ? 'bg-slate-900 text-amber-400 border-slate-700 shadow-md'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span>Fondos de Perfil</span>
            <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-mono font-bold">
              {progress.unlockedHeroes.length}/10
            </span>
          </button>
          <button
            onClick={() => setActiveTab('avatars')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all cursor-pointer border-t border-x ${
              activeTab === 'avatars'
                ? 'bg-slate-900 text-sky-400 border-slate-700 shadow-md'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Iconos
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 flex flex-col gap-4 overflow-y-auto overflow-x-hidden min-w-0">
          {/* TAB 1: BATTLE CARD & STATS */}
          {activeTab === 'card' && (
            <>
              {/* BRAWL STARS BATTLE CARD PREVIEW */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 self-start">
                  Vista Previa de tu Tarjeta de Batalla
                </span>

                <div
                  className={`relative flex flex-col justify-between w-48 sm:w-56 h-64 sm:h-72 rounded-3xl border-3 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.4)] overflow-hidden`}
                >
                  {/* Dynamic Gradient & Pattern */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${currentBgDef.gradient} opacity-95`} />
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />

                  {/* Top Mastery Badge */}
                  <div className="relative z-10 pt-2.5 flex items-center justify-center">
                    <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/85 border border-white/20 shadow-lg backdrop-blur-xs">
                      <span className="text-xs">{currentBgDef.badgeIcon}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 font-display">
                        MAESTRÍA
                      </span>
                      <span className="text-xs">{rank.badge}</span>
                    </div>
                  </div>

                  {/* Center Hero Icon */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
                    <div
                      style={{ backgroundColor: currentBgDef.accentColor }}
                      className="absolute w-20 h-20 rounded-full blur-md opacity-35 animate-pulse"
                    />
                    <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-950/80 border border-white/30 flex items-center justify-center shadow-xl">
                      <HeroPortrait heroId={selectedAvatar} shapeSize={42} glow={true} className="w-full h-full" />
                    </div>
                    <span className="text-xs font-black font-display text-white mt-2 uppercase tracking-wider drop-shadow-md">
                      {HERO_DEFINITIONS[selectedAvatar]?.name}
                    </span>
                  </div>

                  {/* Bottom Bar */}
                  <div className="relative z-10 px-3 py-2 bg-slate-950/90 border-t border-white/10 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black font-display text-white">Comandante</span>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-sky-500 text-slate-950 px-1.5 py-0.2 rounded font-mono">
                        TÚ
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-slate-400 font-bold">{rank.title}</span>
                      <span className="text-[10px] text-amber-400 font-bold">{trophies} 🏆</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">Fondo activo:</span>
                  <span className="text-xs font-black text-amber-300 font-display">{currentBgDef.name}</span>
                  <button
                    onClick={() => setActiveTab('backgrounds')}
                    className="text-xs text-sky-400 hover:text-sky-300 underline font-bold cursor-pointer ml-1"
                  >
                    Cambiar fondo →
                  </button>
                </div>
              </div>

              {/* Trophies & Stats Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
                <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center">
                  <Trophy className="w-4 h-4 text-amber-400 mb-0.5" />
                  <span className="text-lg font-black font-mono text-amber-300 tabular-nums">{trophies}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Copas</span>
                </div>

                <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center">
                  <Award className="w-4 h-4 text-emerald-400 mb-0.5" />
                  <span className="text-lg font-black font-mono text-emerald-300 tabular-nums">{wins}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Victorias</span>
                </div>

                <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center">
                  <Flame className="w-4 h-4 text-rose-400 mb-0.5" />
                  <span className="text-lg font-black font-mono text-rose-300 tabular-nums">{winRate}%</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Efectividad</span>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: BACKGROUNDS SELECTOR ("FONDOS DE BATALLA") */}
          {activeTab === 'backgrounds' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-sm font-black font-display text-white uppercase tracking-wider">
                    Fondos de Tarjeta de Batalla
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cada fondo se desbloquea al conseguir al personaje correspondiente.
                  </p>
                </div>
              </div>

              {/* Grid of all 10 backgrounds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ALL_HERO_IDS.map((heroId) => {
                  const bg = BATTLE_BACKGROUNDS[heroId];
                  const heroDef = HERO_DEFINITIONS[heroId];
                  const isUnlocked = progress.unlockedHeroes.includes(heroId);
                  const isEquipped = selectedBg === heroId;

                  return (
                    <div
                      key={heroId}
                      onClick={() => {
                        if (isUnlocked) handleSelectBackground(heroId);
                      }}
                      className={`relative p-3 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                        isEquipped
                          ? 'border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400'
                          : isUnlocked
                          ? 'border-slate-700 bg-slate-850/80 hover:border-sky-400 hover:bg-slate-800 cursor-pointer'
                          : 'border-slate-800/80 bg-slate-950/50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Mini Thumbnail */}
                      <div
                        className={`relative w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden ${
                          bg.borderColor
                        } bg-gradient-to-b ${bg.gradient}`}
                      >
                        <ShapeIcon heroId={heroId} size={22} glow={isEquipped} />
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black font-display text-white truncate">
                            {bg.name}
                          </span>
                          <span className="text-xs">{bg.badgeIcon}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {bg.theme}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          {isUnlocked ? (
                            <span className="text-[9px] font-black uppercase text-emerald-400 font-mono">
                              {isEquipped ? '✓ EQUIPADO' : 'DESBLOQUEADO'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-purple-300 font-mono">
                              🔒 Desbloquea a {heroDef.name} ({heroDef.kronusCost || 50} 💎)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {isUnlocked && (
                        <button
                          type="button"
                          disabled={isEquipped}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectBackground(heroId);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer ${
                            isEquipped
                              ? 'bg-amber-400 text-slate-950 shadow-md'
                              : 'bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-white border border-slate-700'
                          }`}
                        >
                          {isEquipped ? 'Activo' : 'Equipar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AVATAR SELECTOR */}
          {activeTab === 'avatars' && (
            <div className="flex flex-col gap-3">
              <div className="text-left">
                <h3 className="text-sm font-black font-display text-white uppercase tracking-wider">
                  Iconos de Perfil
                </h3>
                <p className="text-[11px] text-slate-400">
                  Selecciona la forma geométrica que representará tu avatar principal.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                {ALL_HERO_IDS.map((heroId) => {
                  const isUnlocked = progress.unlockedHeroes.includes(heroId);
                  const isCurrent = selectedAvatar === heroId;
                  const def = HERO_DEFINITIONS[heroId];

                  return (
                    <button
                      key={heroId}
                      disabled={!isUnlocked}
                      onClick={() => handleSelectAvatar(heroId)}
                      className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-2 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-500/25 border-sky-400 ring-2 ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                          : isUnlocked
                          ? 'bg-slate-850/80 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                          : 'bg-slate-950/40 border-slate-800/40 opacity-40 cursor-not-allowed grayscale'
                      }`}
                      title={isUnlocked ? def.name : `${def.name} (Bloqueado)`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                        <HeroPortrait heroId={heroId} shapeSize={22} glow={isCurrent} className="w-full h-full" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 mt-1 uppercase truncate w-full text-center">
                        {def.name}
                      </span>
                      {isCurrent && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center font-bold text-[9px] shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
