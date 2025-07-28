import { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/router";
import { UserSettings, CalendarSource } from "@/types/app";
import { useUser } from '@/lib/hooks/useUser';
import dynamic from 'next/dynamic';
import Layout from "@/components/ui/Layout";
import CalendarSettings from "@/components/settings/CalendarSettings";
import WidgetsSettings from "@/components/settings/WidgetsSettings";
import TimezoneSettings from "@/components/settings/TimezoneSettings";
import TagsSettings from "@/components/settings/TagsSettings";
import FloCatSettings from "@/components/settings/FloCatSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";

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
    calendarSources: [],
    activeWidgets: [],
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
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [newCalendarSource, setNewCalendarSource] = useState<Partial<CalendarSource>>({});
  const [editingCalendarSourceIndex, setEditingCalendarSourceIndex] = useState<number | null>(null);
  const [newCalendarTag, setNewCalendarTag] = useState('');
  const [newPersonalityKeyword, setNewPersonalityKeyword] = useState('');


  // Use user.email as userId
  const userId = user?.email;

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

  // Fetch available calendars
  const { data: availableCalendars } = useSWR(
    userId ? '/api/calendar/list' : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        // If calendar list fails, return empty array instead of throwing
        console.warn('Failed to fetch calendar list:', response.status);
        return [];
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
    const oldSettings = settings;
    setSettings(newSettings);
    
    // Check if calendar sources have changed
    const oldSourcesHash = JSON.stringify(oldSettings.calendarSources?.filter(s => s.isEnabled) || []);
    const newSourcesHash = JSON.stringify(newSettings.calendarSources?.filter(s => s.isEnabled) || []);
    const calendarSourcesChanged = oldSourcesHash !== newSourcesHash;
    
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
        
        // Clear calendar cache if sources changed
        if (calendarSourcesChanged && user?.email) {
          console.log("Calendar sources changed, clearing caches...");
          try {
            const { clearCalendarCaches } = await import('@/lib/calendarUtils');
            await clearCalendarCaches(user.email);
            
            // Also force refresh calendar API cache
            await fetch('/api/calendar?forceRefresh=true&timeMin=2024-01-01T00:00:00Z&timeMax=2024-12-31T23:59:59Z');
            
            console.log("Calendar caches cleared and refreshed");
          } catch (cacheError) {
            console.error("Error clearing calendar cache:", cacheError);
          }
        }
      } catch (e) {
        console.error("Error updating settings: ", e);
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
        <CalendarSettings
            settings={settings}
            onSettingsChange={handleSettingsChange}
            calendars={availableCalendars || []}
            newCalendarSource={newCalendarSource}
            setNewCalendarSource={setNewCalendarSource}
            editingCalendarSourceIndex={editingCalendarSourceIndex}
            setEditingCalendarSourceIndex={setEditingCalendarSourceIndex}
            showCalendarForm={showCalendarForm}
            setShowCalendarForm={setShowCalendarForm}
            newCalendarTag={newCalendarTag}
            setNewCalendarTag={setNewCalendarTag}
        />
        <WidgetsSettings settings={settings} onSettingsChange={handleSettingsChange} />
        <TimezoneSettings settings={settings} onSettingsChange={handleSettingsChange} />
        <TagsSettings settings={settings} onSettingsChange={handleSettingsChange} />
        <FloCatSettings
            settings={settings}
            onSettingsChange={handleSettingsChange}
            newPersonalityKeyword={newPersonalityKeyword}
            setNewPersonalityKeyword={setNewPersonalityKeyword}
        />
        <NotificationsSettings settings={settings} onSettingsChange={handleSettingsChange} />
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
