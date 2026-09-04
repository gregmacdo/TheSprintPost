"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeader from '../../components/AuthHeader';

export default function MySprintsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mySprints, setMySprints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'time'

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);

      // Fetch user's sprints, limit to 100
      let query = supabase
        .from('sprints')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(100);

      // Apply sorting based on state
      if (sortBy === 'time') {
        query = query.order('time_seconds', { ascending: true }); // Fastest first
      } else {
        query = query.order('created_at', { ascending: false }); // Newest first
      }

      const { data: myData } = await query;
      setMySprints(myData || []);
      setLoading(false);
    };

    fetchUserData();
  }, [router, sortBy]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const handleUnclaim = async (sprintId) => {
    if (!confirm("Are you sure you want to un-claim this sprint? It will become public and require the 3-word phrase to claim again.")) return;

    const { error } = await supabase
      .from('sprints')
      .update({ is_claimed: false, user_id: null, display_name: null, is_anonymous: false })
      .eq('id', sprintId)
      .eq('user_id', user.id); 

    if (!error) {
      setMySprints(mySprints.filter(sprint => sprint.id !== sprintId));
    } else {
      alert("Something went wrong trying to unclaim.");
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
              <h2 className="text-2xl font-bold">My Full Sprint History</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Sorting Dropdown */}
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
              >
                <option value="date">Sort by Newest</option>
                <option value="time">Sort by Fastest</option>
              </select>
              
              <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold border border-gray-700 whitespace-nowrap">
                Top {mySprints.length} Sprints
              </div>
            </div>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading your history...</div>
            ) : mySprints.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                You haven't claimed any sprints yet. Get out there and run!
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mySprints.map((sprint, index) => (
                  <div key={sprint.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    <div className="flex items-center gap-4">
                      {/* Show rank number when sorting by fastest time */}
                      {sortBy === 'time' && (
                        <div className="w-8 h-8 flex-shrink-0 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                      )}
                      <div>
                        <div className="font-bold capitalize text-lg text-black mb-1">
                          {sprint.phrase.split('-').join(' ')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateTime(sprint.created_at)} 
                          {sprint.is_anonymous && ' • (Anonymous)'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 border-gray-100 pt-4 sm:pt-0 mt-2 sm:mt-0">
                      <div className="font-mono text-3xl font-black tracking-tighter">
                        {sprint.time_seconds.toFixed(2)}s
                      </div>
                      <button 
                        onClick={() => handleUnclaim(sprint.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                      >
                        Unclaim
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
