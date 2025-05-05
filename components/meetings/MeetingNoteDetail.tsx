// components/meetings/MeetingNoteDetail.tsx
"use client";

import { useState, useEffect, FormEvent, useMemo } from "react"; // Import useMemo
import type { Note, Action } from "@/types/app"; // Import shared Note and Action types
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs

// Define a type for calendar items (should match the type in pages/dashboard/meetings.tsx)
type CalendarItem = {
  id: string;
  summary: string;
};

type MeetingNoteDetailProps = { // Renamed type
  note: Note;
  // Update onSave type to include new fields and actions
  onSave: (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean, updatedActions?: Action[]) => Promise<void>; // Include updatedActions
  onDelete: (noteId: string) => Promise<void>; // Add onDelete prop
  isSaving: boolean;
  existingTags: string[]; // Add existingTags to props
  calendarEvents: CalendarItem[]; // Add calendarEvents prop
};


export default function MeetingNoteDetail({ note, onSave, onDelete, isSaving, existingTags, calendarEvents }: MeetingNoteDetailProps) { // Destructure new prop
  const [title, setTitle] = useState(note.title || ""); // Add state for title
  const [content, setContent] = useState(note.content);
  const [selectedTags, setSelectedTags] = useState<string[]>(note.tags || []); // State for selected tags (allow multiple)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(note.eventId); // State for selected event ID
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(note.eventTitle); // State for selected event title
  const [isAdhoc, setIsAdhoc] = useState(note.isAdhoc || false); // State for ad-hoc flag
  const [actions, setActions] = useState<Action[]>(note.actions || []); // State for actions
  const [newActionDescription, setNewActionDescription] = useState(""); // State for new action description
  const [newActionAssignedTo, setNewActionAssignedTo] = useState("Me"); // State for new action assigned to


  // Update state when a different note is selected
  useEffect(() => {
    setTitle(note.title || ""); // Update title state
    setContent(note.content);
    setSelectedTags(note.tags || []); // Update selected tags state
    setSelectedEventId(note.eventId); // Update selected event ID state
    setSelectedEventTitle(note.eventTitle); // Update selected event title state
    setIsAdhoc(note.isAdhoc || false); // Update ad-hoc state
    setActions(note.actions || []); // Update actions state
    setNewActionDescription(""); // Clear new action description
    setNewActionAssignedTo("Me"); // Reset assigned to
  }, [note]);

 const handleExportPdf = async () => {
   try {
     const response = await fetch('/api/meetings/export-pdf', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({ id: note.id }),
     });

     if (!response.ok) {
       const errorData = await response.json();
       console.error('PDF export failed:', errorData.message);
       alert('Failed to export PDF.'); // Provide user feedback
       return;
     }

     // Trigger file download
     const blob = await response.blob();
     const url = window.URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${note.title || 'Meeting Note'}_${note.id}.pdf`;
     document.body.appendChild(a);
     a.click();
     a.remove();
     window.URL.revokeObjectURL(url);

   } catch (error) {
     console.error('Error during PDF export:', error);
     alert('An error occurred during PDF export.'); // Provide user feedback
   }
 };

 const handleCopyForEmail = () => {
   let emailContent = `Meeting Note: ${note.title || 'Untitled Meeting Note'}\n\n`;

   if (note.eventTitle) {
     emailContent += `Associated Event: ${note.eventTitle}\n\n`;
   } else if (note.isAdhoc) {
     emailContent += `Ad-hoc Meeting\n\n`;
   }

   if (note.content) {
     emailContent += `Meeting Minutes:\n${note.content}\n\n`;
   }

   if (note.actions && note.actions.length > 0) {
     emailContent += `Action Items:\n`;
     note.actions.forEach(action => {
       emailContent += `- [${action.status === 'done' ? 'x' : ' '}] ${action.description} (Assigned to: ${action.assignedTo})\n`;
     });
     emailContent += '\n';
   }

   emailContent += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;

   navigator.clipboard.writeText(emailContent)
     .then(() => {
       alert('Meeting note copied to clipboard for email.');
     })
     .catch(err => {
       console.error('Failed to copy meeting note:', err);
       alert('Failed to copy meeting note.');
     });
 };

 const handleAddAction = async () => {
   if (newActionDescription.trim() === "") return;

    const newAction: Action = {
      id: uuidv4(), // Generate a unique ID
      description: newActionDescription.trim(),
      assignedTo: newActionAssignedTo,
      status: "todo",
      createdAt: new Date().toISOString(),
    };

    setActions([...actions, newAction]);
    setNewActionDescription(""); // Clear input

    // If assignedTo is "Me", automatically add to tasks list
    if (newActionAssignedTo === "Me") {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: newAction.description,
            source: "meeting-note", // Add a source to identify where the task came from
            // Optionally add a dueDate if the Action type had one
          }),
        });

        if (response.ok) {
        } else {
          const errorData = await response.json();
          console.error("Failed to create task from meeting action:", errorData.error);
        }
      } catch (error) {
        console.error("Error creating task from meeting action:", error);
      }
    }
  };

  const handleActionStatusChange = (actionId: string, status: "todo" | "done") => {
    setActions(actions.map(action =>
      action.id === actionId ? { ...action, status: status } : action
    ));
  };

  const handleActionDelete = (actionId: string) => {
    setActions(actions.filter(action => action.id !== actionId));
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    await onSave(note.id, title, content, selectedTags, selectedEventId, selectedEventTitle, isAdhoc, actions); // Include actions in onSave call
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

        {/* Actions Section */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Actions</h3>
          <div className="space-y-2">
            {actions.map(action => (
              <div key={action.id} className="flex items-center justify-between bg-[var(--neutral-100)] p-2 rounded">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={action.status === "done"}
                    onChange={() => handleActionStatusChange(action.id, action.status === "done" ? "todo" : "done")}
                    className="form-checkbox h-4 w-4 text-[var(--primary)] rounded mr-2"
                    disabled={isSaving}
                  />
                  <div>
                    <p className={`text-sm ${action.status === "done" ? "line-through text-[var(--neutral-500)]" : ""}`}>{action.description}</p>
                    <p className="text-xs text-[var(--neutral-600)]">Assigned to: {action.assignedTo}</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleActionDelete(action.id)} className="text-red-500 hover:text-red-700 text-sm" disabled={isSaving}>Delete</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              className="flex-1 border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent text-sm"
              placeholder="Add new action..."
              value={newActionDescription}
              onChange={(e) => setNewActionDescription(e.target.value)}
              disabled={isSaving}
            />
            <select
              className="border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent text-sm"
              value={newActionAssignedTo}
              onChange={(e) => setNewActionAssignedTo(e.target.value)}
              disabled={isSaving}
            >
              <option value="Me">Me</option>
              <option value="Other">Other</option> {/* Simple "Other" for now */}
            </select>
            <button
              type="button"
              onClick={handleAddAction}
              className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm ${isSaving || newActionDescription.trim() === "" ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isSaving || newActionDescription.trim() === ""}
            >
              Add
            </button>
          </div>
        </div>


        <div className="flex justify-end gap-2 mt-4"> {/* Added mt-4 for spacing */}
          {/* Export Buttons */}
          <button
            type="button"
            className="px-4 py-2 rounded border border-[var(--neutral-300)] bg-off-white text-cool-grey hover:bg-[var(--neutral-200)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportPdf}
            disabled={isSaving}
          >
            Export as PDF
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border border-[var(--neutral-300)] bg-off-white text-cool-grey hover:bg-[var(--neutral-200)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCopyForEmail}
            disabled={isSaving}
          >
            Copy for Email
          </button>

          {/* Action Buttons */}
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