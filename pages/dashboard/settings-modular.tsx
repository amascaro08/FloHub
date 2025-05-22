import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import useSWR from "swr";
import { useRouter } from "next/router";
import { UserSettings } from "@/types/app";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/components/ui/AuthContext";
import dynamic from 'next/dynamic';

const SettingsModularPage = () => {
  const router = useRouter();
  const { logout } = useAuth();

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
  };
  const [settings, setSettings] = useState<UserSettings>(initialSettings);

  // Session state
  const sessionHookResult = useSession();
  const session = sessionHookResult?.data ? sessionHookResult.data : null;

  // Fetch user settings
  const { data: userSettings, error } = useSWR<UserSettings>(
    session ? `/api/userSettings?userId=${session?.user?.email}` : null,
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
    if (session) {
      try {
        const userSettingsRef = doc(db, "userSettings", session?.user?.email || "default");
        await setDoc(userSettingsRef, newSettings);
        console.log("Settings updated successfully!");
      } catch (e) {
        console.error("Error updating settings: ", e);
      }
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Sign In
        </button>
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
          value={settings.tags?.join(",")}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              tags: e.target.value.split(",")
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
          value={settings.widgets?.join(",")}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              widgets: e.target.value.split(",")
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
          value={settings.calendarSettings?.calendars.join(",")}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              calendarSettings: {
                calendars: e.target.value.split(","),
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
          value={settings.floCatSettings?.enabledCapabilities?.join(",")}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              floCatSettings: {
                enabledCapabilities: e.target.value.split(",")
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
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          checked={settings.notificationSettings?.subscribed}
          onChange={(e) =>
            handleSettingsChange({
              ...settings,
              notificationSettings: {
                subscribed: e.target.checked,
              },
            })
          }
        />
      </div>
      <button
        onClick={() => logout()}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      >
        Sign Out
      </button>
    </div>
  );
};

export default dynamic(() => Promise.resolve(SettingsModularPage), { ssr: false });