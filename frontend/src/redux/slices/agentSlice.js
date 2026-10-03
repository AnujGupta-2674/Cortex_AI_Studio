import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

const FALLBACK_AGENTS = [
  {
    id: 'auto',
    name: 'Auto Router',
    description: 'Intelligently determines the best specialist agent for your prompt',
    model: 'Groq + Gemini Multi-Agent'
  },
  {
    id: 'coding',
    name: 'Coding Agent',
    description: 'Full-stack code generation, refactoring, and live interactive UI components',
    model: 'Gemini (gemini-2.5-flash)'
  },
  {
    id: 'chat',
    name: 'Conversational Agent',
    description: 'Knowledgeable dialogue, architecture Q&A, and real-time reasoning',
    model: 'Groq (openai/gpt-oss-120b)'
  },
  {
    id: 'vision',
    name: 'Vision & Image Agent',
    description: 'Visual analysis, UI design comprehension, and image generation',
    model: 'Gemini (gemini-2.5-flash)'
  },
  {
    id: 'search',
    name: 'Web Search Agent',
    description: 'Live web scraping and real-time internet knowledge synthesis',
    model: 'Groq (openai/gpt-oss-120b)'
  },
  {
    id: 'pdf',
    name: 'PDF Document Agent',
    description: 'Deep document analysis, citations, and multi-page summarization',
    model: 'Gemini (gemini-2.5-flash)'
  },
  {
    id: 'ppt',
    name: 'Presentation Agent',
    description: 'Structured slide outlines, keynote designs, and presentation decks',
    model: 'Gemini (gemini-2.5-flash)'
  }
];

export const fetchAvailableAgents = createAsyncThunk(
  'agent/fetchAvailableAgents',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/agent/agents');
      if (res.data?.agents && Array.isArray(res.data.agents)) {
        return [
          {
            id: 'auto',
            name: 'Auto Router',
            description: 'Intelligently routes to the best specialist agent',
            model: 'LangGraph Autonomous Workflow'
          },
          ...res.data.agents
        ];
      }
      return FALLBACK_AGENTS;
    } catch (err) {
      // Graceful fallback if backend is unauthenticated or loading
      return FALLBACK_AGENTS;
    }
  }
);

const initialState = {
  agents: FALLBACK_AGENTS,
  selectedAgent: 'auto',
  loading: false,
  error: null,
};

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    setSelectedAgent(state, action) {
      state.selectedAgent = action.payload;
    },
    resetAgent(state) {
      state.selectedAgent = 'auto';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailableAgents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAvailableAgents.fulfilled, (state, action) => {
        state.loading = false;
        state.agents = action.payload;
      })
      .addCase(fetchAvailableAgents.rejected, (state) => {
        state.loading = false;
        state.agents = FALLBACK_AGENTS;
      });
  },
});

export const { setSelectedAgent, resetAgent } = agentSlice.actions;

export const selectAgents = (state) => state.agent.agents;
export const selectSelectedAgent = (state) => state.agent.selectedAgent;
export const selectSelectedAgentDetails = (state) =>
  state.agent.agents.find((a) => a.id === state.agent.selectedAgent) || state.agent.agents[0];

export default agentSlice.reducer;
