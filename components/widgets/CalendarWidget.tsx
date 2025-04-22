"use client";

import { useSession } from "next-auth/react";
import useSWR         from "swr";
import { useState, useMemo } from "react";

interface CalendarEvent {
  id:      string;
  summary: string;
  start:   { dateTime?: string; date?: string };
  end?:    { dateTime?: string; date?: string };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CalendarWidget() {
  const { data: session, status } = useSession();
  const shouldFetch               = status === "authenticated";

  const { data, error } = useSWR<CalendarEvent[]>(
    shouldFetch ? "/api/calendar" : null,
    fetcher
  );

  if (status === "loading") {
    return (
      <div className="glass p-4 rounded-xl shadow-elevate-sm text-center">
        Loading events…
      </div>
    );
  }
  if (!session) {
    return (
      <div className="glass p-4 rounded-xl shadow-elevate-sm text-center text-[var(--fg)]">
        Please sign in to view your calendar.
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass p-4 rounded-xl shadow-elevate-sm text-red-500">
        Failed to load calendar.
      </div>
    );
  }

  const events: CalendarEvent[] = Array.isArray(data) ? data : [];
  const [view, setView] = useState<"today"|"tomorrow"|"week">("today");

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
      const wk = new Date(now);
      wk.setDate(wk.getDate() + 7);
      return d >= now && d <= wk;
    });
  }, [events, view]);

  const fmt = new Intl.DateTimeFormat(undefined, {
    month:  "short",
    day:    "numeric",
    hour:   "numeric",
    minute: "numeric",
  });

  return (
    <div className="glass p-4 rounded-xl shadow-elevate-sm text-[var(--fg)]">
      <h3 className="text-lg font-semibold mb-3">Events</h3>

      <div className="flex gap-2 mb-4">
        {(["today", "tomorrow", "week"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`
              px-3 py-1 rounded
              ${
                view === v
                  ? "bg-primary-500 text-white"
                  : "bg-[var(--neutral-200)] text-[var(--fg)]"
              }
              hover:opacity-80 transition
            `}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <ul className="space-y-2 text-sm">
        {filtered.length > 0 ? (
          filtered.map((e) => {
            const s = e.start.dateTime || e.start.date;
            const d = s ? new Date(s) : null;
            return (
              <li
                key={e.id}
                className="flex justify-between items-center"
              >
                <span>
                  {d ? fmt.format(d) : "—"}
                </span>
                <span className="font-medium">{e.summary}</span>
              </li>
            );
          })
        ) : (
          <li className="text-[var(--neutral-500)]">No events.</li>
        )}
      </ul>
    </div>
  );
}
