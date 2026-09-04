"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import AuthHeader from '../../components/AuthHeader';

const PAGE_SIZE = 100;

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardFilter, setBoardFilter] = useState('all-time');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Reset to page 1 whenever the time filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [boardFilter]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // We ask Supabase for the exact count so we can calculate total pages
      let query = supabase
        .from('sprints')
        .select('*', { count: 'exact' })
        .order('time_seconds', { ascending: true })
        .range(from, to); 

      if (boardFilter !== 'all-time') {
        const pastDate = new Date();
        if (boardFilter === 'today') pastDate.setHours(pastDate.getHours() - 24);
        if (boardFilter === 'week') pastDate.setDate(pastDate.getDate() - 7);
        if (boardFilter === 'month') pastDate.setDate(pastDate.getDate() - 30);
        if (boardFilter === 'year') pastDate.setDate(pastDate.getDate() - 365);
        query = query.gte('created_at', pastDate.toISOString());
      }

      const { data, count } = await query;
      
      setLeaderboard(data || []);
      setTotalPages(Math.max(1, Math.ceil((count || 0) / PAGE_SIZE)));
      setLoading(false);
    };

    fetchLeaderboard();
  }, [boardFilter, currentPage]);

  // Standardizes Date/Time with NO leading zeroes on hours
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const renderAthleteName = (sprint) => {
    if (!sprint.is_claimed) return <span className="text-gray-500 italic">Unclaimed Sprint</span>;
    if (sprint.is_anonymous) return <span className="text-gray-700 font-medium">Anonymous Athlete</span>;
    return <span className="text-black font-bold">{sprint.display_name}</span>;
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-700 border-yellow-200"; // Gold
    if (rank === 2) return "bg-gray-200 text-gray-700 border-gray-300"; // Silver
    if (rank === 3) return "bg-orange-100 text-orange-800 border-orange-200"; // Bronze
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
                  <th className="p-4 font-medium">Date & Time</th>
                  <th className="p-4 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400">Loading times...</td></tr>
                ) : leaderboard.length === 0 ? (
                  <tr><td colSpan="4" className="p-12 text-center text-gray-400">No sprints found for this time period.</td></tr>
                ) : (
                  leaderboard.map((sprint, index) => {
                    const actualRank = (currentPage - 1) * PAGE_SIZE + index + 1;
                    return (
                      <tr key={sprint.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-center">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${getRankStyle(actualRank)}`}>
                            {actualRank}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-lg">
                            {renderAthleteName(sprint)}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {formatDateTime(sprint.created_at)}
                        </td>
                        <td className="p-4 text-right font-mono text-2xl font-black tracking-tighter text-black">
                          {sprint.time_seconds.toFixed(2)}s
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-sm">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              &larr; Previous
            </button>
            <span className="text-gray-500 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Next &rarr;
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
