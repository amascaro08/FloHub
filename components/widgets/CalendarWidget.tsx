import useSWR from "swr";
import { useState } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CalendarWidget() {
  const { data: events, error, mutate } = useSWR<CalendarEvent[]>(
    "/api/calendar",
    fetcher
  );
  const [busy, setBusy] = useState(false);

  if (error) return <p className="text-red-500">Failed to load calendar.</p>;
  if (!events) return <p>Loading events…</p>;

  const formatDate = new Intl.DateTimeFormat("default", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  async function addBlock() {
    setBusy(true);
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: "FloHub Focus Block",
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    });
    await mutate();
    setBusy(false);
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-3">Upcoming Events</h3>

      <ul className="space-y-2 mb-4 text-sm">
        {events.length === 0 ? (
          <li className="text-gray-500">No upcoming events.</li>
        ) : (
          events.map((e) => {
            const raw = e.start.dateTime || e.start.date!;
            const date = raw ? new Date(raw) : null;
            return (
              <li key={e.id} className="flex justify-between">
                <span>{date ? formatDate.format(date) : "No date"}</span>
                <span className="font-semibold">{e.summary}</span>
              </li>
            );
          })
        )}
      </ul>

      <button
        onClick={addBlock}
        disabled={busy}
        className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-orange-500 disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Add 1h Block Tomorrow @9AM"}
      </button>
    </div>
  );
}
