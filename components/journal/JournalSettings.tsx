import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface JournalSettingsProps {
  onClose: () => void;
}

interface JournalSettingsData {
  reminderEnabled: boolean;
  reminderTime: string;
  pinProtection: boolean;
  pin: string;
  exportFormat: 'json' | 'csv';
}

const JournalSettings: React.FC<JournalSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<JournalSettingsData>({
    reminderEnabled: false,
    reminderTime: '20:00',
    pinProtection: false,
    pin: '',
    exportFormat: 'json'
  });
  
  const [pinConfirm, setPinConfirm] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const { data: session } = useSession();

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }

  // Load saved settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.email) {
      const savedSettings = localStorage.getItem(`journal_settings_${session.user.email}`);
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
        } catch (e) {
          console.error('Error parsing saved journal settings:', e);
        }
      }
    }
  }, [session]);

  const handleSaveSettings = () => {
    // Validate PIN if PIN protection is enabled
    if (settings.pinProtection) {
      if (settings.pin.length < 4) {
        setPinError('PIN must be at least 4 digits');
        return;
      }
      
      if (settings.pin !== pinConfirm) {
        setPinError('PINs do not match');
        return;
      }
    }
    
    // Save settings to localStorage
    if (session?.user?.email) {
      localStorage.setItem(`journal_settings_${session.user.email}`, JSON.stringify(settings));
      
      // Register or unregister reminder notification
      if (settings.reminderEnabled) {
        // In a real app, this would register a notification with the backend
        console.log('Registering reminder notification for', settings.reminderTime);
      } else {
        // In a real app, this would unregister the notification
        console.log('Unregistering reminder notification');
      }
      
      // Show save confirmation
      setSaveConfirmation(true);
      
      // Hide confirmation after 3 seconds
      setTimeout(() => {
        setSaveConfirmation(false);
      }, 3000);
    }
  };

  const handleExportData = async () => {
    if (!session?.user?.email) return;
    
    setExportLoading(true);
    
    try {
      // Collect all journal data from localStorage
      const journalData: {
        entries: Record<string, any>;
        moods: Record<string, any>;
        activities: Record<string, any>;
      } = {
        entries: {},
        moods: {},
        activities: {}
      };
      
      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (!key || !key.includes(session.user.email)) continue;
        
        if (key.includes('journal_entry')) {
          const dateKey = key.split('_').pop() || '';
          journalData.entries[dateKey] = JSON.parse(localStorage.getItem(key) || '{}');
        } else if (key.includes('journal_mood')) {
          const dateKey = key.split('_').pop() || '';
          journalData.moods[dateKey] = JSON.parse(localStorage.getItem(key) || '{}');
        } else if (key.includes('journal_activities')) {
          const dateKey = key.split('_').pop() || '';
          journalData.activities[dateKey] = JSON.parse(localStorage.getItem(key) || '{}');
        }
      }
      
      // Convert to selected format
      let exportData: string;
      let fileName: string;
      
      if (settings.exportFormat === 'json') {
        exportData = JSON.stringify(journalData, null, 2);
        fileName = `journal_export_${new Date().toISOString().split('T')[0]}.json`;
      } else {
        // Convert to CSV format
        const csvRows = ['date,mood,mood_label,activities,entry_content'];
        
        // Combine all dates
        const allDates = new Set([
          ...Object.keys(journalData.entries),
          ...Object.keys(journalData.moods),
          ...Object.keys(journalData.activities)
        ]);
        
        Array.from(allDates).sort().forEach(date => {
          const mood = journalData.moods[date] || {};
          const entry = journalData.entries[date] || {};
          const activities = journalData.activities[date] || [];
          
          // Escape CSV values
          const escapeCsv = (value: string) => {
            if (!value) return '';
            const str = String(value).replace(/"/g, '""');
            return `"${str}"`;
          };
          
          csvRows.push([
            date,
            escapeCsv(mood.emoji || ''),
            escapeCsv(mood.label || ''),
            escapeCsv(Array.isArray(activities) ? activities.join(', ') : ''),
            escapeCsv(entry.content || '')
          ].join(','));
        });
        
        exportData = csvRows.join('\n');
        fileName = `journal_export_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      // Create download link
      const blob = new Blob([exportData], { type: settings.exportFormat === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting journal data:', error);
      alert('There was an error exporting your journal data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Journal Settings</h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Daily Reminders Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Daily Reminders</h3>
            
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="reminder-toggle"
                checked={settings.reminderEnabled}
                onChange={(e) => setSettings({...settings, reminderEnabled: e.target.checked})}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="reminder-toggle" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Enable daily journal reminder
              </label>
            </div>
            
            {settings.reminderEnabled && (
              <div className="ml-6">
                <label htmlFor="reminder-time" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Reminder time
                </label>
                <input
                  type="time"
                  id="reminder-time"
                  value={settings.reminderTime}
                  onChange={(e) => setSettings({...settings, reminderTime: e.target.value})}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You'll receive a notification at this time each day
                </p>
              </div>
            )}
          </div>
          
          {/* Privacy & Security Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Privacy & Security</h3>
            
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="pin-toggle"
                checked={settings.pinProtection}
                onChange={(e) => {
                  setSettings({...settings, pinProtection: e.target.checked});
                  setPinError('');
                }}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="pin-toggle" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Protect journal with PIN
              </label>
            </div>
            
            {settings.pinProtection && (
              <div className="ml-6 space-y-3">
                <div>
                  <label htmlFor="pin" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Enter PIN (min 4 digits)
                  </label>
                  <input
                    type="password"
                    id="pin"
                    value={settings.pin}
                    onChange={(e) => {
                      setSettings({...settings, pin: e.target.value.replace(/\D/g, '')});
                      setPinError('');
                    }}
                    maxLength={8}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full"
                    placeholder="Enter PIN"
                  />
                </div>
                
                <div>
                  <label htmlFor="pin-confirm" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    id="pin-confirm"
                    value={pinConfirm}
                    onChange={(e) => {
                      setPinConfirm(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    maxLength={8}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 w-full"
                    placeholder="Confirm PIN"
                  />
                </div>
                
                {pinError && (
                  <p className="text-sm text-red-500">{pinError}</p>
                )}
                
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You'll need to enter this PIN to access your journal entries
                </p>
              </div>
            )}
          </div>
          
          {/* Data Export Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Data Export</h3>
            
            <div className="mb-3">
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                Export format
              </label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="format-json"
                    name="export-format"
                    value="json"
                    checked={settings.exportFormat === 'json'}
                    onChange={() => setSettings({...settings, exportFormat: 'json'})}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                  />
                  <label htmlFor="format-json" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    JSON
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="format-csv"
                    name="export-format"
                    value="csv"
                    checked={settings.exportFormat === 'csv'}
                    onChange={() => setSettings({...settings, exportFormat: 'csv'})}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                  />
                  <label htmlFor="format-csv" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    CSV
                  </label>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleExportData}
              disabled={exportLoading}
              className="w-full py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex justify-center items-center"
            >
              {exportLoading ? (
                <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Export Journal Data'
              )}
            </button>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This will download all your journal entries, moods, and activities
            </p>
          </div>
          
          <div className="flex flex-wrap justify-end gap-3 relative">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
            >
              Save Settings
            </button>
            
            {saveConfirmation && (
              <div className="absolute top-full right-0 mt-2 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-sm transition-opacity animate-fade-in-out">
                Settings saved successfully! ✅
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalSettings;