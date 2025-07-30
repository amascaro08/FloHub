import { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";

interface JournalSettingsProps {
  onClose: () => void;
  onJournalCleared?: () => void;
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

const JournalSettings: React.FC<JournalSettingsProps> = ({ onClose, onJournalCleared }) => {
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
  const [showClearJournalModal, setShowClearJournalModal] = useState<boolean>(false);
  const [clearJournalStep, setClearJournalStep] = useState<number>(1);
  const [clearingJournal, setClearingJournal] = useState<boolean>(false);
  const [confirmationText, setConfirmationText] = useState<string>('');
  
  const { user } = useUser();

  if (!user) {
    return (
      <div className="w-full p-6">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-teal-200 dark:bg-teal-800 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Load settings from localStorage when component mounts
  useEffect(() => {
    if (user?.primaryEmail) {
      const savedSettings = localStorage.getItem(`journal_settings_${user.primaryEmail}`);
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          // Merge with default settings to ensure new settings have default values
          setSettings({
            ...settings,
            ...parsedSettings
          });
        } catch (error) {
          console.error('Error parsing saved settings:', error);
        }
      }
    }
  }, [user]);

  // Handle PIN validation
  const validatePin = () => {
    if (settings.pin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return false;
    }
    if (settings.pin !== pinConfirm) {
      setPinError('PINs do not match');
      return false;
    }
    setPinError('');
    return true;
  };

  // Save settings
  const handleSaveSettings = () => {
    if (settings.pinProtection && !validatePin()) {
      return;
    }

    if (user?.primaryEmail) {
      localStorage.setItem(`journal_settings_${user.primaryEmail}`, JSON.stringify(settings));
      setSaveConfirmation(true);
      setTimeout(() => setSaveConfirmation(false), 3000);
    }
  };

  // Clear all journal data function
  const handleClearAllJournal = async () => {
    if (!user?.primaryEmail || confirmationText !== 'DELETE MY JOURNAL') return;
    
    setClearingJournal(true);
    
    try {
      const response = await fetch('/api/journal/clear-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Clear local storage as well
        if (typeof window !== 'undefined') {
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.includes(`journal_`) && key.includes(user.primaryEmail)) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // Close modal and reset states
        setShowClearJournalModal(false);
        setClearJournalStep(1);
        setConfirmationText('');
        
        // Show success message
        setSaveConfirmation(true);
        setTimeout(() => setSaveConfirmation(false), 5000);
        
        // Notify parent component to refresh
        if (onJournalCleared) {
          onJournalCleared();
        }
      }
    } catch (error) {
      console.error('Error clearing journal data:', error);
    } finally {
      setClearingJournal(false);
    }
  };

  // Export data function
  const handleExportData = async () => {
    if (!user?.primaryEmail) return;
    
    setExportLoading(true);
    
    try {
      // Fetch all journal data
      const entries = JSON.parse(localStorage.getItem(`journal_entries_${user.primaryEmail}`) || '{}');
      const moods = JSON.parse(localStorage.getItem(`journal_moods_${user.primaryEmail}`) || '{}');
      const activities = JSON.parse(localStorage.getItem(`journal_activities_${user.primaryEmail}`) || '{}');
      const sleep = JSON.parse(localStorage.getItem(`journal_sleep_${user.primaryEmail}`) || '{}');
      
      const data = {
        entries,
        moods,
        activities,
        sleep,
        settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      if (settings.exportFormat === 'json') {
        // Export as JSON
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `floHub_journal_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Export as CSV
        let csvContent = "Date,Entry,Mood,Mood_Tags,Activities,Sleep_Quality,Sleep_Hours\n";
        
        // Get all unique dates
        const allDates = new Set([
          ...Object.keys(entries),
          ...Object.keys(moods),
          ...Object.keys(activities),
          ...Object.keys(sleep)
        ]);
        
        allDates.forEach(date => {
          const entry = entries[date]?.content || '';
          const mood = moods[date]?.emoji || '';
          const moodTags = moods[date]?.tags?.join(';') || '';
          const dayActivities = activities[date]?.join(';') || '';
          const sleepQuality = sleep[date]?.quality || '';
          const sleepHours = sleep[date]?.hours || '';
          
          const escapedEntry = `"${entry.replace(/"/g, '""')}"`;
          csvContent += `${date},${escapedEntry},${mood},"${moodTags}","${dayActivities}",${sleepQuality},${sleepHours}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `floHub_journal_data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
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
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#00C9A7]/5 to-[#FF6B6B]/5 flex-shrink-0">
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

      <div className="flex-1 overflow-y-auto p-6">
        
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
                      Get notified to write in your journal
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
                  <div className="ml-4 border-l-2 border-[#00C9A7] pl-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Reminder time
                    </label>
                    <input
                      type="time"
                      value={settings.reminderTime}
                      onChange={(e) => setSettings({...settings, reminderTime: e.target.value})}
                      className="block w-32 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-[#00C9A7] focus:ring-[#00C9A7] text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Save Section */}
            <div className="bg-white dark:bg-slate-700 rounded-2xl p-6 border border-slate-200 dark:border-slate-600">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                <span className="text-2xl mr-3">💾</span>
                Auto-Save
              </h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Enable auto-save
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatically save your entries as you type
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
                      Daily prompts
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Show writing prompts to inspire your entries
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
                      Weekly reflections
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Receive prompts for weekly reflection
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300/20 dark:peer-focus:ring-yellow-300/40 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300/20 dark:peer-focus:ring-green-300/40 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 dark:peer-focus:ring-blue-300/40 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
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
                PIN Protection
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Add an extra layer of security to your journal entries.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Enable PIN protection
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Require a PIN to access your journal
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                                         <input
                       type="checkbox"
                       checked={settings.pinProtection}
                       onChange={(e) => {
                         setSettings({...settings, pinProtection: e.target.checked, pin: ''});
                         setPinConfirm('');
                       }}
                       className="sr-only peer"
                     />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300/20 dark:peer-focus:ring-red-300/40 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
                  </label>
                </div>
                
                {settings.pinProtection && (
                  <div className="ml-4 space-y-4 border-l-2 border-red-300 pl-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Create PIN (4+ digits)
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={settings.pin}
                        onChange={(e) => setSettings({...settings, pin: e.target.value.replace(/\D/g, '')})}
                        className="block w-32 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 text-center text-lg tracking-widest"
                        placeholder="••••"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Confirm PIN
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={pinConfirm}
                        onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                        className="block w-32 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 text-center text-lg tracking-widest"
                        placeholder="••••"
                      />
                    </div>
                    
                    {pinError && (
                      <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                        {pinError}
                      </p>
                    )}
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
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Export your journal data for backup or to transfer to another app.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Export format
                  </label>
                  <div className="flex space-x-4">
                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      settings.exportFormat === 'json'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}>
                      <input
                        type="radio"
                        name="exportFormat"
                        value="json"
                        checked={settings.exportFormat === 'json'}
                        onChange={(e) => setSettings({...settings, exportFormat: e.target.value as 'json' | 'csv'})}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl mb-2">📄</div>
                        <div className="font-medium text-sm text-slate-700 dark:text-slate-300">JSON</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Structured data</div>
                      </div>
                    </label>
                    
                    <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      settings.exportFormat === 'csv'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}>
                      <input
                        type="radio"
                        name="exportFormat"
                        value="csv"
                        checked={settings.exportFormat === 'csv'}
                        onChange={(e) => setSettings({...settings, exportFormat: e.target.value as 'json' | 'csv'})}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl mb-2">📊</div>
                        <div className="font-medium text-sm text-slate-700 dark:text-slate-300">CSV</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Spreadsheet format</div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="text-center">
                  <button
                    onClick={handleExportData}
                    disabled={exportLoading}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/25"
                  >
                    {exportLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
            
            {/* Clear All Data Section */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-2xl p-6 border-2 border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center">
                <span className="text-2xl mr-3">⚠️</span>
                Danger Zone
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-6">
                Permanently delete all your journal data. This action cannot be undone.
              </p>
              
              <div className="text-center">
                <button
                  onClick={() => setShowClearJournalModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-medium hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25"
                >
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Entire Journal
                </button>
                
                <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                  This will delete all entries, moods, activities, sleep data, and settings
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex-shrink-0">
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
      
      {/* Clear Journal Confirmation Modal */}
      {showClearJournalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              {clearJournalStep === 1 && (
                <>
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clear Entire Journal?</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you absolutely sure you want to permanently delete your entire journal?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 mb-6 space-y-1 ml-4">
                    <li>• All journal entries (all dates)</li>
                    <li>• All mood tracking data</li>
                    <li>• All activity records</li>
                    <li>• All sleep tracking data</li>
                    <li>• Journal settings and preferences</li>
                  </ul>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                      ⚠️ This action cannot be undone. All your journal data will be lost forever.
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowClearJournalModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setClearJournalStep(2)}
                      className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </>
              )}

              {clearJournalStep === 2 && (
                <>
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Final Confirmation</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    <strong>This action cannot be undone!</strong>
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    To confirm deletion, please type <strong>DELETE MY JOURNAL</strong> below:
                  </p>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Type DELETE MY JOURNAL"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-6 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setClearJournalStep(1)}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleClearAllJournal}
                      disabled={clearingJournal || confirmationText !== 'DELETE MY JOURNAL'}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {clearingJournal ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                          Clearing...
                        </>
                      ) : (
                        'Delete Everything'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalSettings;