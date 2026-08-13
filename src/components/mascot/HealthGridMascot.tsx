import React, { useState, useEffect, useRef } from 'react';
import { Activity, Sparkles, Move, X } from 'lucide-react';

/**
 * HealthGridMascot
 * 
 * Visual-only prototype of the HealthGrid IQ AI desktop-pet mascot.
 * 
 * Features & Capabilities:
 * - Unrestricted Dragging: Can move anywhere on screen and slide off the edges of the website/viewport.
 * - Leaves a subtle 20px edge handle so the user can easily pull it back in.
 * - High z-index layer (z-[9999]) ensuring it floats over all layout elements, sidebars, and modals.
 * - Dismissable / Closeable with a quick-remove 'X' badge.
 * - Re-enableable via Header toggle button or custom window event ('healthgrid:mascot-visibility').
 * - State persistence in localStorage ('healthgrid_mascot_visible').
 * - Solid color visual language: dark teal (#0F4C42), emerald (#10B981), clean white, and dark slate.
 * - Strictly NO gradients and NO raw emojis (Lucide icons & SVG graphics only).
 * - Idle levitation float, shadow depth effect, and periodic eye blink.
 */
export default function HealthGridMascot() {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    return localStorage.getItem('healthgrid_mascot_visible') !== 'false';
  });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Position state (null = default CSS bottom-right positioning)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for tracking drag offsets and click distance
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
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

  // Recalculate screen boundary on window resize with off-edge tolerance
  useEffect(() => {
    const handleResize = () => {
      if (position && mascotRef.current) {
        const mascotWidth = 80;
        const mascotHeight = 90;
        const minX = -mascotWidth + 24;
        const maxX = window.innerWidth - 24;
        const minY = -mascotHeight + 30;
        const maxY = window.innerHeight - 24;

        setPosition((prev) => prev ? {
          x: Math.max(minX, Math.min(maxX, prev.x)),
          y: Math.max(minY, Math.min(maxY, prev.y)),
        } : null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Periodic eye blinking cycle for natural idle feeling
  useEffect(() => {
    if (!isVisible) return;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
      }, 200);
    }, 4000);

    return () => clearInterval(blinkInterval);
  }, [isVisible]);

  // Dismiss / Remove Mascot
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    localStorage.setItem('healthgrid_mascot_visible', 'false');
    window.dispatchEvent(new CustomEvent('healthgrid:mascot-visibility', { detail: { visible: false } }));
  };

  // Mouse Drag Handlers with off-screen edge permission
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = mascotRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : window.innerWidth - 100;
    const currentY = rect ? rect.top : window.innerHeight - 120;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
    };
    hasDraggedRef.current = false;
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasDraggedRef.current = true;
      }

      const mascotWidth = 80;
      const mascotHeight = 90;
      // Allow moving off-edge so it can exit the site viewport while keeping a 24px handle
      const minX = -mascotWidth + 24;
      const maxX = window.innerWidth - 24;
      const minY = -mascotHeight + 30;
      const maxY = window.innerHeight - 24;

      const newX = Math.max(minX, Math.min(maxX, dragStartRef.current.initialX + deltaX));
      const newY = Math.max(minY, Math.min(maxY, dragStartRef.current.initialY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Touch Drag Handlers for mobile & tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = mascotRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : window.innerWidth - 100;
    const currentY = rect ? rect.top : window.innerHeight - 120;

    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: currentX,
      initialY: currentY,
    };
    hasDraggedRef.current = false;
    setIsDragging(true);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - dragStartRef.current.startX;
      const deltaY = moveTouch.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasDraggedRef.current = true;
      }

      const mascotWidth = 80;
      const mascotHeight = 90;
      const minX = -mascotWidth + 24;
      const maxX = window.innerWidth - 24;
      const minY = -mascotHeight + 30;
      const maxY = window.innerHeight - 24;

      const newX = Math.max(minX, Math.min(maxX, dragStartRef.current.initialX + deltaX));
      const newY = Math.max(minY, Math.min(maxY, dragStartRef.current.initialY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  // Handle click visual reaction (only if not dragging)
  const handleClick = () => {
    if (hasDraggedRef.current) return;
    setIsClicked(true);
    setTimeout(() => {
      setIsClicked(false);
    }, 700);
  };

  if (!isVisible) return null;

  // Dynamic positioning style with max z-index
  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        zIndex: 9999,
      }
    : {
        zIndex: 9999,
      };

  const isOffEdge = position
    ? position.x < 0 || position.x > window.innerWidth - 70 || position.y < 0 || position.y > window.innerHeight - 70
    : false;

  return (
    <div
      ref={mascotRef}
      style={style}
      className={`fixed ${!position ? 'bottom-6 right-6' : ''} z-[9999] flex flex-col items-center justify-center select-none group touch-none transition-opacity duration-150 ${
        isOffEdge ? 'opacity-90 hover:opacity-100' : ''
      }`}
      aria-label="HealthGrid IQ Mascot Visual Prototype (Off-Screen Moveable)"
    >
      {/* Visual Hover Tooltip Badge */}
      <div 
        className={`mb-2 px-2.5 py-1 bg-[#0F4C42] text-white text-[11px] font-semibold tracking-wide rounded-md shadow-sm border border-emerald-500/30 transition-all duration-200 pointer-events-none flex items-center gap-1.5 ${
          isHovered && !isDragging ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95'
        }`}
      >
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span>HealthGrid IQ Mascot</span>
        <Move className="w-3 h-3 text-emerald-300 ml-0.5 opacity-70" />
      </div>

      {/* Mascot Character Wrapper */}
      <div className="relative flex flex-col items-center">

        {/* Remove / Close Button Badge */}
        <button
          type="button"
          onClick={handleRemove}
          title="Remove Mascot"
          aria-label="Remove Mascot"
          className={`absolute -top-1 -right-1 z-30 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center border border-white shadow transition-all duration-200 cursor-pointer ${
            isHovered && !isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
          }`}
        >
          <X className="w-3 h-3 stroke-[3]" />
        </button>

        {/* Pulse Ring Indicator on Hover */}
        <div 
          className={`absolute -inset-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 pointer-events-none transition-opacity duration-300 ${
            isHovered && !isDragging ? 'opacity-100 animate-mascot-ring' : 'opacity-0'
          }`}
        />

        {/* Main Mascot Body */}
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
              : 'cursor-grab'
          } ${
            isClicked
              ? 'scale-110 -translate-y-2'
              : isHovered && !isDragging
              ? 'scale-105 -translate-y-1'
              : !isDragging
              ? 'animate-mascot-float'
              : ''
          }`}
        >
          {/* Top Status Beacon / Sensor */}
          <div className="absolute -top-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0F4C42] flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          </div>

          {/* Visor Screen */}
          <div className="w-12 h-7 bg-[#0C1225] rounded-full border border-emerald-500/30 flex items-center justify-center gap-2 px-2 transition-all duration-150">
            {/* Left Eye */}
            <div 
              className={`bg-emerald-400 rounded-full transition-all duration-150 ${
                isBlinking 
                  ? 'w-2.5 h-0.5' 
                  : isHovered 
                  ? 'w-2.5 h-3 bg-emerald-300' 
                  : 'w-2.5 h-2.5'
              }`} 
            />

            {/* Right Eye */}
            <div 
              className={`bg-emerald-400 rounded-full transition-all duration-150 ${
                isBlinking 
                  ? 'w-2.5 h-0.5' 
                  : isHovered 
                  ? 'w-2.5 h-3 bg-emerald-300' 
                  : 'w-2.5 h-2.5'
              }`} 
            />
          </div>

          {/* Medical Pulse Chest Emblem */}
          <div className="mt-1 flex items-center justify-center text-emerald-300">
            <Activity className={`w-3.5 h-3.5 transition-transform duration-200 ${isClicked ? 'scale-125 text-white' : ''}`} />
          </div>
        </div>

        {/* Floating Shadow Below Character */}
        <div 
          className={`mt-2 w-12 h-2 bg-[#0F4C42] rounded-full blur-[1px] transition-all duration-200 ${
            isDragging
              ? 'scale-50 opacity-20 translate-y-2'
              : isClicked
              ? 'scale-75 opacity-10'
              : 'animate-mascot-shadow'
          }`}
        />
      </div>
    </div>
  );
}
