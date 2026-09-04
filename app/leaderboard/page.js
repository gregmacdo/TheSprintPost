"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import AuthHeader from '../../components/AuthHeader';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardFilter, setBoardFilter] = useState('all-time');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      // We'll pull the top 100 for this dedicated page
      let query = supabase
        .from('sprints')
        .select('*')
        .order('time_seconds', { ascending: true })
        .limit(100); 

      if (boardFilter !== 'all-time') {
        const pastDate = new Date();
        if (boardFilter === 'today') pastDate.setHours(pastDate.getHours() - 24);
        if (boardFilter === 'week') pastDate.setDate(pastDate.getDate() - 7);
        if (boardFilter === 'month') pastDate.setDate(pastDate.getDate() - 30);
        if (boardFilter === 'year') pastDate.setDate(pastDate.getDate() - 365);
        query = query.gte('created_at', pastDate.toISOString());
      }

      const { data } = await query;
      setLeaderboard(data || []);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [boardFilter]);

  const renderAthleteName = (sprint) => {
    if (!sprint.is_claimed) return <span className="text-gray-500 italic">Unclaimed Sprint</span>;
    if (sprint.is_anonymous) return <span className="text-gray-700 font-medium">Anonymous Athlete</span>;
    return <span className="text-black font-bold">{sprint.display_name}</span>;
  };

  const getRankStyle = (index) => {
    if (index === 0) return "bg-yellow-100 text-yellow-700 border-yellow-200"; // Gold
    if (index === 1) return "bg-gray-200 text-gray-700 border-gray-300"; // Silver
    if (index === 2) return "bg-orange-100 text-orange-800 border-orange-200"; // Bronze
    return "bg-gray-50 text-gray-500 border-gray-100";
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <AuthHeader />

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Header Area */}
          <div className="p-6 md:p-8 bg-gray-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium mb-2 inline-block transition-colors">
                &larr; Back to Dashboard
              </Link>
              <h2 className="text-2xl font-bold">Global Leaderboard</h2>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2 justify-center">
            {['today', 'week', 'month', 'year', 'all-time'].map(f => (
              <button 
                key={f} 
                onClick={() => setBoardFilter(f)} 
                className={`px-6 py-2 rounded-full text-sm font-bold capitalize transition-colors shadow-sm ${
                  boardFilter === f ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-gray-400 text-sm">
                  <th className="p-4 font-medium text-center w-20">Rank</th>
                  <th className="p-4 font-medium">Athlete</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400">Loading times...</td></tr>
                ) : leaderboard.length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400">No sprints found for this time period.</td></tr>
                ) : (
                  leaderboard.map((sprint, index) => (
                    <tr key={sprint.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${getRankStyle(index)}`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-lg">
                          {renderAthleteName(sprint)}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(sprint.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-right font-mono text-2xl font-black tracking-tighter text-black">
                        {sprint.time_seconds.toFixed(2)}s
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </main>
  );
}
