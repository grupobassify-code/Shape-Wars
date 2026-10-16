/**
 * Shape Wars - Mode Selector Modal (Brawl Stars Style)
 * Allows choosing between 3v3 Knockout and 1v1 Duel
 */

import React from 'react';
import { GameMode } from '../game/types';
import { Users, Swords, Trophy, Sparkles, X, Check, Flame } from 'lucide-react';
import { sounds } from '../game/sound';

interface ModeSelectModalProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onClose: () => void;
}

export const ModeSelectModal: React.FC<ModeSelectModalProps> = ({
  selectedMode,
  onSelectMode,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto overflow-x-hidden max-w-full">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-w-0 max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 flex items-center justify-between border-b border-white/10 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black/30 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black font-display text-white tracking-wide truncate">Modos de Juego</h2>
              <p className="text-[11px] sm:text-xs text-white/80 truncate">Selecciona el formato de combate para la arena</p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              sounds.playClick();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/25 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modes Selection Grid */}
        <div className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-y-auto overflow-x-hidden min-w-0">
          {/* Option 1: 3v3 Knockout */}
          <div
            onClick={() => {
              onSelectMode('3v3');
              sounds.playClick();
            }}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
              selectedMode === '3v3'
                ? 'bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 border-sky-400 ring-2 ring-sky-400/30 shadow-[0_0_25px_rgba(56,189,248,0.3)]'
                : 'bg-slate-850/70 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${
                  selectedMode === '3v3'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-white'
                }`}
              >
                <Users className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black font-display text-white">Batalla por Equipos 3v3</h3>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[10px] font-black uppercase tracking-wider text-sky-300">
                    Estándar
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  2 escuadrones de 3 combatientes. Serie al mejor de 3 rondas sin reaparición. Visión compartida de arbustos y sinergia táctica.
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-amber-300">
                  <span>🏆 +8 Copas Victoria</span>
                  <span>•</span>
                  <span>🌐 Emparejamiento en Línea 3v3</span>
                </div>
              </div>
            </div>

            {selectedMode === '3v3' && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500 text-white text-xs font-black shadow-md self-end sm:self-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>SELECCIONADO</span>
              </div>
            )}
          </div>

          {/* Option 2: 1v1 Duel */}
          <div
            onClick={() => {
              onSelectMode('1v1');
              sounds.playClick();
            }}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
              selectedMode === '1v1'
                ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-rose-500 ring-2 ring-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                : 'bg-slate-850/70 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${
                  selectedMode === '1v1'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-white'
                }`}
              >
                <Swords className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black font-display text-white">Duelo de Honor 1v1</h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-400" />
                    Intenso
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Enfrentamiento directo cara a cara: Tú contra 1 rival en serie al mejor de 3 rondas. Puntería pura y reflejos tácticos.
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-amber-300">
                  <span>🏆 +8 Copas Victoria</span>
                  <span>•</span>
                  <span>🌐 Emparejamiento en Línea 1v1</span>
                </div>
              </div>
            </div>

            {selectedMode === '1v1' && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs font-black shadow-md self-end sm:self-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>SELECCIONADO</span>
              </div>
            )}
          </div>

          {/* Option 3: Captura la Bandera (CTF) */}
          <div
            onClick={() => {
              onSelectMode('ctf');
              sounds.playClick();
            }}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
              selectedMode === 'ctf'
                ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-400 ring-2 ring-emerald-400/30 shadow-[0_0_25px_rgba(52,211,153,0.3)]'
                : 'bg-slate-850/70 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${
                  selectedMode === 'ctf'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:text-white'
                }`}
              >
                <span className="text-2xl">🚩</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black font-display text-white">Captura la Bandera</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    ¡Nuevo Modo!
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Infiltra la base enemiga, agarra su bandera y llévala a tu pedestal. Reapariciones continuas cada 4s. Primer equipo a 2 capturas gana.
                </p>
                <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-amber-300">
                  <span>🏆 +8 Copas Victoria</span>
                  <span>•</span>
                  <span>💎 +10 Kronus Victoria</span>
                  <span>•</span>
                  <span>🚩 2 Banderas para Ganar</span>
                </div>
              </div>
            </div>

            {selectedMode === 'ctf' && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black shadow-md self-end sm:self-center">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>SELECCIONADO</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>El modo activo se guardará para todas tus batallas.</span>
          <button
            onClick={() => {
              onClose();
              sounds.playClick();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
