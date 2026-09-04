import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AuthHeader from '../components/AuthHeader';

// Forces Vercel to dynamically fetch fresh data on every page load
export const dynamic = 'force-dynamic';

export default async function LeaderboardPage(props) {
  // In Next.js 15, searchParams is awaited
  const searchParams = await props.searchParams;
  const filter = searchParams?.filter || 'all-time';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Build the base query: fetch the top 50 fastest times
  let query = supabase
    .from('sprints')
    .select('*')
    .order('time_seconds', { ascending: true })
    .limit(50);

  // 2. Apply time horizon filters based on the selected tab
  if (filter !== 'all-time') {
    const now = new Date();
    let pastDate = new Date();
    
    if (filter === 'today') pastDate.setHours(now.getHours() - 24);
    else if (filter === 'week') pastDate.setDate(now.getDate() - 7);
    else if (filter === 'month') pastDate.setDate(now.getDate() - 30);
    else if (filter === 'year') pastDate.setDate(now.getDate() - 365);
    
    // Filter where created_at is Greater Than or Equal to (gte) the past date
    query = query.gte('created_at', pastDate.toISOString());
  }

  const { data: sprints, error } = await query;

  // Tab definitions
  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'all-time', label: 'All Time' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto">
        <AuthHeader />

        {/* Filter Tabs */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2 justify-center">
          {tabs.map((tab) => (
            <Link 
              key={tab.id}
              href={`/?filter=${tab.id}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.id 
                  ? 'bg-black text-white shadow-md' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-red-500">Error loading sprints.</div>
          ) : sprints?.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No sprints recorded for this timeframe yet.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm">
                  <th className="p-4 font-medium w-16 text-center">Rank</th>
                  <th className="p-4 font-medium">Runner</th>
                  <th className="p-4 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {sprints.map((sprint, index) => {
                  const date = new Date(sprint.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  
                  return (
                    <tr key={sprint.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-center font-semibold text-gray-400">
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800 capitalize">
                          {/* Replaces hyphens with spaces (e.g., Brave Blue Cheetah) */}
                          {sprint.phrase.split('-').join(' ')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {date} {sprint.is_claimed ? '• Claimed ✓' : '• Unclaimed'}
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-xl font-bold text-black">
                        {sprint.time_seconds.toFixed(2)}s
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
