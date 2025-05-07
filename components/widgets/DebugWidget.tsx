import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const DebugWidget = () => {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/debug');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setDebugInfo(data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching debug info:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) {
    return <div className="p-4 border rounded-lg shadow-sm">Loading debug info...</div>;
  }

  if (error) {
    return <div className="p-4 border rounded-lg shadow-sm text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="font-bold mb-2">Debug Information</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold">Session Status:</h4>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify({ status, session: session ? 'Present' : 'Missing' }, null, 2)}
        </pre>
      </div>
      
      <div className="mb-4">
        <h4 className="font-semibold">API Authentication:</h4>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
      
      <div>
        <h4 className="font-semibold">API Endpoints Status:</h4>
        <div className="space-y-2 mt-2">
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/tasks');
                const data = await res.json();
                alert(`Tasks API: ${res.status} ${res.statusText}\n\nData: ${JSON.stringify(data).substring(0, 100)}...`);
              } catch (err: any) {
                alert(`Error: ${err.message}`);
              }
            }}
            className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
          >
            Test Tasks API
          </button>
          
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/userSettings');
                const data = await res.json();
                alert(`Settings API: ${res.status} ${res.statusText}\n\nData: ${JSON.stringify(data).substring(0, 100)}...`);
              } catch (err: any) {
                alert(`Error: ${err.message}`);
              }
            }}
            className="px-2 py-1 bg-green-500 text-white rounded text-sm ml-2"
          >
            Test Settings API
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugWidget;