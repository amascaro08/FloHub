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
    <div className="space-y-4">
      {selectedNotes.length > 0 && (
        <button
          onClick={handleDelete}
          className={`bg-red-500 text-white px-4 py-2 rounded text-sm md:text-base w-full md:w-auto ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={isSaving}
        >
          Delete Selected ({selectedNotes.length})
        </button>
      )}

      {sortedGroups.length > 0 ? (
        sortedGroups.map(([monthYear, notesInGroup]) => (
          <details key={monthYear} open={openMonthYear[monthYear]}>
            <summary
              className="text-lg font-semibold mb-2 cursor-pointer"
              onClick={() =>
                setOpenMonthYear((prevState) => ({
                  ...prevState,
                  [monthYear]: !prevState[monthYear],
                }))
              }
            >
              {monthYear} ({notesInGroup.length})
            </summary>
            <div className="space-y-2">
              {notesInGroup.map((note: Note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-md cursor-pointer hover:bg-[var(--neutral-200)] flex items-start ${
                    selectedNoteId === note.id ? "bg-[var(--neutral-300)]" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`meeting-note-${note.id}`}
                    checked={selectedNotes.includes(note.id)}
                    onChange={(e) => handleNoteSelect(note.id, e.target.checked)}
                    disabled={isSaving}
                    className="mt-1 flex-shrink-0"
                  />
                  <label htmlFor={`meeting-note-${note.id}`} onClick={() => onSelectNote(note.id)} className="ml-2 cursor-pointer flex-1"> {/* Added flex-1 to allow text to wrap */}
                    <h3 className="font-semibold text-sm">
                      {note.title || note.eventTitle || `${note.content.substring(0, 50)}...`} {/* Display title or event title */}
                    </h3>
                    {note.eventId && <p className="text-xs text-[var(--neutral-500)]">Event: {note.eventTitle}</p>} {/* Display associated event */}
                    {note.isAdhoc && <p className="text-xs text-[var(--neutral-500)]">Ad-hoc Meeting</p>} {/* Display ad-hoc status */}
                    <p className="text-xs text-[var(--neutral-500)]">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </label>
                </div>
              ))}
            </div>
          </details>
        ))
      ) : (
        <p className="text-[var(--neutral-500)]">No meeting notes found.</p>
      )}
    </div>
  );
}