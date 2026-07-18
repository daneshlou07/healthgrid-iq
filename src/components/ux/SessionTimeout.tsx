import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock } from 'lucide-react';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_MS = 5 * 60 * 1000; // Show warning 5 min before

export default function SessionTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => { lastActivityRef.current = Date.now(); setShowWarning(false); };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        logout();
        setShowWarning(false);
      } else if (remaining <= WARNING_MS) {
        setShowWarning(true);
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearInterval(interval);
    };
  }, [isAuthenticated, logout]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80 bg-amber-50 border border-amber-300 rounded-xl shadow-elevated p-4 animate-slideIn">
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Session Expiring</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Your session will expire in <span className="font-bold">{minutes}:{String(seconds).padStart(2, '0')}</span> due to inactivity.
          </p>
          <p className="text-[10px] text-amber-600 mt-1">Move your mouse or press any key to stay signed in.</p>
        </div>
      </div>
    </div>
  );
}
