/**
 * Shape Wars - Room Lobby Modal (Salas Privadas y Códigos de Invitación)
 * Allows creating and joining private 1v1 and 3v3 matches by room codes (e.g. SW-8492).
 * Works anywhere: published website, custom domains, mobile browsers, and local tabs.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Users,
  Swords,
  Wifi,
  Sparkles,
  Shield,
  ArrowRight,
  RefreshCw,
  Crown,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { HeroId, UserProgress, HERO_DEFINITIONS } from '../game/types';
import { ShapeIcon } from './ShapeIcon';
import { sounds } from '../game/sound';
import {
  RoomNetworkManager,
  RoomPlayer,
  RoomState,
  RoomMode,
  generateRoomCode,
  sanitizeRoomCode
} from '../game/roomNetwork';

interface RoomLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress;
  onStartRoomMatch: (networkManager: RoomNetworkManager, isHost: boolean, mode: RoomMode) => void;
  initialRoomCode?: string | null;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  onClose,
  progress,
  onStartRoomMatch,
  initialRoomCode,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [inputCode, setInputCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [networkManager, setNetworkManager] = useState<RoomNetworkManager | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [selectedHero, setSelectedHero] = useState<HeroId>(progress.selectedHero || 'pulsar');
  const [roomMode, setRoomMode] = useState<RoomMode>('1v1');
  const [isStartingCountdown, setIsStartingCountdown] = useState<number | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // If initialRoomCode is passed via URL (?room=...), switch to join tab immediately
  useEffect(() => {
    if (initialRoomCode) {
      setActiveTab('join');
      setInputCode(sanitizeRoomCode(initialRoomCode));
    }
  }, [initialRoomCode]);

  // Clean up network manager on unmount or close
  useEffect(() => {
    return () => {
      if (networkManager) {
        networkManager.destroy();
      }
    };
  }, [networkManager]);

  if (!isOpen) return null;

  // Local player profile representation
  const localPlayerProfile: RoomPlayer = {
    id: `player-${Math.floor(Math.random() * 100000)}`,
    name: (progress as any).playerName || 'Comandante',
    tag: progress.playerTag || '#SHAPE101',
    heroId: selectedHero,
    trophies: progress.trophies || 0,
    isHost: activeTab === 'create',
    isReady: activeTab === 'create',
  };

  /**
   * Handle Create Room Action
   */
  const handleCreateRoom = async () => {
    sounds.playClick();
    setErrorNotice(null);
    setConnectionStatus('connecting');
    setConnectionMessage('Generando sala segura en línea...');

    if (networkManager) {
      networkManager.destroy();
    }

    const code = generateRoomCode();
    const manager = new RoomNetworkManager(localPlayerProfile, {
      onRoomUpdate: (updatedRoom) => {
        setRoomState({ ...updatedRoom });
      },
      onPlayerJoined: (player) => {
        setConnectionMessage(`¡${player.name} (${player.tag}) se ha unido a la sala!`);
      },
      onPlayerLeft: (tag) => {
        setConnectionMessage(`El jugador ${tag} abandonó la sala.`);
      },
      onMatchStarting: (count) => {
        setIsStartingCountdown(count);
      },
      onMatchStart: ({ mode }) => {
        setIsStartingCountdown(null);
        onStartRoomMatch(manager, true, mode);
      },
      onConnectionStatus: (status, message) => {
        setConnectionStatus(status);
        setConnectionMessage(message);
      },
      onError: (err) => {
        setErrorNotice(err);
      },
    });

    setNetworkManager(manager);
    await manager.createRoom(code, roomMode);
    setRoomState(manager.currentRoom);
  };

  /**
   * Handle Join Room Action
   */
  const handleJoinRoom = async (codeToJoin?: string) => {
    const code = codeToJoin || inputCode;
    if (!code || code.trim().length < 2) {
      setErrorNotice('Por favor ingresa un código de sala válido');
      return;
    }

    sounds.playClick();
    setErrorNotice(null);
    setConnectionStatus('connecting');
    setConnectionMessage(`Buscando sala ${sanitizeRoomCode(code)} en la red P2P...`);

    if (networkManager) {
      networkManager.destroy();
    }

    const manager = new RoomNetworkManager(localPlayerProfile, {
      onRoomUpdate: (updatedRoom) => {
        setRoomState({ ...updatedRoom });
      },
      onMatchStarting: (count) => {
        setIsStartingCountdown(count);
      },
      onMatchStart: ({ mode }) => {
        setIsStartingCountdown(null);
        onStartRoomMatch(manager, false, mode);
      },
      onConnectionStatus: (status, message) => {
        setConnectionStatus(status);
        setConnectionMessage(message);
      },
      onError: (err) => {
        setErrorNotice(err);
      },
    });

    setNetworkManager(manager);
    const joined = await manager.joinRoom(code);
    if (!joined) {
      setConnectionStatus('error');
      setErrorNotice('No se pudo conectar a la sala. Verifica que el anfitrión tenga la sala abierta.');
    }
  };

  /**
   * Copy Code to Clipboard
   */
  const handleCopyCode = () => {
    if (!roomState?.code) return;
    navigator.clipboard.writeText(roomState.code);
    sounds.playCopySuccess();
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  /**
   * Copy Direct Link to Clipboard
   */
  const handleCopyDirectLink = () => {
    if (!roomState?.code) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomState.code);
    navigator.clipboard.writeText(url.toString());
    sounds.playCopySuccess();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  /**
   * Toggle Ready / Start Combat
   */
  const handleToggleReadyOrStart = () => {
    if (!networkManager || !roomState) return;

    if (networkManager.isHost) {
      if (roomState.guest && roomState.guest.isReady) {
        networkManager.startMatchCountdown();
      } else if (!roomState.guest) {
        setErrorNotice('Espera a que un amigo se una a la sala antes de iniciar el combate.');
      } else {
        setErrorNotice('El retador aún no ha marcado "Listo".');
      }
    } else {
      networkManager.toggleReady();
    }
  };

  /**
   * Change Hero in Room
   */
  const handleHeroSelect = (heroId: HeroId) => {
    setSelectedHero(heroId);
    sounds.playClick();
    if (networkManager) {
      networkManager.updateLocalPlayer({ heroId });
    }
  };

  const currentHost = roomState?.host;
  const currentGuest = roomState?.guest;
  const isHost = networkManager?.isHost ?? (activeTab === 'create');
  const isReady = isHost ? true : (roomState?.guest?.isReady ?? false);
  const canStartMatch = isHost && currentGuest && currentGuest.isReady;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-hidden max-w-full">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(15,23,42,0.8)] overflow-hidden flex flex-col max-h-[92vh] min-w-0">
        
        {/* Header Bar */}
        <div className="relative px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.4)]">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black font-display text-white tracking-wide uppercase">
                  Salas Privadas Online
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Web & P2P Activo
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Juega con amigos compartiendo un código de sala en cualquier navegador o móvil
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              if (networkManager) networkManager.leaveRoom();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector (only before room is established) */}
        {!roomState && (
          <div className="flex border-b border-slate-800 p-2 bg-slate-950/60 gap-2">
            <button
              onClick={() => {
                setActiveTab('create');
                sounds.playClick();
                setErrorNotice(null);
              }}
              className={`flex-1 py-2.5 rounded-xl font-black font-display text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Crear Sala</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('join');
                sounds.playClick();
                setErrorNotice(null);
              }}
              className={`flex-1 py-2.5 rounded-xl font-black font-display text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'join'
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Unirse con Código</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-4 sm:space-y-5 min-w-0">
          {errorNotice && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* VIEW 1: Initial Create Room Screen */}
          {activeTab === 'create' && !roomState && (
            <div className="space-y-5 text-center py-4">
              <div className="max-w-md mx-auto space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-400/30 mx-auto flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                  <Crown className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black font-display text-white">
                  Crea tu Sala y Reta a un Amigo
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Obtendrás un código único como <span className="text-sky-300 font-mono font-bold">SW-7492</span>.
                  Tu amigo podrá unirse desde esta misma web sin instalar nada, en PC o móvil.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="max-w-md mx-auto flex items-center gap-3 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                <button
                  onClick={() => {
                    setRoomMode('1v1');
                    sounds.playClick();
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    roomMode === '1v1'
                      ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(225,29,72,0.4)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Swords className="w-4 h-4" />
                  <span>Duelo 1v1</span>
                </button>
                <button
                  onClick={() => {
                    setRoomMode('knockout');
                    sounds.playClick();
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    roomMode === 'knockout'
                      ? 'bg-sky-600 text-white shadow-[0_0_12px_rgba(2,132,199,0.4)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Noqueo 3v3</span>
                </button>
              </div>

              {/* Hero Selection Grid */}
              <div className="text-left space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  Elige tu Personaje para la Sala:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {(Object.keys(HERO_DEFINITIONS) as HeroId[]).map((hid) => {
                    const hero = HERO_DEFINITIONS[hid];
                    const isSelected = selectedHero === hid;
                    return (
                      <button
                        key={hid}
                        onClick={() => handleHeroSelect(hid)}
                        className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)] scale-105'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <ShapeIcon heroId={hid} size={28} glow={isSelected} />
                        <span className="text-[10px] font-black truncate max-w-full text-white font-display">
                          {hero.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateRoom}
                className="w-full max-w-md mx-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-500 hover:from-sky-400 hover:to-indigo-500 text-white font-black font-display text-base tracking-wider uppercase shadow-[0_0_25px_rgba(56,189,248,0.4)] transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-98"
              >
                <Sparkles className="w-5 h-5" />
                <span>Crear Sala Ahora</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* VIEW 2: Initial Join Screen */}
          {activeTab === 'join' && !roomState && (
            <div className="space-y-5 py-4 max-w-md mx-auto">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-400/30 mx-auto flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black font-display text-white">
                  Ingresa el Código de la Sala
                </h3>
                <p className="text-xs text-slate-400">
                  Pídele el código a tu amigo (ejemplo: <span className="text-indigo-300 font-mono font-bold">SW-8492</span> o <span className="text-indigo-300 font-mono font-bold">8492</span>).
                </p>
              </div>

              {/* Code Input */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="SW-XXXX"
                    maxLength={10}
                    className="w-full text-center py-4 px-4 rounded-2xl bg-slate-950 border-2 border-indigo-500/40 focus:border-indigo-400 text-2xl font-black font-mono tracking-widest text-indigo-300 uppercase placeholder:text-slate-700 outline-none transition-all shadow-inner"
                  />
                  {inputCode && (
                    <button
                      onClick={() => setInputCode('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
                  <span>No distingue mayúsculas ni guiones</span>
                  <button
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) setInputCode(sanitizeRoomCode(clip));
                      } catch {
                        // Ignore
                      }
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                  >
                    Pegar del portapapeles
                  </button>
                </div>
              </div>

              {/* Hero Selection Grid */}
              <div className="text-left space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  Elige tu Personaje para la Batalla:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {(Object.keys(HERO_DEFINITIONS) as HeroId[]).map((hid) => {
                    const hero = HERO_DEFINITIONS[hid];
                    const isSelected = selectedHero === hid;
                    return (
                      <button
                        key={hid}
                        onClick={() => handleHeroSelect(hid)}
                        className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <ShapeIcon heroId={hid} size={28} glow={isSelected} />
                        <span className="text-[10px] font-black truncate max-w-full text-white font-display">
                          {hero.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Connect Button */}
              <button
                onClick={() => handleJoinRoom()}
                disabled={connectionStatus === 'connecting'}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600 hover:from-indigo-500 hover:to-sky-400 text-white font-black font-display text-base tracking-wider uppercase shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-98 disabled:opacity-50"
              >
                {connectionStatus === 'connecting' ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-5 h-5" />
                    <span>Unirse a la Batalla</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* VIEW 3: Active Room Lobby (Host or Guest Connected) */}
          {roomState && (
            <div className="space-y-5">
              {/* Room Code Showcase Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Código de Sala
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono font-bold border border-indigo-800">
                        {roomState.mode === '1v1' ? 'Duelo 1v1' : 'Noqueo 3v3'}
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 tracking-widest drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                      {roomState.code}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black uppercase text-slate-200 transition-all cursor-pointer shadow-md"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
                    <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
                  </button>

                  <button
                    onClick={handleCopyDirectLink}
                    title="Copiar link directo para compartir"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-500 text-xs font-black uppercase text-white transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <LinkIcon className="w-4 h-4 text-indigo-200" />}
                    <span>{copiedLink ? '¡Enlace Listo!' : 'Copiar Enlace'}</span>
                  </button>
                </div>
              </div>

              {/* 1v1 Duel Matchup Showcase */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Host Card (Blue) */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-sky-500/50 relative overflow-hidden flex flex-col justify-between shadow-[0_0_20px_rgba(14,165,233,0.15)]">
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>Anfitrión</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 border border-white/40 flex items-center justify-center shrink-0 shadow-lg">
                      <ShapeIcon heroId={currentHost?.heroId || 'pulsar'} size={38} glow={true} />
                    </div>
                    <div>
                      <div className="text-sm font-black font-display text-white">
                        {currentHost?.name || 'Comandante'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {currentHost?.tag || '#SHAPE101'}
                      </div>
                      <div className="text-xs font-bold text-sky-400 mt-1">
                        Héroe: {HERO_DEFINITIONS[currentHost?.heroId || 'pulsar'].name}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Estado:</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Listo para la Batalla
                    </span>
                  </div>
                </div>

                {/* Guest Card (Red) */}
                <div className={`p-4 rounded-2xl border-2 relative overflow-hidden flex flex-col justify-between ${
                  currentGuest
                    ? 'bg-slate-900/90 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    : 'bg-slate-950/60 border-dashed border-slate-800'
                }`}>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Swords className="w-3 h-3 text-rose-400" />
                    <span>Retador</span>
                  </div>

                  {currentGuest ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 border border-white/40 flex items-center justify-center shrink-0 shadow-lg">
                          <ShapeIcon heroId={currentGuest.heroId} size={38} glow={true} />
                        </div>
                        <div>
                          <div className="text-sm font-black font-display text-white">
                            {currentGuest.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {currentGuest.tag}
                          </div>
                          <div className="text-xs font-bold text-rose-400 mt-1">
                            Héroe: {HERO_DEFINITIONS[currentGuest.heroId].name}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Estado:</span>
                        <span className={`text-xs font-black flex items-center gap-1 ${
                          currentGuest.isReady ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {currentGuest.isReady ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ¡ESTOY LISTO!
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              Eligiendo personaje...
                            </>
                          )}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 animate-pulse">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-black font-display text-slate-300">
                        Esperando a tu rival...
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Comparte el código <span className="text-amber-300 font-mono font-bold">{roomState.code}</span> para que un amigo se una.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Change Hero in Lobby (available to anyone in room) */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span>Cambiar tu Personaje:</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {(Object.keys(HERO_DEFINITIONS) as HeroId[]).map((hid) => {
                    const hero = HERO_DEFINITIONS[hid];
                    const isSelected = selectedHero === hid;
                    return (
                      <button
                        key={hid}
                        onClick={() => handleHeroSelect(hid)}
                        className={`p-1.5 rounded-xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/25 border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.4)] scale-105'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <ShapeIcon heroId={hid} size={24} glow={isSelected} />
                        <span className="text-[9px] font-black truncate max-w-full text-white font-display">
                          {hero.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status & Connection Notification */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span>{connectionMessage || 'Red P2P conectada y sincronizada'}</span>
                </div>
                {roomState.host.ping && (
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {roomState.host.ping} ms
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {isHost ? (
                  <button
                    onClick={handleToggleReadyOrStart}
                    disabled={!canStartMatch}
                    className={`flex-1 py-4 px-6 rounded-2xl font-black font-display text-lg tracking-wider uppercase transition-all flex items-center justify-center gap-3 cursor-pointer ${
                      canStartMatch
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.6)] active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <Swords className="w-6 h-6" />
                    <span>
                      {isStartingCountdown !== null
                        ? `INICIANDO EN ${isStartingCountdown}...`
                        : canStartMatch
                        ? '¡INICIAR COMBATE 1v1!'
                        : currentGuest
                        ? 'ESPERANDO QUE EL RIVAL ESTÉ LISTO'
                        : 'ESPERANDO QUE SE UNA UN RIVAL...'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleReadyOrStart}
                    className={`flex-1 py-4 px-6 rounded-2xl font-black font-display text-lg tracking-wider uppercase transition-all flex items-center justify-center gap-3 cursor-pointer ${
                      isReady
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.5)]'
                        : 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>{isReady ? '¡ESTÁS LISTO! (ESPERANDO AL ANFITRIÓN)' : 'MARCAR LISTO PARA COMBATE'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    sounds.playClick();
                    if (networkManager) networkManager.leaveRoom();
                    setRoomState(null);
                  }}
                  className="px-5 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Salir de la Sala
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
