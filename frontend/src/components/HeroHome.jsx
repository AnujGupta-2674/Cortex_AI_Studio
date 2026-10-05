import { useDispatch, useSelector } from 'react-redux';
import {
  selectAgents,
  selectSelectedAgent,
  setSelectedAgent,
} from '../redux/slices/agentSlice.js';

const STARTER_PROMPTS = [
  {
    icon: '⚡',
    title: 'Interactive Counter & Timer',
    desc: 'Generate a clean HTML/JS interactive component with animations for the Artifact Preview.',
    agent: 'coding',
    prompt: 'Create a complete self-contained HTML/CSS/JavaScript interactive counter and timer widget with modern dark glassmorphic styling, increment/decrement buttons, and a reset button. Put the entire code in an html code block so it can be previewed live.',
  },
  {
    icon: '📊',
    title: 'Interactive Pitch Deck',
    desc: 'Generate a 5-slide widescreen interactive presentation deck with keyboard controls and live animations.',
    agent: 'ppt',
    prompt: 'Create a 5-slide interactive presentation deck for Cortex AI: An Autonomous Multi-Agent AI Platform. Include a Title slide, Market Problem, Solution Architecture, Key Performance Metrics, and Roadmap. Put the entire code in an html block with slide navigation and keyboard controls so it can be previewed live in the Artifact panel.',
  },
  {
    icon: '📄',
    title: 'Executive PDF Whitepaper',
    desc: 'Generate an A4 formatted print-ready research report with styled tables, metrics, and one-click PDF printing.',
    agent: 'pdf',
    prompt: 'Generate an executive research whitepaper on "The Future of Autonomous AI Agent Systems in 2026". Format it as a professional A4 document with corporate branding, executive summary, KPI metric cards, comparative data table, recommendations, and print-ready CSS with a Print to PDF button. Put the entire document in an html block.',
  },
  {
    icon: '🌐',
    title: 'Real-time Web Intelligence',
    desc: 'Search recent developments in multi-agent orchestration and production LLM design.',
    agent: 'search',
    prompt: 'What are the latest best practices and architecture patterns for building multi-agent AI platforms in 2025-2026?',
  },
];


export const HeroHome = ({ user, onSelectPrompt }) => {
  const dispatch = useDispatch();
  const agents = useSelector(selectAgents);
  const selectedAgent = useSelector(selectSelectedAgent);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Explorer';

  return (
    <div className="max-w-4xl mx-auto w-full py-8 px-4 flex flex-col items-center text-center animate-in fade-in duration-500">
      {/* Top Status Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-6 shadow-sm">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
        </span>
        <span className="text-xs font-medium text-slate-300">
          Cortex AI Multi-Agent Mesh &bull; Ready
        </span>
      </div>

      {/* Greeting Title (Gemini style) */}
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
        <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
          Hello, {firstName}
        </span>
      </h1>
      <p className="text-base sm:text-lg text-slate-400 max-w-xl mb-8 font-normal leading-relaxed">
        How can Cortex AI assist your software architecture, coding, and creative workflow today?
      </p>

      {/* Specialist Agent Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10 max-w-2xl">
        {agents.map((ag) => {
          const isSelected = selectedAgent === ag.id;
          return (
            <button
              key={ag.id}
              onClick={() => dispatch(setSelectedAgent(ag.id))}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-purple-600/30 text-white border border-purple-400/50 shadow-md shadow-purple-500/20'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
              }`}
            >
              {ag.id === 'coding' && <span>💻</span>}
              {ag.id === 'chat' && <span>💬</span>}
              {ag.id === 'search' && <span>🌐</span>}
              {ag.id === 'vision' && <span>👁️</span>}
              {ag.id === 'pdf' && <span>📄</span>}
              {ag.id === 'ppt' && <span>📊</span>}
              {ag.id === 'auto' && <span>✨</span>}
              <span>{ag.name}</span>
            </button>
          );
        })}
      </div>

      {/* Starter Prompt Cards Grid (Gemini / Claude Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
        {STARTER_PROMPTS.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectPrompt(item.prompt, item.agent)}
            className="group relative p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.07] hover:border-purple-500/40 backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-lg hover:shadow-purple-500/10 active:scale-[0.99] flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  {item.icon}
                </span>
                <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                  {item.title}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
                {item.agent}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
              {item.desc}
            </p>

            <div className="mt-3 flex items-center justify-end text-xs text-purple-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Run prompt &rarr;</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroHome;
