import { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';

export default function DebugAuth() {
  const { user, isLoading, isError } = useUser();
  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Test direct API call
    const testApiCall = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        
        const result = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        };

        if (response.ok) {
          const data = await response.json();
          result.data = data;
        } else {
          const error = await response.text();
          result.error = error;
        }

        setDebugInfo(result);
      } catch (error) {
        setDebugInfo({
          fetchError: error instanceof Error ? error.message : String(error),
          error: 'Failed to fetch'
        });
      }
    };

    if (mounted) {
      testApiCall();
    }
  }, [mounted]);

  if (!mounted) {
    return <div>Mounting...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth Debug Page</h1>
      
      <h2>useUser Hook Results:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {JSON.stringify({ user, isLoading, isError }, null, 2)}
      </pre>

      <h2>Direct API Call Results:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>

      <h2>Current Cookies:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {document.cookie}
      </pre>

      <h2>Navigation Test:</h2>
      <button onClick={() => window.location.href = '/dashboard'}>
        Go to Dashboard (Direct)
      </button>
      {' '}
      <button onClick={() => window.location.href = '/login'}>
        Go to Login
      </button>
    </div>
  );
}