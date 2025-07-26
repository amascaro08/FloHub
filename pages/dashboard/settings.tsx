import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/hooks/useUser";
import { UserSettings } from "@/types/app";
import CalendarSettings from "@/components/settings/CalendarSettings";
import FloCatSettings from "@/components/settings/FloCatSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";
import TagsSettings from "@/components/settings/TagsSettings";
import TimezoneSettings from "@/components/settings/TimezoneSettings";
import WidgetsSettings from "@/components/settings/WidgetsSettings";

const SettingsPage = () => {
  const router = useRouter();
  const { user } = useUser();
  const [settings, setSettings] = useState<UserSettings>({
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
  });
  const [activeTab, setActiveTab] = useState("general");
  const [newPersonalityKeyword, setNewPersonalityKeyword] = useState("");

  // Handle URL parameters for tab navigation
  useEffect(() => {
    if (router.query.tab && typeof router.query.tab === 'string') {
      const validTabs = ['general', 'calendar', 'widgets', 'flocat', 'notifications', 'tags'];
      if (validTabs.includes(router.query.tab)) {
        setActiveTab(router.query.tab);
      }
    }
  }, [router.query.tab]);

  // Handle success/error messages from OAuth
  useEffect(() => {
    if (router.query.success) {
      // Show success message or notification here
      console.log('OAuth success:', router.query.success);
      // Clear the query parameters
      router.replace(router.pathname, undefined, { shallow: true });
    }
    if (router.query.error) {
      // Show error message or notification here
      console.error('OAuth error:', router.query.error);
      // Clear the query parameters
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [router.query.success, router.query.error, router]);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/userSettings?userId=${user.email}`)
        .then((res) => res.json())
        .then((data) => setSettings(data));
    }
  }, [user]);

  const handleSettingsChange = (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (user?.email) {
      fetch(`/api/userSettings/update?userId=${user.email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <TimezoneSettings settings={settings} onSettingsChange={handleSettingsChange} />;
      case "calendar":
        return <CalendarSettings settings={settings} onSettingsChange={handleSettingsChange} calendars={[]} newCalendarSource={{}} setNewCalendarSource={() => {}} editingCalendarSourceIndex={null} setEditingCalendarSourceIndex={() => {}} showCalendarForm={false} setShowCalendarForm={() => {}} newCalendarTag="" setNewCalendarTag={() => {}} />;
      case "widgets":
        return <WidgetsSettings settings={settings} onSettingsChange={handleSettingsChange} />;
      case "flocat":
        return <FloCatSettings settings={settings} onSettingsChange={handleSettingsChange} newPersonalityKeyword={newPersonalityKeyword} setNewPersonalityKeyword={setNewPersonalityKeyword} />;
      case "notifications":
        return <NotificationsSettings settings={settings} onSettingsChange={handleSettingsChange} />;
      case "tags":
        return <TagsSettings settings={settings} onSettingsChange={handleSettingsChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-[var(--fg)]">Settings</h1>
      {/* Fixed mobile responsive tab navigation */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          <button onClick={() => setActiveTab("general")} className={`py-2 px-4 transition-colors whitespace-nowrap ${activeTab === "general" ? "border-b-2 border-primary-500 text-primary-600" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>General</button>
          <button onClick={() => setActiveTab("calendar")} className={`py-2 px-4 transition-colors whitespace-nowrap ${activeTab === "calendar" ? "border-b-2 border-primary-500 text-primary-600" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>Calendar</button>
          <button onClick={() => setActiveTab("widgets")} className={`py-2 px-4 transition-colors whitespace-nowrap ${activeTab === "widgets" ? "border-b-2 border-primary-500 text-primary-600" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>Widgets</button>
          <button onClick={() => setActiveTab("flocat")} className={`py-2 px-4 transition-colors whitespace-nowrap ${activeTab === "flocat" ? "border-b-2 border-primary-500 text-primary-600" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>FloCat</button>
          <button onClick={() => setActiveTab("notifications")} className={`py-2 px-4 transition-colors whitespace-nowrap ${activeTab === "notifications" ? "border-b-2 border-primary-500 text-primary-600" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>Notifications</button>
          <button onClick={() => setActiveTab("tags")} className={`py-2 px-4 transition-colors whitespace-nowrap ${activeTab === "tags" ? "border-b-2 border-primary-500 text-primary-600" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"}`}>Tags</button>
        </div>
      </div>
      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SettingsPage;