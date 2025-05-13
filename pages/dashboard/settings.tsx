"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { UserSettings } from "../../types/app"; // Import UserSettings
import NotificationManager from "@/components/ui/NotificationManager";
import WidgetManager from "@/components/ui/WidgetManager";

type CalItem = { id: string; summary: string; primary?: boolean };
type CalendarSourceType = "google" | "o365" | "apple" | "other";
import { CalendarSource } from "../../types/app";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

import DebugNavigation from "@/components/ui/DebugNavigation";

export default function SettingsPage() {
  // 1) Next-Auth session
  const { data: session, status } = useSession();
  const loadingSession = status === "loading";

  // 2) Only fetch calendars once authenticated
  const { data: calendars, error: calError } = useSWR<CalItem[]>(
    session ? "/api/calendar/list" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // 3) Settings state (local form state)
  const [settings, setSettings] = useState<UserSettings>({ // Use UserSettings type
    selectedCals: [],
    defaultView: "month",
    customRange: {
      start: new Date().toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    },
    powerAutomateUrl: "",
    globalTags: [], // Initialize globalTags
    activeWidgets: ["tasks", "calendar", "ataglance", "quicknote", "debug"], // Initialize active widgets
    calendarSources: [], // Initialize calendar sources
  });

  // State for new calendar source form
  const [newCalendarSource, setNewCalendarSource] = useState<Partial<CalendarSource>>({
    name: "",
    type: "google",
    sourceId: "",
    connectionData: "",
    tags: [],
    isEnabled: true,
  });
  
  // State for editing calendar source
  const [editingCalendarSourceIndex, setEditingCalendarSourceIndex] = useState<number | null>(null);
  
  // State to control form visibility
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  
  // State for new tag input in calendar source form
  const [newCalendarTag, setNewCalendarTag] = useState("");

  // 4) Fetch persistent user settings via SWR
  const { data: loadedSettings, error: settingsError, mutate: mutateSettings } =
    useSWR<UserSettings>(session ? "/api/userSettings" : null, fetcher, { revalidateOnFocus: false }); // Use UserSettings type

  // 5) Initialize local form state when loadedSettings changes
  useEffect(() => {
    if (loadedSettings) {
      console.log("Loaded persistent settings:", loadedSettings);
      
      // If calendarSources is not defined in loaded settings, initialize it
      // and migrate existing calendar settings to the new format
      if (!loadedSettings.calendarSources || loadedSettings.calendarSources.length === 0) {
        const migratedSources: CalendarSource[] = [];
        
        // Migrate selected Google calendars
        if (loadedSettings.selectedCals && loadedSettings.selectedCals.length > 0) {
          loadedSettings.selectedCals.forEach((calId, index) => {
            // Find the calendar name from the calendars list
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
        
        // Migrate O365 calendar if PowerAutomate URL exists
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
        
        // Update the loaded settings with the migrated sources
        loadedSettings.calendarSources = migratedSources;
      }
      
      setSettings(loadedSettings);
    }
  }, [loadedSettings, calendars]);
  // 5) Save settings to backend API
  const save = async () => {
    if (!session?.user?.email) {
      alert("You must be signed in to save settings.");
      return;
    }

    // Optimistic UI update
    mutateSettings(settings, false); // Update local cache immediately, don't revalidate yet

    try {
      const res = await fetch('/api/userSettings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        alert("Failed to save settings. Reverting changes.");
        console.error("Failed to save settings:", await res.text());
        // Revert optimistic update on failure
        mutateSettings(); // Revalidate to get the actual server state
        return;
      }

      alert("Settings saved!");
      // Trigger revalidation to ensure consistency
      mutateSettings();

    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings. Reverting changes.");
      // Revert optimistic update on failure
      mutateSettings(); // Revalidate to get the actual server state
    }
  };

  // Handlers
  const toggleCal = (id: string) => {
    setSettings((s) => {
      const newSelectedCals = s.selectedCals.includes(id)
        ? s.selectedCals.filter((x) => x !== id)
        : [...s.selectedCals, id];
      console.log("Toggling calendar selection:", newSelectedCals);
      return { ...s, selectedCals: newSelectedCals };
    });
  };

  // Early returns
  if (loadingSession) {
    return <main className="p-4 md:p-6">Loading session…</main>;
  }

  if (!session) {
    return (
      <main className="p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <p>You must sign in to configure your calendars.</p>
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

  // 7) Now calendars is a real array, safe to map
  return (
    <main className="p-4 md:p-6 space-y-6">
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

      {/* Calendar Sources */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Calendar Sources</h2>
          <button
            onClick={() => {
              setNewCalendarSource({
                name: "",
                type: "google",
                sourceId: "",
                connectionData: "",
                tags: [],
                isEnabled: true,
              });
              setEditingCalendarSourceIndex(null);
              setShowCalendarForm(true); // Show the form when button is clicked
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
          >
            Add New Calendar
          </button>
        </div>
        
        {/* Calendar Sources List */}
        <div className="space-y-4 mb-6">
          {settings.calendarSources && settings.calendarSources.length > 0 ? (
            settings.calendarSources.map((source, index) => (
              <div key={source.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-lg">{source.name}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {source.type === "google" ? "Google Calendar" :
                       source.type === "o365" ? "Microsoft 365" :
                       source.type === "apple" ? "Apple Calendar" : "Other Calendar"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={source.isEnabled}
                        onChange={() => {
                          setSettings(s => {
                            const updatedSources = [...(s.calendarSources || [])];
                            updatedSources[index] = {
                              ...updatedSources[index],
                              isEnabled: !updatedSources[index].isEnabled
                            };
                            return { ...s, calendarSources: updatedSources };
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {source.isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                    <button
                      onClick={() => {
                        setNewCalendarSource({...source});
                        setEditingCalendarSourceIndex(index);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove "${source.name}"?`)) {
                          setSettings(s => {
                            const updatedSources = [...(s.calendarSources || [])];
                            updatedSources.splice(index, 1);
                            return { ...s, calendarSources: updatedSources };
                          });
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="mt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tags:</div>
                  <div className="flex flex-wrap gap-1">
                    {source.tags && source.tags.length > 0 ? (
                      source.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No calendar sources added yet. Click "Add New Calendar" to get started.
            </div>
          )}
        </div>
        
        {/* Add/Edit Calendar Source Form */}
        {(editingCalendarSourceIndex !== null || showCalendarForm) && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-lg mb-4">
              {editingCalendarSourceIndex !== null ? "Edit Calendar Source" : "Add New Calendar Source"}
            </h3>
            
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Calendar Name</label>
                <input
                  type="text"
                  value={newCalendarSource.name || ""}
                  onChange={(e) => setNewCalendarSource({...newCalendarSource, name: e.target.value})}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="My Calendar"
                />
              </div>
              
              {/* Type */}
              <div>
                <label className="block text-sm font-medium mb-1">Calendar Type</label>
                <select
                  value={newCalendarSource.type || "google"}
                  onChange={(e) => setNewCalendarSource({...newCalendarSource, type: e.target.value as CalendarSourceType})}
                  className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="google">Google Calendar</option>
                  <option value="o365">Microsoft 365</option>
                  <option value="apple">Apple Calendar</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              {/* Source ID */}
              {newCalendarSource.type === "google" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Google Calendar ID</label>
                  <select
                    value={newCalendarSource.sourceId || ""}
                    onChange={(e) => setNewCalendarSource({...newCalendarSource, sourceId: e.target.value})}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select a Google Calendar</option>
                    {calendars && calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>{cal.summary}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {newCalendarSource.type !== "google" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Calendar ID</label>
                  <input
                    type="text"
                    value={newCalendarSource.sourceId || ""}
                    onChange={(e) => setNewCalendarSource({...newCalendarSource, sourceId: e.target.value})}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Calendar ID or identifier"
                  />
                </div>
              )}
              
              {/* Connection Data (for O365) */}
              {newCalendarSource.type === "o365" && (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">O365 Connection Method</label>
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="o365ConnectionType"
                          value="powerautomate"
                          checked={!newCalendarSource.connectionData?.startsWith("oauth:")}
                          onChange={() => {
                            // If currently using OAuth, switch to empty PowerAutomate
                            if (newCalendarSource.connectionData?.startsWith("oauth:")) {
                              setNewCalendarSource({...newCalendarSource, connectionData: ""});
                            }
                          }}
                          className="h-4 w-4 text-blue-500"
                        />
                        <span className="ml-2">PowerAutomate HTTP Request URL</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="o365ConnectionType"
                          value="oauth"
                          checked={newCalendarSource.connectionData?.startsWith("oauth:")}
                          onChange={() => {
                            // If not using OAuth, switch to OAuth
                            if (!newCalendarSource.connectionData?.startsWith("oauth:")) {
                              setNewCalendarSource({...newCalendarSource, connectionData: "oauth:default"});
                            }
                          }}
                          className="h-4 w-4 text-blue-500"
                        />
                        <span className="ml-2">Microsoft OAuth Authentication</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Show PowerAutomate URL input if that option is selected */}
                  {!newCalendarSource.connectionData?.startsWith("oauth:") && (
                    <div>
                      <label className="block text-sm font-medium mb-1">PowerAutomate HTTP Request URL</label>
                      <input
                        type="url"
                        value={newCalendarSource.connectionData || ""}
                        onChange={(e) => setNewCalendarSource({...newCalendarSource, connectionData: e.target.value})}
                        className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="https://prod-xx.westus.logic.azure.com/..."
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Paste your PowerAutomate HTTP request URL here to enable O365 calendar events.
                      </p>
                    </div>
                  )}
                  
                  {/* Show OAuth settings if that option is selected */}
                  {newCalendarSource.connectionData?.startsWith("oauth:") && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Using Microsoft OAuth authentication. You'll need to sign in with your Microsoft account when prompted.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          // Generate a unique ID for this calendar source
                          const tempId = `temp-${Date.now()}`;
                          
                          // Save the current state of the form
                          const currentSource = {...newCalendarSource};
                          
                          // Redirect to the Microsoft OAuth endpoint
                          window.location.href = `/api/auth/microsoft?calendarId=${tempId}&redirectUrl=${encodeURIComponent(window.location.pathname)}`;
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                      >
                        Connect Microsoft Account
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Connection Data for additional Google account */}
              {newCalendarSource.type === "google" && (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Google Account Connection</label>
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="googleConnectionType"
                          value="current"
                          checked={!newCalendarSource.connectionData?.startsWith("oauth:")}
                          onChange={() => {
                            if (newCalendarSource.connectionData?.startsWith("oauth:")) {
                              setNewCalendarSource({...newCalendarSource, connectionData: ""});
                            }
                          }}
                          className="h-4 w-4 text-blue-500"
                        />
                        <span className="ml-2">Use current Google account</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="googleConnectionType"
                          value="additional"
                          checked={newCalendarSource.connectionData?.startsWith("oauth:")}
                          onChange={() => {
                            if (!newCalendarSource.connectionData?.startsWith("oauth:")) {
                              setNewCalendarSource({...newCalendarSource, connectionData: "oauth:default"});
                            }
                          }}
                          className="h-4 w-4 text-blue-500"
                        />
                        <span className="ml-2">Connect different Google account</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Show OAuth settings if connecting a different Google account */}
                  {newCalendarSource.connectionData?.startsWith("oauth:") && (
                    <div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium mb-1">Account Label</label>
                        <input
                          type="text"
                          value={newCalendarSource.connectionData.replace("oauth:", "")}
                          onChange={(e) => setNewCalendarSource({...newCalendarSource, connectionData: `oauth:${e.target.value}`})}
                          className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Work Gmail, Personal Gmail, etc."
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Connect a different Google account to access its calendars.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          // Extract the account label
                          const accountLabel = newCalendarSource.connectionData?.replace("oauth:", "") || "Additional";
                          
                          // Redirect to the Google OAuth endpoint for additional accounts
                          window.location.href = `/api/auth/google-additional?accountLabel=${encodeURIComponent(accountLabel)}&redirectUrl=${encodeURIComponent(window.location.pathname)}`;
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                      >
                        Connect Google Account
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newCalendarSource.tags && newCalendarSource.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center gap-1 text-sm">
                      {tag}
                      <button
                        onClick={() => {
                          setNewCalendarSource({
                            ...newCalendarSource,
                            tags: newCalendarSource.tags?.filter(t => t !== tag) || []
                          });
                        }}
                        className="text-red-500 hover:text-red-700 ml-1"
                        aria-label={`Remove ${tag} tag`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCalendarTag}
                    onChange={(e) => setNewCalendarTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCalendarTag.trim()) {
                        setNewCalendarSource({
                          ...newCalendarSource,
                          tags: [...(newCalendarSource.tags || []), newCalendarTag.trim()]
                        });
                        setNewCalendarTag("");
                      }
                    }}
                    className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Add a tag (e.g., work, personal)"
                  />
                  <button
                    onClick={() => {
                      if (newCalendarTag.trim()) {
                        setNewCalendarSource({
                          ...newCalendarSource,
                          tags: [...(newCalendarSource.tags || []), newCalendarTag.trim()]
                        });
                        setNewCalendarTag("");
                      }
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add tags like "work" or "personal" to categorize your calendars.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setNewCalendarSource({
                      name: "",
                      type: "google",
                      sourceId: "",
                      connectionData: "",
                      tags: [],
                      isEnabled: true,
                    });
                    setEditingCalendarSourceIndex(null);
                    setShowCalendarForm(false); // Hide the form after saving
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newCalendarSource.name || !newCalendarSource.sourceId) {
                      alert("Please provide a name and calendar ID.");
                      return;
                    }
                    
                    setSettings(s => {
                      const updatedSources = [...(s.calendarSources || [])];
                      const completeSource: CalendarSource = {
                        id: editingCalendarSourceIndex !== null && updatedSources[editingCalendarSourceIndex]?.id
                          ? updatedSources[editingCalendarSourceIndex].id
                          : `${newCalendarSource.type}-${Date.now()}`,
                        name: newCalendarSource.name || "Unnamed Calendar",
                        type: newCalendarSource.type as CalendarSourceType || "google",
                        sourceId: newCalendarSource.sourceId || "",
                        connectionData: newCalendarSource.connectionData,
                        tags: newCalendarSource.tags || [],
                        isEnabled: newCalendarSource.isEnabled !== undefined ? newCalendarSource.isEnabled : true,
                      };
                      
                      if (editingCalendarSourceIndex !== null) {
                        updatedSources[editingCalendarSourceIndex] = completeSource;
                      } else {
                        updatedSources.push(completeSource);
                      }
                      
                      return { ...s, calendarSources: updatedSources };
                    });
                    
                    setNewCalendarSource({
                      name: "",
                      type: "google",
                      sourceId: "",
                      connectionData: "",
                      tags: [],
                      isEnabled: true,
                    });
                    setEditingCalendarSourceIndex(null);
                    setShowCalendarForm(false); // Hide the form after saving
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {editingCalendarSourceIndex !== null ? "Update Calendar" : "Add Calendar"}
                </button>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Add and manage your calendar sources here. You can add multiple Google Calendars, Microsoft 365, Apple Calendar, and other calendar sources.
        </p>
      </section>

      {/* Default view filter */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Default Date Filter</h2>
        <select
          value={settings.defaultView}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              defaultView: e.target.value as any,
            }))
          }
          className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full md:w-auto"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>

        {settings.defaultView === "custom" && (
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={settings.customRange.start}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    customRange: { ...s.customRange, start: e.target.value },
                  }))
                }
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={settings.customRange.end}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    customRange: { ...s.customRange, end: e.target.value },
                  }))
                }
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}
      </section>

      {/* Global Tags Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Global Tags</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Add a new tag"
            id="newTagInput"
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                const newTag = input.value.trim();
                if (newTag && !settings.globalTags.includes(newTag)) {
                  setSettings(s => ({
                    ...s,
                    globalTags: [...s.globalTags, newTag]
                  }));
                  input.value = ''; // Clear input
                }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById('newTagInput') as HTMLInputElement;
              const newTag = input.value.trim();
              if (newTag && !settings.globalTags.includes(newTag)) {
                setSettings(s => ({
                  ...s,
                  globalTags: [...s.globalTags, newTag]
                }));
                input.value = ''; // Clear input
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Add Tag
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.globalTags.map(tag => (
            <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center gap-1">
              {tag}
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  globalTags: s.globalTags.filter(t => t !== tag)
                }))}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-1"
                aria-label={`Remove ${tag} tag`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* Widget Manager Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Dashboard Widgets</h2>
        <WidgetManager
          settings={settings}
          onSettingsChange={setSettings}
        />
      </section>

      {/* Notifications Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Notifications</h2>
        <NotificationManager />
      </section>

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
