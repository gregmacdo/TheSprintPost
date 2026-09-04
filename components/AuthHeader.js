"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthHeader() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); 
  };

  return (
    <header className="mb-8 flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="text-center sm:text-left mb-4 sm:mb-0">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-black">⚡ The Sprint Post</h1>
        </Link>
        <p className="text-sm text-gray-500">Run first. Claim later.</p>
      </div>
      
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <Link 
              href="/profile"
              className="text-sm text-gray-700 font-medium hover:text-black hover:underline hidden md:flex items-center gap-2"
            >
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
              )}
              {user.user_metadata?.display_name || user.email}
            </Link>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Log Out
            </button>
          </div>
        ) : (
          <Link 
            href="/login"
            className="px-5 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors shadow-sm"
          >
            Log In
          </Link>
        )}
      </div>
    </header>
  );
}
