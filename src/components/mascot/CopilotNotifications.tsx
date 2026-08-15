import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, X, AlertTriangle, Info, Bell } from 'lucide-react';
import {
  getProactiveInsights,
  type ProactiveInsight,
  type CopilotContext,
  type MascotState,
} from '../../services/copilotService';

interface CopilotNotificationsProps {
  onMascotStateChange: (state: MascotState) => void;
  onInsightCountChange: (count: number) => void;
  isPanelOpen: boolean;
}

export default function CopilotNotifications({
  onMascotStateChange,
  onInsightCountChange,
  isPanelOpen,
}: CopilotNotificationsProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { cases, users, clinics, equipment, reports, patientRequests } = useData();

  const [activeInsight, setActiveInsight] = useState<ProactiveInsight | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [lastShownAt, setLastShownAt] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildContext = useCallback((): CopilotContext => ({
    cases,
    users,
    clinics,
    equipment,
    reports,
    patientRequests,
    currentUserRole: currentUser?.role,
    currentUserName: currentUser?.name,
  }), [cases, users, clinics, equipment, reports, patientRequests, currentUser]);

  // Poll for proactive insights
  useEffect(() => {
    const checkInsights = () => {
      if (isPanelOpen || activeInsight) return; // Don't show while panel is open or another insight is active

      const ctx = buildContext();
      const insights = getProactiveInsights(ctx);
      const now = Date.now();

      // Filter out dismissed and rate-limited insights
      const eligible = insights.filter(insight => {
        if (dismissedIds.has(insight.id)) return false;
        const lastShown = lastShownAt[insight.id] || 0;
        if (now - lastShown < 5 * 60 * 1000) return false; // 5 min cooldown
        return true;
      });

      // Update insight count for badge
      onInsightCountChange(eligible.length);

      // Show the most severe one
      const urgent = eligible.find(i => i.severity === 'urgent');
      const warning = eligible.find(i => i.severity === 'warning');
      const toShow = urgent || warning || eligible[0];

      if (toShow) {
        setActiveInsight(toShow);
        setLastShownAt(prev => ({ ...prev, [toShow.id]: now }));

        // Set mascot state based on severity
        if (toShow.severity === 'urgent') {
          onMascotStateChange('urgent');
        } else if (toShow.severity === 'warning') {
          onMascotStateChange('attention');
        }

        // Auto-dismiss after 15 seconds
        autoDismissRef.current = setTimeout(() => {
          setActiveInsight(null);
          onMascotStateChange('idle');
        }, 15000);
      }
    };

    // Initial check after 8 seconds (let the user settle in)
    timerRef.current = setTimeout(() => {
      checkInsights();
      // Then poll every 60 seconds
      timerRef.current = setInterval(checkInsights, 60000) as unknown as ReturnType<typeof setTimeout>;
    }, 8000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current as unknown as number);
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [isPanelOpen, activeInsight, dismissedIds, buildContext]);

  const handleDismiss = () => {
    if (activeInsight) {
      setDismissedIds(prev => new Set(prev).add(activeInsight.id));
    }
    setActiveInsight(null);
    onMascotStateChange('idle');
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
  };

  const handleAction = () => {
    if (activeInsight?.action.route) {
      navigate(activeInsight.action.route);
    }
    handleDismiss();
  };

  if (!activeInsight || isPanelOpen) return null;

  const severityStyles = {
    urgent: {
      border: 'border-red-300',
      bg: 'bg-red-50',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
      accent: 'text-red-800',
    },
    warning: {
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      icon: <Bell className="w-3.5 h-3.5 text-amber-600" />,
      accent: 'text-amber-800',
    },
    info: {
      border: 'border-[#C0D3CD]',
      bg: 'bg-[#EDF4F2]',
      icon: <Info className="w-3.5 h-3.5 text-[#0F4C42]" />,
      accent: 'text-[#0F4C42]',
    },
  };

  const style = severityStyles[activeInsight.severity];

  return (
    <div
      className={`fixed bottom-28 right-6 z-[9997] w-[320px] ${style.bg} border ${style.border} rounded-xl shadow-elevated animate-insight-slide-in overflow-hidden`}
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      <div className="px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex-shrink-0 mt-0.5">
            {style.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${style.accent} leading-snug`}>
              {activeInsight.text}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleAction}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#D8E5E1] rounded-lg text-[10px] font-semibold text-[#0F4C42] hover:bg-[#F8FAF9] transition-colors"
              >
                {activeInsight.action.label}
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={handleDismiss}
                className="text-[10px] text-[#9BA5B7] hover:text-[#4A5568] transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5 text-[#9BA5B7]" />
          </button>
        </div>
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 bg-white/50">
        <div className={`h-full bg-[#0F4C42]/20 animate-insight-progress`} />
      </div>
    </div>
  );
}
