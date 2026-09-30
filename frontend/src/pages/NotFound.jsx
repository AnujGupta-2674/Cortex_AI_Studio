import { Link, useNavigate } from 'react-router-dom';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#07090e] text-slate-100 overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-transparent blur-[120px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tl from-cyan-600/20 via-blue-600/15 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-900/5 blur-[150px] pointer-events-none" />

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 w-full max-w-lg px-6 py-10 sm:px-8 text-center">
        {/* Status Badge */}
        <div className="inline-flex items-center justify-center gap-2.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-6 shadow-sm">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-xs font-medium tracking-wider uppercase text-slate-300">
            Error 404 • Signal Lost
          </span>
        </div>

        {/* Card Container */}
        <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/60 transition-all duration-300">
          {/* Big 404 Header */}
          <div className="relative mb-4">
            <span className="text-8xl sm:text-9xl font-extrabold tracking-tighter bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent select-none">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center opacity-10 blur-xl pointer-events-none">
              <span className="text-9xl font-extrabold text-purple-500">404</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Neural Node Not Found
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-8 leading-relaxed">
            The coordinates you requested do not map to an active cortex cluster. The page may have migrated or never existed.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.1] hover:border-white/[0.2] text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Go Back
            </button>

            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:opacity-95 text-white text-sm font-medium shadow-lg shadow-purple-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Return to Login
            </Link>
          </div>

          {/* Diagnostics info */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <span>Status: 404 Disconnected</span>
            <span>&bull;</span>
            <span>Gateway: Active</span>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Cortex AI Studio &bull; Autonomous Architecture
        </p>
      </div>
    </div>
  );
};

export default NotFound;
