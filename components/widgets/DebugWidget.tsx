import React, { useState, useEffect } from 'react';
import { useUser } from "@stackframe/react";

const DebugWidget = () => {
  const user = useUser();
  const status = user ? "authenticated" : "unauthenticated";
const [debugInfo, setDebugInfo] = useState<any>(null);

if (!user) {
  return <div>Loading...</div>; // Or any other fallback UI
}
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
        <h4 className="font-semibold">user Status:</h4>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify({ status, user: user ? 'Present' : 'Missing' }, null, 2)}
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

      <div className="mt-4">
        <h4 className="font-semibold">Notifications:</h4>
        <div className="space-y-2 mt-2">
          <div className="flex flex-col space-y-2">
            <div className="text-sm text-gray-600">
              Service Worker Status: {
                'serviceWorker' in navigator
                  ? <span className="text-green-500">Supported</span>
                  : <span className="text-red-500">Not Supported</span>
              }
            </div>
            <div className="text-sm text-gray-600">
              Push API Status: {
                'PushManager' in window
                  ? <span className="text-green-500">Supported</span>
                  : <span className="text-red-500">Not Supported</span>
              }
            </div>
            <div className="text-sm text-gray-600">
              Notification Permission: {
                Notification.permission === 'granted'
                  ? <span className="text-green-500">Granted</span>
                  : Notification.permission === 'denied'
                    ? <span className="text-red-500">Denied</span>
                    : <span className="text-yellow-500">Not requested</span>
              }
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                try {
                  // Request permission if not granted
                  if (Notification.permission !== 'granted') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') {
                      alert('Notification permission denied');
                      return;
                    }
                  }
                  
                  // Send test notification via API
                  const res = await fetch('/api/notifications/test', {
                    method: 'POST',
                  });
                  
                  if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'Failed to send test notification');
                  }
                  
                  const data = await res.json();
                  alert(`Notification sent: ${data.message}`);
                } catch (err: any) {
                  console.error('Error sending test notification:', err);
                  alert(`Error: ${err.message}`);
                }
              }}
              className="px-2 py-1 bg-purple-500 text-white rounded text-sm"
              disabled={Notification.permission === 'denied'}
            >
              Test Push Notification
            </button>
            
            <button
              onClick={() => {
                // Show a local notification (not a push notification)
                if (Notification.permission === 'granted') {
                  new Notification('FlowHub Test', {
                    body: 'This is a local notification (not a push notification)',
                    icon: '/icons/icon-192x192.png'
                  });
                } else {
                  alert('Notification permission not granted');
                }
              }}
              className="px-2 py-1 bg-indigo-500 text-white rounded text-sm"
              disabled={Notification.permission === 'denied'}
            >
              Test Local Notification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugWidget;