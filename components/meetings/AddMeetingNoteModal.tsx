// components/meetings/AddMeetingNoteModal.tsx
"use client";

import { useState, FormEvent, useEffect } from "react"; // Import useEffect
import CreatableSelect from 'react-select/creatable';
import useSWR from "swr"; // Import useSWR
import type { CalendarEvent } from "@/types/calendar"; // Import CalendarEvent type
import type { Action } from "@/types/app"; // Import Action type
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs

type AddMeetingNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // Update onSave type to include new fields and actions
  onSave: (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean; actions?: Action[]; agenda?: string }) => Promise<void>;
  isSaving: boolean;
  existingTags: string[]; // Add existingTags prop
  workCalendarEvents: CalendarEvent[]; // Add workCalendarEvents prop
};

const fetcher = (url: string) => fetch(url).then((r) => r.json()); // Define fetcher

export default function AddMeetingNoteModal({ isOpen, onClose, onSave, isSaving, existingTags, workCalendarEvents }: AddMeetingNoteModalProps) { // Receive workCalendarEvents prop
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [agenda, setAgenda] = useState(""); // Add state for agenda
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined); // State for selected event ID
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(undefined); // State for selected event title
  const [isAdhoc, setIsAdhoc] = useState(false); // State for ad-hoc flag
  const [actions, setActions] = useState<Action[]>([]); // State for actions
  const [newActionDescription, setNewActionDescription] = useState(""); // State for new action input
  const [assignedToType, setAssignedToType] = useState("Me"); // State for assigned to type (Me or Other)
  const [otherAssignedToName, setOtherAssignedToName] = useState(""); // State for the name when assigned to Other


  const handleAddAction = async () => {
    const assignedTo = assignedToType === "Me" ? "Me" : otherAssignedToName.trim();
    if (newActionDescription.trim() && assignedTo) { // Ensure description and assignedTo are not empty
      const newAction: Action = {
        id: uuidv4(), // Generate a unique ID
        description: newActionDescription.trim(),
        assignedTo: assignedTo, // Use the determined assigned person
        status: "todo", // Default status
        createdAt: new Date().toISOString(), // Timestamp
      };
      setActions([...actions, newAction]);
      setNewActionDescription(""); // Clear the input field
      setAssignedToType("Me"); // Reset assigned to type
      setOtherAssignedToName(""); // Clear other assigned to name
      
      // If assignedTo is "Me", automatically add to tasks list as a work task
      if (assignedTo === "Me") {
        try {
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: newAction.description,
              source: "work", // Tag as a work task
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to create task from meeting action:", errorData.error);
          }
        } catch (error) {
          console.error("Error creating task from meeting action:", error);
        }
      }
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
      agenda: agenda, // Include agenda in the saved note
    });

    // Clear form after saving
    setTitle("");
    setContent("");
    setAgenda(""); // Clear agenda
    setSelectedTags([]);
    setSelectedEventId(undefined);
    setSelectedEventTitle(undefined);
    setIsAdhoc(false);
    setActions([]); // Clear actions
    setNewActionDescription(""); // Clear new action input
    setAssignedToType("Me"); // Reset assigned to type
    setOtherAssignedToName(""); // Clear other assigned to name
    onClose(); // Close modal after saving
  };

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));
  const eventOptions = workCalendarEvents.map(event => {
    // Check if event has the required properties
    if (!event || !event.id || !event.summary) {
      console.warn("Invalid event format:", event);
      return null; // Skip this event
    }
    return { value: event.id, label: event.summary };
  }).filter(option => option !== null) as { value: string; label: string }[]; // Filter out null values and cast to the correct type

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
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] p-5 md:p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-700 animate-slide-up">
        <h2 className="text-xl font-semibold mb-5 pb-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          Add New Meeting Note
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="note-title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Title</label>
            <input
              type="text"
              id="note-title"
              className="input-modern"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving || selectedEventId !== undefined}
              placeholder="Meeting title"
            />
          </div>
          
          {/* New fields for meeting notes */}
          {workCalendarEvents.length > 0 && (
            <div>
              <label htmlFor="event-select" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Select Event (Optional)
              </label>
              <CreatableSelect
                options={eventOptions}
                onChange={handleEventChange}
                placeholder="Select an event..."
                isDisabled={isSaving || eventOptions.length === 0}
                isClearable
                isSearchable
                value={selectedEventId ? { value: selectedEventId, label: selectedEventTitle || '' } : null}
                classNamePrefix="react-select"
                theme={(theme) => ({
                  ...theme,
                  colors: {
                    ...theme.colors,
                    primary: '#14B8A6',
                    primary25: '#99F6E4',
                  },
                })}
              />
              {workCalendarEvents.length === 0 &&
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  No work calendar events found for the selected time range.
                </p>
              }
            </div>
          )}
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="adhoc-meeting"
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              checked={isAdhoc}
              onChange={handleAdhocChange}
              disabled={isSaving || selectedEventId !== undefined}
            />
            <label htmlFor="adhoc-meeting" className="ml-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Ad-hoc Meeting
            </label>
          </div>
          
          {/* Agenda Input Field */}
          <div>
            <label htmlFor="meeting-note-agenda" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Agenda
            </label>
            <textarea
              id="meeting-note-agenda"
              className="input-modern"
              rows={3}
              placeholder="Enter meeting agenda here..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              disabled={isSaving}
            />
          </div>
          
          <div>
            <label htmlFor="note-content" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Content
            </label>
            <textarea
              id="note-content"
              className="input-modern"
              rows={4}
              placeholder="Write your meeting notes here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
            />
          </div>
          {/* Actions Section */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Actions
            </label>
            
            <div className="space-y-3 mb-3">
              <input
                type="text"
                className="input-modern"
                placeholder="Action item description..."
                value={newActionDescription}
                onChange={(e) => setNewActionDescription(e.target.value)}
                disabled={isSaving}
              />
              
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className="input-modern"
                  value={assignedToType}
                  onChange={(e) => {
                    setAssignedToType(e.target.value);
                    if (e.target.value !== "Other") {
                      setOtherAssignedToName("");
                    }
                  }}
                  disabled={isSaving}
                >
                  <option value="Me">Me</option>
                  <option value="Other">Other</option>
                </select>
                
                {assignedToType === "Other" && (
                  <input
                    type="text"
                    className="input-modern"
                    placeholder="Enter name..."
                    value={otherAssignedToName}
                    onChange={(e) => setOtherAssignedToName(e.target.value)}
                    disabled={isSaving}
                  />
                )}
              </div>
              
              <button
                type="button"
                className="btn-primary flex items-center justify-center w-full"
                onClick={handleAddAction}
                disabled={isSaving || !newActionDescription.trim() || (assignedToType === "Other" && !otherAssignedToName.trim())}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Action
              </button>
            </div>
            
            {actions.length > 0 ? (
              <div className="space-y-2 mt-3 border-t border-neutral-200 dark:border-neutral-700 pt-3">
                <h4 className="font-medium text-sm text-neutral-700 dark:text-neutral-300">Added Actions:</h4>
                <ul className="space-y-2">
                  {actions.map((action) => (
                    <li key={action.id} className="flex items-start bg-neutral-50 dark:bg-neutral-800 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3 3a1 1 0 01-1.414 0l-1.5-1.5a1 1 0 011.414-1.414l.793.793 2.293-2.293a1 1 0 011.414 1.414z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{action.description}</p>
                        {action.assignedTo && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Assigned to: <span className="font-medium">{action.assignedTo}</span>
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 italic mt-2">
                No actions added yet
              </p>
            )}
          </div>
          <div>
            <label htmlFor="note-tags" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Tags
            </label>
            <CreatableSelect
              isMulti
              options={tagOptions}
              onChange={handleTagChange}
              placeholder="Select or create tags..."
              isDisabled={isSaving}
              isSearchable
              classNamePrefix="react-select"
              theme={(theme) => ({
                ...theme,
                colors: {
                  ...theme.colors,
                  primary: '#14B8A6',
                  primary25: '#99F6E4',
                },
              })}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-primary flex items-center justify-center ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isSaving || (!content.trim() || (!selectedEventId && !isAdhoc))}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}