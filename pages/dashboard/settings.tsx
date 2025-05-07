"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { UserSettings } from "../../types/app"; // Import UserSettings
import NotificationManager from "@/components/ui/NotificationManager";

type CalItem = { id: string; summary: string };

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export default function CalendarSettingsPage() {
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
  });

  // 4) Fetch persistent user settings via SWR
  const { data: loadedSettings, error: settingsError, mutate: mutateSettings } =
    useSWR<UserSettings>(session ? "/api/userSettings" : null, fetcher, { revalidateOnFocus: false }); // Use UserSettings type

  // 5) Initialize local form state when loadedSettings changes
  useEffect(() => {
    if (loadedSettings) {
      console.log("Loaded persistent settings:", loadedSettings);
      setSettings(loadedSettings);
    }
  }, [loadedSettings]);
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
    return <main className="p-6">Loading session…</main>;
  }

  if (!session) {
    return (
      <main className="p-6">
        <p>You must sign in to configure your calendars.</p>
        <button
          onClick={() => signIn()}
          className="mt-4 px-4 py-2 bg-primary-500 text-white rounded"
        >
          Sign In
        </button>
      </main>
    );
  }

  if (calError) {
    return (
      <main className="p-6">
        <p className="text-red-500">
          Failed to load calendars: {calError.message}
        </p>
      </main>
    );
  }

  if (!calendars) {
    return <main className="p-6">Loading your calendars…</main>;
  }

  // 7) Now calendars is a real array, safe to map
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Calendar Settings</h1>
      <Link href="/dashboard">
        <a className="text-blue-500 hover:underline">&larr; Back to Dashboard</a>
      </Link>

      {/* PowerAutomate URL */}
      <section>
        <h2 className="text-lg font-medium mb-2">Work Calendar (O365 PowerAutomate URL)</h2>
        <input
          type="url"
          placeholder="Enter your PowerAutomate HTTP request URL"
          value={settings.powerAutomateUrl || ""}
          onChange={(e) => {
            setSettings((s) => ({
              ...s,
              powerAutomateUrl: e.target.value,
            }));
            console.log("PowerAutomate URL changed to:", e.target.value);
          }}
          className="border px-3 py-2 rounded w-full"
        />
        <p className="text-xs text-[var(--fg-muted)] mt-1">
          Paste your PowerAutomate HTTP request URL here to enable O365 work calendar events.
        </p>
      </section>

      {/* Calendar selection */}
      <section>
        <h2 className="text-lg font-medium mb-2">Which calendars?</h2>
        <div className="space-y-1">
          {calendars.map((cal) => (
            <label key={cal.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.selectedCals.includes(cal.id)}
                onChange={() => toggleCal(cal.id)}
                className="h-4 w-4"
              />
              <span>{cal.summary}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Default view filter */}
      <section>
        <h2 className="text-lg font-medium mb-2">Default date filter</h2>
        <select
          value={settings.defaultView}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              defaultView: e.target.value as any,
            }))
          }
          className="border px-3 py-2 rounded"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>

        {settings.defaultView === "custom" && (
          <div className="mt-2 flex gap-4">
            <div>
              <label className="block text-sm">Start</label>
              <input
                type="date"
                value={settings.customRange.start}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    customRange: { ...s.customRange, start: e.target.value },
                  }))
                }
                className="border px-2 py-1 rounded"
              />
            </div>
            <div>
              <label className="block text-sm">End</label>
              <input
                type="date"
                value={settings.customRange.end}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    customRange: { ...s.customRange, end: e.target.value },
                  }))
                }
                className="border px-2 py-1 rounded"
              />
            </div>
          </div>
        )}
:start_line:238
-------
      </section>

      {/* Global Tags Section */}
      <section>
        <h2 className="text-lg font-medium mb-2">Global Tags</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Add a new tag"
            id="newTagInput"
            className="border px-3 py-2 rounded flex-grow"
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
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Tag
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.globalTags.map(tag => (
            <span key={tag} className="bg-gray-200 px-3 py-1 rounded-full flex items-center gap-1">
              {tag}
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  globalTags: s.globalTags.filter(t => t !== tag)
                }))}
                className="text-red-500 hover:text-red-700"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* Notifications Section */}
      <section>
        <h2 className="text-lg font-medium mb-2">Notifications</h2>
        <NotificationManager />
      </section>

      <button
        onClick={save}
        className="bg-primary-500 text-white px-4 py-2 rounded"
      >
        Save Settings
      </button>
    </main>
  );
}
