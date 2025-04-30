// components/meetings/AddMeetingNoteModal.tsx
"use client";

import { useState, FormEvent, useEffect } from "react"; // Import useEffect
import CreatableSelect from 'react-select/creatable';
import useSWR from "swr"; // Import useSWR
import type { CalendarEvent } from "@/pages/api/calendar/events"; // Import CalendarEvent type

// Define a type for calendar items (should match the type in pages/dashboard/meetings.tsx)
type CalendarItem = {
  id: string;
  summary: string;
};

type AddMeetingNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Update onSave type to include new fields
  onSave: (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean }) => Promise<void>;
  isSaving: boolean;
  existingTags: string[]; // Add existingTags prop
  calendarList: CalendarItem[]; // Rename prop from calendarEvents to calendarList
};

const fetcher = (url: string) => fetch(url).then((r) => r.json()); // Define fetcher

export default function AddMeetingNoteModal({ isOpen, onClose, onSave, isSaving, existingTags, calendarList }: AddMeetingNoteModalProps) { // Receive renamed prop
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | undefined>(undefined); // State for selected calendar ID
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined); // State for selected event ID
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(undefined); // State for selected event title
  const [isAdhoc, setIsAdhoc] = useState(false); // State for ad-hoc flag

  // Fetch events for the selected calendar
  const { data: calendarEvents, error: calendarEventsError } = useSWR<CalendarEvent[]>(
    selectedCalendarId ? `/api/calendar/events?calendarId=${selectedCalendarId}` : null,
    fetcher
  );

  // Log fetched events for debugging
  useEffect(() => {
    console.log("Fetched calendar events:", calendarEvents);
    console.log("Calendar events fetch error:", calendarEventsError);
  }, [calendarEvents, calendarEventsError]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Content is required, and either an event must be selected or it must be ad-hoc
    if (!content.trim() || isSaving || (!selectedEventId && !isAdhoc)) {
      // TODO: Add user feedback for validation failure
      return;
    }

    await onSave({
      title,
      content,
      tags: selectedTags,
      eventId: selectedEventId,
      eventTitle: selectedEventTitle,
      isAdhoc: isAdhoc,
    });

    // Clear form after saving
    setTitle("");
    setContent("");
    setSelectedTags([]);
    setSelectedCalendarId(undefined); // Clear selected calendar
    setSelectedEventId(undefined);
    setSelectedEventTitle(undefined);
    setIsAdhoc(false);
    onClose(); // Close modal after saving
  };

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));
  const calendarOptions = calendarList.map(calendar => ({ value: calendar.id, label: calendar.summary }));
  const eventOptions = calendarEvents?.map(event => ({ value: event.id, label: event.summary })) || []; // Use fetched events


  const handleTagChange = (selectedOptions: any, actionMeta: any) => {
    if (actionMeta.action === 'create-option') {
      setSelectedTags([...selectedTags, actionMeta.option.value]);
    } else {
      setSelectedTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
    }
  };

  const handleCalendarChange = (selectedOption: any) => {
    if (selectedOption) {
      setSelectedCalendarId(selectedOption.value);
      setSelectedEventId(undefined); // Clear selected event when calendar changes
      setSelectedEventTitle(undefined);
    } else {
      setSelectedCalendarId(undefined);
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
    }
  };

  const handleEventChange = (selectedOption: any) => {
    if (selectedOption) {
      setSelectedEventId(selectedOption.value);
      setSelectedEventTitle(selectedOption.label);
      setIsAdhoc(false); // If an event is selected, it's not ad-hoc
    } else {
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
    }
  };

  const handleAdhocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAdhoc(e.target.checked);
    if (e.target.checked) {
      setSelectedCalendarId(undefined); // If ad-hoc, clear selected calendar and event
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass p-6 rounded-xl shadow-elevate-sm w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add New Meeting Note</h2> {/* Updated title */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="note-title" className="block text-sm font-medium text-[var(--fg)] mb-1">Title</label>
            <input
              type="text"
              id="note-title"
              className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="note-content" className="block text-sm font-medium text-[var(--fg)] mb-1">Content</label>
            <textarea
              id="note-content"
              className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
              rows={4}
              placeholder="Write your meeting notes here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="note-tags" className="block text-sm font-medium text-[var(--fg)] mb-1">Tags</label>
            <CreatableSelect // Using CreatableSelect for flexibility, though a standard select might suffice
              isMulti
              options={tagOptions}
              onChange={handleTagChange}
              placeholder="Select or create tags..."
              isDisabled={isSaving}
              isSearchable
            />
          </div>
          {/* New fields for meeting notes */}
          <div>
            <label htmlFor="calendar-select" className="block text-sm font-medium text-[var(--fg)] mb-1">Select Calendar (Optional)</label> {/* Updated label */}
            <CreatableSelect // Using CreatableSelect for flexibility, though a standard select might suffice
              options={calendarOptions}
              onChange={handleCalendarChange}
              placeholder="Select a calendar..."
              isDisabled={isSaving || isAdhoc} // Disable if saving or ad-hoc is checked
              isClearable
              isSearchable
              value={selectedCalendarId ? { value: selectedCalendarId, label: calendarList.find(cal => cal.id === selectedCalendarId)?.summary || '' } : null}
            />
          </div>
           {selectedCalendarId && ( // Show event selection only if a calendar is selected
            <div>
              <label htmlFor="event-select" className="block text-sm font-medium text-[var(--fg)] mb-1">Select Event (Optional)</label> {/* Updated label */}
              <CreatableSelect // Using CreatableSelect for flexibility, though a standard select might suffice
                options={eventOptions}
                onChange={handleEventChange}
                placeholder="Select an event..."
                isDisabled={isSaving || isAdhoc || !calendarEvents} // Disable if saving, ad-hoc is checked, or events are loading/failed
                isClearable
                isSearchable
                value={selectedEventId ? { value: selectedEventId, label: selectedEventTitle || '' } : null}
              />
               {calendarEventsError && <p className="text-red-500 text-sm mt-1">Error loading events.</p>} {/* Show error if events fail to load */}
               {!calendarEvents && !calendarEventsError && selectedCalendarId && <p className="text-sm text-[var(--neutral-500)] mt-1">Loading events...</p>} {/* Show loading state */}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="adhoc-meeting"
              className="form-checkbox h-4 w-4 text-[var(--primary)] rounded"
              checked={isAdhoc}
              onChange={handleAdhocChange}
              disabled={isSaving || selectedEventId !== undefined || selectedCalendarId !== undefined} // Disable if saving, event is selected, or calendar is selected
            />
            <label htmlFor="adhoc-meeting" className="block text-sm font-medium text-[var(--fg)]">Ad-hoc Meeting</label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded border border-[var(--neutral-300)] hover:bg-[var(--neutral-200)] transition"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isSaving || (!content.trim() || (!selectedEventId && !isAdhoc))} // Disable if content is empty AND no event/adhoc selected
            >
              {isSaving ? "Saving..." : "Save Meeting Note"} {/* Updated button text */}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}