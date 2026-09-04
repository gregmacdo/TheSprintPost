"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeader from '../../components/AuthHeader';
import AthleteBadge from '../../components/AthleteBadge';

export default function SprintsByDatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const getTodayLocal = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  };
  
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());

  const [claimingId, setClaimingId] = useState(null);
  const [claimPhrase, setClaimPhrase] = useState('');
  const [isAnonymousInline, setIsAnonymousInline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!selectedDate) return;

      const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
      const endOfDay = new Date(`${selectedDate}T23:59:59.999`).toISOString();

      const { data } = await supabase
        .from('sprints')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      setSprints(data || []);
      setLoading(false);
    };

    fetchData();
  }, [selectedDate]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', { 
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
    
    const { data } = await supabase
      .from('sprints')
      .update(updatePayload)
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

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <AuthHeader />

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="p-6 md:p-8 bg-gray-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium mb-2 inline-block transition-colors">
                &larr; Back to Dashboard
              </Link>
              <h2 className="text-2xl font-bold">Find Sprints by Date</h2>
            </div>
            
            <div className="bg-white text-black p-1 rounded-lg shadow-inner">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-md font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Searching track records...</div>
            ) : sprints.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <span className="text-2xl block mb-2">💨</span>
                No sprints were recorded on this date.
              </div>
            ) : (
              sprints.map(sprint => (
                <div key={sprint.id} className="p-6 hover:bg-gray-50 transition-colors">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <AthleteBadge sprint={sprint} />
                      <div className="text-sm text-gray-500 mt-1">
                        {formatDateTime(sprint.created_at)}
                      </div>
                    </div>
                    <div className="font-mono text-3xl font-black tracking-tighter text-black border-t sm:border-0 border-gray-100 pt-4 sm:pt-0 w-full sm:w-auto text-left sm:text-right">
                      {sprint.time_seconds.toFixed(2)}s
                    </div>
                  </div>

                  {!sprint.is_claimed && (
                    <div className="mt-4">
                      {claimingId === sprint.id ? (
                        <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 max-w-md">
                          <input type="text" placeholder="Enter 3-word phrase" value={claimPhrase} onChange={(e) => setClaimPhrase(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm w-full mb-3 focus:outline-none focus:ring-2 focus:ring-black bg-white" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" id={`anon-${sprint.id}`} checked={isAnonymousInline} onChange={(e) => setIsAnonymousInline(e.target.checked)}/>
                              <label htmlFor={`anon-${sprint.id}`} className="text-sm text-gray-600 font-medium">Claim Anonymously</label>
                            </div>
                            <button onClick={() => processClaim(sprint.id, claimPhrase, isAnonymousInline)} className="bg-black text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors">Verify</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => handleClaimClick(sprint.id)} className="text-sm text-blue-600 font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg">+ Claim this run</button>
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
