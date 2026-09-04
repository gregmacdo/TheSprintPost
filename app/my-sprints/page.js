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

  useEffect(() => {
    const fetchUserData = async () => {
      // Get logged-in user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Bounce them back to login if they aren't authenticated
        router.push('/login');
        return;
      }
      
      setUser(session.user);

      // Fetch ALL of their sprints, no limits
      const { data: myData } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      setMySprints(myData || []);
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handleUnclaim = async (sprintId) => {
    if (!confirm("Are you sure you want to un-claim this sprint? It will become public and require the 3-word phrase to claim again.")) return;

    const { error } = await supabase
      .from('sprints')
      .update({ 
        is_claimed: false,
        user_id: null,
        display_name: null,
        is_anonymous: false
      })
      .eq('id', sprintId)
      .eq('user_id', user.id); // Security check to ensure they own it

    if (!error) {
      // Instead of refreshing the page, we dynamically remove it from the list
      // so the UI feels instantly responsive!
      setMySprints(mySprints.filter(sprint => sprint.id !== sprintId));
    } else {
      alert("Something went wrong trying to unclaim.");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

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
              <h2 className="text-2xl font-bold">My Full Sprint History</h2>
            </div>
            <div className="bg-gray-800 px-4 py-2 rounded-lg text-sm font-bold border border-gray-700">
              Total Sprints: {mySprints.length}
            </div>
          </div>

          {/* Sprints List */}
          <div className="p-0">
            {mySprints.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                You haven't claimed any sprints yet. Get out there and run!
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mySprints.map(sprint => (
                  <div key={sprint.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    {/* Left Side: Details */}
                    <div>
                      <div className="font-bold capitalize text-lg text-black mb-1">
                        {sprint.phrase.split('-').join(' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(sprint.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(sprint.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                        {sprint.is_anonymous && ' • (Anonymous)'}
                      </div>
                    </div>
                    
                    {/* Right Side: Time & Action */}
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
