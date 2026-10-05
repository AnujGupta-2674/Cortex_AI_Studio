import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_SAMPLE_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cortex Interactive Component</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 50%, #151828 0%, #080911 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #f8fafc;
      padding: 24px;
    }
    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      text-align: center;
      max-width: 400px;
      width: 100%;
      animation: float 4s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #c084fc;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 14px; color: #94a3b8; margin-bottom: 24px; }
    .counter-display {
      font-size: 48px;
      font-weight: 800;
      color: #38bdf8;
      margin-bottom: 24px;
      font-variant-numeric: tabular-nums;
    }
    .btn-group { display: flex; gap: 12px; justify-content: center; }
    button {
      background: #8b5cf6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover { background: #7c3aed; transform: scale(1.05); }
    button.secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
    }
    button.secondary:hover { background: rgba(255, 255, 255, 0.15); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✨ Cortex Live Artifact</div>
    <h2>Interactive Counter</h2>
    <p>Rendered live directly in the Cortex Code Preview environment</p>
    <div id="count" class="counter-display">0</div>
    <div class="btn-group">
      <button class="secondary" onclick="change(-1)">- Decr</button>
      <button onclick="change(1)">+ Incr</button>
      <button class="secondary" onclick="reset()">Reset</button>
    </div>
  </div>

  <script>
    let n = 0;
    const el = document.getElementById('count');
    function change(v) {
      n += v;
      el.textContent = n;
      el.style.transform = 'scale(1.2)';
      setTimeout(() => el.style.transform = 'scale(1)', 150);
    }
    function reset() {
      n = 0;
      el.textContent = n;
    }
  </script>
</body>
</html>`;

const initialState = {
  isOpen: false,
  title: 'Interactive Component',
  language: 'html',
  code: DEFAULT_SAMPLE_CODE,
  mode: 'preview', // 'preview' | 'code'
  viewMode: 'desktop', // 'desktop' | 'tablet' | 'mobile'
  agent: null, // 'pdf' | 'ppt' | 'coding' | null
};

const artifactSlice = createSlice({
  name: 'artifact',
  initialState,
  reducers: {
    openArtifact(state, action) {
      state.isOpen = true;
      if (action.payload) {
        if (action.payload.title) state.title = action.payload.title;
        if (action.payload.language) state.language = action.payload.language;
        if (action.payload.code) state.code = action.payload.code;
        if (action.payload.mode) state.mode = action.payload.mode;
        state.agent = action.payload.agent || null;
      }
    },
    closeArtifact(state) {
      state.isOpen = false;
    },
    toggleArtifact(state) {
      state.isOpen = !state.isOpen;
    },
    setArtifactMode(state, action) {
      state.mode = action.payload;
    },
    setViewMode(state, action) {
      state.viewMode = action.payload;
    },
    updateCode(state, action) {
      state.code = action.payload;
    },
    setArtifactData(state, action) {
      return { ...state, ...action.payload, isOpen: true };
    },
  },
});

export const {
  openArtifact,
  closeArtifact,
  toggleArtifact,
  setArtifactMode,
  setViewMode,
  updateCode,
  setArtifactData,
} = artifactSlice.actions;

export const selectArtifactIsOpen = (state) => state.artifact.isOpen;
export const selectArtifactData = (state) => state.artifact;
export const selectArtifactMode = (state) => state.artifact.mode;
export const selectArtifactViewMode = (state) => state.artifact.viewMode;
export const selectArtifactCode = (state) => state.artifact.code;

export default artifactSlice.reducer;
