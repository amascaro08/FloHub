// components/widgets/CalendarWidget.tsx
"use client";

import { useSession } from "next-auth/react";
import useSWR         from "swr";
import { useState, useEffect, useMemo } from "react";
import Link          from "next/link";
import type { CalendarEvent } from "@/pages/api/calendar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CalendarWidget() {
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated";

  // 1) Load settings
  const [settings, setSettings] = useState<{
    selectedCals: string[];
    defaultView:  "today"|"tomorrow"|"week"|"month"|"custom";
    customRange:  { start: string; end: string };
  }>({
    selectedCals: [],
    defaultView:  "month",
    customRange: {
      start: new Date().toISOString().slice(0, 10),
      end:   new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("flohub.calendarSettings");
    if (raw) {
      try { setSettings(JSON.parse(raw)); } catch {}
    }
  }, []);

  const { selectedCals, defaultView, customRange } = settings;

  // 2) Compute timeMin/timeMax
  const { timeMin, timeMax } = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    switch (defaultView) {
      case "today":
        start = new Date(now); start.setHours(0,0,0,0);
        end   = new Date(start); end.setDate(end.getDate()+1);
        break;
      case "tomorrow":
        start = new Date(now); start.setDate(start.getDate()+1); start.setHours(0,0,0,0);
        end   = new Date(start); end.setDate(end.getDate()+1);
        break;
      case "week":
        start = new Date(now); start.setHours(0,0,0,0);
        end   = new Date(start); end.setDate(end.getDate()+7);
        break;
      case "custom":
        start = new Date(customRange.start);
        end   = new Date(customRange.end); end.setHours(23,59,59,999);
        break;
      default: // month
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end   = new Date(start); end.setMonth(end.getMonth()+1);
    }
    return {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    };
  }, [defaultView, customRange]);

  // 3) Build API URL
  const apiUrl =
    isAuthed && selectedCals.length > 0
      ? "/api/calendar?" +
        new URLSearchParams([
          ...selectedCals.map((id) => ["calendarId", id]),
          ["timeMin", timeMin],
          ["timeMax", timeMax],
        ]).toString()
      : null;

  // 4) Fetch events
  const { data, error } = useSWR<CalendarEvent[]>(apiUrl, fetcher);

  // 5) Early returns
  if (status === "loading") {
    return <div>Loading calendar…</div>;
  }
  if (!isAuthed) {
    return <div>Please sign in to view your calendar.</div>;
  }
  if (selectedCals.length === 0) {
    return (
      <div>
        No calendars selected.{" "}
        <Link href="/dashboard/settings">
          <a className="text-primary-500 hover:underline">Configure Settings</a>
        </Link>
      </div>
    );
  }
  if (error) {
    return <div className="text-red-500">Failed to load events.</div>;
  }

  const events = data || [];
  const fmt = new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "numeric"
  });

  // 6) Render
  return (
    <div className="glass p-4 rounded-xl shadow-elevate-sm text-[var(--fg)]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Events</h3>
        <Link href="/dashboard/settings">
          <a className="text-sm text-primary-500 hover:underline">⚙️</a>
        </Link>
      </div>

      <ul className="space-y-2 text-sm max-h-80 overflow-auto">
        {events.length > 0 ? (
          events.map((e) => {
            const s = e.start.dateTime || e.start.date;
            const d = s ? new Date(s) : null;
            return (
              <li key={e.id} className="flex justify-between">
                <span>{d ? fmt.format(d) : "—"}</span>
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
