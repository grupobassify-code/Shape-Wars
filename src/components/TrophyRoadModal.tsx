/**
 * Shape Wars - Brawl Stars Style Trophy Road ("Camino de Trofeos")
 * 
 * Features:
 * - Milestone progression tracker with connecting progress bar
 * - Rewards at milestones: Coins and Kronus (the hero unlock currency)
 * - One-tap claiming with instant progression update and celebratory feedback
 */

import React, { useState } from 'react';
import { UserProgress, claimTrophyReward } from '../game/storage';
import { TROPHY_ROAD_REWARDS, TrophyReward } from '../game/types';
import { Trophy, Coins, Sparkles, Check, Lock, X, Gift, ChevronRight, Award } from 'lucide-react';
import { sounds } from '../game/sound';

interface TrophyRoadModalProps {
  progress: UserProgress;
  onUpdateProgress: (progress: UserProgress) => void;
  onClose: () => void;
}

export const TrophyRoadModal: React.FC<TrophyRoadModalProps> = ({
  progress,
  onUpdateProgress,
  onClose,
}) => {
  const [claimedRewardPopup, setClaimedRewardPopup] = useState<TrophyReward | null>(null);

  const currentTrophies = progress.trophies || 0;
  const claimedList = progress.claimedTrophyRewards || [];

  // Determine League Rank from Trophies
  const getLeagueTitle = (trophies: number) => {
    if (trophies >= 500) return { title: 'Liga Legendaria', color: 'from-amber-400 to-yellow-200', text: 'text-yellow-300' };
    if (trophies >= 300) return { title: 'Liga Diamante', color: 'from-cyan-400 to-blue-500', text: 'text-cyan-300' };
    if (trophies >= 150) return { title: 'Liga Oro', color: 'from-amber-500 to-yellow-600', text: 'text-amber-300' };
    if (trophies >= 50) return { title: 'Liga Plata', color: 'from-slate-300 to-slate-400', text: 'text-slate-200' };
    return { title: 'Liga Bronce', color: 'from-amber-700 to-amber-900', text: 'text-amber-500' };
  };

  const league = getLeagueTitle(currentTrophies);

  const handleClaim = (reward: TrophyReward) => {
    const res = claimTrophyReward(progress, reward.trophiesRequired, reward.coins, reward.kronus);
    if (res.success) {
      sounds.playVictory();
      onUpdateProgress(res.progress);
      setClaimedRewardPopup(reward);
    } else {
      sounds.playHit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 animate-fadeIn select-none overflow-y-auto overflow-x-hidden max-w-full">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-w-0">
        {/* ======================================================== */}
        {/* HEADER: TROPHY ROAD BANNER                               */}
        {/* ======================================================== */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-5 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 flex items-center justify-between border-b border-white/10 shrink-0 min-w-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-black/30 backdrop-blur-xs flex items-center justify-center shadow-lg border border-amber-300/40">
              <Trophy className="w-7 h-7 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black font-display text-white tracking-wide">
                  Camino de Trofeos
                </h2>
                <span className={`px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-black uppercase tracking-wider ${league.text} border border-white/15`}>
                  {league.title}
                </span>
              </div>
              <p className="text-xs text-white/90 font-medium">
                Gana copas en combate para desbloquear Monedas y Kronus exclusivos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Trophies Counter Pill */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/40 border border-amber-300/30 text-amber-300 font-mono font-black text-base shadow-inner">
              <Trophy className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>{currentTrophies}</span>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BODY: SCROLLABLE MILESTONES ROADMAP                      */}
        {/* ======================================================== */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 flex flex-col gap-4 sm:gap-6 min-w-0">
          <div className="relative pl-6 sm:pl-8 flex flex-col gap-6">
            {/* Continuous Vertical Road Track Line */}
            <div className="absolute left-2.5 sm:left-3.5 top-4 bottom-4 w-1 bg-slate-800 rounded-full -translate-x-1/2" />

            {/* Glowing Active Track Line */}
            {(() => {
              const maxMilestone = TROPHY_ROAD_REWARDS[TROPHY_ROAD_REWARDS.length - 1].trophiesRequired;
              const fillPct = Math.min(100, (currentTrophies / maxMilestone) * 100);
              return (
                <div
                  style={{ height: `${fillPct}%` }}
                  className="absolute left-2.5 sm:left-3.5 top-4 w-1 bg-gradient-to-b from-amber-400 to-yellow-300 rounded-full -translate-x-1/2 shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-all duration-500"
                />
              );
            })()}

            {/* Milestone Cards */}
            {TROPHY_ROAD_REWARDS.map((reward, index) => {
              const isReached = currentTrophies >= reward.trophiesRequired;
              const isClaimed = claimedList.includes(reward.trophiesRequired);
              const isClaimable = isReached && !isClaimed;
              const remaining = reward.trophiesRequired - currentTrophies;

              return (
                <div
                  key={reward.trophiesRequired}
                  className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl border-2 transition-all ${
                    isClaimable
                      ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_25px_rgba(251,191,36,0.25)]'
                      : isClaimed
                      ? 'bg-slate-900/60 border-slate-800/80 opacity-75'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Road Node Marker */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center -translate-x-1/2 ${
                      isClaimed
                        ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                        : isClaimable
                        ? 'bg-amber-400 border-yellow-200 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {isClaimed ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span className="text-[10px] font-black">{index + 1}</span>
                    )}
                  </div>

                  {/* Left: Milestone Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
                        isClaimable
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                          : isClaimed
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {isClaimed ? (
                        <Check className="w-7 h-7 text-emerald-400" />
                      ) : (
                        <Award className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-black text-xs flex items-center gap-1">
                          <Trophy className="w-3 h-3 fill-current" />
                          <span>{reward.trophiesRequired} Copas</span>
                        </span>
                        <h3 className="text-base font-black font-display text-white">
                          {reward.title}
                        </h3>
                      </div>

                      {/* Rewards Preview */}
                      <div className="flex items-center gap-3 mt-2 text-xs font-bold">
                        {/* Coins */}
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-amber-300 font-mono">
                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                          <span>+{reward.coins} Monedas</span>
                        </div>

                        {/* Kronus */}
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/50 text-purple-300 font-mono shadow-sm">
                          <span className="text-purple-400">💎</span>
                          <span>+{reward.kronus} Kronus</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Claim Button or Status */}
                  <div className="self-end sm:self-center shrink-0">
                    {isClaimable ? (
                      <button
                        onClick={() => handleClaim(reward)}
                        className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(251,191,36,0.6)] border border-yellow-200 transition-all cursor-pointer flex items-center gap-2 animate-bounce"
                      >
                        <Sparkles className="w-4 h-4 fill-slate-950" />
                        <span>¡RECLAMAR!</span>
                      </button>
                    ) : isClaimed ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>RECLAMADO</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono font-bold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Faltan {remaining} 🏆</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">Consejo:</span>
            <span>Gana partidas en 3v3, 1v1 o Captura la Bandera para sumar +8 copas y desbloquear Kronus rápidamente.</span>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>

        {/* Reward celebration overlay */}
        {claimedRewardPopup && (
          <div className="absolute inset-0 bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.8)] animate-bounce mb-4">
              <Gift className="w-10 h-10 text-slate-950" />
            </div>
            <h3 className="text-2xl font-black font-display text-white mb-1">
              ¡Recompensa Reclamada!
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Has alcanzado el hito de {claimedRewardPopup.trophiesRequired} copas: {claimedRewardPopup.title}
            </p>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-amber-400 text-amber-300 font-mono font-black text-lg shadow-lg">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>+{claimedRewardPopup.coins} Monedas</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-950 border border-purple-400 text-purple-300 font-mono font-black text-lg shadow-lg">
                <span className="text-purple-400">💎</span>
                <span>+{claimedRewardPopup.kronus} Kronus</span>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                setClaimedRewardPopup(null);
              }}
              className="px-8 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg cursor-pointer"
            >
              ¡Genial!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
