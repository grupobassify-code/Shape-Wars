/**
 * Shape Wars - Main Application Entry & State Coordinator
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { UserProgress, loadUserProgress, saveUserProgress, applyMatchReward } from './game/storage';
import { HeroId, MatchStats } from './game/types';
import { sounds } from './game/sound';
import { HeaderBar } from './components/HeaderBar';
import { MainMenu } from './components/MainMenu';
import { HeroSelectScreen } from './components/HeroSelectScreen';
import { UpgradesScreen } from './components/UpgradesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CombatHUD } from './components/CombatHUD';
import { TouchControls } from './components/TouchControls';
import { MatchResultModal } from './components/MatchResultModal';
import { ModeSelectModal } from './components/ModeSelectModal';
import { ProfileModal } from './components/ProfileModal';
import { TrophyRoadModal } from './components/TrophyRoadModal';
import { AILoadingScreen } from './components/AILoadingScreen';
import { BattleCardsIntro } from './components/BattleCardsIntro';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { MatchmakingModal } from './components/MatchmakingModal';
import { VersusScreen } from './components/VersusScreen';
import { OnlinePlayerProfile } from './game/onlinePlayers';
import { Matchmaker } from './game/matchmaking';
import { GameMode, FlagState } from './game/types';
import { RoomLobbyModal } from './components/RoomLobbyModal';
import { RoomNetworkManager, RoomMode } from './game/roomNetwork';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'menu' | 'combat' | 'heroes' | 'upgrades' | 'settings'>('menu');
  const [progress, setProgress] = useState<UserProgress>(() => loadUserProgress());
  const [isModeSelectOpen, setIsModeSelectOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTrophyRoadOpen, setIsTrophyRoadOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [showBattleCardsIntro, setShowBattleCardsIntro] = useState(false);
  const [matchRivals, setMatchRivals] = useState<HeroId[]>(['nova', 'volt', 'boom']);

  // Online Matchmaking State
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState('Buscando combatiente en tu rango de copas...');
  const [matchmakingFound, setMatchmakingFound] = useState(false);
  const [showVersusScreen, setShowVersusScreen] = useState(false);
  const [matchedRival, setMatchedRival] = useState<OnlinePlayerProfile | null>(null);
  const [matchedAllies, setMatchedAllies] = useState<OnlinePlayerProfile[]>([]);
  const [matchedRivals, setMatchedRivals] = useState<OnlinePlayerProfile[]>([]);
  const matchmakerRef = useRef<Matchmaker | null>(null);

  // Private Room Network State (Salas con Códigos P2P / Web)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [activeRoomNetwork, setActiveRoomNetwork] = useState<RoomNetworkManager | null>(null);
  const [activeRoomRole, setActiveRoomRole] = useState<'host' | 'client' | null>(null);
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(null);

  // Combat State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [combatState, setCombatState] = useState<{
    timer: number;
    blueAlive: number;
    redAlive: number;
    playerHp: number;
    playerMaxHp: number;
    playerEnergy: number;
    isSuperReady: boolean;
    autoAimActive: boolean;
    autoAimTargetName: string | null;
    playerGadgetCharges: number;
    playerGadgetCooldown: number;
    gadgetName: string;
    currentRound: number;
    blueRoundsWon: number;
    redRoundsWon: number;
    roundState: 'ROUND_ACTIVE' | 'ROUND_INTERMISSION' | 'MATCH_OVER';
    roundTransitionTimer: number;
    participants: any[];
    isSpectating: boolean;
    spectatedAllyName: string | null;
    blueFlag?: FlagState | null;
    redFlag?: FlagState | null;
    blueScore?: number;
    redScore?: number;
    gameMode?: GameMode;
    activeModifierAlert?: string | null;
    poisonGasDistance?: number;
    isSuddenDeathActive?: boolean;
    powerOrbAvailable?: boolean;
  }>({
    timer: 90,
    blueAlive: 3,
    redAlive: 3,
    playerHp: 100,
    playerMaxHp: 100,
    playerEnergy: 0,
    isSuperReady: false,
    autoAimActive: progress.autoAimEnabled,
    autoAimTargetName: null,
    playerGadgetCharges: 2,
    playerGadgetCooldown: 0,
    gadgetName: '',
    currentRound: 1,
    blueRoundsWon: 0,
    redRoundsWon: 0,
    roundState: 'ROUND_ACTIVE',
    roundTransitionTimer: 0,
    participants: [],
    isSpectating: false,
    spectatedAllyName: null,
    blueFlag: null,
    redFlag: null,
    blueScore: 0,
    redScore: 0,
    gameMode: progress.selectedMode || '3v3',
    activeModifierAlert: null,
    poisonGasDistance: 0,
    isSuddenDeathActive: false,
    powerOrbAvailable: true,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [autoAimActive, setAutoAimActive] = useState(progress.autoAimEnabled);
  const [matchResult, setMatchResult] = useState<MatchStats | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Sync sounds mute setting
  useEffect(() => {
    sounds.setMuted(!progress.soundEnabled);
  }, [progress.soundEnabled]);

  // Detect touch device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(hasTouch);
    }
  }, []);

  // Update progress helper
  const handleUpdateProgress = useCallback((newProgress: UserProgress) => {
    setProgress(newProgress);
    saveUserProgress(newProgress);
  }, []);

  // Match End Callback
  const handleMatchEnd = useCallback(
    (stats: MatchStats) => {
      // Award reward strictly once
      const { coinsEarned, updatedProgress } = applyMatchReward(
        progress,
        stats.result,
        stats.playerKills
      );

      setProgress(updatedProgress);
      setMatchResult({
        ...stats,
        coinsEarned,
      });
    },
    [progress]
  );

  // Start Combat & Matchmaking
  const handleStartCombat = useCallback(
    (heroId?: HeroId) => {
      const activeHero = heroId || progress.selectedHero || 'pulsar';
      if (heroId && heroId !== progress.selectedHero) {
        const updated = { ...progress, selectedHero: heroId };
        handleUpdateProgress(updated);
      }

      setMatchResult(null);
      setIsPaused(false);
      setIsMatchmaking(true);
      setMatchmakingFound(false);
      setShowVersusScreen(false);

      if (matchmakerRef.current) {
        matchmakerRef.current.cancel();
      }

      const matchmaker = new Matchmaker(
        progress.trophies || 0,
        activeHero,
        progress.selectedMode || '1v1',
        {
          onStatusChange: (status, message) => {
            setMatchmakingStatus(message);
            if (status === 'FOUND') {
              setMatchmakingFound(true);
            }
          },
          onMatchFound: (rival, allies, otherRivals) => {
            setMatchedRival(rival);
            setMatchedAllies(allies || []);
            setMatchedRivals(otherRivals || [rival]);
            setMatchRivals(otherRivals ? otherRivals.map((r) => r.heroId) : [rival.heroId]);
          },
          onVersusStart: () => {
            setIsMatchmaking(false);
            setShowVersusScreen(true);
          },
          onMatchReady: () => {
            setShowVersusScreen(false);
            setIsLoadingMatch(false);
            setShowBattleCardsIntro(false);
            setCurrentTab('combat');
          },
        }
      );

      matchmakerRef.current = matchmaker;
      matchmaker.start();
    },
    [progress, handleUpdateProgress]
  );

  // Detect room code in URL (?room=SW-XXXX) on website launch
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const roomParam = searchParams.get('room');
      if (roomParam) {
        setInitialRoomCode(roomParam);
        setIsRoomModalOpen(true);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Start Room Match from Room Lobby
  const handleStartRoomMatch = useCallback(
    (networkManager: RoomNetworkManager, isHost: boolean, mode: RoomMode) => {
      setActiveRoomNetwork(networkManager);
      setActiveRoomRole(isHost ? 'host' : 'client');
      setIsRoomModalOpen(false);

      const room = networkManager.currentRoom;
      const opponent = isHost ? room?.guest : room?.host;
      if (opponent) {
        const rivalProfile: OnlinePlayerProfile = {
          id: opponent.id,
          name: opponent.name,
          clan: 'Sala Privada',
          flag: isHost ? '⚡' : '👑',
          countryName: 'P2P Online',
          heroId: opponent.heroId,
          heroPowerLevel: 5,
          trophies: opponent.trophies || 100,
          rankTitle: 'Comandante',
          winRate: 65,
          pingMs: opponent.ping || 18,
          avatarIcon: opponent.heroId,
          serverRegion: 'Global WebRTC',
        };
        setMatchedRival(rivalProfile);
        setMatchedRivals([rivalProfile]);
      }

      setMatchResult(null);
      setIsPaused(false);
      setIsMatchmaking(false);
      setMatchmakingFound(false);
      setShowVersusScreen(true);

      setTimeout(() => {
        setShowVersusScreen(false);
        setIsLoadingMatch(false);
        setShowBattleCardsIntro(false);
        setCurrentTab('combat');
      }, 2400);
    },
    []
  );

  const handleCancelMatchmaking = useCallback(() => {
    if (matchmakerRef.current) {
      matchmakerRef.current.cancel();
      matchmakerRef.current = null;
    }
    setIsMatchmaking(false);
    setMatchmakingFound(false);
    setShowVersusScreen(false);
  }, []);

  // Exit Combat to Menu
  const handleExitCombat = useCallback(() => {
    if (matchmakerRef.current) {
      matchmakerRef.current.cancel();
      matchmakerRef.current = null;
    }
    if (activeRoomNetwork) {
      activeRoomNetwork.leaveRoom();
      setActiveRoomNetwork(null);
      setActiveRoomRole(null);
    }
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setMatchResult(null);
    setIsPaused(false);
    setIsMatchmaking(false);
    setShowVersusScreen(false);
    setIsLoadingMatch(false);
    setShowBattleCardsIntro(false);
    setCurrentTab('menu');
  }, [activeRoomNetwork]);

  // Rematch
  const handleRematch = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setMatchResult(null);
    setIsPaused(false);
    if (activeRoomNetwork && activeRoomRole) {
      // Direct rematch in private room
      setCurrentTab('combat');
    } else {
      handleStartCombat();
    }
  }, [handleStartCombat, activeRoomNetwork, activeRoomRole]);

  // Setup Combat Engine
  useEffect(() => {
    if (currentTab !== 'combat' || isLoadingMatch || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new GameEngine(
      canvas,
      progress,
      {
        onMatchEnd: handleMatchEnd,
        onStateUpdate: (state) => {
          setCombatState(state);
        },
      },
      {
        onlineRival: matchedRival,
        onlineAllies: matchedAllies,
        onlineRivals: matchedRivals,
        roomNetwork: activeRoomNetwork,
        roomRole: activeRoomRole,
      }
    );

    engineRef.current = engine;
    setAutoAimActive(engine.isAutoAimEnabled());
    engine.start();

    // Keyboard controls tracker
    const keysPressed: Record<string, boolean> = {};

    const updateMovementFromKeys = () => {
      if (showBattleCardsIntro) return;
      let mx = 0;
      let my = 0;
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) my -= 1;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) my += 1;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) mx -= 1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) mx += 1;
      engine.setPlayerMoveInput(mx, my);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showBattleCardsIntro) return;

      keysPressed[e.code] = true;
      updateMovementFromKeys();

      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;
        const player = engine.getPlayer();
        if (player && !player.isAlive) {
          engine.cycleSpectateTarget();
        } else {
          engine.triggerPlayerAttack();
        }
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        if (e.repeat) return;
        engine.triggerPlayerSuper();
      } else if (e.code === 'KeyQ' || e.code === 'KeyG') {
        e.preventDefault();
        if (e.repeat) return;
        engine.triggerPlayerGadget();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        if (e.repeat) return;
        const state = engine.toggleAutoAim();
        setAutoAimActive(state);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (e.repeat) return;
        const paused = engine.togglePause();
        setIsPaused(paused);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      delete keysPressed[e.code];
      updateMovementFromKeys();
    };

    const handleMouseMove = (e: MouseEvent) => {
      engine.setPlayerMousePos(e.clientX, e.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const player = engine.getPlayer();
        if (player && !player.isAlive) {
          engine.cycleSpectateTarget();
        } else {
          engine.setPlayerMouseDown(true);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        engine.setPlayerMouseDown(false);
      }
    };

    const handleResize = () => {
      engine.handleResize();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      engineRef.current = null;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentTab, isLoadingMatch, showBattleCardsIntro, progress, handleMatchEnd, matchedRival, matchedAllies, matchedRivals]);

  // Touch & Joystick control handlers
  const handleTouchMove = useCallback((x: number, y: number) => {
    if (showBattleCardsIntro) return;
    if (engineRef.current) {
      engineRef.current.setPlayerMoveInput(x, y);
    }
  }, [showBattleCardsIntro]);

  const handleTouchAim = useCallback((x: number, y: number, isAiming: boolean, isSuper: boolean = false) => {
    if (engineRef.current) {
      engineRef.current.setPlayerAimJoystick(x, y, isAiming, isSuper);
    }
  }, []);

  const handleTouchAttackRelease = useCallback((x: number, y: number, wasDragged: boolean) => {
    if (engineRef.current) {
      engineRef.current.releaseAttackJoystick(x, y, wasDragged);
    }
  }, []);

  const handleTouchSuperRelease = useCallback((x: number, y: number, wasDragged: boolean) => {
    if (engineRef.current) {
      engineRef.current.releaseSuperJoystick(x, y, wasDragged);
    }
  }, []);

  const handleTouchGadget = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerPlayerGadget();
    }
  }, []);

  const handleToggleAutoAim = useCallback(() => {
    if (engineRef.current) {
      const state = engineRef.current.toggleAutoAim();
      setAutoAimActive(state);
    }
  }, []);

  const handleTogglePause = useCallback(() => {
    if (engineRef.current) {
      const paused = engineRef.current.togglePause();
      setIsPaused(paused);
    }
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full max-w-full overflow-hidden flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top Bar Navigation */}
      <HeaderBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (currentTab !== 'combat') {
            setCurrentTab(tab);
          }
        }}
        coins={progress.coins}
        kronus={progress.kronus || 0}
        trophies={progress.trophies || 0}
        soundEnabled={progress.soundEnabled}
        onToggleSound={() => {
          const val = !progress.soundEnabled;
          handleUpdateProgress({ ...progress, soundEnabled: val });
        }}
        onStartCombat={() => handleStartCombat()}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenTrophyRoad={() => setIsTrophyRoadOpen(true)}
        isInCombat={currentTab === 'combat'}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative w-full h-full overflow-hidden flex flex-col min-w-0 max-w-full overscroll-none">
        {currentTab === 'menu' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 overscroll-none">
            <MainMenu
              progress={progress}
              onStartCombat={() => handleStartCombat()}
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenModeSelect={() => setIsModeSelectOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenTrophyRoad={() => setIsTrophyRoadOpen(true)}
              onOpenPrivacy={() => setIsPrivacyOpen(true)}
              onOpenRoomLobby={() => setIsRoomModalOpen(true)}
            />
          </div>
        )}

        {currentTab === 'heroes' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 overscroll-none">
            <HeroSelectScreen
              progress={progress}
              onUpdateProgress={handleUpdateProgress}
              onStartCombatWithHero={(heroId) => handleStartCombat(heroId)}
            />
          </div>
        )}

        {currentTab === 'upgrades' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 overscroll-none">
            <UpgradesScreen progress={progress} onUpdateProgress={handleUpdateProgress} />
          </div>
        )}

        {currentTab === 'settings' && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full min-w-0 overscroll-none">
            <SettingsScreen progress={progress} onUpdateProgress={handleUpdateProgress} />
          </div>
        )}

        {/* Combat Screen */}
        {currentTab === 'combat' && (
          <div className="relative w-full h-full flex-1 flex items-center justify-center bg-slate-950 overflow-hidden max-w-full touch-none select-none">
            {isLoadingMatch ? (
              /* AI Battle Loading Screen (Brawl Stars Style) */
              <AILoadingScreen
                playerHeroId={progress.selectedHero || 'pulsar'}
                selectedMode={progress.selectedMode || '3v3'}
                rivalHeroes={matchRivals}
                onLoadingComplete={() => {
                  setIsLoadingMatch(false);
                  setShowBattleCardsIntro(true);
                }}
              />
            ) : (
              <>
                {/* 2D Canvas */}
                <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair touch-none" />

                {/* Combat HUD Overlay */}
                <CombatHUD
                  timer={combatState.timer}
                  blueAlive={combatState.blueAlive}
                  redAlive={combatState.redAlive}
                  playerHp={combatState.playerHp}
                  playerMaxHp={combatState.playerMaxHp}
                  playerEnergy={combatState.playerEnergy}
                  isSuperReady={combatState.isSuperReady}
                  playerHeroId={progress.selectedHero}
                  autoAimActive={autoAimActive}
                  autoAimTargetName={combatState.autoAimTargetName}
                  playerGadgetCharges={combatState.playerGadgetCharges}
                  playerGadgetCooldown={combatState.playerGadgetCooldown}
                  isPaused={isPaused}
                  currentRound={combatState.currentRound}
                  blueRoundsWon={combatState.blueRoundsWon}
                  redRoundsWon={combatState.redRoundsWon}
                  roundState={combatState.roundState}
                  roundTransitionTimer={combatState.roundTransitionTimer}
                  participants={combatState.participants}
                  isSpectating={combatState.isSpectating}
                  spectatedAllyName={combatState.spectatedAllyName}
                  blueFlag={combatState.blueFlag}
                  redFlag={combatState.redFlag}
                  blueScore={combatState.blueScore}
                  redScore={combatState.redScore}
                  gameMode={combatState.gameMode || progress.selectedMode || '3v3'}
                  activeModifierAlert={combatState.activeModifierAlert}
                  poisonGasDistance={combatState.poisonGasDistance}
                  isSuddenDeathActive={combatState.isSuddenDeathActive}
                  powerOrbAvailable={combatState.powerOrbAvailable}
                  onTogglePause={handleTogglePause}
                  onForfeit={handleExitCombat}
                  onToggleAutoAim={handleToggleAutoAim}
                  onTriggerGadget={handleTouchGadget}
                  onTriggerSuper={() => {
                    if (engineRef.current) {
                      engineRef.current.triggerPlayerSuper();
                    }
                  }}
                  onCycleSpectate={() => {
                    if (engineRef.current) {
                      engineRef.current.cycleSpectateTarget();
                    }
                  }}
                />

                {/* Dual Joystick Combat Controls (Always active during combat) */}
                <TouchControls
                  onMoveChange={handleTouchMove}
                  onAimChange={handleTouchAim}
                  onAttackRelease={handleTouchAttackRelease}
                  onSuperRelease={handleTouchSuperRelease}
                  onGadget={handleTouchGadget}
                  isSuperReady={combatState.isSuperReady}
                  playerEnergy={combatState.playerEnergy}
                  gadgetCharges={combatState.playerGadgetCharges}
                  gadgetCooldown={combatState.playerGadgetCooldown}
                  gadgetName={combatState.gadgetName}
                />

                {/* 3-Second Brawl Stars Battle Cards Match Intro */}
                {showBattleCardsIntro && (
                  <BattleCardsIntro
                    participants={combatState.participants}
                    gameMode={combatState.gameMode || progress.selectedMode || '3v3'}
                    playerHeroId={progress.selectedHero || 'pulsar'}
                    playerBackgroundId={progress.selectedBackground || progress.selectedHero || 'pulsar'}
                    onFinish={() => setShowBattleCardsIntro(false)}
                  />
                )}

                {/* Match Result Modal */}
                {matchResult && (
                  <MatchResultModal
                    stats={matchResult}
                    rival={matchedRival}
                    onRematch={handleRematch}
                    onReturnToMenu={handleExitCombat}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Online Matchmaking Radar Modal */}
        {isMatchmaking && (
          <MatchmakingModal
            progress={progress}
            mode={progress.selectedMode || '1v1'}
            statusMessage={matchmakingStatus}
            isFound={matchmakingFound}
            onCancel={handleCancelMatchmaking}
          />
        )}

        {/* 1v1 / 3v3 Face-Off Versus Screen */}
        {showVersusScreen && matchedRival && (
          <VersusScreen
            progress={progress}
            rival={matchedRival}
            mode={progress.selectedMode || '1v1'}
            onFinish={() => {
              setShowVersusScreen(false);
              setIsLoadingMatch(false);
              setShowBattleCardsIntro(false);
              setCurrentTab('combat');
            }}
          />
        )}

        {/* Global Modal: Mode Selection (3v3 vs 1v1 vs CTF) */}
        {isModeSelectOpen && (
          <ModeSelectModal
            selectedMode={progress.selectedMode || '3v3'}
            onSelectMode={(newMode: GameMode) => {
              handleUpdateProgress({ ...progress, selectedMode: newMode });
            }}
            onClose={() => setIsModeSelectOpen(false)}
          />
        )}

        {/* Global Modal: Player Profile */}
        {isProfileOpen && (
          <ProfileModal
            progress={progress}
            onUpdateProgress={handleUpdateProgress}
            onClose={() => setIsProfileOpen(false)}
          />
        )}

        {/* Global Modal: Trophy Road (Camino de Trofeos) */}
        {isTrophyRoadOpen && (
          <TrophyRoadModal
            progress={progress}
            onUpdateProgress={handleUpdateProgress}
            onClose={() => setIsTrophyRoadOpen(false)}
          />
        )}

        {/* Global Modal: Privacy Policy (Políticas de Privacidad) */}
        {isPrivacyOpen && (
          <PrivacyPolicyModal
            isOpen={isPrivacyOpen}
            onClose={() => setIsPrivacyOpen(false)}
          />
        )}

        {/* Global Modal: Private Room Lobby & Code Join (Salas Online Web / P2P) */}
        {isRoomModalOpen && (
          <RoomLobbyModal
            isOpen={isRoomModalOpen}
            onClose={() => setIsRoomModalOpen(false)}
            progress={progress}
            onStartRoomMatch={handleStartRoomMatch}
            initialRoomCode={initialRoomCode}
          />
        )}
      </main>
    </div>
  );
}
