"use client";

import { useState, useEffect }  from "react";
import { useSession }           from "next-auth/react";
import useSWR                   from "swr";
import Link                     from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CalendarSettings() {
  const { data: session, status } = useSession();
  const shouldFetch               = status === "authenticated";

  // 1) Fetch available Google calendars
  const { data: calendars } = useSWR<
    { id: string; summary: string }[]
  >(shouldFetch ? "/api/calendar/list" : null, fetcher);

  // 2) Local state for user selections
  const [selectedCals, setSelectedCals] = useState<string[]>([]);
  const [defaultView, setDefaultView]   =
    useState<"today"|"tomorrow"|"week"|"month"|"custom">("today");
  const [customRange, setCustomRange]   =
    useState<{ start: string; end: string }>({
      start: new Date().toISOString().slice(0,10),
      end:   new Date().toISOString().slice(0,10),
    });

  // 3) Load saved settings (from localStorage or your backend)
  useEffect(() => {
    const saved    = localStorage.getItem("flohub.calendarSettings");
    if (saved) {
      const s = JSON.parse(saved);
      setSelectedCals(s.selectedCals || []);
      setDefaultView(s.defaultView || "today");
      setCustomRange(s.customRange || customRange);
    }
  }, []);

  // 4) Handlers
  const toggleCal = (id: string) => {
    setSelectedCals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const saveSettings = () => {
    const payload = { selectedCals, defaultView, customRange };
    localStorage.setItem("flohub.calendarSettings", JSON.stringify(payload));
    alert("Calendar settings saved!");
  };

  if (status === "loading") return <p>Loading…</p>;
  if (!session) return <p>Please sign in to configure calendars.</p>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Calendar Settings</h2>

      {/* Back link */}
      <Link href="/dashboard">
        <a className="text-blue-500 hover:underline">&larr; Back to Dashboard</a>
      </Link>

      {/* 1) Calendar selection */}
      <section className="space-y-2">
        <h3 className="text-lg font-medium">Choose Calendars</h3>
        {!calendars && <p>Loading calendars…</p>}
        {calendars?.map((cal) => (
          <label key={cal.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedCals.includes(cal.id)}
              onChange={() => toggleCal(cal.id)}
              className="h-4 w-4"
            />
            <span>{cal.summary}</span>
          </label>
        ))}
      </section>

      {/* 2) Default view filter */}
      <section className="space-y-2">
        <h3 className="text-lg font-medium">Default Date Filter</h3>
        <select
          value={defaultView}
          onChange={(e) =>
            setDefaultView(e.target.value as any)
          }
          className="border px-3 py-2 rounded"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>

        {defaultView === "custom" && (
          <div className="flex gap-2">
            <div>
              <label className="block text-sm">Start</label>
              <input
                type="date"
                value={customRange.start}
                onChange={(e) =>
                  setCustomRange((r) => ({
                    ...r, start: e.target.value,
                  }))
                }
                className="border px-2 py-1 rounded"
              />
            </div>
            <div>
              <label className="block text-sm">End</label>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) =>
                  setCustomRange((r) => ({
                    ...r, end: e.target.value,
                  }))
                }
                className="border px-2 py-1 rounded"
              />
            </div>
          </div>
        )}
      </section>

      <button
        onClick={saveSettings}
        className="bg-primary-500 text-white px-4 py-2 rounded"
      >
        Save Settings
      </button>
    </div>
  );
}
