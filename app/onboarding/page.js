// app/onboarding/page.js
"use client";

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('Male');
  const [isOver40, setIsOver40] = useState(false);
  const [isClydesdale, setIsClydesdale] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Save demographics into the authenticated user's metadata
    const { error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        gender: gender,
        is_over_40: isOver40,
        is_clydesdale: isClydesdale,
      },
    });

    if (error) {
      alert(`Error saving profile: ${error.message}`);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-black mb-2">⚡ Finish Your Athlete Profile</h1>
          <p className="text-gray-500 text-sm">Tell us a bit about yourself to rank on local leaderboards.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 text-black">Display Name</label>
            <input 
              type="text" 
              required 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white"
              placeholder="e.g. SpeedDemon99"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-black">Gender Category</label>
            <select 
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white cursor-pointer"
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

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4 shadow-sm"
          >
            {loading ? 'Saving...' : 'Complete Profile & Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
