import React, { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

type ViewType = 'today' | 'tomorrow' | 'week' | 'month' | 'custom';
type CustomRange = { start: string; end: string };

export interface CalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  source?: "personal" | "work"; // "personal" = Google, "work" = O365
  description?: string; // Add description field
}

const fetcher = async (url: string): Promise<CalendarEvent[]> => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error loading events');
  return data;
};

export default function CalendarWidget() {
  const { mutate } = useSWRConfig();
  const [selectedCals, setSelectedCals] = useState<string[]>(['primary']);
  const [activeView, setActiveView] = useState<ViewType>('week');
  const [customRange, setCustomRange] = useState<CustomRange>({ start: '', end: '' });
  const [timeRange, setTimeRange] = useState<{ timeMin: string; timeMax: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<{
    calendarId: string;
    summary: string;
    start: string;
    end: string;
  }>({ calendarId: '', summary: '', start: '', end: '' });
  const [powerAutomateUrl, setPowerAutomateUrl] = useState<string>("");

  // Load calendar settings on mount from backend API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/userSettings');
        if (!res.ok) {
          console.error('Failed to load calendar settings:', await res.text());
          return;
        }
        const settings = await res.json();
        if (Array.isArray(settings.selectedCals) && settings.selectedCals.length > 0) {
          setSelectedCals(settings.selectedCals);
        }
        if (['today', 'tomorrow', 'week', 'month', 'custom'].includes(settings.defaultView)) {
          setActiveView(settings.defaultView);
        }
        if (
          settings.customRange &&
          typeof settings.customRange.start === 'string' &&
          typeof settings.customRange.end === 'string'
        ) {
          setCustomRange({ start: settings.customRange.start, end: settings.customRange.end });
        }
        if (typeof settings.powerAutomateUrl === "string") {
          setPowerAutomateUrl(settings.powerAutomateUrl);
        }
      } catch (e) {
        console.error('Failed to load calendar settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Save calendar settings to backend API when they change
  useEffect(() => {
    const saveSettings = async () => {
      const settings = {
        selectedCals,
        defaultView: activeView,
        customRange,
        powerAutomateUrl,
      };
      try {
        const res = await fetch('/api/userSettings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        if (!res.ok) {
          console.error('Failed to save calendar settings:', await res.text());
        }
      } catch (e) {
        console.error('Failed to save calendar settings:', e);
      }
    };
    saveSettings();
  }, [selectedCals, activeView, customRange, powerAutomateUrl]);

  // Calculate time range when view or customRange changes
  useEffect(() => {
    const now = new Date();
    let minDate = new Date();
    let maxDate = new Date();
    const startOfDay = (d: Date) => (d.setHours(0, 0, 0, 0), d);
    const endOfDay = (d: Date) => (d.setHours(23, 59, 59, 999), d);

    switch (activeView) {
      case 'today':
        minDate = startOfDay(new Date(now));
        maxDate = endOfDay(new Date(now));
        break;
      case 'tomorrow':
        const t = new Date(now);
        t.setDate(now.getDate() + 1);
        minDate = startOfDay(t);
        maxDate = endOfDay(t);
        break;
      case 'week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        minDate = startOfDay(new Date(monday));
        maxDate = endOfDay(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000));
        break;
      }
      case 'month':
        minDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        maxDate = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'custom': {
        const cs = new Date(customRange.start);
        const ce = new Date(customRange.end);
        if (!isNaN(cs.getTime()) && !isNaN(ce.getTime()) && cs <= ce) {
          minDate = startOfDay(cs);
          maxDate = endOfDay(ce);
        } else {
          // Fallback to week
          const dd = now.getDay();
          const diff2 = now.getDate() - dd + (dd === 0 ? -6 : 1);
          const monday2 = new Date(now.setDate(diff2));
          minDate = startOfDay(new Date(monday2));
          maxDate = endOfDay(new Date(monday2.getTime() + 6 * 24 * 60 * 60 * 1000));
        }
        break;
      }
      default:
        // default to week
        const ddd = now.getDay();
        const diff3 = now.getDate() - ddd + (ddd === 0 ? -6 : 1);
        const monday3 = new Date(now.setDate(diff3));
        minDate = startOfDay(new Date(monday3));
        maxDate = endOfDay(new Date(monday3.getTime() + 6 * 24 * 60 * 60 * 1000));
    }
    setTimeRange({ timeMin: minDate.toISOString(), timeMax: maxDate.toISOString() });
  }, [activeView, customRange]);

  // ... rest of the component unchanged, including rendering and event handlers

  return (
    <div>
      {/* Calendar widget UI here */}
      {/* This part is unchanged */}
    </div>
  );
}
