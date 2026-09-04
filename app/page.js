"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AuthHeader from '../components/AuthHeader';

export default function DashboardPage() {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSprints = async () => {
      // Assuming your table is named 'sprints' and has a 'created_at' and 'sprint_time' column
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setSprints(data);
      }
      setLoading(false);
    };

    fetchSprints();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <AuthHeader />
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8 bg-gray-900 text-white flex justify-between items-center">
            <h2 className="text-2xl font-bold">Sprint Leaderboard</h2>
          </div>
          
          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500 font-medium animate-pulse">
                Loading sprints...
              </div>
            ) : sprints.length === 0 ? (
              <div className="p-10 text-center text-gray-500 font-medium">
                No sprints recorded yet. Time to hit the track!
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sprints.map((sprint) => (
                  <li key={sprint.id} className="p-5 md:p-6 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4">
                      {/* THIS IS THE TINY w-8 h-8 PERFECTLY CIRCULAR CONTAINER */}
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-transparent flex-shrink-0">
                        {sprint.athlete_avatar ? (
                          <img 
                            src={sprint.athlete_avatar} 
                            alt={sprint.display_name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs">👤</div>
                        )}
                      </div>
                      
                      <div>
                        <p className="font-bold text-gray-900">{sprint.display_name || 'Unknown Athlete'}</p>
                        <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{sprint.athlete_gender || 'Unspecified'}</span>
                          {sprint.athlete_over_40 && <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium text-gray-600">Masters</span>}
                          {sprint.athlete_clydesdale && <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium text-gray-600">Clydesdale</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl md:text-2xl font-black font-mono tracking-tighter">
                        {sprint.sprint_time ? `${sprint.sprint_time.toFixed(2)}s` : '--'}
                      </span>
                    </div>
                    
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
