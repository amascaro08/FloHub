import useSWR from "swr";
import { useState, useMemo } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?:   { dateTime?: string; date?: string };
}

// fetcher returns CalendarEvent[]
const fetcher = (url: string): Promise<CalendarEvent[]> =>
  fetch(url).then((res) => {
    if (!res.ok && res.status !== 304) throw new Error(`HTTP ${res.status}`);
    return res.status === 304 ? [] : res.json();
  });

export default function CalendarWidget() {
  // keep the raw `data` for loading state
  const { data, error, mutate } = useSWR<CalendarEvent[]>(
    "/api/calendar",
    fetcher,
    { revalidateOnFocus: false }
  );
  // ensure events is always an array
  const events: CalendarEvent[] = Array.isArray(data) ? data : [];

  // ── Range Picker State ────────────────────────────────────────────
  const options = ["today", "tomorrow", "thisWeek", "nextWeek", "custom"] as const;
  type Opt = typeof options[number];
  const [range, setRange]             = useState<Opt>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");

  // ── Compute startDate/endDate ─────────────────────────────────────
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date(now), end = new Date(now);

    const day = now.getDay();
    const mondayOffset = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "tomorrow":
        start.setDate(start.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "thisWeek":
        start = monday;
        end   = sunday;
        break;
      case "nextWeek":
        start = new Date(monday);
        start.setDate(monday.getDate() + 7);
        start.setHours(0, 0, 0, 0);
        end = new Date(sunday);
        end.setDate(sunday.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (customStart) {
          start = new Date(customStart);
          start.setHours(0, 0, 0, 0);
        }
        if (customEnd) {
          end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
        }
        break;
    }

    return { startDate: start, endDate: end };
  }, [range, customStart, customEnd]);

  // ── Group & Sort Events ───────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const raw = e.start.dateTime ?? e.start.date;
      if (!raw) continue;
      const d = new Date(raw);
      if (d < startDate || d > endDate) continue;
      const key = d.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => {
        const da = new Date(a.start.dateTime ?? a.start.date!);
        const db = new Date(b.start.dateTime ?? b.start.date!);
        return da.getTime() - db.getTime();
      })
    );
    return map;
  }, [events, startDate, endDate]);

  // ── Formatters ───────────────────────────────────────────────────
  const dateFmt = new Intl.DateTimeFormat("default", {
    weekday: "short",
    month:    "short",
    day:      "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("default", {
    hour:   "numeric",
    minute: "numeric",
    hour12: false,
  });

  // ── Sample Event Helper ──────────────────────────────────────────
  const addSampleEvent = async () => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    await fetch("/api/calendar", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        summary: "FloHub Focus Block",
        start:   start.toISOString(),
        end:     end.toISOString(),
      }),
    });
    await mutate();
  };

  if (error) return <p className="text-red-500">Failed to load calendar.</p>;
  if (!data)  return <p>Loading events…</p>;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">Calendar View</h3>

      {/* Range picker */}
      <div className="flex flex-wrap gap-2 mb-4">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => setRange(opt)}
            className={`px-3 py-1 text-sm rounded ${
              range === opt
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {opt === "thisWeek"
              ? "This Week"
              : opt === "nextWeek"
              ? "Next Week"
              : opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            />
            <span>–</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            />
          </div>
        )}
      </div>

      {/* Grouped events */}
      {Object.keys(grouped).length > 0 ? (
        Object.entries(grouped).map(([dateStr, evs]) => {
          const date = new Date(dateStr);
          return (
            <div key={dateStr} className="mb-4">
              <h4 className="font-semibold mb-2">{dateFmt.format(date)}</h4>
              <ul className="space-y-1">
                {evs.map((e) => {
                  const raw = e.start.dateTime ?? e.start.date!;
                  const dt  = new Date(raw);
                  return (
                    <li key={e.id} className="flex justify-between text-sm">
                      <span>{timeFmt.format(dt)}</span>
                      <span className="font-medium">{e.summary}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      ) : (
        <p className="text-gray-500">No events in this range.</p>
      )}

      <button
        onClick={addSampleEvent}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Add 1h Block Tomorrow @9AM
      </button>
    </div>
  );
}
