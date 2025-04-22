// components/widgets/CalendarWidget.tsx
import useSWR from "swr";
import { useState, useMemo } from "react";

interface CalEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?:   { dateTime?: string; date?: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CalendarWidget() {
  const { data: allEvents, error } = useSWR<CalEvent[]>("/api/calendar", fetcher);
  const [view, setView] = useState<"today"|"tomorrow"|"week"|"month">("today");

  if (error) return <p className="text-red-500">Failed to load calendar.</p>;
  if (!allEvents) return <p>Loading events…</p>;

  const now = new Date();
  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      const iso = e.start.dateTime || e.start.date;
      if (!iso) return false;
      const d = new Date(iso);
      const diffDays = Math.floor((d.getTime() - now.getTime())/86400000);

      switch (view) {
        case "today":    return d.toDateString() === now.toDateString();
        case "tomorrow": return diffDays === 1;
        case "week":     return diffDays >= 0 && diffDays < 7;
        case "month":    return d.getMonth() === now.getMonth();
      }
    });
  }, [allEvents, view]);

  const fmt = new Intl.DateTimeFormat("default", {
    month: "short", day: "numeric", hour: "numeric", minute: "numeric"
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">Events</h3>

      {/* view picker */}
      <div className="flex gap-2 mb-4 text-sm">
        {(["today","tomorrow","week","month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2 py-1 rounded ${view===v ? "bg-pastel-teal text-white" : "hover:bg-gray-100"}`}
          >
            {v.charAt(0).toUpperCase()+v.slice(1)}
          </button>
        ))}
      </div>

      <ul className="space-y-2 text-sm">
        {filtered.length > 0 ? filtered.map((e) => {
          const iso = e.start.dateTime || e.start.date || "";
          const d = new Date(iso);
          return (
            <li key={e.id} className="flex justify-between">
              <span>{fmt.format(d)}</span>
              <span className="font-semibold">{e.summary}</span>
            </li>
          );
        }) : (
          <li className="text-gray-500">No {view} events.</li>
        )}
      </ul>
    </div>
  );
}
