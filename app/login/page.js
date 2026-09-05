"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Standard Auth Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Demographics (Only used for Sign Up)
  const [gender, setGender] = useState('Prefer not to say');
  const [isOver40, setIsOver40] = useState(false);
  const [isClydesdale, setIsClydesdale] = useState(false);

  // Handle Google Token Response
  const handleGoogleCallback = async (response) => {
    setLoading(true);
    setError(null);
  
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.credential,
    });
  
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
  
    // Check if user has already completed their profile setup
    const user = data.user;
    const hasCompletedProfile = user?.user_metadata?.display_name && user?.user_metadata?.gender;
  
    if (hasCompletedProfile) {
      router.push('/');
    } else {
      // Missing demographics -> send to onboarding
      router.push('/onboarding');
    }
    router.refresh();
  };



  // Initialize Google SDK once script loads
  const handleScriptLoad = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      });

      // Render official Google button inside #googleSignInDiv
      const btnContainer = document.getElementById('googleSignInDiv');
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          width: '384', // Matches max-w-md container width
          shape: 'pill',
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            gender: gender,
            is_over_40: isOver40,
            is_clydesdale: isClydesdale,
            avatar_url: null
          }
        }
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/');
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
          <p className="text-gray-500">{isSignUp ? 'Create your athlete profile.' : 'Welcome back, runner.'}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
            {error}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-black">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
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

          {isSignUp && (
            <div className="space-y-5 pt-4 border-t border-gray-100 mt-2">
              <div>
                <label className="block text-sm font-bold mb-2 text-black">Display Name</label>
                <input 
                  type="text" 
                  required 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition-colors"
                  placeholder="e.g. Usain Bolt"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-black">Gender Category</label>
                <select 
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isOver40}
                    onChange={(e) => setIsOver40(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm font-bold">Masters (40+ years old)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isClydesdale}
                    onChange={(e) => setIsClydesdale(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <div>
                    <span className="text-sm font-bold block">Clydesdale / Athena</span>
                    <span className="text-xs text-gray-500">Male 200+ lbs / Female 165+ lbs</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4 shadow-sm"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <button 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-sm text-gray-500 hover:text-black font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </button>
        </div>

      </div>
    </main>
  );
}
