import { useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { UserSettings } from "@/types/app";
import CalendarSettings from "@/components/settings/CalendarSettings";
import FloCatSettings from "@/components/settings/FloCatSettings";
import NotificationsSettings from "@/components/settings/NotificationsSettings";
import TagsSettings from "@/components/settings/TagsSettings";
import TimezoneSettings from "@/components/settings/TimezoneSettings";
import WidgetsSettings from "@/components/settings/WidgetsSettings";

const SettingsPage = () => {
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
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="flex border-b">
        <button onClick={() => setActiveTab("general")} className={`py-2 px-4 ${activeTab === "general" ? "border-b-2 border-blue-500" : ""}`}>General</button>
        <button onClick={() => setActiveTab("calendar")} className={`py-2 px-4 ${activeTab === "calendar" ? "border-b-2 border-blue-500" : ""}`}>Calendar</button>
        <button onClick={() => setActiveTab("widgets")} className={`py-2 px-4 ${activeTab === "widgets" ? "border-b-2 border-blue-500" : ""}`}>Widgets</button>
        <button onClick={() => setActiveTab("flocat")} className={`py-2 px-4 ${activeTab === "flocat" ? "border-b-2 border-blue-500" : ""}`}>FloCat</button>
        <button onClick={() => setActiveTab("notifications")} className={`py-2 px-4 ${activeTab === "notifications" ? "border-b-2 border-blue-500" : ""}`}>Notifications</button>
        <button onClick={() => setActiveTab("tags")} className={`py-2 px-4 ${activeTab === "tags" ? "border-b-2 border-blue-500" : ""}`}>Tags</button>
      </div>
      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SettingsPage;