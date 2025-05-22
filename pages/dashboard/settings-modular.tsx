"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import useSWR from "swr";
import { UserSettings } from "../../types/app";
import { CalendarSource } from "../../types/app";
import DebugNavigation from "@/components/ui/DebugNavigation";

// Import modular settings components
import CalendarSettings from "@/components/settings/CalendarSettings";
import FloCatSettings from "@/components/settings/FloCatSettings";
import TagsSettings from "@/components/settings/TagsSettings";
import WidgetsSettings from "@/components/settings/WidgetsSettings";
import TimezoneSettings from "@/components/settings/TimezoneSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";

type CalItem = { id: string; summary: string; primary?: boolean };
type TabName = "calendar" | "flocat" | "tags" | "widgets" | "timezone" | "notifications";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export default function SettingsPage() {
  // Session state
  const { data: session, status } = useSession();
  const loadingSession = status === "loading";

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }

  // Fetch calendars
  const { data: calendars, error: calError } = useSWR<CalItem[]>(
    session ? "/api/calendar/list" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    selectedCals: [],
    defaultView: "month",
    customRange: {
      start: new Date().toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    },
    powerAutomateUrl: "",
    globalTags: [],
    activeWidgets: ["tasks", "calendar", "ataglance", "quicknote"],
    calendarSources: [],
    floCatStyle: "default",
    floCatPersonality: [],
    preferredName: "",
  });

  // Calendar form state
  const [newCalendarSource, setNewCalendarSource] = useState<Partial<CalendarSource>>({
    name: "",
    type: "google",
    sourceId: "",
    connectionData: "",
    tags: [],
    isEnabled: true,
  });
  const [editingCalendarSourceIndex, setEditingCalendarSourceIndex] = useState<number | null>(null);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [newCalendarTag, setNewCalendarTag] = useState("");
  
  // FloCat state
  const [newPersonalityKeyword, setNewPersonalityKeyword] = useState("");
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<TabName>("calendar");

  // Fetch user settings
  const { data: loadedSettings, error: settingsError, mutate: mutateSettings } =
    useSWR<UserSettings>(session ? "/api/userSettings" : null, fetcher, { revalidateOnFocus: false });

  // Handle authentication success/error
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      const provider = urlParams.get('provider');
      
      if (success === 'true' && provider) {
        if (provider === 'microsoft') {
          alert("Microsoft account connected successfully!");
        } else if (provider === 'google') {
          const accountLabel = urlParams.get('accountLabel') || 'Additional';
          alert(`Google account "${accountLabel}" connected successfully!`);
        }
      } else if (error) {
        alert(`Authentication error: ${error}`);
      }
      
      if (success || error) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Initialize settings from loaded data
  useEffect(() => {
    if (loadedSettings) {
      console.log("Loaded persistent settings:", loadedSettings);
      
      // Migrate calendar sources if needed
      if (!loadedSettings.calendarSources || loadedSettings.calendarSources.length === 0) {
        const migratedSources: CalendarSource[] = [];
        
        if (loadedSettings.selectedCals && loadedSettings.selectedCals.length > 0) {
          loadedSettings.selectedCals.forEach((calId, index) => {
            const calendarName = calendars?.find(cal => cal.id === calId)?.summary || `Google Calendar ${index + 1}`;
            const isPrimary = calendars?.find(cal => cal.id === calId)?.primary || false;
            
            migratedSources.push({
              id: `google-${calId}`,
              name: calendarName,
              type: "google",
              sourceId: calId,
              tags: isPrimary ? ["personal"] : [],
              isEnabled: true,
            });
          });
        }
        
        if (loadedSettings.powerAutomateUrl) {
          migratedSources.push({
            id: `o365-${Date.now()}`,
            name: "Work Calendar (O365)",
            type: "o365",
            sourceId: "o365",
            connectionData: loadedSettings.powerAutomateUrl,
            tags: ["work"],
            isEnabled: true,
          });
        }
        
        loadedSettings.calendarSources = migratedSources;
      }
      
      setSettings(loadedSettings);
    }
  }, [loadedSettings, calendars]);

  // Save settings
  const save = async () => {
    if (status !== 'authenticated' || !session?.user?.email) {
      alert("You must be signed in to save settings.");
      return;
    }

    mutateSettings(settings, false);

    try {
      const res = await fetch('/api/userSettings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        alert("Failed to save settings. Reverting changes.");
        console.error("Failed to save settings:", await res.text());
        mutateSettings();
        return;
      }

      alert("Settings saved!");
      mutateSettings();

    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings. Reverting changes.");
      mutateSettings();
    }
  };

  // Early returns
  if (loadingSession) {
    return <main className="p-4 md:p-6">Loading session…</main>;
  }

  if (!session) {
    return (
      <main className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <p>You must sign in to configure your settings.</p>
          <button
            onClick={() => signIn()}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  if (calError) {
    return (
      <main className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <p className="text-red-500 dark:text-red-400">
            Failed to load calendars: {calError.message}
          </p>
        </div>
      </main>
    );
  }

  if (!calendars) {
    return (
      <main className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          Loading your calendars…
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-6 space-y-6 max-w-full">
      <DebugNavigation />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <a
            href="/dashboard"
            className="text-blue-500 hover:underline text-sm cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/dashboard";
            }}
          >
            &larr; Back to Dashboard
          </a>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1 w-full">
        <nav className="flex flex-nowrap -mb-px min-w-max">
          <button
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "calendar"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("calendar")}
          >
            Calendar
          </button>
          <button
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "flocat"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("flocat")}
          >
            FloCat
          </button>
          <button
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "tags"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("tags")}
          >
            Global Tags
          </button>
          <button
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "widgets"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("widgets")}
          >
            Widgets
          </button>
          <button
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "timezone"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("timezone")}
          >
            Timezone
          </button>
          <button
            className={`py-2 px-4 text-center border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "notifications"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("notifications")}
          >
            Notifications
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="w-full overflow-x-hidden">
      {activeTab === "calendar" && (
        <CalendarSettings
          settings={settings}
          setSettings={setSettings}
          calendars={calendars}
          newCalendarSource={newCalendarSource}
          setNewCalendarSource={setNewCalendarSource}
          editingCalendarSourceIndex={editingCalendarSourceIndex}
          setEditingCalendarSourceIndex={setEditingCalendarSourceIndex}
          showCalendarForm={showCalendarForm}
          setShowCalendarForm={setShowCalendarForm}
          newCalendarTag={newCalendarTag}
          setNewCalendarTag={setNewCalendarTag}
        />
      )}
      
      {activeTab === "flocat" && (
        <FloCatSettings
          settings={settings}
          setSettings={setSettings}
          newPersonalityKeyword={newPersonalityKeyword}
          setNewPersonalityKeyword={setNewPersonalityKeyword}
        />
      )}
      
      {activeTab === "tags" && (
        <TagsSettings
          settings={settings}
          setSettings={setSettings}
        />
      )}
      
      {activeTab === "widgets" && (
        <WidgetsSettings
          settings={settings}
          setSettings={setSettings}
        />
      )}
      
      {activeTab === "timezone" && (
        <TimezoneSettings
          settings={settings}
          setSettings={setSettings}
        />
      )}
      
      {activeTab === "notifications" && (
        <NotificationsSettings
          settings={settings}
          setSettings={setSettings}
        />
      )}

      </div>
      
      <div className="flex justify-end mt-6">
        <button
          onClick={save}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
        >
          Save Settings
        </button>
      </div>
    </main>
  );
}