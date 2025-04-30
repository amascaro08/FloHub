// components/meetings/MeetingNoteDetail.tsx
"use client";

import { useState, useEffect, FormEvent, useMemo } from "react"; // Import useMemo
import type { Note } from "@/types/app"; // Import shared Note type
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect

// Define a type for calendar items (should match the type in pages/dashboard/meetings.tsx)
type CalendarItem = {
  id: string;
  summary: string;
};

type MeetingNoteDetailProps = { // Renamed type
  note: Note;
  // Update onSave type to include new fields
  onSave: (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>; // Add onDelete prop
  isSaving: boolean;
  existingTags: string[]; // Add existingTags to props
  calendarEvents: CalendarItem[]; // Add calendarEvents prop
};

export default function MeetingNoteDetail({ note, onSave, onDelete, isSaving, existingTags, calendarEvents }: MeetingNoteDetailProps) { // Destructure new prop
  const [title, setTitle] = useState(note.title || ""); // Add state for title
  const [content, setContent] = useState(note.content);
  const [selectedTags, setSelectedTags] = useState<string[]>(note.tags || []); // State for selected tags (allow multiple)
  const [newTagInput, setNewTagInput] = useState(""); // State for new tag input
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(note.eventId); // State for selected event ID
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(note.eventTitle); // State for selected event title
  const [isAdhoc, setIsAdhoc] = useState(note.isAdhoc || false); // State for ad-hoc flag

  // Update state when a different note is selected
  useEffect(() => {
    setTitle(note.title || ""); // Update title state
    setContent(note.content);
    setSelectedTags(note.tags || []); // Update selected tags state
    setNewTagInput(""); // Clear new tag input
    setSelectedEventId(note.eventId); // Update selected event ID state
    setSelectedEventTitle(note.eventTitle); // Update selected event title state
    setIsAdhoc(note.isAdhoc || false); // Update ad-hoc state
  }, [note]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    // Combine existing and new tags
    const tagsToSave = [...selectedTags];
    if (newTagInput.trim() !== "" && !tagsToSave.includes(newTagInput.trim())) {
      tagsToSave.push(newTagInput.trim());
    }

    await onSave(note.id, title, content, tagsToSave, selectedEventId, selectedEventTitle, isAdhoc); // Include new fields in onSave call
  };

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));
  const eventOptions = calendarEvents.map(event => ({ value: event.id, label: event.summary }));

  const handleTagChange = (selectedOptions: any, actionMeta: any) => {
    if (actionMeta.action === 'create-option') {
      setSelectedTags([...selectedTags, actionMeta.option.value]);
    } else {
      setSelectedTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
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
      setSelectedEventId(undefined); // If ad-hoc, clear selected event
      setSelectedEventTitle(undefined);
    }
  };

  // Format selected tags for CreatableSelect
  const selectedTagOptions = useMemo(() => {
    return selectedTags.map(tag => ({ value: tag, label: tag }));
  }, [selectedTags]);


  return (
    <div className="flex flex-col h-full">
      {/* Add input for title */}
      <div className="mb-4">
        <label htmlFor="meeting-note-detail-title" className="block text-sm font-medium text-[var(--fg)] mb-1">Title</label> {/* Updated ID and label */}
        <input
          type="text"
          id="meeting-note-detail-title" // Updated ID
          className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent text-xl font-semibold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          placeholder="Meeting Note Title" // Updated placeholder
        />
      </div>

      {/* New fields for meeting notes */}
      <div className="mb-4">
        <label htmlFor="meeting-calendar-event" className="block text-sm font-medium text-[var(--fg)] mb-1">Associated Calendar Event (Optional)</label> {/* Updated ID and label */}
        <CreatableSelect // Using CreatableSelect for flexibility, though a standard select might suffice
          options={eventOptions}
          onChange={handleEventChange}
          placeholder="Select an event..."
          isDisabled={isSaving || isAdhoc} // Disable if saving or ad-hoc is checked
          isClearable
          isSearchable
          value={selectedEventId ? { value: selectedEventId, label: selectedEventTitle || '' } : null}
        />
      </div>
      <div className="flex items-center gap-2 mb-4"> {/* Added mb-4 for spacing */}
        <input
          type="checkbox"
          id="meeting-adhoc" // Updated ID
          className="form-checkbox h-4 w-4 text-[var(--primary)] rounded"
          checked={isAdhoc}
          onChange={handleAdhocChange}
          disabled={isSaving || selectedEventId !== undefined} // Disable if saving or event is selected
        />
        <label htmlFor="meeting-adhoc" className="block text-sm font-medium text-[var(--fg)]">Ad-hoc Meeting</label> {/* Updated ID and label */}
      </div>


      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1"> {/* Use flex-1 to make form take available space */}
        <div>
          <label htmlFor="meeting-note-content" className="block text-sm font-medium text-[var(--fg)] mb-1">Content</label> {/* Updated ID and label */}
          <textarea
            id="meeting-note-content" // Updated ID
            className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent flex-1" // Use flex-1 to make textarea grow
            rows={10} // Adjust rows as needed
            placeholder="Write your meeting notes here..." // Updated placeholder
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div>
          <label htmlFor="meeting-note-tags" className="block text-sm font-medium text-[var(--fg)] mb-1">Tags</label> {/* Updated ID and label */}
          <CreatableSelect // Use CreatableSelect for tags
            isMulti
            options={tagOptions}
            onChange={handleTagChange}
            placeholder="Select or create tags..."
            isDisabled={isSaving}
            isSearchable
            value={selectedTagOptions} // Set selected value
          />
        </div>
        <div className="flex justify-end gap-2"> {/* Add gap for spacing */}
          <button
            type="button" // Change type to button to prevent form submission
            className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => onDelete(note.id)} // Call onDelete with note ID
            disabled={isSaving}
          >
            Delete Meeting Note {/* Updated button text */}
          </button>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
      <p className="text-xs text-[var(--neutral-500)] mt-4">
        Created: {new Date(note.createdAt).toLocaleString()}
      </p>
    </div>
  );
}