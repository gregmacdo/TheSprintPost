"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeader from '../components/AuthHeader';
import dynamic from 'next/dynamic';

const ProgressionChart = dynamic(() => import('../components/ProgressionChart'), { ssr: false });

export default function MainPage() {
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); 
  
  const [recentGlobal, setRecentGlobal] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [mySprints, setMySprints] = useState([]);
  
  const [boardFilter, setBoardFilter] = useState('all-time');
  const [chartFilter, setChartFilter] = useState('month');

  const [manualPhrase, setManualPhrase] = useState('');
  const [isAnonymousManual, setIsAnonymousManual] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [claimPhrase, setClaimPhrase] = useState('');
  const [isAnonymousInline, setIsAnonymousInline] = useState(false);

  const [isSmartClaimOpen, setIsSmartClaimOpen] = useState(false);
  const [suggestedSprints, setSuggestedSprints] = useState([]);
  const [suggestedAnon, setSuggestedAnon] = useState({});

  useEffect(() => {
    setMounted(true); 
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: myData } = await supabase.from('sprints').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        setMySprints(myData || []);
      }

      const { data: recentData } = await supabase.from('sprints').select('*').order('created_at', { ascending: false }).limit(10);
      setRecentGlobal(recentData || []);

      let query = supabase.from('sprints').select('*').order('time_seconds', { ascending: true }).limit(10);
      if (boardFilter !== 'all-time') {
        const pastDate = new Date();
        if (boardFilter === 'today') pastDate.setHours(pastDate.getHours() - 24);
        if (boardFilter === 'week') pastDate.setDate(pastDate.getDate() - 7);
        if (boardFilter === 'month') pastDate.setDate(pastDate.getDate() - 30);
        if (boardFilter === 'year') pastDate.setDate(pastDate.getDate() - 365);
        query = query.gte('created_at', pastDate.toISOString());
      }
      const { data: boardData } = await query;
      setLeaderboard(boardData || []);
      setLoading(false);
    };
    fetchData();
  }, [boardFilter]); 

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const renderAthleteName = (sprint) => {
    if (!sprint.is_claimed) return <span className="text-gray-500 italic">Unclaimed Sprint</span>;
    if (sprint.is_anonymous) return <span className="text-gray-700 font-medium">Anonymous Athlete</span>;
    
    return (
      <div className="flex items-center gap-2">
        {sprint.athlete_avatar && (
          {/* BYPASSING TAILWIND WITH INLINE STYLES FOR THE SPRINT LIST (24px) */}
          <img 
            src={sprint.athlete_avatar} 
            alt="Avatar" 
            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }} 
          />
        )}
        <span className="text-black font-bold flex items-center gap-1">
          {sprint.display_name}
          {sprint.athlete_over_40 && <span title="Masters (40+)" className="text-xs">🌟</span>}
          {sprint.athlete_clydesdale && <span title="Clydesdale/Athena" className="text-xs">🐴</span>}
        </span>
      </div>
    );
  };

  const processClaim = async (sprintId, phraseToTest, isAnon) => {
    const cleanPhrase = phraseToTest.toLowerCase().trim();
    const meta = user.user_metadata || {};
    const athleteName = meta.display_name || 'Runner';
    
    const updatePayload = {
      is_claimed: true,
      user_id: user.id,
      display_name: athleteName,
      is_anonymous: isAnon,
      athlete_gender: meta.gender || 'Prefer not to say',
      athlete_over_40: meta.is_over_40 || false,
      athlete_clydesdale: meta.is_clydesdale || false,
      athlete_avatar: meta.avatar_url || null
    };

    let query = supabase.from('sprints').update(updatePayload).eq('phrase', cleanPhrase).eq('is_claimed', false);
    if (sprintId) query = query.eq('id', sprintId);

    const { data } = await query.select();
    if (data && data.length > 0) {
      const claimedSprint = data[0];
      const sprintTime = new Date(claimedSprint.created_at);
      const windowStart = new Date(sprintTime.getTime() - 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(sprintTime.getTime() + 60 * 60 * 1000).toISOString();
      const { data: nearbyData } = await supabase.from('sprints').select('*').eq('is_claimed', false).gte('created_at', windowStart).lte('created_at', windowEnd).neq('id', claimedSprint.id);

      if (nearbyData && nearbyData.length > 0) {
        setSuggestedSprints(nearbyData);
        setIsSmartClaimOpen(true);
      } else {
        alert('Sprint claimed successfully!');
        window.location.reload(); 
      }
    } else { alert('Incorrect phrase or sprint already claimed.'); }
  };

  const submitSuggestedClaim = async (sprintId) => {
    const isAnon = suggestedAnon[sprintId] || false;
    const meta = user.user_metadata || {};
    const athleteName = meta.display_name || 'Runner';
    
    const updatePayload = {
      is_claimed: true,
      user_id: user.id,
      display_name: athleteName,
      is_anonymous: isAnon,
      athlete_gender: meta.gender || 'Prefer not to say',
      athlete_over_40: meta.is_over_40 || false,
      athlete_clydesdale: meta.is_clydesdale || false,
      athlete_avatar: meta.avatar_url || null
    };

    const { data } = await supabase.from('sprints').update(updatePayload).eq('id', sprintId).eq('is_claimed', false).select();
    if (data && data.length > 0) {
      const remaining = suggestedSprints.filter(s => s.id !== sprintId);
      setSuggestedSprints(remaining);
      if (remaining.length === 0) window.location.reload();
    } else { alert('Could not claim this sprint.'); }
  };

  const handleUnclaim = async (sprintId) => {
    if (!confirm("Are you sure you want to un-claim this sprint?")) return;
    const { error } = await supabase.from('sprints').update({ is_claimed: false, user_id: null, display_name: null, is_anonymous: false }).eq('id', sprintId).eq('user_id', user.id); 
    if (!error) window.location.reload();
  };

  const getFilteredChartData = () => {
    const now = new Date().getTime();
    const filtered = mySprints.filter(sprint => {
      if (chartFilter === 'all-time') return true;
      const date = new Date(sprint.created_at).getTime();
      if (chartFilter === 'week') return (now - date) < 7 * 24 * 60 * 60 * 1000;
      if (chartFilter === 'month') return (now - date) < 30 * 24 * 60 * 60 * 1000;
      if (chartFilter === 'year') return (now - date) < 365 * 24 * 60 * 60 * 1000;
      return true;
    });
    
    return [...filtered].reverse().map((sprint, index) => ({
      name: `Run ${index + 1}`,
      time: Number(sprint.time_seconds) || 0,
      fullDate: formatDateTime(sprint.created_at) 
    }));
  };

  const chartData = getFilteredChartData();

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900 relative">
      
      {isSmartClaimOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">Did you run these too? ⚡</h2>
            <div className="space-y-4 mb-8">
              {suggestedSprints.map(sprint => (
                <div key={sprint.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-mono text-2xl font-bold">{sprint.time_seconds.toFixed(2)}s</div>
                    <div className="text-sm text-gray-500">{formatDateTime(sprint.created_at)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id={`suggest-anon-${sprint.id}`} checked={suggestedAnon[sprint.id] || false} onChange={(e) => setSuggestedAnon({...suggestedAnon, [sprint.id]: e.target.checked})}/>
                      <label htmlFor={`suggest-anon-${sprint.id}`} className="text-sm text-gray-600">Anonymous</label>
                    </div>
                    <button onClick={() => submitSuggestedClaim(sprint.id)} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 shrink-0">Claim</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => window.location.reload()} className="w-full bg-gray-100 text-black py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">I'm Done</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-12">
        <AuthHeader />

        {user && (
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 md:p-8 bg-gray-900 text-white flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Dashboard</h2>
            </div>
            
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
              <div className="lg:col-span-1 flex flex-col gap-8">
                
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <h3 className="font-bold text-lg mb-4">Claim by Phrase</h3>
                  <form onSubmit={(e) => { e.preventDefault(); processClaim(null, manualPhrase, isAnonymousManual); }}>
                    <input type="text" placeholder="e.g. turbo-red-hawk" value={manualPhrase} onChange={(e) => setManualPhrase(e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-3" required/>
                    <div className="flex items-center gap-2 mb-4">
                      <input type="checkbox" id="anonManual" checked={isAnonymousManual} onChange={(e) => setIsAnonymousManual(e.target.checked)}/>
                      <label htmlFor="anonManual" className="text-sm text-gray-600">Keep this run anonymous</label>
                    </div>
                    <button type="submit" className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800">Find & Claim</button>
                  </form>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">My Latest Sprints</h3>
                    <Link href="/my-sprints" className="text-sm text-blue-600 font-medium hover:underline">View All &rarr;</Link>
                  </div>
                  {mySprints.length === 0 ? (
                    <p className="text-gray-400 text-sm">No sprints claimed yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {mySprints.slice(0, 10).map(sprint => (
                        <div key={sprint.id} className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <div>
                            <div className="font-bold capitalize text-black">{sprint.phrase.split('-').join(' ')}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(sprint.created_at)} {sprint.is_anonymous && '(Anon)'}</div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="font-mono text-lg font-bold">{sprint.time_seconds.toFixed(2)}s</div>
                            <button onClick={() => handleUnclaim(sprint.id)} className="text-xs text-red-500 font-medium hover:underline mt-1">Unclaim</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">My Progression</h3>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {['week', 'month', 'year', 'all-time'].map(f => (
                      <button key={f} onClick={() => setChartFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-colors ${chartFilter === f ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}>
                        {f.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                
                {chartData.length > 1 ? (
                  <div className="w-full mt-4 relative">
                    {mounted && <ProgressionChart data={chartData} />}
                  </div>
                ) : chartData.length === 1 ? (
                   <div className="h-[300px] w-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-white">
                    <span className="text-2xl mb-2">🏃</span>
                    <p className="text-sm font-medium text-black">First sprint logged!</p>
                    <p className="text-xs mt-1">Log one more sprint to see your progression line chart.</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl bg-white">
                    <span className="text-2xl mb-2">🏁</span>
                    <p className="text-sm">Log some sprints to see your progress!</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-bold whitespace-nowrap">Live Feed</h3>
                <Link href="/sprints-by-date" className="text-sm text-blue-600 font-medium hover:underline">
                  Find sprints by date &rarr;
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {recentGlobal.map(sprint => (
                  <div key={sprint.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        {renderAthleteName(sprint)}
                        <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(sprint.created_at)}</div>
                      </div>
                      <div className="font-mono text-xl font-bold">{sprint.time_seconds.toFixed(2)}s</div>
                    </div>
                    
                    {!sprint.is_claimed && (
                      <div className="mt-2">
                        {claimingId === sprint.id ? (
                          <div className="space-y-2 mt-3 bg-gray-100 p-3 rounded-lg border border-gray-200">
                            <input type="text" placeholder="Enter 3-word phrase" value={claimPhrase} onChange={(e) => setClaimPhrase(e.target.value)} className="px-3 py-2 border border-gray-200 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-black"/>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`anon-${sprint.id}`} checked={isAnonymousInline} onChange={(e) => setIsAnonymousInline(e.target.checked)}/>
                                <label htmlFor={`anon-${sprint.id}`} className="text-sm text-gray-600">Anonymous</label>
                              </div>
                              <button onClick={() => processClaim(sprint.id, claimPhrase, isAnonymousInline)} className="bg-black text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-800">Verify</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { if(!user) router.push('/login'); else setClaimingId(sprint.id); }} className="text-sm text-blue-600 font-medium hover:underline">+ Claim this run</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold">Leaderboard</h3>
                <Link href="/leaderboard" className="text-sm text-blue-600 font-medium hover:underline">View All &rarr;</Link>
              </div>
              
              <div className="p-3 bg-white border-b border-gray-100 flex flex-wrap gap-2 justify-center">
                {['today', 'week', 'month', 'year', 'all-time'].map(f => (
                  <button key={f} onClick={() => setBoardFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${boardFilter === f ? 'bg-black text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
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
                          <div className="text-xs text-gray-400 mt-1">{formatDateTime(sprint.created_at)}</div>
                        </td>
                        <td className="p-4 text-right font-mono text-lg font-bold">{sprint.time_seconds.toFixed(2)}s</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}
