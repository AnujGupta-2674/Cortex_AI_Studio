import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSelectedAgent,
  setSelectedAgent,
  selectAgents,
} from '../redux/slices/agentSlice.js';
import { toggleArtifact, selectArtifactIsOpen } from '../redux/slices/artifactSlice.js';
import { selectCurrentUser } from '../redux/slices/authSlice.js';

export const ChatInput = ({ onSend, isSending, onOpenTopup }) => {
  const dispatch = useDispatch();
  const [prompt, setPrompt] = useState('');
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const textareaRef = useRef(null);
  const agentDropdownRef = useRef(null);

  const selectedAgent = useSelector(selectSelectedAgent);
  const agents = useSelector(selectAgents);
  const isArtifactOpen = useSelector(selectArtifactIsOpen);
  const user = useSelector(selectCurrentUser);

  const currentAgent = agents.find((a) => a.id === selectedAgent) || agents[0];
  const currentAgentCost = currentAgent.credits || (currentAgent.id === 'ppt' ? 5 : currentAgent.id === 'pdf' || currentAgent.id === 'vision' ? 3 : currentAgent.id === 'coding' || currentAgent.id === 'search' ? 2 : 1);
  const userCredits = user?.credits ?? 0;
  const hasEnoughCredits = userCredits >= currentAgentCost;
  const isOutOfAllCredits = userCredits <= 0;

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  // Close agent dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target)) {
        setAgentMenuOpen(false);
      }
    };
    if (agentMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [agentMenuOpen]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!hasEnoughCredits) return;
    if (!prompt.trim() || isSending) return;
    onSend(prompt, selectedAgent);
    setPrompt('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!hasEnoughCredits) return;
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Floating Warning Paywall Banner when user is low on credits */}
      {!hasEnoughCredits && (
        <div className="mb-2 p-2.5 rounded-2xl bg-purple-950/80 border border-purple-500/40 backdrop-blur-xl flex items-center justify-between gap-3 text-xs text-purple-200 shadow-xl shadow-black/60 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0 animate-bounce">⚡</span>
            <span className="truncate">
              {isOutOfAllCredits
                ? "You have 0 credits remaining. Top up to unlock AI generation."
                : `${currentAgent.name} requires ${currentAgentCost} credits, but you only have ${userCredits}. Top up or switch agent.`}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenTopup}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30 cursor-pointer shrink-0 active:scale-95"
          >
            Top Up Credits &rarr;
          </button>
        </div>
      )}

      {/* Floating Input Card Container */}
      <div
        className={`relative rounded-2xl border backdrop-blur-2xl p-3 shadow-2xl shadow-black/80 transition-all duration-200 ${
          !hasEnoughCredits
            ? 'bg-purple-950/15 border-purple-500/30'
            : 'bg-white/[0.035] hover:bg-white/[0.045] focus-within:bg-white/[0.05] border-white/[0.1] focus-within:border-purple-500/50'
        }`}
      >
        
        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={prompt}
          disabled={!hasEnoughCredits}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !hasEnoughCredits
              ? isOutOfAllCredits
                ? "⚡ You have 0 credits remaining. Top up to continue chatting..."
                : `⚡ ${currentAgent.name} requires ${currentAgentCost} credits (you have ${userCredits}). Top up or switch to a cheaper agent below...`
              : "Ask Cortex AI to write code, build interactive widgets, search the web..."
          }
          rows={1}
          className={`w-full bg-transparent text-sm outline-none resize-none leading-relaxed max-h-44 min-h-[44px] py-1 px-1 ${
            !hasEnoughCredits
              ? 'text-purple-300 placeholder-purple-400/60 cursor-not-allowed'
              : 'text-slate-100 placeholder-slate-500 selection:bg-purple-500 selection:text-white'
          }`}
        />

        {/* Bottom Toolbar & Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] mt-1 gap-2">
          
          {/* Left toolbar: Agent Dropdown Selector & Artifact Quick Toggle */}
          <div className="flex items-center gap-2 relative">
            {/* Agent Selector Dropdown Button */}
            <div className="relative" ref={agentDropdownRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAgentMenuOpen((prev) => !prev);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-purple-300 transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>{currentAgent.name}</span>
                <span className="text-[10px] text-purple-400/90 font-mono bg-purple-500/10 px-1 py-0.2 rounded">
                  {currentAgent.credits || (currentAgent.id === 'ppt' ? 5 : currentAgent.id === 'pdf' || currentAgent.id === 'vision' ? 3 : currentAgent.id === 'coding' || currentAgent.id === 'search' ? 2 : 1)} cr
                </span>
                <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Agent Menu Dropdown */}
              {agentMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 mb-2 w-72 rounded-xl bg-[#0c0f18] border border-white/[0.1] shadow-2xl p-1.5 z-50 backdrop-blur-2xl space-y-0.5 animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center justify-between">
                    <span>Select Specialist Agent</span>
                    <span>Cost</span>
                  </div>
                  {agents.map((ag) => {
                    const cost = ag.credits || (ag.id === 'ppt' ? 5 : ag.id === 'pdf' || ag.id === 'vision' ? 3 : ag.id === 'coding' || ag.id === 'search' ? 2 : 1);
                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(setSelectedAgent(ag.id));
                          setAgentMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex flex-col transition-colors cursor-pointer ${
                          selectedAgent === ag.id
                            ? 'bg-purple-500/20 text-white font-medium'
                            : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{ag.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                              {cost} {cost === 1 ? 'credit' : 'credits'}
                            </span>
                            {selectedAgent === ag.id && (
                              <span className="text-purple-400 text-xs">✓</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate mt-0.5">{ag.description}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Artifact Preview Panel Toggle */}
            <button
              type="button"
              onClick={() => dispatch(toggleArtifact())}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isArtifactOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border-white/[0.08]'
              }`}
              title="Toggle Live Artifact Preview Panel"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span>Artifact</span>
            </button>
          </div>

          {/* Right Toolbar: Send Button & Quick Hints */}
          <div className="flex items-center gap-2">
            {hasEnoughCredits && (
              <span className="hidden sm:inline text-[11px] text-slate-500 font-mono">
                Press ↵ to send
              </span>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isSending || !hasEnoughCredits}
              className="h-8 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 disabled:opacity-40 disabled:hover:from-purple-600 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all duration-200 shadow-md shadow-purple-600/25 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <p className="mt-2 text-center text-[11px] text-slate-500">
        Cortex Multi-Agent Studio &bull; Groq &amp; Gemini LLMs &bull; Live Code Artifact Sandbox
      </p>
    </div>
  );
};

export default ChatInput;
