// components/meetings/MeetingNoteList.tsx
"use client";

import { useState, useMemo } from "react";
import type { Note } from "@/types/app"; // Import shared Note type

type MeetingNoteListProps = { // Renamed type
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onDeleteNotes: (noteIds: string[]) => Promise<void>; // Add prop for deleting selected notes
  isSaving: boolean; // Add isSaving prop
};

export default function MeetingNoteList({ notes, selectedNoteId, onSelectNote, onDeleteNotes, isSaving }: MeetingNoteListProps) { // Receive new props
  const [openMonthYear, setOpenMonthYear] = useState<Record<string, boolean>>({});
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  const handleNoteSelect = (noteId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedNotes([...selectedNotes, noteId]);
    } else {
      setSelectedNotes(selectedNotes.filter((id) => id !== noteId));
    }
  };

  const handleDelete = async () => {
    if (selectedNotes.length > 0 && !isSaving) {
      await onDeleteNotes(selectedNotes);
      setSelectedNotes([]); // Clear selected notes after deletion
    }
  };

  // Group notes by month and year
  const groupedNotes = useMemo(() => {
    if (!notes || notes.length === 0) return {};

    return notes.reduce((groups, note) => {
      const date = new Date(note.createdAt);
      const monthYear = date.toLocaleString("default", { month: "long", year: "numeric" });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(note);
      return groups;
    }, {} as Record<string, Note[]>);
  }, [notes]);

  // Sort month/year groups in descending order
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedNotes)
      .sort(([aMonthYear], [bMonthYear]) => {
        const [aMonth, aYear] = aMonthYear.split(" ");
        const [bMonth, bYear] = bMonthYear.split(" ");
        const aDate = new Date(`${aMonth} 1, ${aYear}`);
        const bDate = new Date(`${bMonth} 1, ${bYear}`);
        return bDate.getTime() - aDate.getTime();
      });
  }, [groupedNotes]);


  return (
    <div className="space-y-5">
      {selectedNotes.length > 0 && (
        <button
          onClick={handleDelete}
          className={`bg-red-500 text-white px-4 py-2 rounded-lg text-sm md:text-base font-medium shadow-sm hover:bg-red-600 transition-colors flex items-center ${
            isSaving ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isSaving}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Delete Selected ({selectedNotes.length})
        </button>
      )}

      {sortedGroups.length > 0 ? (
        sortedGroups.map(([monthYear, notesInGroup]) => (
          <div key={monthYear} className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
            <div
              className={`bg-neutral-100 dark:bg-neutral-800 px-4 py-3 flex items-center justify-between cursor-pointer transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700`}
              onClick={() =>
                setOpenMonthYear((prevState) => ({
                  ...prevState,
                  [monthYear]: !prevState[monthYear],
                }))
              }
            >
              <h3 className="text-lg font-semibold">
                {monthYear} <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-1">({notesInGroup.length})</span>
              </h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 text-neutral-500 transition-transform ${openMonthYear[monthYear] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {(openMonthYear[monthYear] !== false) && (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {notesInGroup.map((note: Note) => (
                  <div
                    key={note.id}
                    className={`p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-start transition-colors ${
                      selectedNoteId === note.id ? "bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500" : ""
                    }`}
                  >
                    <div className="flex items-center h-5 mr-3">
                      <input
                        type="checkbox"
                        id={`meeting-note-${note.id}`}
                        checked={selectedNotes.includes(note.id)}
                        onChange={(e) => handleNoteSelect(note.id, e.target.checked)}
                        disabled={isSaving}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                    <label
                      htmlFor={`meeting-note-${note.id}`}
                      onClick={() => onSelectNote(note.id)}
                      className="cursor-pointer flex-1"
                    >
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {note.title || note.eventTitle || `${note.content.substring(0, 50)}...`}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {note.eventId && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {note.eventTitle}
                          </span>
                        )}
                        {note.isAdhoc && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Ad-hoc
                          </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-12 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">No meeting notes found.</p>
        </div>
      )}
    </div>
  );
}