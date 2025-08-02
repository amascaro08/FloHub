import React, { useState } from 'react';
import { UserSettings } from '../../types/app';
import { GlobeAltIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AccountDeletion from './AccountDeletion';
import ThemeSettings from './ThemeSettings';

interface TimezoneSettingsProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
}

const TimezoneSettings: React.FC<TimezoneSettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  const [showAccountDeletion, setShowAccountDeletion] = useState(false);
  const timezones = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)", offset: "+00:00" },
    { value: "Pacific/Honolulu", label: "Hawaii (HST)", offset: "-10:00" },
    { value: "America/Anchorage", label: "Alaska (AKST)", offset: "-09:00" },
    { value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)", offset: "-08:00" },
    { value: "America/Denver", label: "Mountain Time (MST/MDT)", offset: "-07:00" },
    { value: "America/Chicago", label: "Central Time (CST/CDT)", offset: "-06:00" },
    { value: "America/New_York", label: "Eastern Time (EST/EDT)", offset: "-05:00" },
    { value: "America/Sao_Paulo", label: "São Paulo (BRT)", offset: "-03:00" },
    { value: "Europe/London", label: "London (GMT/BST)", offset: "+00:00" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)", offset: "+01:00" },
    { value: "Europe/Moscow", label: "Moscow (MSK)", offset: "+03:00" },
    { value: "Asia/Dubai", label: "Dubai (GST)", offset: "+04:00" },
    { value: "Asia/Kolkata", label: "India (IST)", offset: "+05:30" },
    { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "+08:00" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "+09:00" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", offset: "+10:00" },
    { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", offset: "+12:00" }
  ];

  const currentTimezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentTime = new Date().toLocaleString('en-US', { 
    timeZone: currentTimezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <GlobeAltIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--fg)]">General Settings</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Configure your timezone and basic preferences
          </p>
        </div>
      </div>

      {/* Current Time Display */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-800/50">
        <div className="flex items-center space-x-3 mb-3">
          <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium text-blue-900 dark:text-blue-100">Current Time</h3>
        </div>
        <p className="text-lg font-mono text-blue-800 dark:text-blue-200">
          {currentTime}
        </p>
      </div>

      {/* Timezone Settings */}
      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <h3 className="text-lg font-medium text-[var(--fg)] mb-6">Timezone Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Your Timezone
            </label>
            <select
              value={currentTimezone}
              onChange={(e) =>
                onSettingsChange({ ...settings, timezone: e.target.value })
              }
              className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </option>
              ))}
            </select>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3 flex items-start space-x-2">
              <svg className="w-4 h-4 mt-0.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                This timezone will be used for all date and time displays throughout FloHub. 
                Changing this setting will affect how events, tasks, and other time-sensitive data are displayed.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <ThemeSettings settings={settings} onSettingsChange={onSettingsChange} />

      {/* Additional Settings */}
      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <h3 className="text-lg font-medium text-[var(--fg)] mb-6">Display Preferences</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <div>
              <p className="font-medium text-[var(--fg)]">24-Hour Format</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Use 24-hour time format instead of 12-hour AM/PM
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="24hour"
                className="w-4 h-4 text-primary-600 bg-white border-neutral-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
                defaultChecked={false}
              />
              <label htmlFor="24hour" className="sr-only">
                Enable 24-hour format
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <div>
              <p className="font-medium text-[var(--fg)]">Week Starts On</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Choose which day your week starts with
              </p>
            </div>
            <select className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-[var(--fg)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </select>
          </div>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <h3 className="text-lg font-medium text-[var(--fg)] mb-6">Account Management</h3>
        
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
                  Delete Account
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone and will remove all your calendar events, notes, tasks, journal entries, and personal settings.
                </p>
                <button
                  onClick={() => setShowAccountDeletion(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Deletion Modal */}
      {showAccountDeletion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AccountDeletion onCancel={() => setShowAccountDeletion(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TimezoneSettings;