/**
 * Shape Wars - Modal de Políticas de Privacidad
 * Contiene el texto íntegro redactado en español y el enlace directo al documento oficial.
 */

import React from 'react';
import { ShieldCheck, ExternalLink, X, FileText, CheckCircle2, Lock, Eye, Server, RefreshCw } from 'lucide-react';
import { sounds } from '../game/sound';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PRIVACY_POLICY_DOC_URL =
  'https://docs.google.com/document/d/1aojxFSrZ-Xj40B2X5WQuMpB4vVNsfz_xHap6OMqAR4E/edit?usp=drivesdk';

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 animate-fadeIn overflow-y-auto overflow-x-hidden max-w-full">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-700 flex items-center justify-between border-b border-white/10 shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black/30 backdrop-blur-xs flex items-center justify-center text-sky-300 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black font-display text-white tracking-wide truncate">Políticas de Privacidad</h2>
              <p className="text-[11px] sm:text-xs text-white/80 truncate">Shape Wars • Compromiso y Protección de Datos</p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              sounds.playClick();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/25 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 sm:space-y-6 text-slate-300 text-sm leading-relaxed min-w-0">
          {/* Official Document Banner */}
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs sm:text-sm">Documento Oficial en Google Docs</p>
                <p className="text-xs text-sky-300/80">Puedes revisar o descargar la versión completa y actualizada en la nube.</p>
              </div>
            </div>
            <a
              href={PRIVACY_POLICY_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sounds.playClick()}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
            >
              <span>Abrir Documento</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base font-display">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3>1. Introducción y Alcance</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 pl-6">
              En <strong className="text-white">Shape Wars</strong> nos tomamos muy en serio la privacidad y seguridad de todos nuestros jugadores. La presente Política de Privacidad describe cómo se gestionan, resguardan y procesan los datos generados durante la experiencia de juego en nuestra aplicación web.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base font-display">
              <Eye className="w-4 h-4 text-sky-400" />
              <h3>2. Información que Recopilamos</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 pl-6">
              Shape Wars está diseñado con una filosofía de recopilación mínima de datos:
            </p>
            <ul className="list-disc pl-11 space-y-1.5 text-xs sm:text-sm text-slate-400">
              <li>
                <strong className="text-slate-200">Datos de Progreso Local:</strong> Trofeos, monedas, gemas Kronus, personajes desbloqueados, fondos de perfil seleccionados y récord de partidas ganadas/perdidas. Toda esta información se almacena <strong className="text-sky-300">únicamente de forma local en tu navegador</strong> (LocalStorage).
              </li>
              <li>
                <strong className="text-slate-200">Preferencias de Usuario:</strong> Ajustes de audio (silenciado/activo), modo de juego preferido y preferencia de auto-apuntado.
              </li>
              <li>
                <strong className="text-slate-200">Sin Datos Personales Sensibles:</strong> No solicitamos contraseñas, números telefónicos, domicilios, tarjetas bancarias ni datos bancarios.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base font-display">
              <Server className="w-4 h-4 text-amber-400" />
              <h3>3. Uso de la Información e Inteligencia Artificial</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 pl-6">
              La información del juego se utiliza exclusivamente para:
            </p>
            <ul className="list-disc pl-11 space-y-1.5 text-xs sm:text-sm text-slate-400">
              <li>Permitirte reanudar tu partida, conservar tus personajes y mantener tu avance en el Camino de Trofeos.</li>
              <li>
                <strong className="text-slate-200">Asesoramiento Táctico en Pantalla de Carga:</strong> Al iniciar una batalla, los nombres de los personajes de tu equipo y del equipo rival se envían temporalmente al modelo de inteligencia artificial para generar un informe táctico en tiempo real. Esta consulta es efímera, anónima y no contiene ninguna información identificativa del jugador.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base font-display">
              <Lock className="w-4 h-4 text-rose-400" />
              <h3>4. Almacenamiento, Control y Eliminación</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 pl-6">
              Tú tienes el control absoluto de tus datos en todo momento. Desde la sección de <strong className="text-white">Ajustes</strong> del juego puedes restablecer por completo todo el progreso y las estadísticas, borrando los registros del almacenamiento de tu dispositivo con un solo toque.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-base font-display">
              <RefreshCw className="w-4 h-4 text-purple-400" />
              <h3>5. Modificaciones y Contacto</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 pl-6">
              Nos reservamos el derecho de actualizar esta política para adaptarla a futuras actualizaciones de contenido o requerimientos de seguridad. Cualquier cambio sustancial será reflejado tanto en este modal como en el documento en línea disponible públicamente en Google Docs.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <a
            href={PRIVACY_POLICY_DOC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 underline underline-offset-4"
          >
            <span>Ver documento en docs.google.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => {
              onClose();
              sounds.playClick();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
