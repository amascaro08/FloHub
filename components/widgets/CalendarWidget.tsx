import { useEffect, useState } from "react"; // Import useState
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
  // State to hold selected calendar IDs, initialize with default
  const [selectedCals, setSelectedCals] = useState<string[]>(["primary"]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const rawSettings = localStorage.getItem("flohub.calendarSettings");
    let calIds = ["primary"]; // Default to primary
    if (rawSettings) {
      try {
        const settings = JSON.parse(rawSettings);
        if (Array.isArray(settings.selectedCals) && settings.selectedCals.length > 0) {
          calIds = settings.selectedCals;
        }
      } catch (e) {
        console.error("Failed to parse calendar settings from localStorage", e);
      }
    }
    setSelectedCals(calIds);
  }, []);


  // State for time range
  const [timeRange, setTimeRange] = useState<{ timeMin: string; timeMax: string } | null>(null);

  // Calculate time range once on mount
  useEffect(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    setTimeRange({
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
    });
  }, []); // Empty dependency array ensures this runs only once

  // Construct the URL dynamically based on selectedCals state and timeRange
  const apiUrl = timeRange
    ? `/api/calendar?timeMin=${encodeURIComponent(timeRange.timeMin)}&timeMax=${encodeURIComponent(timeRange.timeMax)}${selectedCals.map(id => `&calendarId=${encodeURIComponent(id)}`).join('')}`
    : null; // Don't fetch until timeRange is set

  // 👇 LOG for debugging
  useEffect(() => {
    if (apiUrl && timeRange) {
      console.log("CALENDAR FETCH URL:", apiUrl);
      console.log("Raw timeMin:", timeRange.timeMin);
      console.log("Raw timeMax:", timeRange.timeMax);
    }
  }, [apiUrl, timeRange]); // Re-run if URL or timeRange changes

  const { data, error } = useSWR(
    apiUrl, // Use the dynamically generated URL
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
