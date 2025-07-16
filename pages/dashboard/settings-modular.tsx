import { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import { UserSettings } from "@/types/app";
import { useUser } from '@/lib/hooks/useUser';
import dynamic from 'next/dynamic';

const SettingsModularPage = () => {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // State for settings
  const initialSettings: UserSettings = {
    selectedCals: [],
    defaultView: "today",
    customRange: { start: "", end: "" },
    globalTags: [],
    timezone: "UTC",
    tags: [],
    widgets: [],
    calendarSettings: {
      calendars: [],
    },
    notificationSettings: {
      subscribed: false,
    },
    floCatSettings: {
      enabledCapabilities: [],
    },
  };
  const [settings, setSettings] = useState<UserSettings>(initialSettings);

  // Use user.email as userId
  const userId = user?.primaryEmail || user?.id;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Fetch user settings
  const { data: userSettings, error } = useSWR<UserSettings>(
    userId ? `/api/userSettings?userId=${userId}` : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }
  );

  useEffect(() => {
    if (userSettings) {
      setSettings(userSettings);
    }
  }, [userSettings]);

  // Handle settings update
  const handleSettingsChange = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (userId) {
      try {
        const response = await fetch("/api/userSettings/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...newSettings, userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update settings");
        }
        console.log("Settings updated successfully!");
      } catch (e) {
        console.error("Error updating settings: ", e);
      }
    }
  };

  // If not authenticated
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <a
          href="/login"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      {/* Timezone Settings */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Timezone
        </label>
        <select
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={settings.timezone}
          onChange={(e) =>
            handleSettingsChange({ ...settings, timezone: e.target.value })
          }
        >
          <option value="UTC">UTC</option>
          <option value="Australia/Sydney">Australia/Sydney</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          {/* Add more timezones as needed */}
        </select>
      </div>
      {/* Tags Settings */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Tags
        </label>
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={settings.tags?.join(",") || ""}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
            })
          }
        />
      </div>
      {/* Widgets Settings */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Widgets
        </label>
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={settings.widgets?.join(",") || ""}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              widgets: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
            })
          }
        />
      </div>
      {/* Calendar Settings */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Calendar Settings
        </label>
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={settings.calendarSettings?.calendars.join(",") || ""}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              calendarSettings: {
                calendars: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
              },
            })
          }
        />
      </div>
      {/* FloCat Settings */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          FloCat Settings
        </label>
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={settings.floCatSettings?.enabledCapabilities?.join(",") || ""}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              floCatSettings: {
                enabledCapabilities: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
              }
            })
          }
        />
      </div>
      {/* Notification Settings */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Notification Settings
        </label>
        <input
          type="checkbox"
          className="mr-2 leading-tight"
          checked={!!settings.notificationSettings?.subscribed}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              notificationSettings: {
                subscribed: e.target.checked,
              },
            })
          }
        />
        <span className="text-sm text-gray-700">Subscribed</span>
      </div>
      <button
        onClick={() => window.location.assign('/logout')}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      >
        Sign Out
      </button>
    </div>
  );
};

export default dynamic(() => Promise.resolve(SettingsModularPage), { ssr: false });
