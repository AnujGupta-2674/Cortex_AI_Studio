import React, { useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../utils/firebase.js'

const App = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      console.log('=== Firebase Auth Success ===');
      console.log('User Object:', user);
      console.log('Firebase ID Token:', idToken);
      console.log('User UID:', user.uid);
      console.log('Display Name:', user.displayName);
      console.log('Email:', user.email);
      console.log('Avatar URL:', user.photoURL);
    } catch (error) {
      console.error('Firebase Auth Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex items-center justify-center h-screen bg-slate-900'>
      <button 
        onClick={handleLogin}
        disabled={loading}
        className='max-w-5xl min-w-fit h-10 bg-blue-500 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-white font-medium rounded-md transition-all duration-200 px-5 cursor-pointer shadow-md'
      >
        {loading ? 'Signing in...' : 'Login with Firebase'}
      </button>
    </div>
  )
}

export default App