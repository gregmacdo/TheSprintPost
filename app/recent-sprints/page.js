"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeader from '../../components/AuthHeader';

export default function RecentSprintsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [recentSprints, setRecentSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [timeFilter, setTimeFilter] = useState('all-time');

  // Claiming State
  const [claimingId, setClaimingId] = useState(null);
  const [claimPhrase, setClaimPhrase] = useState('');
  const [isAnonymousInline, setIsAnonymousInline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Get user
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      // 2. Fetch the 100 most recent sprints globally, applying the time filter
      let query = supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (timeFilter !== 'all-time') {
        const pastDate = new Date();
        if (timeFilter === 'today') pastDate.setHours(pastDate.getHours() - 24);
        if (timeFilter === 'week') pastDate.setDate(pastDate.getDate() - 7);
        if (timeFilter === 'month') pastDate.setDate(pastDate.getDate() - 30);
        if (timeFilter === 'year') pastDate.setDate(pastDate.getDate() - 365);
        query = query.gte('created_at', pastDate.toISOString());
      }

      const { data } = await query;
      setRecentSprints(data || []);
      setLoading(false);
    };

    fetchData();
  }, [timeFilter]);

  // Standardizes Date/Time with NO leading zeroes on hours
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const handleClaimClick = (sprintId) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setClaimingId(sprintId);
    setClaimPhrase('');
    setIsAnonymousInline(false);
  };

  const processClaim = async (sprintId, phraseToTest, isAnon) => {
    const cleanPhrase = phraseToTest.toLowerCase().trim();
    const athleteName = user.user_metadata?.display_name || 'Runner';
    
    const { data } = await supabase
      .from('sprints')
      .update({ 
        is_claimed: true, 
        user_id: user.id,
        display_name: athleteName,
        is_anonymous: isAnon
      })
      .eq('id', sprintId)
      .eq('phrase', cleanPhrase)
      .eq('is_claimed', false)
      .select();

    if (data && data.length > 0) {
      alert('Sprint claimed successfully!');
      window.location.reload(); 
    } else {
      alert('Incorrect phrase or sprint already claimed.');
    }
  };

  const renderAthleteName = (sprint) => {
    if (!sprint.is_claimed) return <span className="text-gray-500 italic">Unclaimed Sprint</span>;
    if (sprint.is_anonymous) return <span className="text-gray-700 font-medium">Anonymous Athlete</span>;
    return <span className="text-black font-bold">{sprint.display_name}</span>;
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <AuthHeader />

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Header Area */}
          <div className="p-6 md:p-8 bg-gray-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium mb-2 inline-block transition-colors">
                &larr; Back to Dashboard
              </Link>
              <h2 className="text-2xl font-bold">Live Feed Timeline</h2>
            </div>
            <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold border border-gray-700">
              Showing Last 100 Sprints
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2 justify-center">
            {['today', 'week', 'month', 'year', 'all-time'].map(f => (
              <button 
                key={f} 
                onClick={() => setTimeFilter(f)} 
                className={`px-6 py-2 rounded-full text-sm font-bold capitalize transition-colors shadow-sm ${
                  timeFilter === f ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Sprints List */}
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading timeline...</div>
            ) : recentSprints.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No sprints recorded in this timeframe.</div>
            ) : (
              recentSprints.map(sprint => (
                <div key={sprint.id} className="p-6 hover:bg-gray-50 transition-colors">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="text-lg">
                        {renderAthleteName(sprint)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatDateTime(sprint.created_at)}
                      </div>
                    </div>
                    <div className="font-mono text-3xl font-black tracking-tighter text-black border-t sm:border-0 border-gray-100 pt-4 sm:pt-0 w-full sm:w-auto text-left sm:text-right">
                      {sprint.time_seconds.toFixed(2)}s
                    </div>
                  </div>

                  {/* Inline Claiming UI */}
                  {!sprint.is_claimed && (
                    <div className="mt-4">
                      {claimingId === sprint.id ? (
                        <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 max-w-md">
                          <input
                            type="text"
                            placeholder="Enter 3-word phrase"
                            value={claimPhrase}
                            onChange={(e) => setClaimPhrase(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-full mb-3 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`anon-${sprint.id}`} 
                                checked={isAnonymousInline} 
                                onChange={(e) => setIsAnonymousInline(e.target.checked)}
                              />
                              <label htmlFor={`anon-${sprint.id}`} className="text-sm text-gray-600 font-medium">Claim Anonymously</label>
                            </div>
                            <button 
                              onClick={() => processClaim(sprint.id, claimPhrase, isAnonymousInline)} 
                              className="bg-black text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                            >
                              Verify
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleClaimClick(sprint.id)} 
                          className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg"
                        >
                          + Claim this run
                        </button>
                      )}
                    </div>
                  )}

                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
