/**
 * Shape Wars - High-Performance Dual Joystick Combat Controls
 * Left: Ultra-smooth analog movement joystick
 * Right:
 *   - Attack Joystick: Aim-and-Release (Drag to aim trajectory, release to fire)
 *   - Super Joystick: Aim-and-Release (Drag to aim golden trajectory/ability, release to cast; tap to auto-cast)
 *   - Gadget Button: Instant activation with remaining charges and cooldown
 * Fully supports touch events (multi-touch isolated) and pointer/mouse drag fallbacks.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Sword, Zap, Sparkles } from 'lucide-react';
import { sounds } from '../game/sound';

interface TouchControlsProps {
  onMoveChange: (x: number, y: number) => void;
  onAimChange: (x: number, y: number, isAiming: boolean, isSuper?: boolean) => void;
  onAttackRelease: (x: number, y: number, wasDragged: boolean) => void;
  onSuperRelease: (x: number, y: number, wasDragged: boolean) => void;
  onGadget: () => void;
  isSuperReady: boolean;
  playerEnergy: number;
  gadgetCharges: number;
  gadgetCooldown: number;
  gadgetName: string;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onAimChange,
  onAttackRelease,
  onSuperRelease,
  onGadget,
  isSuperReady,
  playerEnergy,
  gadgetCharges,
  gadgetCooldown,
  gadgetName,
}) => {
  // --- 1. MOVEMENT JOYSTICK STATE ---
  const moveBaseRef = useRef<HTMLDivElement>(null);
  const [moveKnobPos, setMoveKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMoveDragging, setIsMoveDragging] = useState(false);
  const moveTouchId = useRef<number | null>(null);
  const isMoveMouseDown = useRef(false);
  const moveMaxRadius = 48;

  // --- 2. ATTACK AIM JOYSTICK STATE ---
  const attackBaseRef = useRef<HTMLDivElement>(null);
  const [attackKnobPos, setAttackKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isAttackAiming, setIsAttackAiming] = useState(false);
  const attackTouchId = useRef<number | null>(null);
  const isAttackMouseDown = useRef(false);
  const attackMaxRadius = 52;

  // --- 3. SUPER AIM JOYSTICK STATE ---
  const superBaseRef = useRef<HTMLDivElement>(null);
  const [superKnobPos, setSuperKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSuperAiming, setIsSuperAiming] = useState(false);
  const superTouchId = useRef<number | null>(null);
  const isSuperMouseDown = useRef(false);
  const superMaxRadius = 42;
  const lastGadgetTriggerTime = useRef<number>(0);
  const lastSuperTriggerTime = useRef<number>(0);

  // --- MOVEMENT HANDLERS ---
  const updateMoveFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!moveBaseRef.current) return;
      const rect = moveBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist <= moveMaxRadius) {
        setMoveKnobPos({ x: dx, y: dy });
        onMoveChange(dx / moveMaxRadius, dy / moveMaxRadius);
      } else {
        const angle = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * moveMaxRadius;
        const ky = Math.sin(angle) * moveMaxRadius;
        setMoveKnobPos({ x: kx, y: ky });
        onMoveChange(Math.cos(angle), Math.sin(angle));
      }
    },
    [onMoveChange, moveMaxRadius]
  );

  const handleMoveTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (moveTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    moveTouchId.current = touch.identifier;
    setIsMoveDragging(true);
    updateMoveFromCoords(touch.clientX, touch.clientY);
  };

  const handleMoveTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (moveTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === moveTouchId.current) {
        updateMoveFromCoords(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleMoveTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === moveTouchId.current) {
        moveTouchId.current = null;
        setIsMoveDragging(false);
        setMoveKnobPos({ x: 0, y: 0 });
        onMoveChange(0, 0);
        break;
      }
    }
  };

  const handleMoveMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isMoveMouseDown.current = true;
    setIsMoveDragging(true);
    updateMoveFromCoords(e.clientX, e.clientY);
  };

  // --- ATTACK JOYSTICK HANDLERS ---
  const updateAttackFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!attackBaseRef.current) return;
      const rect = attackBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist <= attackMaxRadius) {
        setAttackKnobPos({ x: dx, y: dy });
        onAimChange(dx / attackMaxRadius, dy / attackMaxRadius, true, false);
      } else {
        const angle = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * attackMaxRadius;
        const ky = Math.sin(angle) * attackMaxRadius;
        setAttackKnobPos({ x: kx, y: ky });
        onAimChange(Math.cos(angle), Math.sin(angle), true, false);
      }
    },
    [onAimChange, attackMaxRadius]
  );

  const handleAttackTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (attackTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    attackTouchId.current = touch.identifier;
    setIsAttackAiming(true);
    updateAttackFromCoords(touch.clientX, touch.clientY);
  };

  const handleAttackTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (attackTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === attackTouchId.current) {
        updateAttackFromCoords(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleAttackTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === attackTouchId.current) {
        attackTouchId.current = null;
        setIsAttackAiming(false);

        const dist = Math.hypot(attackKnobPos.x, attackKnobPos.y);
        const wasDragged = dist > 14;

        onAttackRelease(
          attackKnobPos.x / attackMaxRadius,
          attackKnobPos.y / attackMaxRadius,
          wasDragged
        );

        setAttackKnobPos({ x: 0, y: 0 });
        onAimChange(0, 0, false, false);
        break;
      }
    }
  };

  const handleAttackMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isAttackMouseDown.current = true;
    setIsAttackAiming(true);
    updateAttackFromCoords(e.clientX, e.clientY);
  };

  // --- SUPER JOYSTICK HANDLERS ---
  const updateSuperFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!superBaseRef.current) return;
      const rect = superBaseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist <= superMaxRadius) {
        setSuperKnobPos({ x: dx, y: dy });
        onAimChange(dx / superMaxRadius, dy / superMaxRadius, true, true);
      } else {
        const angle = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * superMaxRadius;
        const ky = Math.sin(angle) * superMaxRadius;
        setSuperKnobPos({ x: kx, y: ky });
        onAimChange(Math.cos(angle), Math.sin(angle), true, true);
      }
    },
    [onAimChange, superMaxRadius]
  );

  const handleSuperTouchStart = (e: React.TouchEvent) => {
    if (!isSuperReady) return;
    e.stopPropagation();
    if (superTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    superTouchId.current = touch.identifier;
    setIsSuperAiming(true);
    updateSuperFromCoords(touch.clientX, touch.clientY);
  };

  const handleSuperTouchMove = (e: React.TouchEvent) => {
    if (!isSuperReady || superTouchId.current === null) return;
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === superTouchId.current) {
        updateSuperFromCoords(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleSuperTouchEnd = (e: React.TouchEvent) => {
    if (!isSuperReady) return;
    e.stopPropagation();
    e.preventDefault();
    lastSuperTriggerTime.current = Date.now();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === superTouchId.current) {
        superTouchId.current = null;
        setIsSuperAiming(false);

        const dist = Math.hypot(superKnobPos.x, superKnobPos.y);
        const wasDragged = dist > 12;

        onSuperRelease(
          superKnobPos.x / superMaxRadius,
          superKnobPos.y / superMaxRadius,
          wasDragged
        );

        setSuperKnobPos({ x: 0, y: 0 });
        onAimChange(0, 0, false, false);
        break;
      }
    }
  };

  const handleSuperMouseDown = (e: React.MouseEvent) => {
    if (!isSuperReady || e.button !== 0) return;
    isSuperMouseDown.current = true;
    setIsSuperAiming(true);
    updateSuperFromCoords(e.clientX, e.clientY);
  };

  // Global mouse move & up listeners for testing fallback (Move, Attack, Super)
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isMoveMouseDown.current) {
        updateMoveFromCoords(e.clientX, e.clientY);
      }
      if (isAttackMouseDown.current) {
        updateAttackFromCoords(e.clientX, e.clientY);
      }
      if (isSuperMouseDown.current && isSuperReady) {
        updateSuperFromCoords(e.clientX, e.clientY);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isMoveMouseDown.current) {
        isMoveMouseDown.current = false;
        setIsMoveDragging(false);
        setMoveKnobPos({ x: 0, y: 0 });
        onMoveChange(0, 0);
      }
      if (isAttackMouseDown.current) {
        isAttackMouseDown.current = false;
        setIsAttackAiming(false);
        const dist = Math.hypot(attackKnobPos.x, attackKnobPos.y);
        const wasDragged = dist > 14;
        onAttackRelease(
          attackKnobPos.x / attackMaxRadius,
          attackKnobPos.y / attackMaxRadius,
          wasDragged
        );
        setAttackKnobPos({ x: 0, y: 0 });
        onAimChange(0, 0, false, false);
      }
      if (isSuperMouseDown.current) {
        isSuperMouseDown.current = false;
        setIsSuperAiming(false);
        const dist = Math.hypot(superKnobPos.x, superKnobPos.y);
        const wasDragged = dist > 12;
        lastSuperTriggerTime.current = Date.now();
        onSuperRelease(
          superKnobPos.x / superMaxRadius,
          superKnobPos.y / superMaxRadius,
          wasDragged
        );
        setSuperKnobPos({ x: 0, y: 0 });
        onAimChange(0, 0, false, false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    updateMoveFromCoords,
    updateAttackFromCoords,
    updateSuperFromCoords,
    onMoveChange,
    onAimChange,
    onAttackRelease,
    onSuperRelease,
    attackKnobPos,
    attackMaxRadius,
    superKnobPos,
    superMaxRadius,
    isSuperReady,
  ]);

  return (
    <div className="absolute inset-0 max-w-full overflow-hidden pointer-events-none z-30 select-none flex items-end justify-between p-1.5 sm:p-6 touch-none">
      {/* ======================================================== */}
      {/* LEFT: MOVEMENT JOYSTICK                                   */}
      {/* ======================================================== */}
      <div className="pointer-events-auto flex flex-col items-center shrink-0">
        {/* Outer decorative backplate aura to improve aesthetics */}
        <div className="relative flex items-center justify-center">
          {/* Animated decorative backing rings */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-sky-500/10 via-cyan-500/5 to-transparent blur-md pointer-events-none" />
          <div className="absolute -inset-1.5 rounded-full border border-sky-400/20 border-dashed animate-[spin_24s_linear_infinite] pointer-events-none" />
          
          <div
            ref={moveBaseRef}
            onTouchStart={handleMoveTouchStart}
            onTouchMove={handleMoveTouchMove}
            onTouchEnd={handleMoveTouchEnd}
            onTouchCancel={handleMoveTouchEnd}
            onMouseDown={handleMoveMouseDown}
            className="relative w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-slate-950/35 border border-sky-400/30 backdrop-blur-xs touch-none flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.18)] active:border-sky-400/60 cursor-grab active:cursor-grabbing transition-all select-none"
          >
            {/* Cardinal Direction Guides */}
            <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-sky-400/60 shadow-[0_0_6px_#38bdf8]" />
            <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-sky-400/60 shadow-[0_0_6px_#38bdf8]" />
            <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-sky-400/60 shadow-[0_0_6px_#38bdf8]" />
            <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-sky-400/60 shadow-[0_0_6px_#38bdf8]" />

            {/* Inner tactical radial ring */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border border-sky-400/25 border-dashed" />

            {/* Movable Knob with high transparency and neon border */}
            <div
              style={{
                transform: `translate(${moveKnobPos.x}px, ${moveKnobPos.y}px)`,
                transition: isMoveDragging ? 'none' : 'transform 0.14s ease-out',
              }}
              className="absolute w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-sky-500/40 border-2 border-sky-200/90 backdrop-blur-sm shadow-[0_0_18px_rgba(56,189,248,0.7)] flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-sky-100 shadow-[0_0_8px_#ffffff]" />
              <span className="text-[6.5px] sm:text-[7px] font-black uppercase text-sky-100 tracking-tighter mt-0.5">MOVER</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT: ATTACK JOYSTICK, SUPER JOYSTICK & GADGET          */}
      {/* ======================================================== */}
      <div className="pointer-events-auto flex items-end gap-1.5 sm:gap-4 relative shrink-0">
        {/* Left column of combat cluster: Super Joystick & Gadget */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2.5 mb-0.5 sm:mb-1">
          {/* Gadget Button */}
          <div className="relative">
            <button
              type="button"
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const now = Date.now();
                if (now - lastGadgetTriggerTime.current < 450) return;
                lastGadgetTriggerTime.current = now;
                if (gadgetCooldown <= 0) {
                  onGadget();
                  sounds.playClick();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                const now = Date.now();
                if (now - lastGadgetTriggerTime.current < 450) return;
                lastGadgetTriggerTime.current = now;
                if (gadgetCooldown <= 0) {
                  onGadget();
                  sounds.playClick();
                }
              }}
              disabled={gadgetCooldown > 0}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center text-xs shadow-xl active:scale-95 transition-all cursor-pointer ${
                gadgetCooldown <= 0
                  ? 'bg-emerald-600/45 border-emerald-300 text-white backdrop-blur-xs ring-2 ring-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-950/40 border-slate-700/50 text-slate-500 opacity-50 cursor-not-allowed'
              }`}
              title={gadgetName}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow" />
              <span className="text-[6px] sm:text-[6.5px] font-black uppercase tracking-tight mt-0.5">POTENCIA</span>
            </button>

            {/* Charges count badge */}
            <div className="absolute -top-1 -right-1 px-1 sm:px-1.5 py-0.2 rounded-full bg-slate-950/90 border border-emerald-400 text-emerald-300 text-[8px] sm:text-[9px] font-black font-mono shadow-sm">
              {gadgetCooldown > 0 ? `${gadgetCooldown.toFixed(1)}s` : '∞'}
            </div>
          </div>

          {/* SÚPER AIM & RELEASE JOYSTICK */}
          <div className="flex flex-col items-center">
            {/* Super decorative backdrop glow */}
            <div className="relative flex items-center justify-center">
              {isSuperReady && (
                <>
                  <div className="absolute -inset-2.5 rounded-full bg-amber-500/15 blur-sm animate-pulse pointer-events-none" />
                  <div className="absolute -inset-1 rounded-full border border-amber-400/40 border-dashed animate-[spin_16s_linear_infinite] pointer-events-none" />
                </>
              )}

              <div
                ref={superBaseRef}
                onTouchStart={handleSuperTouchStart}
                onTouchMove={handleSuperTouchMove}
                onTouchEnd={handleSuperTouchEnd}
                onTouchCancel={handleSuperTouchEnd}
                onMouseDown={handleSuperMouseDown}
                onClick={(e) => {
                  e.preventDefault();
                  const now = Date.now();
                  if (now - lastSuperTriggerTime.current < 450) return;
                  if (isSuperReady && !isSuperAiming) {
                    lastSuperTriggerTime.current = now;
                    onSuperRelease(0, 0, false);
                    sounds.playClick();
                  }
                }}
                className={`relative w-18 h-18 sm:w-24 sm:h-24 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-xl transition-all select-none touch-none ${
                  isSuperReady
                    ? 'bg-amber-950/25 border-amber-400/70 text-amber-200 ring-2 ring-amber-400/30 shadow-[0_0_22px_rgba(251,191,36,0.45)] cursor-grab active:cursor-grabbing'
                    : 'bg-slate-950/30 border-slate-700/40 text-slate-500 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Cardinal guides for Super */}
                <div className={`absolute top-1 w-1 h-1 rounded-full ${isSuperReady ? 'bg-amber-400 shadow-[0_0_4px_#fbbf24]' : 'bg-slate-600'}`} />
                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSuperReady ? 'bg-amber-400 shadow-[0_0_4px_#fbbf24]' : 'bg-slate-600'}`} />
                <div className={`absolute left-1 w-1 h-1 rounded-full ${isSuperReady ? 'bg-amber-400 shadow-[0_0_4px_#fbbf24]' : 'bg-slate-600'}`} />
                <div className={`absolute right-1 w-1 h-1 rounded-full ${isSuperReady ? 'bg-amber-400 shadow-[0_0_4px_#fbbf24]' : 'bg-slate-600'}`} />

                {/* Inner ring */}
                <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-dashed ${isSuperReady ? 'border-amber-400/35' : 'border-slate-700/40'}`} />

                {/* Movable Super Joystick Knob */}
                <div
                  style={{
                    transform: `translate(${superKnobPos.x}px, ${superKnobPos.y}px)`,
                    transition: isSuperAiming ? 'none' : 'transform 0.14s ease-out',
                  }}
                  className={`absolute w-10 h-10 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center border-2 pointer-events-none transition-shadow ${
                    isSuperReady
                      ? 'bg-amber-500/45 border-amber-200 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.8)] backdrop-blur-xs'
                      : 'bg-slate-900/40 border-slate-700/50 text-slate-400'
                  }`}
                >
                  <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${isSuperReady ? 'text-amber-200 fill-amber-200' : 'text-slate-500'}`} />
                  <span className="text-[6.5px] sm:text-[7.5px] font-black uppercase tracking-tight mt-0.5">
                    {isSuperReady ? (isSuperAiming ? 'SOLTAR' : 'SÚPER') : `${Math.round(playerEnergy)}%`}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[7px] sm:text-[8px] font-bold text-amber-300/80 uppercase tracking-wider mt-0.5 sm:mt-1 text-center drop-shadow">
              {isSuperReady ? 'Súper' : `${Math.round(playerEnergy)}%`}
            </span>
          </div>
        </div>

        {/* Primary ATTACK JOYSTICK (AIM & RELEASE) */}
        <div className="flex flex-col items-center">
          {/* Decorative rotating backing aura for Attack */}
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-rose-500/10 via-orange-500/5 to-transparent blur-md pointer-events-none" />
            <div className="absolute -inset-1.5 rounded-full border border-rose-400/20 border-dashed animate-[spin_24s_linear_infinite_reverse] pointer-events-none" />

            <div
              ref={attackBaseRef}
              onTouchStart={handleAttackTouchStart}
              onTouchMove={handleAttackTouchMove}
              onTouchEnd={handleAttackTouchEnd}
              onTouchCancel={handleAttackTouchEnd}
              onMouseDown={handleAttackMouseDown}
              className="relative w-26 h-26 sm:w-36 sm:h-36 rounded-full bg-slate-950/35 border border-rose-400/35 backdrop-blur-xs touch-none flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)] active:border-rose-400/60 cursor-grab active:cursor-grabbing transition-all select-none"
            >
              {/* Cardinal Aiming Marks */}
              <div className="absolute top-1.5 w-1.5 h-1.5 rounded-full bg-rose-400/70 shadow-[0_0_6px_#f43f5e]" />
              <div className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-rose-400/70 shadow-[0_0_6px_#f43f5e]" />
              <div className="absolute left-1.5 w-1.5 h-1.5 rounded-full bg-rose-400/70 shadow-[0_0_6px_#f43f5e]" />
              <div className="absolute right-1.5 w-1.5 h-1.5 rounded-full bg-rose-400/70 shadow-[0_0_6px_#f43f5e]" />

              {/* Inner dashed tactical ring */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-dashed border-rose-400/25" />

              {/* Movable Attack Knob with high transparency and neon edge */}
              <div
                style={{
                  transform: `translate(${attackKnobPos.x}px, ${attackKnobPos.y}px)`,
                  transition: isAttackAiming ? 'none' : 'transform 0.14s ease-out',
                }}
                className="absolute w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-rose-500/40 border-2 border-rose-200/90 shadow-[0_0_18px_rgba(244,63,94,0.7)] backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none"
              >
                <Sword className="w-5 h-5 sm:w-6 sm:h-6 text-rose-100 drop-shadow" />
                <span className="text-[6.5px] sm:text-[7.5px] font-black uppercase text-rose-100 tracking-tighter mt-0.5">
                  {isAttackAiming ? 'SOLTAR' : 'DISPARO'}
                </span>
              </div>
            </div>
          </div>
          <span className="text-[7.5px] sm:text-[9px] font-bold text-rose-300/80 uppercase tracking-wider mt-0.5 sm:mt-1 text-center drop-shadow">
            Arrastra y suelta
          </span>
        </div>
      </div>
    </div>
  );
};
