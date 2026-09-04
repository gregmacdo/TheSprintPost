"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import AuthHeader from '../components/AuthHeader';

export default function MainPage() {
  const router = useRouter();
  
  // App State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [recentGlobal, setRecentGlobal] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [mySprints, setMySprints] = useState([]);
  const [filter, setFilter] = useState('all-time');
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Claiming State
  const [manualPhrase, setManualPhrase] = useState('');
  const [isAnonymousManual, setIsAnonymousManual] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [claimPhrase, setClaimPhrase] = useState('');
  const [isAnonymousInline, setIsAnonymousInline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: myData } = await supabase
          .from('sprints')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });
        setMySprints(myData || []);
      }

      const { data: recentData } = await supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentGlobal(recentData || []);

      let query = supabase.from('sprints').select('*').order('time_seconds', { ascending: true }).limit(50);
      if (filter !== 'all-time') {
        const pastDate = new Date();
        if (filter === 'today') pastDate.setHours(pastDate.getHours() - 24);
        if (filter === 'week') pastDate.setDate(pastDate.getDate() - 7);
        if (filter === 'month') pastDate.setDate(pastDate.getDate() - 30);
        if (filter === 'year') pastDate.setDate(pastDate.getDate() - 365);
        query = query.gte('created_at', pastDate.toISOString());
      }
      const { data: boardData } = await query;
      setLeaderboard(boardData || []);
      setLoading(false);
    };
    fetchData();
  }, [filter]); 

  const processClaim = async (sprintId, phraseToTest, isAnon) => {
    const cleanPhrase = phraseToTest.toLowerCase().trim();
    const athleteName = user.user_metadata?.display_name || 'Runner';
    
    // We update the record where ID (if provided) and Phrase match.
    let query = supabase
      .from('sprints')
      .update({ 
        is_claimed: true, 
        user_id: user.id,
        display_name: athleteName,
        is_anonymous: isAnon
      })
      .eq('phrase', cleanPhrase)
      .eq('is_claimed', false); // Ensure we don't steal a claimed run

    if (sprintId) query = query.eq('id', sprintId);

    const { data, error } = await query.select();

    if (data && data.length > 0) {
      alert('Sprint claimed successfully!');
      window.location.reload(); 
    } else {
      alert('Incorrect phrase or sprint already claimed.');
    }
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

  const renderAthleteName = (sprint) => {
    if (!sprint.is_claimed) return <span className="text-gray-500 italic">Unclaimed Sprint</span>;
    if (sprint.is_anonymous) return <span className="text-gray-700 font-medium">Anonymous Athlete</span>;
    return <span className="text-black font-bold">{sprint.display_name}</span>;
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <AuthHeader />

        {/* --- LOGGED IN USER SECTION --- */}
        {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-4">Claim by Phrase</h2>
              <form onSubmit={(e) => { e.preventDefault(); processClaim(null, manualPhrase, isAnonymousManual); }}>
                <input
                  type="text"
                  placeholder="e.g. turbo-red-hawk"
                  value={manualPhrase}
                  onChange={(e) => setManualPhrase(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg mb-3"
                  required
                />
                <div className="flex items-center gap-2 mb-4">
                  <input 
                    type="checkbox" 
                    id="anonManual" 
                    checked={isAnonymousManual} 
                    onChange={(e) => setIsAnonymousManual(e.target.checked)}
                  />
                  <label htmlFor="anonManual" className="text-sm text-gray-600">Keep this run anonymous</label>
                </div>
                <button type="submit" className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800">
                  Find & Claim
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">My Recent Sprints</h2>
                {mySprints.length > 3 && (
                  <button onClick={() => setShowAllHistory(!showAllHistory)} className="text-sm text-blue-600 hover:underline">
                    {showAllHistory ? 'Show Less' : 'View All'}
                  </button>
                )}
              </div>
              
              {mySprints.length === 0 ? (
                <p className="text-gray-400 text-sm">No sprints claimed yet.</p>
              ) : (
                <div className="space-y-3">
                  {(showAllHistory ? mySprints : mySprints.slice(0, 3)).map(sprint => (
                    <div key={sprint.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <div className="font-bold capitalize">{sprint.phrase.split('-').join(' ')}</div>
                        <div className="text-xs text-gray-400">{new Date(sprint.created_at).toLocaleDateString()} {sprint.is_anonymous && '(Anonymous)'}</div>
                      </div>
                      <div className="font-mono text-xl font-bold">{sprint.time_seconds.toFixed(2)}s</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- GLOBAL FEEDS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Feed 1: Recent Results */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-900 text-white font-bold">Live Feed: Recent Results</div>
            <div className="divide-y divide-gray-50">
              {recentGlobal.map(sprint => (
                <div key={sprint.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      {renderAthleteName(sprint)}
                      <div className="text-xs text-gray-400">
                        {new Date(sprint.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <div className="font-mono text-xl font-bold">{sprint.time_seconds.toFixed(2)}s</div>
                  </div>
                  
                  {!sprint.is_claimed && (
                    <div className="mt-2">
                      {claimingId === sprint.id ? (
                        <div className="space-y-2 mt-3 bg-gray-100 p-3 rounded-lg border border-gray-200">
                          <input
                            type="text"
                            placeholder="Enter 3-word phrase"
                            value={claimPhrase}
                            onChange={(e) => setClaimPhrase(e.target.value)}
                            className="px-3 py-2 border rounded text-sm w-full"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id={`anon-${sprint.id}`} 
                                checked={isAnonymousInline} 
                                onChange={(e) => setIsAnonymousInline(e.target.checked)}
                              />
                              <label htmlFor={`anon-${sprint.id}`} className="text-sm text-gray-600">Anonymous</label>
                            </div>
                            <button 
                              onClick={() => processClaim(sprint.id, claimPhrase, isAnonymousInline)} 
                              className="bg-black text-white px-4 py-1.5 rounded text-sm font-medium"
                            >
                              Verify
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => handleClaimClick(sprint.id)} className="text-sm text-blue-600 font-medium hover:underline">
                          + Claim this run
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feed 2: The Leaderboard */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2 justify-center">
              {['today', 'week', 'month', 'year', 'all-time'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                    filter === f ? 'bg-black text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {f.replace('-', ' ')}
                </button>
              ))}
            </div>
            
            <table className="w-full text-left">
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr><td className="p-8 text-center text-gray-400">No sprints found.</td></tr>
                ) : (
                  leaderboard.map((sprint, index) => (
                    <tr key={sprint.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 text-center font-bold text-gray-400 w-12">{index + 1}</td>
                      <td className="p-4">
                        {renderAthleteName(sprint)}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(sprint.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-lg font-bold">{sprint.time_seconds.toFixed(2)}s</td>
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
