import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  loginWithGoogle, 
  logoutUser, 
  clearError,
  selectCurrentUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from '../redux/slices/authSlice.js';

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const handleGoogleLogin = async () => {
    dispatch(clearError());
    const res = await dispatch(loginWithGoogle());
    if (loginWithGoogle.fulfilled.match(res)) {
      navigate('/');
    }
  };

  const handleLogout = () => {
    dispatch(logoutUser());
  };


  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#07090e] text-slate-100 overflow-hidden font-sans selection:bg-purple-500 selection:text-white">
      {/* Dynamic Background Gradients and Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-transparent blur-[120px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tl from-cyan-600/20 via-blue-600/15 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-900/5 blur-[150px] pointer-events-none" />

      {/* Grid Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6 py-10 sm:px-8">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-4 shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium tracking-wider uppercase text-slate-300">
              Cortex AI Studio • Secure Auth
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-purple-500/20">
              <div className="h-full w-full bg-[#0b0e14] rounded-[11px] flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a8 8 0 0 0-8 8c0 3.37 2.07 6.26 5 7.42V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.58c2.93-1.16 5-4.05 5-7.42a8 8 0 0 0-8-8z" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Cortex AI
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Autonomous multi-agent platform powered by real-time intelligence
          </p>
        </div>

        {/* Card Container */}
        <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-7 shadow-2xl shadow-black/60 transition-all duration-300">
          
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-start justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-2.5 items-center">
                <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => dispatch(clearError())} 
                className="text-red-400/80 hover:text-red-200 transition-colors"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Conditional View: Logged In Card vs. Login Actions */}
          {isAuthenticated && user ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="relative mb-3">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`}
                    alt={user.name}
                    className="w-20 h-20 rounded-full border-2 border-purple-500/40 object-cover shadow-md shadow-purple-500/20"
                  />
                  <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-[#07090e]" title="Active" />
                </div>
                <h2 className="text-xl font-semibold text-white">{user.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    MongoDB Synced
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 text-xs font-mono border border-purple-500/20">
                    UID: {(user.firebaseUid || user.userId || user._id)?.slice(0, 8)}...
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                >
                  <span>Launch Studio Workspace &rarr;</span>
                </button>

                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 hover:border-red-500/50 font-medium text-sm transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold text-slate-100">Welcome to Cortex</h2>
                <p className="text-xs text-slate-400">
                  Authenticate with your Google account to access your studio workspace.
                </p>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="group relative w-full flex items-center justify-center gap-3.5 py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all duration-200 cursor-pointer shadow-lg shadow-white/5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Cortex...</span>
                  </div>
                ) : (
                  <>
                    {/* Official Multi-Color Google SVG */}
                    <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Value proposition badges */}
              <div className="pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-indigo-400">✓</span> Instant provisioning
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-cyan-400">✓</span> Session encrypted
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs text-slate-400/80">
          Protected by Firebase Auth and Cortex API Gateway &bull; v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Login;
