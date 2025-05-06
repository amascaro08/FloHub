// components/meetings/AddMeetingNoteModal.tsx
"use client";

import { useState, FormEvent, useEffect } from "react"; // Import useEffect
import CreatableSelect from 'react-select/creatable';
import useSWR from "swr"; // Import useSWR
import type { CalendarEvent } from "@/components/widgets/CalendarWidget"; // Import CalendarEvent type
import type { Action } from "@/types/app"; // Import Action type
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs

type AddMeetingNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Update onSave type to include new fields and actions
  onSave: (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean; actions?: Action[] }) => Promise<void>;
  isSaving: boolean;
  existingTags: string[]; // Add existingTags prop
  workCalendarEvents: CalendarEvent[]; // Add workCalendarEvents prop
};

const fetcher = (url: string) => fetch(url).then((r) => r.json()); // Define fetcher

export default function AddMeetingNoteModal({ isOpen, onClose, onSave, isSaving, existingTags, workCalendarEvents }: AddMeetingNoteModalProps) { // Receive workCalendarEvents prop
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined); // State for selected event ID
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(undefined); // State for selected event title
  const [isAdhoc, setIsAdhoc] = useState(false); // State for ad-hoc flag
  const [actions, setActions] = useState<Action[]>([]); // State for actions
  const [newActionDescription, setNewActionDescription] = useState(""); // State for new action input
  const [newActionAssignedTo, setNewActionAssignedTo] = useState("Me"); // State for new action assigned to

  const handleAddAction = () => {
    if (newActionDescription.trim()) {
      const newAction: Action = {
        id: uuidv4(), // Generate a unique ID
        description: newActionDescription.trim(),
        assignedTo: "Me", // Default assignment
        status: "todo", // Default status
        createdAt: new Date().toISOString(), // Timestamp
      };
      setActions([...actions, newAction]);
      setNewActionDescription(""); // Clear the input field
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Content is required, and either an event must be selected or it must be ad-hoc
    if (!content.trim() || isSaving || (!selectedEventId && !isAdhoc)) {
      return;
    }

    await onSave({
      title,
      content,
      tags: selectedTags,
      eventId: selectedEventId,
      eventTitle: selectedEventTitle,
      isAdhoc: isAdhoc,
      actions: actions, // Include actions in the saved note
    });

    // Clear form after saving
    setTitle("");
    setContent("");
    setSelectedTags([]);
    setSelectedEventId(undefined);
    setSelectedEventTitle(undefined);
    setIsAdhoc(false);
    setActions([]); // Clear actions
    setNewActionDescription(""); // Clear new action input
    setNewActionAssignedTo("Me"); // Reset assigned to
    onClose(); // Close modal after saving
  };

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));
  const eventOptions = workCalendarEvents.map(event => ({ value: event.id, label: event.summary || '' })); // Use passed-in workCalendarEvents and provide default for label

  // Log passed-in events and generated options for debugging
  useEffect(() => {
    console.log("Passed-in work calendar events:", workCalendarEvents);
    console.log("Generated event options:", eventOptions);
  }, [workCalendarEvents, eventOptions]);

  const handleTagChange = (selectedOptions: any, actionMeta: any) => {
    if (actionMeta.action === 'create-option') {
      setSelectedTags([...selectedTags, actionMeta.option.value]);
    } else {
      setSelectedTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
    }
  };

  const handleEventChange = (selectedOption: any) => {
    if (selectedOption) {
      const selectedEvent = workCalendarEvents.find(event => event.id === selectedOption.value); // Use workCalendarEvents
      setSelectedEventId(selectedOption.value);
      setSelectedEventTitle(selectedOption.label);
      setTitle(selectedOption.label); // Set title to event summary
      setIsAdhoc(false); // If an event is selected, it's not ad-hoc
    } else {
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
      setTitle(""); // Clear title
    }
  };

  const handleAdhocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAdhoc(e.target.checked);
    if (e.target.checked) {
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
      setTitle(""); // Clear title for ad-hoc
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
              disabled={isSaving || selectedEventId !== undefined} // Disable if saving or event is selected
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
          {/* Actions Section */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg)] mb-1">Actions</label>
            <div className="flex flex-col gap-2 mb-2"> {/* Use flex-col for stacking inputs */}
              <input
                type="text"
                className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
                placeholder="Action item description..."
                value={newActionDescription}
                onChange={(e) => setNewActionDescription(e.target.value)}
                disabled={isSaving}
              />
              <div className="flex gap-2"> {/* Flex container for assignedTo and Add button */}
                <input
                  type="text"
                  className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
                  placeholder="Assigned to (e.g., Me, John Doe)..."
                  value={newActionAssignedTo}
                  onChange={(e) => setNewActionAssignedTo(e.target.value)}
                  disabled={isSaving}
                />
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-primary-500 text-white hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddAction}
                  disabled={isSaving || !newActionDescription.trim()}
                >
                  Add
                </button>
              </div>
            </div>
            {actions.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--fg)]">
                {actions.map((action, index) => (
                  <li key={action.id}>
                    {action.description}
                    {action.assignedTo && <span className="font-semibold"> (Assigned to: {action.assignedTo})</span>} {/* Display assigned person */}
                  </li>
                ))}
              </ul>
            )}
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
          {/* Removed calendar selection as events are passed directly */}
           {workCalendarEvents.length > 0 && ( // Show event selection only if workCalendarEvents are available
            <div>
              <label htmlFor="event-select" className="block text-sm font-medium text-[var(--fg)] mb-1">Select Event (Optional)</label> {/* Updated label */}
              <CreatableSelect // Using CreatableSelect for flexibility, though a standard select might suffice
                options={eventOptions}
                onChange={handleEventChange}
                placeholder="Select an event..."
                isDisabled={isSaving || eventOptions.length === 0} // Disable if saving or no events
                isClearable
                isSearchable
                value={selectedEventId ? { value: selectedEventId, label: selectedEventTitle || '' } : null}
              />
               {workCalendarEvents.length === 0 && <p className="text-sm text-[var(--neutral-500)] mt-1">No work calendar events found for the selected time range.</p>} {/* Show message if no events */}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="adhoc-meeting"
              className="form-checkbox h-4 w-4 text-[var(--primary)] rounded"
              checked={isAdhoc}
              onChange={handleAdhocChange}
              disabled={isSaving || selectedEventId !== undefined} // Disable if saving or event is selected
            />
            <label htmlFor="adhoc-meeting" className="block text-sm font-medium text-[var(--fg)]">Ad-hoc Meeting</label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded border border-[var(--neutral-300)] bg-off-white text-cool-grey hover:bg-[var(--neutral-200)] transition"
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