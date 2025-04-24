// pages/dashboard/settings.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession }          from "next-auth/react";
import useSWR                  from "swr";
import Link                    from "next/link";

type CalItem = { id: string; summary: string };
type Settings = {
  selectedCals: string[];
  defaultView:  "today"|"tomorrow"|"week"|"month"|"custom";
  customRange:  { start: string; end: string };
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export default function CalendarSettingsPage() {
  // 1) Auth guard
  const { data: session, status } = useSession();
  const loadingSession = status === "loading";

  // 2) SWR – only fetch once authenticated
  const { data: calendars, error: calError } = useSWR<CalItem[]>(
    session ? "/api/calendar/list" : null,
    fetcher
  );

  // 3) Local state for settings
  const [settings, setSettings] = useState<Settings>({
    selectedCals: [],
    defaultView:  "month",
    customRange:  {
      start: new Date().toISOString().slice(0,10),
      end:   new Date().toISOString().slice(0,10),
    },
  });

  // 4) Load saved settings
  useEffect(() => {
    const raw = localStorage.getItem("flohub.calendarSettings");
    if (raw) {
      try {
        setSettings(JSON.parse(raw));
      } catch {
        console.warn("Invalid calendarSettings in localStorage");
      }
    }
  }, []);

  // 5) Handlers
  const toggleCal = (id: string) =>
    setSettings((s) => ({
      ...s,
      selectedCals: s.selectedCals.includes(id)
        ? s.selectedCals.filter((x) => x !== id)
        : [...s.selectedCals, id],
    }));

  const save = () => {
    localStorage.setItem("flohub.calendarSettings", JSON.stringify(settings));
    alert("Settings saved!");
  };

  // 6) Render guards
  if (loadingSession) {
    return <p>Loading…</p>;
  }
  if (!session) {
    return (
      <main className="p-6">
        <p>Please sign in to configure calendars.</p>
      </main>
    );
  }
  if (calError) {
    return (
      <main className="p-6">
        <p className="text-red-500">Failed to load calendars: {calError.message}</p>
      </main>
    );
  }
  if (!calendars) {
    return (
      <main className="p-6">
        <p>Loading calendars…</p>
      </main>
    );
  }
  if (!Array.isArray(calendars)) {
    return (
      <main className="p-6">
        <p className="text-red-500">Unexpected response format from /api/calendar/list</p>
      </main>
    );
  }

  // 7) Actual settings UI
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Calendar Settings</h1>
      <Link href="/dashboard">
        <a className="text-blue-500 hover:underline">&larr; Back to Dashboard</a>
      </Link>

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
