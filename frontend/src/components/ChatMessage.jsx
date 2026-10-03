import { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { openArtifact } from '../redux/slices/artifactSlice.js';
import { markMessageStreamed } from '../redux/slices/chatSlice.js';
import { parseMarkdownSegments } from '../utils/codeParser.js';

// Pulsing Typewriter Cursor
const StreamingCursor = () => (
  <span
    aria-hidden="true"
    className="inline-block w-2 h-4.5 bg-gradient-to-b from-purple-400 via-indigo-400 to-cyan-400 ml-1 rounded-[2px] align-middle animate-pulse shadow-[0_0_10px_rgba(192,132,252,0.85)]"
  />
);

// Formats inline markdown elements (bold, italic, inline code)
const renderInlineStyles = (str) => {
  if (!str) return '';
  const parts = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 text-purple-200 font-mono text-[12px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-purple-200">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIdx = match.index + token.length;
  }

  if (lastIdx < str.length) {
    parts.push(str.slice(lastIdx));
  }

  return parts.length > 0 ? parts : str;
};

// Formats text block with paragraphs, headers, bullet lists
const FormattedTextBlock = ({ text, isStreaming, isLastSegment }) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-slate-200 text-sm leading-relaxed font-sans">
      {lines.map((line, lIdx) => {
        const isLastLine = lIdx === lines.length - 1;

        // Headings
        if (line.startsWith('### ')) {
          return (
            <h3 key={lIdx} className="text-base font-semibold text-purple-200 mt-3 mb-1">
              {renderInlineStyles(line.slice(4))}
              {isStreaming && isLastSegment && isLastLine && <StreamingCursor />}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={lIdx} className="text-lg font-bold text-white mt-4 mb-2">
              {renderInlineStyles(line.slice(3))}
              {isStreaming && isLastSegment && isLastLine && <StreamingCursor />}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={lIdx} className="text-xl font-bold text-white mt-4 mb-2">
              {renderInlineStyles(line.slice(2))}
              {isStreaming && isLastSegment && isLastLine && <StreamingCursor />}
            </h1>
          );
        }

        // Bullet point (* or -)
        if (/^[\*\-]\s+/.test(line)) {
          const itemText = line.replace(/^[\*\-]\s+/, '');
          return (
            <div key={lIdx} className="flex items-start gap-2.5 ml-2 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0 shadow-sm shadow-purple-500/50" />
              <div className="flex-1">
                {renderInlineStyles(itemText)}
                {isStreaming && isLastSegment && isLastLine && <StreamingCursor />}
              </div>
            </div>
          );
        }

        // Numbered list (1., 2., etc.)
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2.5 ml-2 my-1">
              <span className="text-xs font-mono font-bold text-purple-400 shrink-0 mt-0.5">
                {numMatch[1]}.
              </span>
              <div className="flex-1">
                {renderInlineStyles(numMatch[2])}
                {isStreaming && isLastSegment && isLastLine && <StreamingCursor />}
              </div>
            </div>
          );
        }

        // Empty line
        if (!line.trim()) {
          return <div key={lIdx} className="h-2" />;
        }

        // Standard paragraph line
        return (
          <p key={lIdx} className="whitespace-pre-wrap">
            {renderInlineStyles(line)}
            {isStreaming && isLastSegment && isLastLine && <StreamingCursor />}
          </p>
        );
      })}
    </div>
  );
};

export const ChatMessage = ({ message, user, onStreamTick }) => {
  const dispatch = useDispatch();
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  const isUser = message.role === 'user';
  const shouldStream = !isUser && message.isNew;

  // Split into word & whitespace tokens for natural word-by-word streaming
  const tokens = useMemo(() => {
    if (!message.content) return [];
    return message.content.match(/\S+|\s+/g) || [];
  }, [message.content]);

  // Streaming State
  const [displayedTokenCount, setDisplayedTokenCount] = useState(
    shouldStream ? 0 : tokens.length
  );
  const [isStreaming, setIsStreaming] = useState(shouldStream);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!shouldStream) {
      setDisplayedTokenCount(tokens.length);
      setIsStreaming(false);
      return;
    }

    let currentIndex = 0;
    const total = tokens.length;
    // Dynamically adjust step size based on response length for optimal pacing
    const step = total > 400 ? 3 : total > 150 ? 2 : 1;

    const tick = () => {
      currentIndex = Math.min(currentIndex + step, total);
      setDisplayedTokenCount(currentIndex);

      if (onStreamTick) {
        onStreamTick();
      }

      if (currentIndex >= total) {
        setIsStreaming(false);
        if (message._id) {
          dispatch(markMessageStreamed(message._id));
        }
      } else {
        // Natural conversational pacing: pause slightly on punctuation
        const currentToken = tokens[currentIndex - 1] || '';
        const hasPunctuation = /[.!?\n]$/.test(currentToken.trim());
        const delay = hasPunctuation ? 55 : 22;
        timerRef.current = setTimeout(tick, delay);
      }
    };

    timerRef.current = setTimeout(tick, 25);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message.content, shouldStream, tokens, message._id, dispatch, onStreamTick]);

  const handleSkipStream = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedTokenCount(tokens.length);
    setIsStreaming(false);
    if (message._id) {
      dispatch(markMessageStreamed(message._id));
    }
    if (onStreamTick) {
      onStreamTick();
    }
  };

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(index);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleOpenArtifact = (code, language) => {
    let title = 'Live Component';
    if (language === 'html') title = 'HTML5 Component';
    if (language === 'jsx') title = 'React Component';
    if (language === 'svg') title = 'Vector Graphics';

    dispatch(
      openArtifact({
        title,
        language,
        code,
        mode: 'preview',
      })
    );
  };

  // Slice content for word-by-word typewriter rendering
  const activeContent = shouldStream && isStreaming
    ? tokens.slice(0, displayedTokenCount).join('')
    : (message.content || '');

  const segments = parseMarkdownSegments(activeContent);

  // 1. User Message
  if (isUser) {
    return (
      <div className="flex justify-end mb-6 group animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-start gap-3 max-w-[85%] md:max-w-[75%]">
          <div className="relative">
            <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-600/35 via-indigo-600/30 to-purple-700/25 border border-purple-500/40 p-4 text-slate-100 shadow-xl shadow-purple-950/20 text-sm leading-relaxed backdrop-blur-xl">
              <p className="whitespace-pre-wrap selection:bg-purple-500 selection:text-white font-sans text-slate-100">
                {message.content}
              </p>
            </div>

            {/* Quick meta & copy on hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 right-1 flex items-center gap-2 text-[10px] text-slate-500">
              <span>
                {message.createdAt
                  ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now'}
              </span>
              <button
                onClick={handleCopyMessage}
                className="hover:text-purple-300 transition-colors cursor-pointer"
                title="Copy message"
              >
                {copiedMsg ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.email || 'user'}`}
            alt={user?.name || 'User'}
            className="w-8 h-8 rounded-full border border-purple-500/40 object-cover shrink-0 mt-0.5 shadow-md shadow-purple-950/30"
          />
        </div>
      </div>
    );
  }

  // 2. Assistant Message
  return (
    <div className="flex justify-start mb-8 group animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3.5 max-w-[98%] md:max-w-[92%] w-full">
        {/* Cortex AI Avatar */}
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-500/25 shrink-0 mt-0.5">
          <div className="h-full w-full bg-[#0b0e14] rounded-[11px] flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a8 8 0 0 0-8 8c0 3.37 2.07 6.26 5 7.42V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.58c2.93-1.16 5-4.05 5-7.42a8 8 0 0 0-8-8z" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0">
          {/* Agent Meta Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white tracking-tight">Cortex AI</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                {message.agent ? `${message.agent.toUpperCase()} AGENT` : 'AUTONOMOUS AGENT'}
              </span>
              <span className="text-[10px] text-slate-500">
                {message.createdAt
                  ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
            </div>

            {/* Skip typing animation button if currently streaming */}
            {isStreaming && (
              <button
                onClick={handleSkipStream}
                className="text-[10px] text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-0.5 rounded-lg border border-white/[0.08] transition-colors cursor-pointer flex items-center gap-1"
                title="Skip typewriter animation and display full response"
              >
                <span>Skip</span>
                <span className="text-purple-400">⏭</span>
              </button>
            )}
          </div>

          {/* Formatted Message Card */}
          <div className="rounded-2xl rounded-tl-sm bg-white/[0.025] hover:bg-white/[0.035] border border-white/[0.08] backdrop-blur-xl p-5 text-slate-200 text-sm leading-relaxed shadow-xl space-y-4 transition-all duration-200">
            {segments.map((seg, idx) => {
              const isLastSegment = idx === segments.length - 1;

              if (seg.type === 'text') {
                return (
                  <FormattedTextBlock
                    key={idx}
                    text={seg.content}
                    isStreaming={isStreaming}
                    isLastSegment={isLastSegment}
                  />
                );
              }

              // Code block segment
              const previewableLangs = ['html', 'htm', 'jsx', 'tsx', 'svg', 'javascript', 'js', 'css'];
              const isPreviewable = previewableLangs.includes(seg.language.toLowerCase()) || /<[a-z][\s\S]*>/i.test(seg.content);

              return (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden border border-white/[0.1] bg-[#06080e] shadow-lg my-3"
                >
                  {/* Code Bar Header */}
                  <div className="px-4 py-2 bg-white/[0.04] border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                        {seg.language || 'code'}
                      </span>
                      {seg.isIncomplete && isStreaming && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-purple-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                          Streaming code...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Open in Artifact Button (similar to Claude / v0) */}
                      {isPreviewable && !seg.isIncomplete && (
                        <button
                          onClick={() => handleOpenArtifact(seg.content, seg.language)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-medium shadow-md shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Open in Artifact</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCopyCode(seg.content, idx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        {copiedCodeIdx === idx ? (
                          <>
                            <span className="text-emerald-400">✓</span> Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Code View with blinking cursor if code is streaming */}
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-purple-200/90 bg-[#06080e] leading-relaxed selection:bg-purple-500/40">
                    <code>
                      {seg.content}
                      {isStreaming && isLastSegment && <StreamingCursor />}
                    </code>
                  </pre>
                </div>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 mt-2 px-1 text-xs text-slate-500">
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copiedMsg ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
