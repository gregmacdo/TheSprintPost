import { createClient } from '@supabase/supabase-js';

export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch test data directly inside the React Server Component
  const { data: sprints, error } = await supabase.from('sprints').select('*');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '3rem', textAlign: 'center' }}>
      <h1>Database Connection Test ⚡</h1>

      {error ? (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          <p>❌ Connection Error:</p>
          <code>{error.message}</code>
        </div>
      ) : (
        <div style={{ color: 'green', marginTop: '1rem' }}>
          <p>✅ Successfully connected to Supabase!</p>
          <h3>Data fetched from database:</h3>
          <pre style={{ 
            background: '#f4f4f4', 
            padding: '1rem', 
            borderRadius: '8px', 
            display: 'inline-block', 
            textAlign: 'left',
            color: '#333'
          }}>
            {JSON.stringify(sprints, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
