import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import chatReducer from './slices/chatSlice.js';
import agentReducer from './slices/agentSlice.js';
import artifactReducer from './slices/artifactSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    agent: agentReducer,
    artifact: artifactReducer,
  },
});

export default store;
