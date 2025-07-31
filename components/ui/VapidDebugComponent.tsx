// components/ui/VapidDebugComponent.tsx
import { useState } from 'react';

export default function VapidDebugComponent() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkClientVapid = () => {
    setLoading(true);
    
    // This runs in the React app, so it can access Next.js environment variables
    const clientVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    
    fetch('/api/debug-client-vapid')
      .then(res => res.json())
      .then(serverData => {
        setResult({
          client: {
            vapidKey: clientVapidKey || 'NOT_AVAILABLE',
            hasKey: !!clientVapidKey,
            keyLength: clientVapidKey?.length || 0
          },
          server: serverData.server,
          match: clientVapidKey === serverData.server.publicKey,
          environment: serverData.environment
        });
        setLoading(false);
      })
      .catch(error => {
        setResult({ error: error.message });
        setLoading(false);
      });
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold mb-4">🔍 VAPID Key Debug (React Component)</h3>
      
      <button 
        onClick={checkClientVapid}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Check VAPID Keys'}
      </button>

      {result && (
        <div className="mt-4">
          <h4 className="font-bold">Results:</h4>
          <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          
          {result.match !== undefined && (
            <div className="mt-2 p-2 rounded" style={{
              backgroundColor: result.match ? '#d4edda' : '#f8d7da',
              color: result.match ? '#155724' : '#721c24'
            }}>
              <strong>Keys Match: {result.match ? '✅ YES' : '❌ NO'}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}