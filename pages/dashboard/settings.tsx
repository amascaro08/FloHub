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
import SidebarSettings from "@/components/settings/SidebarSettings";
import { 
  CogIcon,
  GlobeAltIcon,
  CalendarIcon,
  Squares2X2Icon,
  SparklesIcon,
  BellIcon,
  TagIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

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
  const [isSaving, setIsSaving] = useState(false);

  // Define tabs with icons and improved structure
  const tabs = [
    { id: "general", label: "General", icon: GlobeAltIcon, description: "Timezone and basic settings" },
    { id: "sidebar", label: "Sidebar", icon: Bars3Icon, description: "Customize navigation menu" },
    { id: "calendar", label: "Calendar", icon: CalendarIcon, description: "Calendar sources and settings" },
    { id: "widgets", label: "Widgets", icon: Squares2X2Icon, description: "Dashboard widget management" },
    { id: "flocat", label: "FloCat", icon: SparklesIcon, description: "AI assistant preferences" },
    { id: "notifications", label: "Notifications", icon: BellIcon, description: "Alerts and email settings" },
    { id: "tags", label: "Tags", icon: TagIcon, description: "Global tag management" },
  ];

  // Handle URL parameters for tab navigation
  useEffect(() => {
    if (router.query.tab && typeof router.query.tab === 'string') {
      const validTabs = tabs.map(tab => tab.id);
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
      // Clear the query parameters and refresh settings
      router.replace(router.pathname, undefined, { shallow: true });
      // Reload settings after OAuth success to get updated calendar sources
      if (user?.email) {
        setTimeout(() => {
          fetch(`/api/userSettings?userId=${user.email}`)
            .then((res) => res.json())
            .then((data) => {
              console.log('Refreshed settings after OAuth:', data);
              setSettings(data);
            });
        }, 1000); // Wait 1 second for backend to process
      }
    }
    if (router.query.error) {
      // Show error message or notification here
      console.error('OAuth error:', router.query.error);
      // Clear the query parameters
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [router.query.success, router.query.error, router, user?.email]);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/userSettings?userId=${user.email}`)
        .then((res) => res.json())
        .then((data) => setSettings(data));
    }
  }, [user]);

  const handleSettingsChange = async (newSettings: UserSettings) => {
    // Prevent concurrent saves
    if (isSaving) {
      console.log('Save already in progress, skipping...');
      return;
    }

    setIsSaving(true);
    setSettings(newSettings);
    
    if (user?.email) {
      try {
        console.log('Saving settings with calendar sources:', newSettings.calendarSources?.length || 0);
        const response = await fetch(`/api/userSettings/update?userId=${user.email}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSettings),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to save settings:', response.status, errorText);
          // Optionally show user notification here
          alert('Failed to save settings. Please try again.');
          return;
        }
        
        console.log('Settings saved successfully');
        
        // Verify the save by fetching settings again
        const verifyResponse = await fetch(`/api/userSettings?userId=${user.email}`);
        if (verifyResponse.ok) {
          const savedSettings = await verifyResponse.json();
          console.log('Verified saved calendar sources:', savedSettings.calendarSources?.length || 0);
          setSettings(savedSettings); // Update with server state
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings. Please try again.');
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <TimezoneSettings settings={settings} onSettingsChange={handleSettingsChange} />;
      case "sidebar":
        return <SidebarSettings settings={settings} onSettingsChange={handleSettingsChange} />;
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
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <CogIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--fg)]">Settings</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Customize your FloHub experience
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <nav className="space-y-1 p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group
                        ${isActive 
                          ? 'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800' 
                          : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/50'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 group-hover:text-neutral-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${isActive ? 'text-primary-700 dark:text-primary-300' : ''}`}>
                            {tab.label}
                          </p>
                          <p className={`text-xs ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {tab.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Saving indicator */}
            {isSaving && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 dark:bg-amber-900/20 dark:border-amber-800">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Saving changes...</p>
                </div>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="mt-8 lg:mt-0 lg:col-span-9">
            <div className="animate-fade-in">
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;