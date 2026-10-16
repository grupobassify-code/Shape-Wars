/**
 * Shape Wars - Settings & Statistics Screen
 */

import React, { useState } from 'react';
import { UserProgress, saveUserProgress, getDefaultProgress } from '../game/storage';
import { Volume2, VolumeX, Crosshair, Smartphone, RotateCcw, Award, Check, ShieldCheck, ExternalLink, FileText } from 'lucide-react';
import { sounds } from '../game/sound';
import { PrivacyPolicyModal, PRIVACY_POLICY_DOC_URL } from './PrivacyPolicyModal';

interface SettingsScreenProps {
  progress: UserProgress;
  onUpdateProgress: (progress: UserProgress) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ progress, onUpdateProgress }) => {
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const toggleSound = () => {
    const val = !progress.soundEnabled;
    sounds.setMuted(!val);
    const updated = { ...progress, soundEnabled: val };
    onUpdateProgress(updated);
    saveUserProgress(updated);
    sounds.playClick();
  };

  const toggleAutoAim = () => {
    const val = !progress.autoAimEnabled;
    const updated = { ...progress, autoAimEnabled: val };
    onUpdateProgress(updated);
    saveUserProgress(updated);
    sounds.playClick();
  };

  const handleResetData = () => {
    if (!resetConfirmed) {
      setResetConfirmed(true);
      return;
    }
    const def = getDefaultProgress();
    onUpdateProgress(def);
    saveUserProgress(def);
    setResetConfirmed(false);
    sounds.playElimination();
  };

  const winRate =
    progress.matchesPlayed > 0 ? Math.round((progress.wins / progress.matchesPlayed) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8 animate-fadeIn min-w-0 max-w-full overflow-x-hidden">
      {/* Title */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-3xl font-black font-display tracking-tight text-white">Ajustes & Estadísticas</h1>
        <p className="text-sm text-slate-400 mt-1">Configura tu experiencia de combate y consulta tu rendimiento.</p>
      </div>

      {/* Grid: Settings & Career Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Career Stats */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
          <div className="flex items-center gap-2.5 text-sky-400">
            <Award className="w-5 h-5" />
            <h2 className="text-lg font-bold font-display text-white">Récord de Combate</h2>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Partidas Jugadas</span>
              <span className="text-2xl font-black font-mono text-white mt-1 tabular-nums">{progress.matchesPlayed}</span>
            </div>

            <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Victorias</span>
              <span className="text-2xl font-black font-mono text-emerald-400 mt-1 tabular-nums">{progress.wins}</span>
            </div>

            <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Derrotas</span>
              <span className="text-2xl font-black font-mono text-rose-400 mt-1 tabular-nums">{progress.losses}</span>
            </div>

            <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Tasa de Victoria</span>
              <span className="text-2xl font-black font-mono text-amber-300 mt-1 tabular-nums">{winRate}%</span>
            </div>
          </div>
        </div>

        {/* Controls & Audio Settings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
          <h2 className="text-lg font-bold font-display text-white">Preferencias de Juego</h2>

          <div className="flex flex-col gap-3">
            {/* Audio Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-850 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                {progress.soundEnabled ? <Volume2 className="w-5 h-5 text-sky-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Efectos de Audio</h4>
                  <p className="text-xs text-slate-400">Sonidos de disparos, impactos y habilidades</p>
                </div>
              </div>
              <button
                onClick={toggleSound}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  progress.soundEnabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    progress.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto Aim Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-850 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <Crosshair className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Auto-Apuntado Activo por Defecto</h4>
                  <p className="text-xs text-slate-400">Fija automáticamente al rival visible más cercano</p>
                </div>
              </div>
              <button
                onClick={toggleAutoAim}
                className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  progress.autoAimEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    progress.autoAimEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Privacy Policy / Políticas de Privacidad */}
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Políticas de Privacidad
              </span>
              <a
                href={PRIVACY_POLICY_DOC_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => sounds.playClick()}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>Google Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <button
              onClick={() => {
                setIsPrivacyModalOpen(true);
                sounds.playClick();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-white border border-sky-500/30 hover:border-sky-400 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Leer Políticas de Privacidad Completas</span>
            </button>
          </div>

          {/* Reset Save Data */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={handleResetData}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                resetConfirmed
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-rose-400 border border-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetConfirmed ? '¿Confirmar reinicio de todo el progreso?' : 'Reiniciar Progreso'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};
