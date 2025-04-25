// /components/widgets/CalendarWidget.tsx

"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CalendarWidget() {
  const calendarId = "primary"; // Replace if you have a custom calendarId
  const timeMin = new Date().toISOString();
  const timeMax = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(); // next 7 days

  const { data, error } = useSWR(
    `/api/calendar/list?calendarId=${calendarId}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
    fetcher
  );

  if (error) return <div>Failed to load calendar.</div>;
  if (!data) return <div>Loading calendar...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Upcoming Events</h2>
      <ul className="space-y-2">
        {data?.events?.length > 0 ? (
          data.events.map((event: any) => (
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
