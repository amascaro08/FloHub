// components/widgets/CalendarWidget.tsx
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CalendarWidget() {
  const calendarId = "primary"; // Using "primary" calendar
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const timeMin = now.toISOString();
  const timeMax = nextWeek.toISOString();

  const { data, error } = useSWR(
    `/api/calendar?calendarId=${calendarId}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
    fetcher
  );

  if (error) return <div>Failed to load calendar events.</div>;
  if (!data) return <div>Loading calendar...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Upcoming Events</h2>
      <ul className="space-y-2">
        {data?.length ? (
          data.map((event: any) => (
            <li key={event.id} className="border-b pb-2">
              <div className="font-medium">{event.summary}</div>
              <div className="text-sm text-gray-600">
                {new Date(event.start.dateTime || event.start.date).toLocaleString()}
              </div>
            </li>
          ))
        ) : (
          <li>No events scheduled.</li>
        )}
      </ul>
    </div>
  );
}
