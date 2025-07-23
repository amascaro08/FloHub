// components/meetings/MeetingNoteDetail.tsx
"use client";
import { useState, FormEvent, useEffect, useMemo } from "react";
import type { Note, Action } from "@/types/app";
import CreatableSelect from 'react-select/creatable';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent } from "@/types/calendar";
import RichTextEditor from '../journal/RichTextEditor';

type MeetingNoteDetailProps = {
  note: Note;
  onSave: (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean, updatedActions?: Action[], updatedAgenda?: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  isSaving: boolean;
  existingTags: string[];
  calendarEvents: CalendarEvent[];
};

export default function MeetingNoteDetail({ 
  note, 
  onSave, 
  onDelete, 
  isSaving, 
  existingTags, 
  calendarEvents 
}: MeetingNoteDetailProps) {
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(note.content);
  const [agenda, setAgenda] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(note.tags || []);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(note.eventId);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(note.eventTitle);
  const [isAdhoc, setIsAdhoc] = useState(note.isAdhoc || false);
  const [actions, setActions] = useState<Action[]>(note.actions || []);
  const [newActionDescription, setNewActionDescription] = useState("");
  const [newActionAssignedTo, setNewActionAssignedTo] = useState("Me");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update state when a different note is selected
  useEffect(() => {
    setTitle(note.title || "");
    setContent(note.content);
    setAgenda(note.agenda || "");
    setSelectedTags(note.tags || []);
    setSelectedEventId(note.eventId);
    setSelectedEventTitle(note.eventTitle);
    setIsAdhoc(note.isAdhoc || false);
    setActions(note.actions || []);
    setNewActionDescription("");
    setNewActionAssignedTo("Me");
    
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
        alert('Failed to export PDF.');
        return;
      }

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
      alert('An error occurred during PDF export.');
    }
  };

  const handleCopyForEmail = () => {
    let emailContent = `Meeting Note: ${note.title || 'Untitled Meeting Note'}\n\n`;

    if (note.eventTitle) {
      emailContent += `Associated Event: ${note.eventTitle}\n\n`;
    } else if (note.isAdhoc) {
      emailContent += `Ad-hoc Meeting\n\n`;
    }

    if (agenda.trim()) {
      emailContent += `Agenda:\n${agenda}\n\n`;
    }

    if (note.content) {
      emailContent += `Meeting Minutes:\n${note.content.replace(/<[^>]*>/g, '')}\n\n`;
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
      id: uuidv4(),
      description: newActionDescription.trim(),
      assignedTo: newActionAssignedTo,
      status: "todo",
      createdAt: new Date().toISOString(),
    };

    setActions([...actions, newAction]);
    setNewActionDescription("");

    if (newActionAssignedTo === "Me") {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: newAction.description,
            source: "work",
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

    setSaveSuccess(false);

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
      await onSave(note.id, title, content, selectedTags, selectedEventId, selectedEventTitle, isAdhoc, actions, agenda);
      console.log("MeetingNoteDetail - Update submitted successfully");
      setSaveSuccess(true);
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("MeetingNoteDetail - Error submitting update:", error);
      alert("Failed to save meeting note. Please try again.");
    }
  };

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));
  const eventOptions = calendarEvents.map(event => ({ value: event.id, label: event.summary || '' }));

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
      setIsAdhoc(false);
    } else {
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
    }
  };

  const handleAdhocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAdhoc(e.target.checked);
    if (e.target.checked) {
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
    }
  };

  const selectedTagOptions = useMemo(() => {
    return selectedTags.map(tag => ({ value: tag, label: tag }));
  }, [selectedTags]);

  return (
    <div className="bg-white rounded-xl border border-[var(--neutral-200)] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color)]/80 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-white">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-lg">Meeting Note Details</h2>
              <p className="text-white/80 text-sm">
                Created {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              onClick={handleExportPdf}
              disabled={isSaving}
              title="Export PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              type="button"
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              onClick={handleCopyForEmail}
              disabled={isSaving}
              title="Copy for Email"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* AI Summary Section */}
        {note.aiSummary && (
          <div className="bg-gradient-to-r from-[var(--primary-color)]/5 to-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-3 text-[var(--primary-color)] flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              AI Summary
            </h3>
            <p className="text-[var(--neutral-700)] leading-relaxed">{note.aiSummary}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title and Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="meeting-note-detail-title" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                Meeting Title
              </label>
              <input
                type="text"
                id="meeting-note-detail-title"
                className="input-modern"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
                placeholder="Meeting Note Title"
              />
            </div>

            <div>
              <label htmlFor="note-tags" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                Tags
              </label>
              <CreatableSelect
                isMulti
                options={tagOptions}
                onChange={handleTagChange}
                placeholder="Select or create tags..."
                isDisabled={isSaving}
                isSearchable
                value={selectedTagOptions}
                className="text-sm"
                classNamePrefix="react-select"
                theme={(theme) => ({
                  ...theme,
                  colors: {
                    ...theme.colors,
                    primary: '#00C9A7',
                    primary25: '#00C9A7',
                  },
                })}
              />
            </div>
          </div>

          {/* Meeting Association */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label htmlFor="meeting-calendar-event" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                Associated Calendar Event
              </label>
              <CreatableSelect
                options={eventOptions}
                onChange={handleEventChange}
                placeholder="Select an event..."
                isDisabled={isSaving || isAdhoc}
                isClearable
                isSearchable
                value={selectedEventId ? { value: selectedEventId, label: selectedEventTitle || '' } : null}
                className="text-sm"
                classNamePrefix="react-select"
                theme={(theme) => ({
                  ...theme,
                  colors: {
                    ...theme.colors,
                    primary: '#00C9A7',
                    primary25: '#00C9A7',
                  },
                })}
              />
            </div>
            
            <div className="flex items-end">
              <div className="flex items-center h-11">
                <input
                  type="checkbox"
                  id="meeting-adhoc"
                  className="h-4 w-4 rounded border-[var(--neutral-300)] text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
                  checked={isAdhoc}
                  onChange={handleAdhocChange}
                  disabled={isSaving || selectedEventId !== undefined}
                />
                <label htmlFor="meeting-adhoc" className="ml-2 block text-sm font-medium text-[var(--neutral-700)]">
                  Ad-hoc Meeting
                </label>
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label htmlFor="meeting-note-agenda" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
              Meeting Agenda
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

          {/* Content with Rich Text Editor */}
          <div>
            <label htmlFor="note-content" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
              Meeting Notes
            </label>
            <div className="rounded-lg border border-[var(--neutral-200)] overflow-hidden">
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your meeting notes here. Use the toolbar to format text, add lists, and more..."
              />
            </div>
          </div>

          {/* Actions Section */}
          <div className="border border-[var(--neutral-200)] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--primary-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Action Items ({actions.length})
            </h3>
            
            {/* Action Items List */}
            <div className="space-y-3 mb-6">
              {actions.length === 0 ? (
                <div className="text-center py-8 text-[var(--neutral-500)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-[var(--neutral-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">No action items yet</p>
                </div>
              ) : (
                actions.map(action => (
                  <div
                    key={action.id}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border transition-all
                      ${action.status === "done"
                        ? "bg-green-50 border-green-200"
                        : "bg-[var(--neutral-50)] border-[var(--neutral-200)]"
                      }
                    `}
                  >
                    <div className="flex items-start flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={action.status === "done"}
                        onChange={() => handleActionStatusChange(action.id, action.status === "done" ? "todo" : "done")}
                        className="h-5 w-5 rounded border-[var(--neutral-300)] text-[var(--primary-color)] focus:ring-[var(--primary-color)] mt-0.5"
                        disabled={isSaving}
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <p className={`font-medium ${action.status === "done" ? "line-through text-[var(--neutral-500)]" : "text-[var(--neutral-800)]"}`}>
                          {action.description}
                        </p>
                        <p className="text-xs text-[var(--neutral-500)] mt-1">
                          Assigned to: <span className="font-medium">{action.assignedTo}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleActionDelete(action.id)}
                      className="ml-2 text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50"
                      disabled={isSaving}
                      title="Delete action"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {/* Add New Action */}
            <div className="border-t border-[var(--neutral-200)] pt-4">
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  className="input-modern flex-1"
                  placeholder="Add new action item..."
                  value={newActionDescription}
                  onChange={(e) => setNewActionDescription(e.target.value)}
                  disabled={isSaving}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newActionDescription.trim()) {
                      e.preventDefault();
                      handleAddAction();
                    }
                  }}
                />
                <select
                  className="input-modern w-32"
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
                  className="btn-primary px-4"
                  disabled={isSaving || newActionDescription.trim() === ""}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Footer with actions */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--neutral-200)]">
            {/* Success message */}
            {saveSuccess && (
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg flex items-center animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Saved successfully!
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                onClick={() => onDelete(note.id)}
                disabled={isSaving}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete Note
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center px-6 py-2"
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}