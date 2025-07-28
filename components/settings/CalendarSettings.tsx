import React, { useState, useEffect } from 'react';
import { UserSettings, CalendarSource } from '../../types/app';

type CalItem = { id: string; summary: string; primary?: boolean };
type CalendarSourceType = "google" | "o365" | "apple" | "ical" | "other";

interface CalendarSettingsProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
  calendars: CalItem[];
  newCalendarSource: Partial<CalendarSource>;
  setNewCalendarSource: React.Dispatch<React.SetStateAction<Partial<CalendarSource>>>;
  editingCalendarSourceIndex: number | null;
  setEditingCalendarSourceIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showCalendarForm: boolean;
  setShowCalendarForm: React.Dispatch<React.SetStateAction<boolean>>;
  newCalendarTag: string;
  setNewCalendarTag: React.Dispatch<React.SetStateAction<string>>;
}

const CalendarSettings: React.FC<CalendarSettingsProps> = ({
  settings,
  onSettingsChange,
  calendars,
  newCalendarSource,
  setNewCalendarSource,
  editingCalendarSourceIndex,
  setEditingCalendarSourceIndex,
  showCalendarForm,
  setShowCalendarForm,
  newCalendarTag,
  setNewCalendarTag
}) => {
  const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'connected' | 'error' | 'checking' }>({});
  const [testingUrl, setTestingUrl] = useState<string | null>(null);

  // Test Google Calendar connection
  const testGoogleConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, google: 'checking' }));
    try {
      const response = await fetch('/api/calendar/list');
      if (response.ok) {
        const calendars = await response.json();
        setConnectionStatus(prev => ({ ...prev, google: 'connected' }));
        return true;
      } else {
        setConnectionStatus(prev => ({ ...prev, google: 'error' }));
        return false;
      }
    } catch (error) {
      console.error('Error testing Google connection:', error);
      setConnectionStatus(prev => ({ ...prev, google: 'error' }));
      return false;
    }
  };

  // Test Power Automate URL
  const testPowerAutomateUrl = async (url: string) => {
    setTestingUrl(url);
    try {
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Power Automate URL test successful:', data);
        alert('Power Automate URL is working correctly!');
        return true;
      } else {
        console.error('Power Automate URL test failed:', response.status);
        alert(`Power Automate URL test failed with status ${response.status}. Please check the URL.`);
        return false;
      }
    } catch (error) {
      console.error('Error testing Power Automate URL:', error);
      alert('Error testing Power Automate URL. Please check the URL and try again.');
      return false;
    } finally {
      setTestingUrl(null);
    }
  };

  // Test iCal URL
  const testICalUrl = async (url: string) => {
    setTestingUrl(url);
    try {
      const response = await fetch('/api/calendar/test-ical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('iCal URL test successful:', result);
        alert(`iCal URL is working correctly! Found ${result.eventCount || 0} events.`);
        return true;
      } else {
        const errorData = await response.json();
        console.error('iCal URL test failed:', errorData);
        
        // Show detailed error message for PowerAutomate issues
        if (errorData.error === 'PowerAutomate URL timeout') {
          alert(`PowerAutomate Logic App Timeout (${errorData.timeout})\n\n${errorData.details}\n\nRecommendations:\n${errorData.recommendations.map((rec: string) => `• ${rec}`).join('\n')}`);
        } else if (errorData.error === 'PowerAutomate Logic App format issue') {
          alert(`PowerAutomate Format Issue Detected\n\n${errorData.details}\n\nIssue: ${errorData.issue}\n\nHow to Fix:\n${errorData.recommendations.map((rec: string) => `• ${rec}`).join('\n')}\n\nResponse Preview:\n${errorData.responsePreview}`);
        } else {
          alert(`iCal URL test failed: ${errorData.error || 'Unknown error'}`);
        }
        return false;
      }
    } catch (error) {
      console.error('Error testing iCal URL:', error);
      alert('Error testing iCal URL. Please check the URL and try again.');
      return false;
    } finally {
      setTestingUrl(null);
    }
  };

  // Check connection status on component mount
  useEffect(() => {
    testGoogleConnection();
  }, []);

  const getConnectionStatusIcon = (status: 'connected' | 'error' | 'checking') => {
    switch (status) {
      case 'connected':
        return <span className="text-green-500">✓</span>;
      case 'error':
        return <span className="text-red-500">✗</span>;
      case 'checking':
        return <span className="text-yellow-500 animate-spin">⟳</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Summary */}
      <section className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
        <h3 className="text-lg font-medium mb-3">Calendar Connection Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Google Calendar</span>
            <div className="flex items-center gap-2">
              {getConnectionStatusIcon(connectionStatus.google)}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus.google === 'connected' ? 'Connected' : 
                 connectionStatus.google === 'error' ? 'Not Connected' : 'Checking...'}
              </span>
              {connectionStatus.google === 'error' ? (
                <button
                  onClick={testGoogleConnection}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Retry
                </button>
              ) : connectionStatus.google === 'connected' ? (
                <button
                  onClick={() => {
                    const refreshUrl = `/api/calendar/connect?provider=google&refresh=true`;
                    window.location.href = refreshUrl;
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Refresh Calendars
                </button>
              ) : null}
            </div>
          </div>
          {settings.calendarSources?.filter(s => s.type === 'o365').map(source => (
            <div key={source.id} className="flex items-center justify-between">
              <span className="truncate">{source.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => source.connectionData && testPowerAutomateUrl(source.connectionData)}
                  disabled={testingUrl === source.connectionData}
                  className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                >
                  {testingUrl === source.connectionData ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          ))}
          {settings.calendarSources?.filter(s => s.type === 'ical').map(source => (
            <div key={source.id} className="flex items-center justify-between">
              <span className="truncate">{source.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => source.connectionData && testICalUrl(source.connectionData)}
                  disabled={testingUrl === source.connectionData}
                  className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                >
                  {testingUrl === source.connectionData ? 'Testing...' : 'Test'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Calendar Sources */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 overflow-hidden">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h2 className="text-lg font-medium">Calendar Sources</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const googleAuthUrl = `/api/calendar/connect?provider=google`;
                window.location.href = googleAuthUrl;
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Add Google Calendar
            </button>
            <button
              onClick={async () => {
                const powerAutomateUrl = prompt(
                  "Please enter your Power Automate URL:\n\n" +
                  "This should be a HTTP endpoint that returns calendar events in JSON format.\n" +
                  "Example: https://prod-xx.westus.logic.azure.com:443/workflows/xxx/triggers/manual/paths/invoke?..."
                );
                if (powerAutomateUrl && powerAutomateUrl.trim()) {
                  if (!powerAutomateUrl.startsWith('http')) {
                    alert('Please enter a valid HTTP URL');
                    return;
                  }
                  
                  // Test the URL first to make sure it works
                  const isWorking = await testPowerAutomateUrl(powerAutomateUrl.trim());
                  if (!isWorking) {
                    const proceed = confirm(
                      "The Power Automate URL test failed. This could be due to:\n" +
                      "- Network issues\n" +
                      "- CORS configuration\n" +
                      "- The URL being temporarily unavailable\n\n" +
                      "Do you want to add it anyway? You can test it again later."
                    );
                    if (!proceed) {
                      return;
                    }
                  }
                  
                  // Create a new calendar source for the Power Automate URL
                  const newSource: CalendarSource = {
                    id: `o365_${Date.now()}`,
                    name: "Work Calendar (O365)",
                    type: "o365",
                    sourceId: "default",
                    connectionData: powerAutomateUrl.trim(),
                    tags: ["work"],
                    isEnabled: true,
                  };
                  
                  console.log('Adding Power Automate source:', newSource);
                  const updatedSources = settings.calendarSources ? [...settings.calendarSources, newSource] : [newSource];
                  console.log('Updated calendar sources count:', updatedSources.length);
                  
                  const newSettings = {
                    ...settings,
                    calendarSources: updatedSources,
                    powerAutomateUrl: powerAutomateUrl.trim(), // Keep legacy field for backward compatibility
                  };
                  
                  console.log('Saving settings with Power Automate source...');
                  await onSettingsChange(newSettings);
                  
                  alert('✅ Power Automate URL added successfully!\n\nYour calendar events will now sync from this source.');
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Add Power Automate URL
            </button>
            <button
              onClick={() => {
                const calendarName = prompt("Please enter a name for this calendar:", "My iCal Calendar");
                if (!calendarName || !calendarName.trim()) {
                  return;
                }
                
                const icalUrl = prompt(
                  "Please enter your iCal URL:\n\n" +
                  "📅 GOOGLE CALENDAR SECRET URL:\n" +
                  "Go to Google Calendar Settings → [Calendar Name] → Integrate Calendar → Copy 'Secret address in iCal format'\n" +
                  "Format: https://calendar.google.com/calendar/ical/[email]/private-[secret]/basic.ics\n\n" +
                  "🏢 OUTLOOK/OFFICE 365:\n" +
                  "Go to Outlook Calendar Settings → Shared Calendars → Publish → Copy ICS link\n" +
                  "Format: https://outlook.live.com/calendar/published/[id]/calendar.ics\n\n" +
                  "🔗 OTHER ICAL FEEDS:\n" +
                  "• PowerAutomate Logic Apps: https://[region].logic.azure.com/workflows/.../invoke\n" +
                  "• Public calendars: https://example.com/calendar.ics\n" +
                  "• Webcal links: webcal://example.com/calendar.ics\n\n" +
                  "⚠️ IMPORTANT: Use SECRET/PRIVATE URLs for your own calendars for security!"
                );
                if (icalUrl && icalUrl.trim()) {
                  let processedUrl = icalUrl.trim();
                  
                  // Convert webcal:// to https://
                  if (processedUrl.startsWith('webcal://')) {
                    processedUrl = 'https://' + processedUrl.substring(9);
                  }
                  
                  if (!processedUrl.startsWith('http')) {
                    alert('Please enter a valid HTTP/HTTPS URL or webcal:// URL');
                    return;
                  }
                  
                  // Detect calendar provider and set appropriate defaults
                  let calendarProvider = "other";
                  let defaultTags = ["personal"];
                  
                  if (processedUrl.includes('calendar.google.com')) {
                    calendarProvider = "Google Calendar (iCal)";
                    if (processedUrl.includes('/private-')) {
                      defaultTags = ["personal", "google-secret"];
                    } else {
                      defaultTags = ["personal", "google-public"];
                    }
                  } else if (processedUrl.includes('outlook.live.com') || processedUrl.includes('outlook.office365.com')) {
                    calendarProvider = "Outlook Calendar (iCal)";
                    defaultTags = ["personal", "outlook"];
                  } else if (processedUrl.includes('logic.azure.com')) {
                    calendarProvider = "PowerAutomate (iCal)";
                    defaultTags = ["work", "powerautomate"];
                  }
                  
                  // Create a new calendar source for the iCal URL
                  const newSource: CalendarSource = {
                    id: `ical_${Date.now()}`,
                    name: calendarName.trim(),
                    type: "ical",
                    sourceId: "default",
                    connectionData: processedUrl,
                    tags: defaultTags,
                    isEnabled: true,
                  };
                  
                  const updatedSources = settings.calendarSources ? [...settings.calendarSources, newSource] : [newSource];
                  
                  onSettingsChange({
                    ...settings,
                    calendarSources: updatedSources,
                  });
                  
                  // Show helpful message based on provider
                  if (processedUrl.includes('calendar.google.com') && processedUrl.includes('/private-')) {
                    alert(`✅ Google Calendar secret URL added successfully!\n\nThis is a secure private feed that only you can access. Your calendar events will sync automatically.\n\nNote: If you regenerate the secret URL in Google Calendar, you'll need to update it here.`);
                  } else if (processedUrl.includes('outlook.live.com') || processedUrl.includes('outlook.office365.com')) {
                    alert(`✅ Outlook Calendar URL added successfully!\n\nYour Outlook calendar events will sync automatically.\n\nNote: If you change the publishing settings in Outlook, you may need to update the URL here.`);
                  } else if (processedUrl.includes('logic.azure.com')) {
                    alert(`✅ PowerAutomate iCal URL added successfully!\n\nThis Logic App will generate your calendar events in iCal format.\n\nNote: Make sure your Logic App is published and publicly accessible.`);
                  }
                }
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Add iCal Calendar
            </button>
          </div>
        </div>
        
        {/* Calendar Sources List */}
        <div className="space-y-4 mb-6">
          {settings.calendarSources && settings.calendarSources.length > 0 ? (
            settings.calendarSources.map((source, index) => (
              <div key={source.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-lg">{source.name}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {source.type === "google" ? "Google Calendar" :
                       source.type === "o365" ? "Microsoft 365" :
                       source.type === "apple" ? "Apple Calendar" :
                       source.type === "ical" ? "iCal Feed" : "Other Calendar"}
                    </div>
                    {source.connectionData && (source.type === "o365" || source.type === "ical") && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 break-all">
                        URL: {source.connectionData.length > 60 ? 
                          `${source.connectionData.substring(0, 60)}...` : 
                          source.connectionData}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={source.isEnabled}
                        onChange={() => {
                          onSettingsChange({
                            ...settings,
                            calendarSources: settings.calendarSources?.map((source, i) => 
                              i === index ? { ...source, isEnabled: !source.isEnabled } : source
                            )
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {source.isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                    {source.type === "o365" && source.connectionData && (
                      <button
                        onClick={() => testPowerAutomateUrl(source.connectionData!)}
                        disabled={testingUrl === source.connectionData}
                        className="text-xs text-green-600 hover:text-green-800 underline disabled:opacity-50"
                      >
                        {testingUrl === source.connectionData ? 'Testing...' : 'Test URL'}
                      </button>
                    )}
                    {source.type === "ical" && source.connectionData && (
                      <button
                        onClick={() => testICalUrl(source.connectionData!)}
                        disabled={testingUrl === source.connectionData}
                        className="text-xs text-green-600 hover:text-green-800 underline disabled:opacity-50"
                      >
                        {testingUrl === source.connectionData ? 'Testing...' : 'Test URL'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setNewCalendarSource({...source});
                        setEditingCalendarSourceIndex(index);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove "${source.name}"?`)) {
                          onSettingsChange({
                            ...settings,
                            calendarSources: settings.calendarSources?.filter((_, i) => i !== index)
                          });
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="mt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tags:</div>
                  <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                    {source.tags && source.tags.length > 0 ? (
                      source.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6v6m8-6v6M6 7h12l-1 14H7L6 7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Calendar Sources</h3>
              <p className="mb-4">Connect your calendars to see events in FloHub</p>
              <div className="space-y-2 text-sm">
                <p>• <strong>Google Calendar:</strong> Full sync with your Google events</p>
                <p>• <strong>Power Automate:</strong> Connect Office 365 or other calendar systems</p>
                <p>• <strong>iCal Feed:</strong> Subscribe to private/secret iCal URLs (Google, Outlook) or public feeds</p>
              </div>
              <div className="mt-6 space-x-2">
                <button
                  onClick={() => {
                    const googleAuthUrl = `/api/calendar/connect?provider=google`;
                    window.location.href = googleAuthUrl;
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
                >
                  Connect Google Calendar
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Legacy Power Automate URL Display */}
        {settings.powerAutomateUrl && (!settings.calendarSources || settings.calendarSources.length === 0) && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium text-lg mb-2">Legacy Power Automate URL</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 break-all">
              URL: {settings.powerAutomateUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => testPowerAutomateUrl(settings.powerAutomateUrl!)}
                disabled={testingUrl === settings.powerAutomateUrl}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {testingUrl === settings.powerAutomateUrl ? 'Testing...' : 'Test URL'}
              </button>
              <button
                onClick={() => {
                  // Convert legacy URL to calendar source
                  const newSource: CalendarSource = {
                    id: `o365_legacy_${Date.now()}`,
                    name: "Work Calendar (O365) - Legacy",
                    type: "o365",
                    sourceId: "default",
                    connectionData: settings.powerAutomateUrl,
                    tags: ["work"],
                    isEnabled: true,
                  };
                  
                  onSettingsChange({
                    ...settings,
                    calendarSources: [newSource],
                    powerAutomateUrl: "", // Clear the legacy field after conversion
                  });
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
              >
                Convert to Calendar Source
              </button>
            </div>
          </div>
        )}
      </section>
      
      {/* Help Section */}
      <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700 p-4">
        <h3 className="text-lg font-medium mb-2">Having Issues?</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p><strong>Google Calendar:</strong> If you see "Not Connected", click "Add Google Calendar" to authorize access.</p>
          <p><strong>Power Automate URL:</strong> Make sure your URL returns JSON data and is accessible from the internet. Use the "Test URL" button to verify.</p>
          <p><strong>iCal Calendar:</strong> Use SECRET/PRIVATE iCal URLs for your own calendars (Google, Outlook) or public feeds. Supports http/https and webcal:// URLs. For Google Calendar, use the "Secret address in iCal format" from calendar settings for security.</p>
          <p><strong>No Events Showing:</strong> Check that your calendar sources are enabled and that you have events in the selected date range.</p>
        </div>
      </section>
      
      {/* Default view filter */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 overflow-hidden">
        <h2 className="text-lg font-medium mb-4">Default Date Filter</h2>
        <select
          value={settings.defaultView}
          onChange={(e) =>
            onSettingsChange({ ...settings, defaultView: e.target.value as any })
          }
          className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full md:w-auto"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="agenda">Agenda (30 days)</option>
          <option value="timeline">Timeline (30 days)</option>
          <option value="custom">Custom Range</option>
        </select>

        {settings.defaultView === "custom" && (
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={settings.customRange?.start || ''}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    customRange: { ...settings.customRange, start: e.target.value, end: settings.customRange?.end || '' },
                  })
                }
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={settings.customRange?.end || ''}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    customRange: { ...settings.customRange, start: settings.customRange?.start || '', end: e.target.value },
                  })
                }
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CalendarSettings;