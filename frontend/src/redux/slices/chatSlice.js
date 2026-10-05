import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api.js';

// Safe error helper
const resolveError = (err, fallback) => {
  return err.response?.data?.error || err.response?.data?.message || err.message || fallback;
};

/**
 * Async Thunk: Fetch all conversations for current user
 */
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async ({ page = 1, limit = 50, search = '' } = {}, { rejectWithValue }) => {
    try {
      const params = { page, limit };
      if (search) params.search = search;
      const res = await api.get('/api/chat/conversations', { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(resolveError(err, 'Failed to fetch conversations'));
    }
  }
);

/**
 * Async Thunk: Create a new conversation
 */
export const createConversation = createAsyncThunk(
  'chat/createConversation',
  async ({ title = 'New Chat' } = {}, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/chat/conversations', { title });
      return res.data.conversation;
    } catch (err) {
      return rejectWithValue(resolveError(err, 'Failed to create conversation'));
    }
  }
);

/**
 * Async Thunk: Fetch messages for a specific conversation
 */
export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/chat/conversations/${conversationId}/messages`, {
        params: { limit: 100 }
      });
      return { conversationId, messages: res.data.messages || [] };
    } catch (err) {
      return rejectWithValue(resolveError(err, 'Failed to fetch messages'));
    }
  }
);

/**
 * Async Thunk: Rename conversation
 */
export const renameConversation = createAsyncThunk(
  'chat/renameConversation',
  async ({ id, title }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/api/chat/conversations/${id}`, { title });
      return res.data.conversation || { _id: id, title };
    } catch (err) {
      return rejectWithValue(resolveError(err, 'Failed to rename conversation'));
    }
  }
);

/**
 * Async Thunk: Delete conversation
 */
export const deleteConversation = createAsyncThunk(
  'chat/deleteConversation',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/chat/conversations/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(resolveError(err, 'Failed to delete conversation'));
    }
  }
);

/**
 * Async Thunk: Clear messages in a conversation
 */
export const clearConversationMessages = createAsyncThunk(
  'chat/clearConversationMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/chat/conversations/${conversationId}/messages`);
      return conversationId;
    } catch (err) {
      return rejectWithValue(resolveError(err, 'Failed to clear conversation messages'));
    }
  }
);

/**
 * Async Thunk: Run agent workflow and record user & assistant messages
 */
export const sendAgentPrompt = createAsyncThunk(
  'chat/sendAgentPrompt',
  async ({ prompt, agent, conversationId }, { rejectWithValue }) => {
    try {
      const payload = {
        prompt: prompt.trim(),
        agent: agent && agent !== 'auto' ? agent : undefined,
        conversationId: conversationId || undefined,
      };

      const res = await api.post('/api/agent', payload);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(resolveError(err, 'Failed to execute agent workflow'));
    }
  }
);

const initialState = {
  conversations: [],
  activeConversationId: null,
  messages: [],
  loadingConversations: false,
  loadingMessages: false,
  isSending: false,
  error: null,
  searchQuery: '',
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
    },
    startNewChat(state) {
      state.activeConversationId = null;
      state.messages = [];
      state.error = null;
    },
    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
    },
    clearChatError(state) {
      state.error = null;
    },
    // Optimistic user message append while agent runs
    addOptimisticUserMessage(state, action) {
      state.messages.push({
        _id: `temp-${Date.now()}`,
        role: 'user',
        content: action.payload.content,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      });
    },
    markMessageStreamed(state, action) {
      const msg = state.messages.find((m) => m._id === action.payload);
      if (msg) {
        msg.isNew = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loadingConversations = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loadingConversations = false;
        state.conversations = action.payload.conversations || [];
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loadingConversations = false;
        state.error = action.payload;
      })

      // Create Conversation
      .addCase(createConversation.fulfilled, (state, action) => {
        const conv = action.payload;
        state.conversations.unshift(conv);
        state.activeConversationId = conv._id;
        state.messages = [];
      })

      // Fetch Messages
      .addCase(fetchMessages.pending, (state) => {
        state.loadingMessages = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loadingMessages = false;
        state.activeConversationId = action.payload.conversationId;
        state.messages = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loadingMessages = false;
        state.error = action.payload;
      })

      // Rename Conversation
      .addCase(renameConversation.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.conversations.findIndex((c) => c._id === updated._id);
        if (index !== -1) {
          state.conversations[index] = { ...state.conversations[index], ...updated };
        }
      })

      // Delete Conversation
      .addCase(deleteConversation.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.conversations = state.conversations.filter((c) => c._id !== deletedId);
        if (state.activeConversationId === deletedId) {
          state.activeConversationId = null;
          state.messages = [];
        }
      })

      // Clear Messages
      .addCase(clearConversationMessages.fulfilled, (state) => {
        state.messages = [];
      })

      // Send Agent Prompt
      .addCase(sendAgentPrompt.pending, (state) => {
        state.isSending = true;
        state.error = null;
      })
      .addCase(sendAgentPrompt.fulfilled, (state, action) => {
        state.isSending = false;
        const data = action.payload;

        if (data.conversationId) {
          state.activeConversationId = data.conversationId;

          // If this was a new conversation, check if it's in list or prepend
          const exists = state.conversations.find((c) => c._id === data.conversationId);
          if (!exists) {
            const autoTitle = data.prompt.length > 35 ? `${data.prompt.slice(0, 32)}...` : data.prompt;
            state.conversations.unshift({
              _id: data.conversationId,
              title: autoTitle,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            // Touch updatedAt and move to top
            const updatedList = state.conversations.filter((c) => c._id !== data.conversationId);
            exists.updatedAt = new Date().toISOString();
            state.conversations = [exists, ...updatedList];
          }
        }

        // Clean up optimistic message and ensure saved messages are present
        state.messages = state.messages.filter((m) => !m.isOptimistic);

        if (data.messages?.user) {
          state.messages.push(data.messages.user);
        } else if (data.prompt) {
          state.messages.push({
            _id: `user-${Date.now()}`,
            role: 'user',
            content: data.prompt,
            createdAt: new Date().toISOString(),
          });
        }

        if (data.messages?.assistant) {
          state.messages.push({
            ...data.messages.assistant,
            agent: data.agent,
            sources: data.sources || [],
            searchQueries: data.searchQueries || [],
            isNew: true,
          });
        } else if (data.response) {
          state.messages.push({
            _id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            agent: data.agent,
            sources: data.sources || [],
            searchQueries: data.searchQueries || [],
            createdAt: new Date().toISOString(),
            isNew: true,
          });
        }
      })
      .addCase(sendAgentPrompt.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.payload;
        // Clean up optimistic message on failure
      });
  },
});

export const {
  setActiveConversation,
  startNewChat,
  setSearchQuery,
  clearChatError,
  addOptimisticUserMessage,
  markMessageStreamed,
} = chatSlice.actions;

// Selectors
export const selectConversations = (state) => state.chat.conversations;
export const selectActiveConversationId = (state) => state.chat.activeConversationId;
export const selectActiveConversation = (state) =>
  state.chat.conversations.find((c) => c._id === state.chat.activeConversationId) || null;
export const selectMessages = (state) => state.chat.messages;
export const selectLoadingConversations = (state) => state.chat.loadingConversations;
export const selectLoadingMessages = (state) => state.chat.loadingMessages;
export const selectIsSending = (state) => state.chat.isSending;
export const selectChatError = (state) => state.chat.error;
export const selectSearchQuery = (state) => state.chat.searchQuery;

export default chatSlice.reducer;
