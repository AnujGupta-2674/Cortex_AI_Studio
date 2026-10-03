import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

// Redux Selectors and Actions
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectIsCheckingAuth,
} from '../redux/slices/authSlice.js';
import {
  selectConversations,
  selectActiveConversationId,
  selectActiveConversation,
  selectMessages,
  selectLoadingMessages,
  selectIsSending,
  selectChatError,
  fetchConversations,
  fetchMessages,
  sendAgentPrompt,
  addOptimisticUserMessage,
  startNewChat,
} from '../redux/slices/chatSlice.js';
import {
  fetchAvailableAgents,
  selectSelectedAgent,
  setSelectedAgent,
} from '../redux/slices/agentSlice.js';
import {
  openArtifact,
  selectArtifactIsOpen,
  toggleArtifact,
} from '../redux/slices/artifactSlice.js';

// Components
import Sidebar from '../components/Sidebar.jsx';
import ArtifactPanel from '../components/ArtifactPanel.jsx';
import ChatMessage from '../components/ChatMessage.jsx';
import HeroHome from '../components/HeroHome.jsx';
import ChatInput from '../components/ChatInput.jsx';
import { extractCodeBlocks } from '../utils/codeParser.js';

export const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Auth State
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isCheckingAuth = useSelector(selectIsCheckingAuth);

  // Chat State
  const activeConversationId = useSelector(selectActiveConversationId);
  const activeConversation = useSelector(selectActiveConversation);
  const messages = useSelector(selectMessages);
  const loadingMessages = useSelector(selectLoadingMessages);
  const isSending = useSelector(selectIsSending);
  const chatError = useSelector(selectChatError);

  // Agent & Artifact State
  const selectedAgent = useSelector(selectSelectedAgent);
  const isArtifactOpen = useSelector(selectArtifactIsOpen);

  // UI Local State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const chatContainerRef = useRef(null);

  // Scoped Auto-Scroll strictly within chat container (prevents window jumping)
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      });
    }
  }, []);

  // Detect if user has scrolled up to pause auto-scroll during streaming
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    setIsUserScrolledUp(distanceFromBottom > 160);
  };

  // Called on each word streamed from assistant
  const handleStreamTick = useCallback(() => {
    if (!isUserScrolledUp) {
      scrollToBottom(false);
    }
  }, [isUserScrolledUp, scrollToBottom]);

  // Scroll to bottom when new messages arrive or when sending starts
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, isSending, scrollToBottom]);

  // Initial Data Hydration (conversations & available agents)
  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchAvailableAgents());
  }, [dispatch]);

  // Handle Prompt Submission
  const handleSendPrompt = async (promptText, agentChoice) => {
    if (!promptText.trim()) return;

    // Reset scrolled-up lock
    setIsUserScrolledUp(false);

    // 1. Optimistic message update
    dispatch(addOptimisticUserMessage({ content: promptText }));
    setTimeout(() => scrollToBottom(true), 50);

    // 2. Dispatch Agent execution thunk
    try {
      const resultAction = await dispatch(
        sendAgentPrompt({
          prompt: promptText,
          agent: agentChoice || selectedAgent,
          conversationId: activeConversationId || undefined,
        })
      );

      if (sendAgentPrompt.fulfilled.match(resultAction)) {
        const payload = resultAction.payload;
        const responseText = payload?.response;

        // Auto-detect code blocks to pop up the Artifact Preview if code is returned
        if (responseText) {
          const blocks = extractCodeBlocks(responseText);
          const previewableBlock = blocks.find((b) => b.isPreviewable) || blocks[0];
          if (previewableBlock) {
            dispatch(
              openArtifact({
                title: previewableBlock.title || 'Generated Component',
                language: previewableBlock.language || 'html',
                code: previewableBlock.code,
                mode: 'preview',
              })
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to run agent:', err);
    }
  };

  const handleStarterPrompt = (promptText, agentType) => {
    if (agentType) {
      dispatch(setSelectedAgent(agentType));
    }
    handleSendPrompt(promptText, agentType);
  };

  return (
    <div className="relative h-screen w-screen flex bg-[#07090e] text-slate-100 overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-cyan-600/15 via-blue-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-purple-900/5 blur-[160px] pointer-events-none" />

      {/* Grid Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* 1. Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 2. Main Chat Workspace Column */}
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 relative overflow-hidden z-10">
        
        {/* Top Header Bar (Permanently pinned) */}
        <header className="h-14 min-h-[56px] px-4 border-b border-white/[0.07] bg-[#07090e]/85 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05]"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Conversation Title & Agent Tag */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-white truncate max-w-xs md:max-w-md">
                {activeConversation?.title || 'New Workspace Session'}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {selectedAgent.toUpperCase()} AGENT
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* New Chat shortcut button */}
            <button
              onClick={() => dispatch(startNewChat())}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New</span>
            </button>

            {/* Artifact Code Preview Panel Toggle */}
            <button
              onClick={() => dispatch(toggleArtifact())}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                isArtifactOpen
                  ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/30 text-white border-purple-500/40 shadow-sm'
                  : 'bg-white/[0.04] text-slate-300 hover:text-white border-white/[0.08]'
              }`}
              title="Toggle Live Artifact Code Preview"
            >
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <span className="hidden md:inline">Artifact Preview</span>
            </button>

            {/* Auth status link */}
            {!isAuthenticated && !isCheckingAuth && (
              <button
                onClick={() => navigate('/login')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Chat Scroll Area (with pb-44 padding so last message is never obscured) */}
        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pt-6 pb-44 scrollbar-thin scrollbar-thumb-white/10 relative"
        >
          {/* Error Banner */}
          {chatError && (
            <div className="max-w-3xl mx-auto mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between">
              <span>{chatError}</span>
            </div>
          )}

          {/* If no messages in active conversation, show Gemini-style Hero */}
          {messages.length === 0 && !loadingMessages ? (
            <HeroHome user={user} onSelectPrompt={handleStarterPrompt} />
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              {loadingMessages ? (
                <div className="py-20 text-center text-xs text-slate-500 space-y-3">
                  <div className="w-6 h-6 mx-auto border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading conversation history...</span>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg._id || idx}
                    message={msg}
                    user={user}
                    onStreamTick={handleStreamTick}
                  />
                ))
              )}

              {/* Streaming / Agent Thinking State Indicator */}
              {isSending && (
                <div className="flex justify-start mb-6 animate-in fade-in">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 p-[1px]">
                      <div className="h-full w-full bg-[#0b0e14] rounded-[7px] flex items-center justify-center">
                        <div className="w-2.5 h-2.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-purple-300">
                      <span>Multi-Agent LangGraph thinking...</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating "Scroll to Latest" indicator button */}
        {isUserScrolledUp && (
          <button
            onClick={() => {
              setIsUserScrolledUp(false);
              scrollToBottom(true);
            }}
            className="absolute bottom-36 right-8 z-30 px-3.5 py-2 rounded-full bg-[#121624]/90 hover:bg-purple-600/90 text-white shadow-xl shadow-black/80 border border-purple-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md flex items-center gap-1.5 text-xs animate-in fade-in"
            title="Scroll to latest messages"
          >
            <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span>Latest</span>
          </button>
        )}

        {/* Bottom Floating Prompt Bar Dock with smooth gradient backdrop */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-20 bg-gradient-to-t from-[#07090e] via-[#07090e]/95 to-transparent pt-8 pb-3 px-4 md:px-6">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <ChatInput onSend={handleSendPrompt} isSending={isSending} />
          </div>
        </div>
      </div>

      {/* 3. Rightmost Artifact & Code Preview Panel */}
      <ArtifactPanel />
    </div>
  );
};

export default Home;
