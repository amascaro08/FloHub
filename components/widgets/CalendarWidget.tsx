import { useEffect } from "react";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'An unknown error occurred');
  }
  return data;
};

export default function CalendarWidget() {
  const calendarId = "primary";
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const timeMin = now.toISOString();
  const timeMax = nextWeek.toISOString();

  // 👇 LOG for debugging
  useEffect(() => {
    console.log("CALENDAR FETCH URL:", `/api/calendar?calendarId=${calendarId}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
    console.log("Raw timeMin:", timeMin);
    console.log("Raw timeMax:", timeMax);
  }, []);

  const { data, error } = useSWR(
    `/api/calendar?calendarId=${calendarId}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
    fetcher
  );

  if (error) {
    if (error.message.includes("Not signed in") || error.message.includes("Invalid Credentials")) {
      return <div className="text-red-500">Please re-sign in to access your calendar.</div>;
    }
    return <div className="text-red-500">Failed to load calendar events.</div>;
  }

  if (!data) return <div>Loading calendar...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Upcoming Events</h2>
      <ul className="space-y-2">
        {data.length ? (
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
