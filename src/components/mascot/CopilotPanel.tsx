import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Send,
  Sparkles,
  Bot,
  MessageCircle,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import {
  generateCopilotResponse,
  generateMessageId,
  SUGGESTED_PROMPTS,
  type CopilotMessage,
  type CopilotContext,
  type MascotState,
} from '../../services/copilotService';

interface CopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMascotStateChange: (state: MascotState) => void;
}

export default function CopilotPanel({ isOpen, onClose, onMascotStateChange }: CopilotPanelProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { cases, users, clinics, equipment, reports, patientRequests } = useData();

  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build context snapshot from live data
  const buildContext = (): CopilotContext => ({
    cases,
    users,
    clinics,
    equipment,
    reports,
    patientRequests,
    currentUserRole: currentUser?.role,
    currentUserName: currentUser?.name,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getTimeGreeting();
      const name = currentUser?.name?.split(' ')[0] || '';
      setMessages([{
        id: generateMessageId(),
        role: 'copilot',
        text: `${greeting}${name ? ', ' + name : ''}! I'm your HealthGrid Copilot.\n\nI can help you navigate the system, check case statuses, understand scheduling decisions, and monitor department activity. What would you like to know?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [isOpen]);

  const handleSend = (text?: string) => {
    const query = (text || inputValue).trim();
    if (!query || isProcessing) return;

    // Add user message
    const userMsg: CopilotMessage = {
      id: generateMessageId(),
      role: 'user',
      text: query,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);
    onMascotStateChange('processing');

    // Simulate slight processing delay for natural feel
    const delay = 400 + Math.random() * 800;
    setTimeout(() => {
      const ctx = buildContext();
      const response = generateCopilotResponse(query, ctx);

      const copilotMsg: CopilotMessage = {
        id: generateMessageId(),
        role: 'copilot',
        text: response.text,
        actions: response.actions,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, copilotMsg]);
      setIsProcessing(false);

      if (response.mascotState) {
        onMascotStateChange(response.mascotState);
        // Return to idle after a few seconds
        setTimeout(() => onMascotStateChange('idle'), 4000);
      } else {
        onMascotStateChange('idle');
      }
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAction = (action: { route?: string; onClick?: () => void }) => {
    if (action.route) {
      navigate(action.route);
      onClose();
    }
    if (action.onClick) {
      action.onClick();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-28 right-6 z-[9998] w-[380px] max-h-[520px] bg-[#FAFCFB] border border-[#D8E5E1] rounded-xl shadow-elevated flex flex-col animate-copilot-slide-in overflow-hidden"
      style={{ maxWidth: 'calc(100vw - 32px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D8E5E1] bg-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0F4C42] rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0F4C42] leading-tight">HealthGrid Copilot</h3>
            <p className="text-[10px] text-[#3B665E] leading-tight">Your AI Radiology Workflow Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[#EDF4F2] transition-colors text-[#3B665E]"
          aria-label="Close Copilot"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'copilot' && (
              <div className="w-6 h-6 bg-[#0F4C42] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-emerald-300" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
              <div
                className={`px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#0F4C42] text-white rounded-br-sm'
                    : 'bg-white border border-[#D8E5E1] text-[#112A28] rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
              {/* Action buttons */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {msg.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleAction(action)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#C0D3CD] rounded-lg text-[10px] font-semibold text-[#0F4C42] hover:bg-[#EDF4F2] hover:border-[#0F4C42]/30 transition-colors"
                    >
                      {action.label}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex gap-2">
            <div className="w-6 h-6 bg-[#0F4C42] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-emerald-300" />
            </div>
            <div className="px-3 py-2 rounded-xl rounded-bl-sm bg-white border border-[#D8E5E1]">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-[#3B665E] rounded-full animate-copilot-dot-1" />
                <span className="w-1.5 h-1.5 bg-[#3B665E] rounded-full animate-copilot-dot-2" />
                <span className="w-1.5 h-1.5 bg-[#3B665E] rounded-full animate-copilot-dot-3" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts — only show when < 3 messages */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-[#D8E5E1] bg-white flex-shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#3B665E]" />
            <span className="text-[10px] font-semibold text-[#3B665E] uppercase tracking-wider">Suggested</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 bg-[#EDF4F2] border border-[#D8E5E1] rounded-lg text-[10px] text-[#2C524B] hover:bg-[#D8E5E1] hover:border-[#C0D3CD] transition-colors text-left leading-snug"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-3 py-2.5 border-t border-[#D8E5E1] bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask HealthGrid Copilot..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 bg-[#F8FAF9] border border-[#D8E5E1] rounded-lg text-xs text-[#112A28] placeholder-[#9BA5B7] focus:outline-none focus:ring-1 focus:ring-[#0F4C42]/30 focus:border-[#C0D3CD] transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isProcessing}
            className="p-2 bg-[#0F4C42] hover:bg-[#0B3931] text-white rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-[#0F4C42] flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[9px] text-[#9BA5B7] flex items-center gap-1">
            <CornerDownLeft className="w-2.5 h-2.5" />
            Enter to send
          </span>
          <span className="text-[9px] text-[#9BA5B7]">
            HealthGrid IQ Copilot
          </span>
        </div>
      </div>
    </div>
  );
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
