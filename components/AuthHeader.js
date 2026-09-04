"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthHeader() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // 1. Check if a user is already logged in on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Listen for any login/logout events dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); // Refresh the page to clear any user data
  };

  return (
    <header className="mb-8 flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="text-center sm:text-left mb-4 sm:mb-0">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">⚡ The Sprint Post</h1>
        <p className="text-sm text-gray-500">Run first. Claim later.</p>
      </div>
      
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 font-medium hidden md:block">
              {user.email}
            </span>
            {/* We will build this dashboard page next! */}
            <Link 
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Dashboard
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
