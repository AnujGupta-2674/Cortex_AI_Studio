import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectArtifactData,
  closeArtifact,
  setArtifactMode,
  setViewMode,
  updateCode,
} from '../redux/slices/artifactSlice.js';
import { buildPreviewHtml } from '../utils/codeParser.js';

export const ArtifactPanel = () => {
  const dispatch = useDispatch();
  const { isOpen, title, language, code, mode, viewMode } = useSelector(selectArtifactData);

  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [isEditable, setIsEditable] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    // Force iframe refresh when code or mode changes
    setIframeKey((prev) => prev + 1);
  }, [code, mode]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshPreview = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenNewTab = () => {
    const html = buildPreviewHtml(code, language);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const previewHtml = buildPreviewHtml(code, language);

  return (
    <aside className="w-full lg:w-[48%] xl:w-[50%] h-full flex flex-col bg-[#090c14] border-l border-white/[0.08] backdrop-blur-2xl z-20 shadow-2xl transition-all duration-300">
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-[#07090e]/90 flex items-center justify-between gap-3">
        {/* Artifact Title and Language */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-white truncate">{title || 'Live Artifact'}</h2>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.1]">
                {language || 'html'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Interactive Code Preview</p>
          </div>
        </div>

        {/* Tab Switcher: [ Preview ] | [ Code ] */}
        <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <button
            onClick={() => dispatch(setArtifactMode('preview'))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              mode === 'preview'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>
          <button
            onClick={() => dispatch(setArtifactMode('code'))}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              mode === 'code'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Code
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {mode === 'preview' && (
            <button
              onClick={handleRefreshPreview}
              title="Refresh Preview"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors relative"
          >
            {copied ? (
              <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>

          <button
            onClick={handleOpenNewTab}
            title="Open in new window"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>

          <button
            onClick={() => dispatch(closeArtifact())}
            title="Close Preview Panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sub-header Toolbar (Viewport Switcher for preview or Edit toggle for code) */}
      <div className="px-4 py-2 border-b border-white/[0.04] bg-[#07090e]/60 flex items-center justify-between text-xs text-slate-400">
        {mode === 'preview' ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Viewport:</span>
            <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.06]">
              <button
                onClick={() => dispatch(setViewMode('desktop'))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === 'desktop' ? 'bg-white/10 text-white' : 'hover:text-slate-200'
                }`}
              >
                Desktop (100%)
              </button>
              <button
                onClick={() => dispatch(setViewMode('tablet'))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === 'tablet' ? 'bg-white/10 text-white' : 'hover:text-slate-200'
                }`}
              >
                Tablet (768px)
              </button>
              <button
                onClick={() => dispatch(setViewMode('mobile'))}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === 'mobile' ? 'bg-white/10 text-white' : 'hover:text-slate-200'
                }`}
              >
                Mobile (375px)
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditable(!isEditable)}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                isEditable
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              {isEditable ? 'Editing Mode' : 'Read Only'}
            </button>
            <span className="text-[11px] text-slate-500 font-mono">
              {code.split('\n').length} lines &bull; {code.length} chars
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Live Sandboxed</span>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 relative overflow-hidden bg-[#06080e]">
        {mode === 'preview' ? (
          <div className="w-full h-full flex items-center justify-center p-3 overflow-auto bg-[#07090e]">
            <div
              className={`h-full transition-all duration-300 shadow-2xl bg-[#090d16] overflow-hidden flex flex-col ${
                viewMode === 'desktop'
                  ? 'w-full rounded-xl border border-white/[0.08]'
                  : viewMode === 'tablet'
                  ? 'w-[768px] max-w-full rounded-2xl border-4 border-slate-700 shadow-purple-500/10'
                  : 'w-[375px] max-w-full rounded-[36px] border-8 border-slate-800 shadow-purple-500/15'
              }`}
            >
              {/* Mock device notch for mobile */}
              {viewMode === 'mobile' && (
                <div className="w-full h-5 bg-slate-800 flex justify-center items-center">
                  <div className="w-20 h-3 bg-black rounded-b-lg" />
                </div>
              )}

              <iframe
                key={iframeKey}
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Cortex Artifact Preview"
                sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                className="w-full flex-1 border-0 bg-[#090d16]"
              />
            </div>
          </div>
        ) : (
          /* Code View / Editor */
          <div className="w-full h-full overflow-auto p-4 font-mono text-xs bg-[#07090e] text-slate-200">
            {isEditable ? (
              <textarea
                value={code}
                onChange={(e) => dispatch(updateCode(e.target.value))}
                className="w-full h-full bg-transparent text-slate-200 font-mono text-xs outline-none resize-none selection:bg-purple-500/30"
                spellCheck={false}
              />
            ) : (
              <div className="table w-full">
                {code.split('\n').map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-white/[0.02]">
                    <div className="table-cell pr-4 text-right select-none text-slate-600 font-mono text-[11px] w-10">
                      {idx + 1}
                    </div>
                    <div className="table-cell whitespace-pre font-mono text-slate-200 selection:bg-purple-500/30">
                      {line || ' '}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default ArtifactPanel;
