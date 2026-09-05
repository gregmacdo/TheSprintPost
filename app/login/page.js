"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);

  // Handle Google Token Response
  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.credential,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    const hasCompletedProfile = user?.user_metadata?.display_name && user?.user_metadata?.gender;

    if (hasCompletedProfile) {
      router.push('/');
    } else {
      router.push('/onboarding');
    }
    router.refresh();
  };

  // Initialize Google SDK
  const handleScriptLoad = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });

      const btnContainer = document.getElementById('googleSignInDiv');
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          width: '384',
          shape: 'pill',
        });
      }
    }
  };

  // Handle Email Auth (Magic Link or Password)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (usePassword) {
      // Password Login Flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        const user = data.user;
        const hasCompletedProfile = user?.user_metadata?.display_name && user?.user_metadata?.gender;

        if (hasCompletedProfile) {
          router.push('/');
        } else {
          router.push('/onboarding');
        }
        router.refresh();
      }
    } else {
      // Magic Link Flow
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('⚡ Magic link sent! Check your inbox to sign in.');
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
      {/* Google Identity Services SDK */}
      <Script 
        src="https://accounts.google.com/gsi/client" 
        onLoad={handleScriptLoad} 
        strategy="afterInteractive" 
      />

      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-8">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="text-3xl font-extrabold tracking-tight text-black mb-2">⚡ The Sprint Post</h1>
          </Link>
          <p className="text-gray-500">Sign in to track and claim your times.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 text-center">
            {message}
          </div>
        )}

        {/* NATIVE GOOGLE BUTTON CONTAINER */}
        <div className="flex justify-center mb-6">
          <div id="googleSignInDiv"></div>
        </div>

        {/* DIVIDER */}
        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-xs text-gray-400 font-bold uppercase tracking-wider">Or email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-black">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="runner@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          {usePassword && (
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 mt-2 shadow-sm"
          >
            {loading 
              ? 'Processing...' 
              : usePassword 
                ? 'Sign In with Password' 
                : 'Send Magic Link ✉️'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <button 
            onClick={() => {
              setUsePassword(!usePassword);
              setError(null);
              setMessage(null);
            }}
            className="text-sm text-gray-500 hover:text-black font-medium transition-colors"
          >
            {usePassword ? '← Back to Magic Link login' : 'Sign in with Password instead'}
          </button>
        </div>

      </div>
    </main>
  );
}
