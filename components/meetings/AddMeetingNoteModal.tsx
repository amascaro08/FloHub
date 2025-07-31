// components/meetings/AddMeetingNoteModal.tsx
"use client";

import { useState, FormEvent, useEffect } from "react";
import CreatableSelect from 'react-select/creatable';
import useSWR from "swr";
import type { CalendarEvent } from "@/types/calendar.d.ts";
import type { Action } from "@/types/app";
import { v4 as uuidv4 } from 'uuid';
import RichTextEditor from '../journal/RichTextEditor';

type AddMeetingNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean; actions?: Action[]; agenda?: string; meetingSeries?: string }) => Promise<void>;
  isSaving: boolean;
  existingTags: string[];
  workCalendarEvents: CalendarEvent[];
  calendarLoading?: boolean;
  existingSeries?: string[];
  preSelectedSeries?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AddMeetingNoteModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isSaving, 
  existingTags, 
  workCalendarEvents,
  calendarLoading = false,
  existingSeries = [],
  preSelectedSeries
}: AddMeetingNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [agenda, setAgenda] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string | undefined>(undefined);
  const [isAdhoc, setIsAdhoc] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [newActionDescription, setNewActionDescription] = useState("");
  const [assignedToType, setAssignedToType] = useState("Me");
  const [otherAssignedToName, setOtherAssignedToName] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSeries, setSelectedSeries] = useState<string>("");

  const handleAddAction = async () => {
    const assignedTo = assignedToType === "Me" ? "Me" : otherAssignedToName.trim();
    if (newActionDescription.trim() && assignedTo) {
      const newAction: Action = {
        id: uuidv4(),
        description: newActionDescription.trim(),
        assignedTo: assignedTo,
        status: "todo",
        createdAt: new Date().toISOString(),
      };
      setActions([...actions, newAction]);
      setNewActionDescription("");
      setAssignedToType("Me");
      setOtherAssignedToName("");
      
      // If assignedTo is "Me", automatically add to tasks list as a work task
      if (assignedTo === "Me") {
        try {
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: newAction.description,
              source: "work",
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
      actions: actions,
      agenda: agenda,
      meetingSeries: selectedSeries || undefined,
    });

    // Clear form after saving
    setTitle("");
    setContent("");
    setAgenda("");
    setSelectedTags([]);
    setSelectedEventId(undefined);
    setSelectedEventTitle(undefined);
    setIsAdhoc(false);
    setActions([]);
    setNewActionDescription("");
    setAssignedToType("Me");
    setOtherAssignedToName("");
    setCurrentStep(1);
    setSelectedSeries("");
    onClose();
  };

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));
  const eventOptions = workCalendarEvents.map(event => {
    if (!event || !event.id || !event.summary) {
      console.warn("Invalid event format:", event);
      return null;
    }
    return { value: event.id, label: event.summary };
  }).filter(option => option !== null) as { value: string; label: string }[];

  useEffect(() => {
    console.log("Passed-in work calendar events:", workCalendarEvents);
    console.log("Generated event options:", eventOptions);
  }, [workCalendarEvents, eventOptions]);

  // Set pre-selected series when modal opens
  useEffect(() => {
    if (preSelectedSeries) {
      setSelectedSeries(preSelectedSeries);
    }
  }, [preSelectedSeries, isOpen]);

  const handleTagChange = (selectedOptions: any, actionMeta: any) => {
    if (actionMeta.action === 'create-option') {
      setSelectedTags([...selectedTags, actionMeta.option.value]);
    } else {
      setSelectedTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
    }
  };

  const handleEventChange = (selectedOption: any) => {
    if (selectedOption) {
      const selectedEvent = workCalendarEvents.find(event => event.id === selectedOption.value);
      setSelectedEventId(selectedOption.value);
      setSelectedEventTitle(selectedOption.label);
      setTitle(selectedOption.label); // Set title to event summary
      setIsAdhoc(false);
    } else {
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
      // Don't clear title if user typed something - only clear if it was auto-populated
      if (selectedEventId) {
        setTitle(""); // Only clear if we had an event selected before
      }
    }
  };

  const handleAdhocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAdhoc(e.target.checked);
    if (e.target.checked) {
      setSelectedEventId(undefined);
      setSelectedEventTitle(undefined);
      // Don't auto-clear title when switching to ad-hoc, let user keep what they typed
    }
  };

  const removeAction = (actionId: string) => {
    setActions(actions.filter(action => action.id !== actionId));
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceedToStep2 = () => {
    // Allow proceeding if:
    // 1. Ad-hoc is selected and title is provided, OR
    // 2. An event is selected and title is provided, OR  
    // 3. Calendar is still loading but ad-hoc is selected with title
    return (isAdhoc && title.trim()) || (selectedEventId && title.trim());
  };

  const canCreateNote = () => {
    return title.trim(); // Just need a title to create the note
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color)]/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Meeting Note</h2>
                <p className="text-white/80 text-sm">Step {currentStep} of 2</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              disabled={isSaving}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex space-x-2">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step <= currentStep ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Step 1: Meeting Setup */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-[var(--neutral-900)] dark:text-white mb-2">Meeting Setup</h3>
                  <p className="text-[var(--neutral-600)] dark:text-gray-300">Choose your meeting type and provide basic details</p>
                </div>

                {/* Meeting Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`
                    relative border-2 rounded-xl p-4 cursor-pointer transition-all
                    ${!isAdhoc && selectedEventId 
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 dark:bg-[var(--primary-color)]/10' 
                      : 'border-[var(--neutral-200)] dark:border-gray-600 hover:border-[var(--neutral-300)] dark:hover:border-gray-500'
                    }
                  `}>
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-[var(--neutral-900)] dark:text-white">Scheduled Meeting</h4>
                        <p className="text-sm text-[var(--neutral-600)] dark:text-gray-300 mt-1">Link to an existing calendar event</p>
                        
                                                 {calendarLoading ? (
                           <div className="mt-3">
                             <div className="animate-pulse">
                               <div className="h-10 bg-[var(--neutral-200)] rounded-lg"></div>
                             </div>
                             <p className="text-sm text-[var(--neutral-500)] mt-2 flex items-center">
                               <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                               </svg>
                               Loading calendar events...
                             </p>
                           </div>
                                                   ) : workCalendarEvents.length > 0 ? (
                            <div className="mt-3">
                              <CreatableSelect
                                options={eventOptions}
                                onChange={handleEventChange}
                                placeholder={workCalendarEvents.length > 0 ? `Select from ${workCalendarEvents.length} events today...` : "No meetings scheduled for today"}
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
                              <p className="text-xs text-green-600 mt-1 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {workCalendarEvents.length} meeting{workCalendarEvents.length !== 1 ? 's' : ''} scheduled for today
                              </p>
                            </div>
                          ) : (
                           <p className="text-sm text-[var(--neutral-500)] mt-2 flex items-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                             </svg>
                             No meetings scheduled for today
                           </p>
                         )}
                      </div>
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${!isAdhoc && selectedEventId ? 'border-[var(--primary-color)] bg-[var(--primary-color)]' : 'border-[var(--neutral-300)]'}
                      `}>
                        {!isAdhoc && selectedEventId && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`
                      relative border-2 rounded-xl p-4 cursor-pointer transition-all
                      ${isAdhoc 
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 dark:bg-[var(--primary-color)]/10' 
                        : 'border-[var(--neutral-200)] dark:border-gray-600 hover:border-[var(--neutral-300)] dark:hover:border-gray-500'
                      }
                    `}
                    onClick={() => handleAdhocChange({ target: { checked: !isAdhoc } } as any)}
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-[var(--neutral-900)] dark:text-white">Ad-hoc Meeting</h4>
                        <p className="text-sm text-[var(--neutral-600)] dark:text-gray-300 mt-1">For unscheduled meetings and quick notes</p>
                      </div>
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${isAdhoc ? 'border-[var(--primary-color)] bg-[var(--primary-color)]' : 'border-[var(--neutral-300)]'}
                      `}>
                        {isAdhoc && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="note-title" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    id="note-title"
                    className="input-modern"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSaving || (selectedEventId !== undefined && !isAdhoc)}
                    placeholder={selectedEventId ? "Title from calendar event" : "Enter meeting title"}
                  />
                </div>

                {/* Tags */}
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

                {/* Meeting Series */}
                {existingSeries.length > 0 && (
                  <div>
                    <label htmlFor="meeting-series" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                      Meeting Series (Optional)
                    </label>
                    <select
                      id="meeting-series"
                      className="input-modern"
                      value={selectedSeries}
                      onChange={(e) => setSelectedSeries(e.target.value)}
                      disabled={isSaving}
                    >
                      <option value="">No series - standalone meeting</option>
                      {existingSeries.map((series) => (
                        <option key={series} value={series}>
                          {series}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[var(--neutral-500)] mt-1">
                      Add this meeting to an existing series to build context across related meetings
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Agenda & Content */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-[var(--neutral-900)] dark:text-white mb-2">Meeting Details</h3>
                  <p className="text-[var(--neutral-600)] dark:text-gray-300">Add basic details (you can add action items after creating the note)</p>
                </div>

                {/* Agenda */}
                <div>
                  <label htmlFor="meeting-note-agenda" className="block text-sm font-medium text-[var(--neutral-700)] mb-2">
                    Meeting Agenda
                  </label>
                  <textarea
                    id="meeting-note-agenda"
                    className="input-modern"
                    rows={4}
                    placeholder="Outline the key topics and objectives for this meeting..."
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
                      placeholder="Add meeting notes here (optional - you can edit this later)..."
                    />
                  </div>
                  <p className="text-xs text-[var(--neutral-500)] mt-2">
                    Meeting notes are optional. You can add or edit them later in the main view.
                  </p>
                </div>
              </div>
            )}



            {/* Navigation */}
            <div className="flex justify-between items-center pt-6 border-t border-[var(--neutral-200)] mt-6">
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={prevStep}
                    disabled={isSaving}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                
                {currentStep < 2 ? (
                  <button
                    type="button"
                    className={`btn-primary ${
                      !canProceedToStep2() ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={nextStep}
                    disabled={isSaving || !canProceedToStep2()}
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`btn-primary ${isSaving || !canCreateNote() ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={isSaving || !canCreateNote()}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Create Meeting Note
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}