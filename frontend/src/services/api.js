import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true, // Enables cross-origin cookie sending/receiving
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
