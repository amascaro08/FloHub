// components/widgets/CalendarWidget.tsx
"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CalendarWidget() {
  const { data, error } = useSWR<CalendarEvent[]>("/api/calendar", fetcher);
  const [view, setView] = useState<"today"|"tomorrow"|"week">("today");

  if (error) {
    return <p className="text-red-500">Failed to load calendar.</p>;
  }
  if (!data) {
    return <p>Loading events…</p>;
  }

  // make sure it's really an array
  const events: CalendarEvent[] = Array.isArray(data) ? data : [];

  // filter by your view (example: today)
  const filtered = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      const s = e.start.dateTime || e.start.date;
      if (!s) return false;
      const d = new Date(s);
      if (view === "today") {
        return d.toDateString() === now.toDateString();
      }
      if (view === "tomorrow") {
        const t = new Date(now);
        t.setDate(t.getDate() + 1);
        return d.toDateString() === t.toDateString();
      }
      // week view
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);
      return d >= now && d <= weekLater;
    });
  }, [events, view]);

  const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "numeric"
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">Events</h3>

      {/* view selector */}
      <div className="flex gap-2 mb-4">
        {["today","tomorrow","week"].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={`
              px-3 py-1 rounded
              ${view===v? "bg-indigo-600 text-white":"bg-gray-200 text-gray-700"}
            `}
          >
            {v.charAt(0).toUpperCase()+v.slice(1)}
          </button>
        ))}
      </div>

      <ul className="space-y-2 text-sm mb-4">
        {filtered.length > 0
          ? filtered.map((e) => {
              const s = e.start.dateTime || e.start.date;
              const d = s ? new Date(s) : null;
              return (
                <li key={e.id} className="flex justify-between">
                  <span>{d ? dateTimeFormat.format(d) : "—"}</span>
                  <span className="font-semibold">{e.summary}</span>
                </li>
              );
            })
          : <li className="text-gray-500">No events.</li>
        }
      </ul>
    </div>
  );
}
