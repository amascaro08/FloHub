import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";

interface JournalSettingsProps {
  onClose: () => void;
}

interface JournalSettingsData {
  reminderEnabled: boolean;
  reminderTime: string;
  pinProtection: boolean;
  pin: string;
  exportFormat: 'json' | 'csv';
  autoSave: boolean;
  dailyPrompts: boolean;
  moodTracking: boolean;
  activityTracking: boolean;
  sleepTracking: boolean;
  weeklyReflections: boolean;
}

const JournalSettings: React.FC<JournalSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<JournalSettingsData>({
    reminderEnabled: false,
    reminderTime: '20:00',
    pinProtection: false,
    pin: '',
    exportFormat: 'json',
    autoSave: true,
    dailyPrompts: true,
    moodTracking: true,
    activityTracking: true,
    sleepTracking: true,
    weeklyReflections: false
  });
  
  const [pinConfirm, setPinConfirm] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [saveConfirmation, setSaveConfirmation] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'data' | 'tracking'>('general');
  
  const { user } = useUser();

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-teal-200 dark:bg-teal-800 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Load saved settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.primaryEmail) {
      const savedSettings = localStorage.getItem(`journal_settings_${user.primaryEmail}`);
      
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings({...settings, ...parsed});
        } catch (e) {
          console.error('Error parsing saved journal settings:', e);
        }
      }
    }
  }, [user]);

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
    if (user?.primaryEmail) {
      localStorage.setItem(`journal_settings_${user.primaryEmail}`, JSON.stringify(settings));
      
      // Register or unregister reminder notification
      if (settings.reminderEnabled) {
        console.log('Registering reminder notification for', settings.reminderTime);
      } else {
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
    if (!user?.primaryEmail) return;
    
    setExportLoading(true);
    
    try {
      // Collect all journal data from localStorage
      const journalData: {
        entries: Record<string, any>;
        moods: Record<string, any>;
        activities: Record<string, any>;
        sleep: Record<string, any>;
        settings: JournalSettingsData;
      } = {
        entries: {},
        moods: {},
        activities: {},
        sleep: {},
        settings: settings
      };
      
      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (!key || !key.includes(user.primaryEmail)) continue;
        
        if (key.includes('journal_entry')) {
          const dateKey = key.split('_').pop() || '';
          journalData.entries[dateKey] = JSON.parse(localStorage.getItem(key) || '{}');
        } else if (key.includes('journal_mood')) {
          const dateKey = key.split('_').pop() || '';
          journalData.moods[dateKey] = JSON.parse(localStorage.getItem(key) || '{}');
        } else if (key.includes('journal_activities')) {
          const dateKey = key.split('_').pop() || '';
          journalData.activities[dateKey] = JSON.parse(localStorage.getItem(key) || '{}');
        } else if (key.includes('journal_sleep')) {
          const dateKey = key.split('_').pop() || '';
          journalData.sleep[dateKey] = JSON.parse(localStorage.getItem(key) || '{}');
        }
      }
      
      // Convert to selected format
      let exportData: string;
      let fileName: string;
      let mimeType: string;
      
      if (settings.exportFormat === 'json') {
        exportData = JSON.stringify(journalData, null, 2);
        fileName = `floHub_journal_export_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // Convert to CSV format
        const csvRows = ['date,mood,mood_label,mood_tags,activities,sleep_quality,sleep_hours,entry_content'];
        
        // Combine all dates
        const allDates = new Set([
          ...Object.keys(journalData.entries),
          ...Object.keys(journalData.moods),
          ...Object.keys(journalData.activities),
          ...Object.keys(journalData.sleep)
        ]);
        
        Array.from(allDates).sort().forEach(date => {
          const mood = journalData.moods[date] || {};
          const entry = journalData.entries[date] || {};
          const activities = journalData.activities[date] || [];
          const sleep = journalData.sleep[date] || {};
          
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
            escapeCsv(Array.isArray(mood.tags) ? mood.tags.join('; ') : ''),
            escapeCsv(Array.isArray(activities) ? activities.join('; ') : ''),
            escapeCsv(sleep.quality || ''),
            escapeCsv(sleep.hours ? sleep.hours.toString() : ''),
            escapeCsv(entry.content || '')
          ].join(','));
        });
        
        exportData = csvRows.join('\n');
        fileName = `floHub_journal_export_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }
      
      // Create download link
      const blob = new Blob([exportData], { type: mimeType });
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

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'tracking', label: 'Tracking', icon: '📊' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'data', label: 'Data', icon: '💾' }
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#00C9A7]/5 to-[#FF6B6B]/5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <span className="text-3xl mr-3">⚙️</span>
            Journal Settings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize your journaling experience
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex mt-6 space-x-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center">
                <span className="text-base mr-2">{tab.icon}</span>
                {tab.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
          
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 import-step">
              
              {/* Daily Reminders Section */}
              <div className="bg-gradient-to-br from-[#00C9A7]/5 to-[#FF6B6B]/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-3">🔔</span>
                  Daily Reminders
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Enable daily journal reminder
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Get a gentle nudge to journal each day
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.reminderEnabled}
                        onChange={(e) => setSettings({...settings, reminderEnabled: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00C9A7]/20 dark:peer-focus:ring-[#00C9A7]/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#00C9A7]"></div>
                    </label>
                  </div>
                  
                  {settings.reminderEnabled && (
                    <div className="ml-6 pt-4 border-t border-slate-200 dark:border-slate-600">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Reminder time
                      </label>
                      <input
                        type="time"
                        value={settings.reminderTime}
                        onChange={(e) => setSettings({...settings, reminderTime: e.target.value})}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00C9A7] focus:border-transparent"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        You'll receive a notification at this time each day
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-Save Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-3">💾</span>
                  Auto-Save
                </h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Automatically save entries as you type
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Never lose your thoughts with real-time saving
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 dark:peer-focus:ring-blue-300/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>

              {/* Writing Prompts Section */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-3">💭</span>
                  Writing Prompts
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Show daily writing prompts
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Get inspiration with thoughtful questions
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.dailyPrompts}
                        onChange={(e) => setSettings({...settings, dailyPrompts: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 dark:peer-focus:ring-purple-300/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Weekly reflection prompts
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Deeper questions for weekly reflection
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.weeklyReflections}
                        onChange={(e) => setSettings({...settings, weeklyReflections: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 dark:peer-focus:ring-purple-300/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tracking Tab */}
          {activeTab === 'tracking' && (
            <div className="space-y-6 import-step">
              <div className="bg-gradient-to-br from-[#00C9A7]/5 to-[#FF6B6B]/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  Wellbeing Tracking
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  Choose which aspects of your wellbeing you'd like to track in your journal.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">😊</span>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Mood Tracking
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Track daily emotions
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.moodTracking}
                        onChange={(e) => setSettings({...settings, moodTracking: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00C9A7]/20 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#00C9A7]"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">🎯</span>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Activity Tracking
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Log daily activities
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.activityTracking}
                        onChange={(e) => setSettings({...settings, activityTracking: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00C9A7]/20 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#00C9A7]"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-xl">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">😴</span>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Sleep Tracking
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Monitor sleep quality
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.sleepTracking}
                        onChange={(e) => setSettings({...settings, sleepTracking: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00C9A7]/20 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#00C9A7]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 import-step">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-3">🔒</span>
                  Privacy & Security
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Protect journal with PIN
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Add an extra layer of security to your entries
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.pinProtection}
                        onChange={(e) => {
                          setSettings({...settings, pinProtection: e.target.checked});
                          setPinError('');
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300/20 dark:peer-focus:ring-red-300/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
                    </label>
                  </div>
                  
                  {settings.pinProtection && (
                    <div className="ml-6 pt-4 border-t border-slate-200 dark:border-slate-600 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Enter PIN (minimum 4 digits)
                        </label>
                        <input
                          type="password"
                          value={settings.pin}
                          onChange={(e) => {
                            setSettings({...settings, pin: e.target.value.replace(/\D/g, '')});
                            setPinError('');
                          }}
                          maxLength={8}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Enter PIN"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Confirm PIN
                        </label>
                        <input
                          type="password"
                          value={pinConfirm}
                          onChange={(e) => {
                            setPinConfirm(e.target.value.replace(/\D/g, ''));
                            setPinError('');
                          }}
                          maxLength={8}
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Confirm PIN"
                        />
                      </div>
                      
                      {pinError && (
                        <p className="text-sm text-red-500 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {pinError}
                        </p>
                      )}
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        You'll need to enter this PIN to access your journal entries
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6 import-step">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                  <span className="text-2xl mr-3">💾</span>
                  Data Export
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Export format
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        settings.exportFormat === 'json'
                          ? 'border-[#00C9A7] bg-[#00C9A7]/5'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}>
                        <input
                          type="radio"
                          name="export-format"
                          value="json"
                          checked={settings.exportFormat === 'json'}
                          onChange={() => setSettings({...settings, exportFormat: 'json'})}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-2">📄</div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">JSON</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Complete data structure</div>
                        </div>
                      </label>
                      
                      <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        settings.exportFormat === 'csv'
                          ? 'border-[#00C9A7] bg-[#00C9A7]/5'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}>
                        <input
                          type="radio"
                          name="export-format"
                          value="csv"
                          checked={settings.exportFormat === 'csv'}
                          onChange={() => setSettings({...settings, exportFormat: 'csv'})}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className="text-2xl mb-2">📊</div>
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">CSV</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Spreadsheet compatible</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleExportData}
                    disabled={exportLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00C9A7] to-teal-600 text-white font-medium hover:from-[#00C9A7]/90 hover:to-teal-600/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                    {exportLoading ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        Export Journal Data
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    This will download all your journal entries, moods, activities, and settings
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Back to Journal
            </button>
            
            <div className="flex items-center space-x-3">
              {saveConfirmation && (
                <div className="flex items-center text-[#00C9A7] text-sm font-medium">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Settings saved! ✨
                </div>
              )}
              
              <button
                onClick={handleSaveSettings}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#00C9A7] to-teal-600 text-white font-medium hover:from-[#00C9A7]/90 hover:to-teal-600/90 transition-all shadow-lg shadow-teal-500/25"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalSettings;