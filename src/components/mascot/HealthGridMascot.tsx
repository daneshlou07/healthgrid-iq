import React, { useState, useEffect, useRef } from 'react';
import { Activity, Sparkles, Move, X, Bot, Brain, Check, Bell } from 'lucide-react';
import CopilotPanel from './CopilotPanel';
import CopilotNotifications from './CopilotNotifications';
import type { MascotState } from '../../services/copilotService';

/**
 * HealthGridMascot — AI Copilot Desktop Pet
 *
 * The visual personality/interface of the HealthGrid AI Copilot.
 *
 * Features:
 * - 7 visual states: idle, processing, speaking, attention, urgent, success, scheduling
 * - Click to open the AI Copilot chat panel
 * - Drag to reposition anywhere on screen
 * - Proactive workflow notifications via CopilotNotifications
 * - Notification badge for pending insights
 * - Dismiss via X button; re-enable via Header toggle
 * - State persistence in localStorage
 */
export default function HealthGridMascot() {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    return localStorage.getItem('healthgrid_mascot_visible') !== 'false';
  });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [insightCount, setInsightCount] = useState(0);

  // Position state (null = default CSS bottom-right positioning)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for tracking drag offsets and click distance
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0, startY: 0, initialX: 0, initialY: 0,
  });
  const hasDraggedRef = useRef(false);
  const mascotRef = useRef<HTMLDivElement>(null);

  // Listen to external visibility toggle events (e.g., from Header toggle)
  useEffect(() => {
    const handleVisibilityEvent = (e: CustomEvent<{ visible: boolean }>) => {
      if (typeof e.detail?.visible === 'boolean') {
        setIsVisible(e.detail.visible);
      }
    };

    window.addEventListener('healthgrid:mascot-visibility' as any, handleVisibilityEvent);
    return () => window.removeEventListener('healthgrid:mascot-visibility' as any, handleVisibilityEvent);
  }, []);

  // Strict screen boundary clamping (prevents mascot from running off-screen)
  const PADDING = 16;
  const MASCOT_WIDTH = 84;
  const MASCOT_HEIGHT = 100;

  const clampPosition = (x: number, y: number): { x: number; y: number } => {
    const minX = PADDING;
    const maxX = Math.max(PADDING, window.innerWidth - MASCOT_WIDTH - PADDING);
    const minY = PADDING;
    const maxY = Math.max(PADDING, window.innerHeight - MASCOT_HEIGHT - PADDING);

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  };

  // Recalculate screen boundary on window resize
  useEffect(() => {
    const handleResize = () => {
      if (position) {
        setPosition(prev => (prev ? clampPosition(prev.x, prev.y) : null));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Periodic eye blinking cycle
  useEffect(() => {
    if (!isVisible || mascotState === 'processing') return;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, [isVisible, mascotState]);

  // Dismiss / Remove Mascot
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setIsPanelOpen(false);
    localStorage.setItem('healthgrid_mascot_visible', 'false');
    window.dispatchEvent(new CustomEvent('healthgrid:mascot-visibility', { detail: { visible: false } }));
  };

  // --- Drag Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = mascotRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : window.innerWidth - 100;
    const currentY = rect ? rect.top : window.innerHeight - 120;

    dragStartRef.current = { startX: e.clientX, startY: e.clientY, initialX: currentX, initialY: currentY };
    hasDraggedRef.current = false;
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) hasDraggedRef.current = true;

      const rawX = dragStartRef.current.initialX + deltaX;
      const rawY = dragStartRef.current.initialY + deltaY;

      setPosition(clampPosition(rawX, rawY));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = mascotRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : window.innerWidth - 100;
    const currentY = rect ? rect.top : window.innerHeight - 120;

    dragStartRef.current = { startX: touch.clientX, startY: touch.clientY, initialX: currentX, initialY: currentY };
    hasDraggedRef.current = false;
    setIsDragging(true);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - dragStartRef.current.startX;
      const deltaY = moveTouch.clientY - dragStartRef.current.startY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) hasDraggedRef.current = true;

      const rawX = dragStartRef.current.initialX + deltaX;
      const rawY = dragStartRef.current.initialY + deltaY;

      setPosition(clampPosition(rawX, rawY));
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Click → open/close panel (only if not dragging)
  const handleClick = () => {
    if (hasDraggedRef.current) return;
    setIsPanelOpen(prev => !prev);
  };

  const handleMascotStateChange = (state: MascotState) => {
    setMascotState(state);
  };

  if (!isVisible) return null;

  // --- Visual state configuration ---
  const stateConfig: Record<MascotState, {
    eyeColor: string;
    beaconColor: string;
    beaconPulse: boolean;
    bodyExtra: string;
    visorBg: string;
    icon: React.ReactNode;
    ringColor: string;
  }> = {
    idle: {
      eyeColor: 'bg-emerald-400',
      beaconColor: 'bg-emerald-400',
      beaconPulse: false,
      bodyExtra: '',
      visorBg: 'bg-[#0C1225]',
      icon: <Activity className="w-3.5 h-3.5 text-emerald-300" />,
      ringColor: 'border-emerald-500/40 bg-emerald-500/10',
    },
    processing: {
      eyeColor: 'bg-emerald-300',
      beaconColor: 'bg-emerald-400',
      beaconPulse: true,
      bodyExtra: 'animate-mascot-processing',
      visorBg: 'bg-[#0C1225]',
      icon: <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-spin" style={{ animationDuration: '2s' }} />,
      ringColor: 'border-emerald-500/40 bg-emerald-500/10',
    },
    speaking: {
      eyeColor: 'bg-emerald-300',
      beaconColor: 'bg-emerald-400',
      beaconPulse: false,
      bodyExtra: '',
      visorBg: 'bg-[#0C1225]',
      icon: <Activity className="w-3.5 h-3.5 text-emerald-300" />,
      ringColor: 'border-emerald-500/40 bg-emerald-500/10',
    },
    attention: {
      eyeColor: 'bg-amber-400',
      beaconColor: 'bg-amber-400',
      beaconPulse: true,
      bodyExtra: '',
      visorBg: 'bg-[#1A1508]',
      icon: <Bell className="w-3.5 h-3.5 text-amber-300" />,
      ringColor: 'border-amber-500/40 bg-amber-500/10',
    },
    urgent: {
      eyeColor: 'bg-red-400',
      beaconColor: 'bg-red-500',
      beaconPulse: true,
      bodyExtra: 'animate-mascot-urgent',
      visorBg: 'bg-[#1A0808]',
      icon: <Activity className="w-3.5 h-3.5 text-red-300" />,
      ringColor: 'border-red-500/40 bg-red-500/10',
    },
    success: {
      eyeColor: 'bg-emerald-300',
      beaconColor: 'bg-emerald-400',
      beaconPulse: false,
      bodyExtra: 'animate-mascot-success',
      visorBg: 'bg-[#0C1225]',
      icon: <Check className="w-3.5 h-3.5 text-emerald-300" />,
      ringColor: 'border-emerald-500/40 bg-emerald-500/10',
    },
    scheduling: {
      eyeColor: 'bg-blue-400',
      beaconColor: 'bg-blue-400',
      beaconPulse: true,
      bodyExtra: '',
      visorBg: 'bg-[#08101A]',
      icon: <Brain className="w-3.5 h-3.5 text-blue-300" />,
      ringColor: 'border-blue-500/40 bg-blue-500/10',
    },
  };

  const state = stateConfig[mascotState];

  // Dynamic positioning style
  const style: React.CSSProperties = position
    ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, bottom: 'auto', right: 'auto', zIndex: 9999 }
    : { zIndex: 9999 };

  return (
    <>
      <div
        ref={mascotRef}
        style={style}
        className={`fixed ${!position ? 'bottom-6 right-6' : ''} z-[9999] flex flex-col items-center justify-center select-none group touch-none transition-opacity duration-150`}
        aria-label="HealthGrid Copilot — Click to open AI assistant"
      >
        {/* Hover Tooltip */}
        <div
          className={`mb-2 px-2.5 py-1 bg-[#0F4C42] text-white text-[11px] font-semibold tracking-wide rounded-md shadow-sm border border-emerald-500/30 transition-all duration-200 pointer-events-none flex items-center gap-1.5 ${
            isHovered && !isDragging ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95'
          }`}
        >
          <Bot className="w-3 h-3 text-emerald-400" />
          <span>HealthGrid Copilot</span>
          <Move className="w-3 h-3 text-emerald-300 ml-0.5 opacity-70" />
        </div>

        {/* Mascot Character */}
        <div className="relative flex flex-col items-center">
          {/* Remove Button */}
          <button
            type="button"
            onClick={handleRemove}
            title="Remove Copilot"
            aria-label="Remove Copilot"
            className={`absolute -top-1 -right-1 z-30 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center border border-white shadow transition-all duration-200 cursor-pointer ${
              isHovered && !isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
            }`}
          >
            <X className="w-3 h-3 stroke-[3]" />
          </button>

          {/* Insight count badge */}
          {insightCount > 0 && !isPanelOpen && (
            <div className="absolute -top-1 -left-1 z-30 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center border border-white shadow text-[9px] font-bold">
              {insightCount > 9 ? '9+' : insightCount}
            </div>
          )}

          {/* Panel-open indicator ring */}
          {isPanelOpen && (
            <div className="absolute -inset-2 rounded-full border-2 border-[#0F4C42]/30 bg-[#0F4C42]/5 pointer-events-none" />
          )}

          {/* Hover/state pulse ring */}
          <div
            className={`absolute -inset-1.5 rounded-full border ${state.ringColor} pointer-events-none transition-opacity duration-300 ${
              (isHovered && !isDragging) || mascotState !== 'idle' ? 'opacity-100 animate-mascot-ring' : 'opacity-0'
            }`}
          />

          {/* Main Body */}
          <div
            role="button"
            tabIndex={0}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative w-18 h-18 sm:w-20 sm:h-20 bg-[#0F4C42] rounded-full border-2 border-white shadow-lg flex flex-col items-center justify-center transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              isDragging
                ? 'cursor-grabbing scale-105 shadow-2xl ring-2 ring-emerald-400'
                : 'cursor-pointer'
            } ${
              isPanelOpen
                ? 'scale-105 -translate-y-1 ring-2 ring-[#0F4C42]/30'
                : isHovered && !isDragging
                ? 'scale-105 -translate-y-1'
                : !isDragging
                ? 'animate-mascot-float'
                : ''
            } ${state.bodyExtra}`}
          >
            {/* Top Beacon */}
            <div className={`absolute -top-1 w-3.5 h-3.5 ${state.beaconColor} rounded-full border-2 border-[#0F4C42] flex items-center justify-center`}>
              <div className={`w-1.5 h-1.5 bg-white rounded-full ${state.beaconPulse ? 'animate-pulse' : ''}`} />
            </div>

            {/* Visor */}
            <div className={`w-12 h-7 ${state.visorBg} rounded-full border border-emerald-500/30 flex items-center justify-center gap-2 px-2 transition-all duration-300`}>
              {mascotState === 'processing' ? (
                // Processing: shimmer dots
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-copilot-dot-1" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-copilot-dot-2" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-copilot-dot-3" />
                </div>
              ) : mascotState === 'speaking' ? (
                // Speaking: oscillating eyes
                <>
                  <div className={`${state.eyeColor} rounded-full transition-all duration-150 w-2.5 animate-mascot-speaking-eye`} />
                  <div className={`${state.eyeColor} rounded-full transition-all duration-150 w-2.5 animate-mascot-speaking-eye`} style={{ animationDelay: '0.15s' }} />
                </>
              ) : (
                // Default: normal eyes with blink
                <>
                  <div className={`${state.eyeColor} rounded-full transition-all duration-150 ${
                    isBlinking ? 'w-2.5 h-0.5' : isHovered ? 'w-2.5 h-3' : 'w-2.5 h-2.5'
                  }`} />
                  <div className={`${state.eyeColor} rounded-full transition-all duration-150 ${
                    isBlinking ? 'w-2.5 h-0.5' : isHovered ? 'w-2.5 h-3' : 'w-2.5 h-2.5'
                  }`} />
                </>
              )}
            </div>

            {/* Chest Emblem */}
            <div className="mt-1 flex items-center justify-center">
              {state.icon}
            </div>
          </div>

          {/* Shadow */}
          <div
            className={`mt-2 w-12 h-2 bg-[#0F4C42] rounded-full blur-[1px] transition-all duration-200 ${
              isDragging
                ? 'scale-50 opacity-20 translate-y-2'
                : isPanelOpen
                ? 'scale-75 opacity-10'
                : 'animate-mascot-shadow'
            }`}
          />
        </div>
      </div>

      {/* Copilot Chat Panel */}
      <CopilotPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onMascotStateChange={handleMascotStateChange}
      />

      {/* Proactive Notifications */}
      <CopilotNotifications
        onMascotStateChange={handleMascotStateChange}
        onInsightCountChange={setInsightCount}
        isPanelOpen={isPanelOpen}
      />
    </>
  );
}
