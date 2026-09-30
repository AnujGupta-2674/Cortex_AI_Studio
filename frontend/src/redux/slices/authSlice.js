import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../../../utils/firebase.js';
import api from '../../services/api.js';
import { authStorage } from '../../utils/storage.js';

// Safe error message extractor for Axios & Firebase responses
const resolveErrorMessage = (err, fallback) => {
  return err.response?.data?.error || err.message || fallback;
};

/**
 * Async Thunk: Sign in with Google Popup, verify token on API gateway,
 * and persist profile locally with 7-day TTL.
 */
export const loginWithGoogle = createAsyncThunk(
  'auth/loginWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      // 1. Firebase Client Authentication
      const credentials = await signInWithPopup(auth, googleProvider);
      const idToken = await credentials.user.getIdToken();

      // 2. Gateway Handshake & Session Generation
      const { data } = await api.post('/api/auth/login', { token: idToken });
      const user = data.user;

      // 3. Cache session synchronized with 7-day cookie lifespan
      authStorage.setUser(user);

      return { user, token: idToken };
    } catch (err) {
      console.error('[auth/loginWithGoogle] Error:', err);
      return rejectWithValue(resolveErrorMessage(err, 'Authentication failed. Please try again.'));
    }
  }
);

/**
 * Async Thunk: Sign out from Firebase and invalidate server session.
 */
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth);
      await api.post('/api/auth/logout');
      return true;
    } catch (err) {
      console.error('[auth/logoutUser] Error:', err);
      return rejectWithValue(resolveErrorMessage(err, 'Failed to sign out cleanly.'));
    } finally {
      authStorage.clearUser();
    }
  }
);

/**
 * Async Thunk: Fetch current session user from gateway (/api/me).
 * Verifies HTTP-only session cookie against Redis and syncs auth state.
 */
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/api/me');
      const user = data.user;
      if (user) {
        authStorage.setUser(user);
      }
      return user;
    } catch (err) {
      // Expired or invalid session cookie on server
      if (err.response?.status === 401) {
        authStorage.clearUser();
      }
      return rejectWithValue(resolveErrorMessage(err, 'Failed to fetch current user session.'));
    }
  }
);

// Hydrate initial state cleanly from storage layer
const cachedUser = authStorage.getUser();

const initialState = {
  user: cachedUser,
  token: null,
  isAuthenticated: Boolean(cachedUser),
  loading: false,
  isCheckingAuth: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    resetAuthState() {
      authStorage.clearUser();
      return {
        ...initialState,
        user: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Google Login Lifecycle
      .addCase(loginWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isCheckingAuth = false;
        state.error = null;
      })
      .addCase(loginWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Current User (/api/me) Lifecycle
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        state.user = action.payload;
        state.isAuthenticated = Boolean(action.payload);
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isCheckingAuth = false;
        state.user = null;
        state.isAuthenticated = false;
      })

      // Logout Lifecycle
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isCheckingAuth = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isCheckingAuth = false;
      });
  },
});

// Selectors for clean component consumption
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectIsCheckingAuth = (state) => state.auth.isCheckingAuth;
export const selectAuthError = (state) => state.auth.error;

export const { clearError, resetAuthState } = authSlice.actions;
export default authSlice.reducer;
