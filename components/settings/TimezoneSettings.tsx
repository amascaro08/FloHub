import React from 'react';
import { UserSettings } from '../../types/app';

interface TimezoneSettingsProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

const TimezoneSettings: React.FC<TimezoneSettingsProps> = ({
  settings,
  setSettings
}) => {
  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Timezone Settings</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Timezone
          </label>
          <select
            value={settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                timezone: e.target.value,
              }))
            }
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full"
          >
            {[
              "UTC",
              "Pacific/Honolulu",
              "America/Anchorage",
              "America/Los_Angeles",
              "America/Denver",
              "America/Chicago",
              "America/New_York",
              "America/Sao_Paulo",
              "Europe/London",
              "Europe/Paris",
              "Europe/Moscow",
              "Asia/Dubai",
              "Asia/Kolkata",
              "Asia/Singapore",
              "Asia/Tokyo",
              "Australia/Sydney",
              "Pacific/Auckland"
            ].map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace("_", " ")}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This timezone will be used for all date and time displays throughout the app.
          </p>
        </div>
      </section>
    </div>
  );
};

export default TimezoneSettings;