// components/meetings/MeetingNoteDetail.tsx
"use client";

import { useState, useEffect, FormEvent, useMemo } from "react"; // Import useMemo
import type { Note, Action } from "@/types/app"; // Import shared Note and Action types
import CreatableSelect from 'react-select/creatable'; // Import CreatableSelect
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs
import type { CalendarEvent } from "@/types/calendar"; // Import CalendarEvent type

type MeetingNoteDetailProps = { // Renamed type
  note: Note;
  // Update onSave type to include new fields and actions
  onSave: (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean, updatedActions?: Action[], updatedAgenda?: string) => Promise<void>; // Include updatedActions and updatedAgenda
  onDelete: (noteId: string) => Promise<void>; // Add onDelete prop
  isSaving: boolean;
  existingTags: string[]; // Add existingTags to props
  calendarEvents: CalendarEvent[]; // Update to CalendarEvent[]
};


export default function MeetingNoteDetail({ note, onSave, onDelete, isSaving, existingTags, calendarEvents }: MeetingNoteDetailProps) { // Destructure new prop
  const [title, setTitle] = useState(note.title || ""); // Add state for title
  const [content, setContent] = useState(note.content);
  const [agenda, setAgenda] = useState(""); // Add state for agenda
  const [selectedTags, setSelectedTags] = useState<string[]>(note.tags || []); // State for selected tags (allow multiple)
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(note.eventId); // State for selected event ID
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(note.eventTitle); // State for selected event title
  const [isAdhoc, setIsAdhoc] = useState(note.isAdhoc || false); // State for ad-hoc flag
  const [actions, setActions] = useState<Action[]>(note.actions || []); // State for actions
  const [newActionDescription, setNewActionDescription] = useState(""); // State for new action description
  const [newActionAssignedTo, setNewActionAssignedTo] = useState("Me"); // State for new action assigned to
  const [saveSuccess, setSaveSuccess] = useState(false); // State to track save success


  // Update state when a different note is selected
  useEffect(() => {
    setTitle(note.title || ""); // Update title state
    setContent(note.content);
    setAgenda(note.agenda || ""); // Initialize agenda from note.agenda if it exists
    setSelectedTags(note.tags || []); // Update selected tags state
    setSelectedEventId(note.eventId); // Update selected event ID state
    setSelectedEventTitle(note.eventTitle); // Update selected event title state
    setIsAdhoc(note.isAdhoc || false); // Update ad-hoc state
    setActions(note.actions || []); // Update actions state
    setNewActionDescription(""); // Clear new action description
    setNewActionAssignedTo("Me"); // Reset assigned to
    
    // Log if AI summary exists
    console.log("Note loaded with AI summary:", note.aiSummary ? "Yes" : "No");
    if (note.aiSummary) {
      console.log("AI Summary content:", note.aiSummary);
    }
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

   if (agenda.trim()) { // Include agenda in email content
     emailContent += `Agenda:\n${agenda}\n\n`;
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
            source: "work", // Tag as a work task
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

    setSaveSuccess(false); // Reset save success state

    console.log("MeetingNoteDetail - Submitting update with:", {
      noteId: note.id,
      title,
      content,
      selectedTags,
      selectedEventId,
      selectedEventTitle,
      isAdhoc,
      actions,
      agenda
    });

    try {
      await onSave(note.id, title, content, selectedTags, selectedEventId, selectedEventTitle, isAdhoc, actions, agenda); // Include actions and agenda in onSave call
      console.log("MeetingNoteDetail - Update submitted successfully");
      setSaveSuccess(true); // Set save success to true
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("MeetingNoteDetail - Error submitting update:", error);
      alert("Failed to save meeting note. Please try again.");
    }
  };


  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));
  const eventOptions = calendarEvents.map(event => ({ value: event.id, label: event.summary || '' })); // Use CalendarEvent[] and provide default for label

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
    <div className="flex flex-col h-full space-y-5">
      {/* Title input */}
      <div>
        <label htmlFor="meeting-note-detail-title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Title</label>
        <input
          type="text"
          id="meeting-note-detail-title"
          className="input-modern text-xl font-semibold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          placeholder="Meeting Note Title"
        />
      </div>
      
      {/* AI Summary Section */}
      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
        <h3 className="text-md font-semibold mb-2 text-primary-700 dark:text-primary-300 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          AI Summary
        </h3>
        {note.aiSummary ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{note.aiSummary}</p>
        ) : (
          <div className="bg-white/50 dark:bg-black/10 p-3 rounded-lg">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 italic mb-2">No AI summary available yet.</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Fill in the agenda, content, and action items, then save the meeting note to generate an AI summary.
            </p>
          </div>
        )}
      </div>

      {/* Meeting details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="meeting-calendar-event" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Associated Calendar Event (Optional)
          </label>
          <CreatableSelect
            options={eventOptions}
            onChange={handleEventChange}
            placeholder="Select an event..."
            isDisabled={isSaving || isAdhoc}
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
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="meeting-adhoc"
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            checked={isAdhoc}
            onChange={handleAdhocChange}
            disabled={isSaving || selectedEventId !== undefined}
          />
          <label htmlFor="meeting-adhoc" className="ml-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Ad-hoc Meeting
          </label>
        </div>
      </div>

      {/* Agenda Input Field */}
      <div>
        <label htmlFor="meeting-note-agenda" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            Agenda
          </span>
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


      <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
        <div>
          <label htmlFor="meeting-note-content" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Content
            </span>
          </label>
          <textarea
            id="meeting-note-content"
            className="input-modern flex-1"
            rows={10}
            placeholder="Write your meeting notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSaving}
          />
        </div>
        
        <div>
          <label htmlFor="meeting-note-tags" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Tags
            </span>
          </label>
          <CreatableSelect
            isMulti
            options={tagOptions}
            onChange={handleTagChange}
            placeholder="Select or create tags..."
            isDisabled={isSaving}
            isSearchable
            value={selectedTagOptions}
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

        {/* Actions Section */}
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Actions
          </h3>
          
          <div className="space-y-2 mb-4">
            {actions.length === 0 ? (
              <div className="text-center py-4 text-neutral-500 dark:text-neutral-400 italic text-sm">
                No actions added yet
              </div>
            ) : (
              actions.map(action => (
                <div
                  key={action.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    action.status === "done"
                      ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900"
                      : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <div className="flex items-start flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={action.status === "done"}
                      onChange={() => handleActionStatusChange(action.id, action.status === "done" ? "todo" : "done")}
                      className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mt-0.5"
                      disabled={isSaving}
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className={`font-medium ${action.status === "done" ? "line-through text-neutral-500" : "text-neutral-800 dark:text-neutral-200"}`}>
                        {action.description}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Assigned to: {action.assignedTo}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActionDelete(action.id)}
                    className="ml-2 text-red-500 hover:text-red-700 transition-colors p-1"
                    disabled={isSaving}
                    aria-label="Delete action"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              className="input-modern flex-1"
              placeholder="Add new action..."
              value={newActionDescription}
              onChange={(e) => setNewActionDescription(e.target.value)}
              disabled={isSaving}
            />
            <select
              className="input-modern sm:w-32"
              value={newActionAssignedTo}
              onChange={(e) => setNewActionAssignedTo(e.target.value)}
              disabled={isSaving}
            >
              <option value="Me">Me</option>
              <option value="Other">Other</option>
            </select>
            <button
              type="button"
              onClick={handleAddAction}
              className={`btn-primary flex items-center justify-center ${
                isSaving || newActionDescription.trim() === "" ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isSaving || newActionDescription.trim() === ""}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add
            </button>
          </div>
        </div>


        <div className="flex flex-wrap justify-between items-center gap-3 mt-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">
          {/* Created date */}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Created: {new Date(note.createdAt).toLocaleString()}
          </p>
          
          {/* Success message */}
          {saveSuccess && (
            <div className="px-4 py-2 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded-lg flex items-center animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Saved successfully!
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 ml-auto">
            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex items-center"
                onClick={handleExportPdf}
                disabled={isSaving}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                </svg>
                Export PDF
              </button>
              <button
                type="button"
                className="btn-secondary flex items-center"
                onClick={handleCopyForEmail}
                disabled={isSaving}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy Email
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                onClick={() => onDelete(note.id)}
                disabled={isSaving}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center"
                disabled={isSaving}
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
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}