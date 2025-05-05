"use client";

import type { Note } from "@/types/app"; // Import shared Note type

type NoteListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  selectedNotes: string[]; // Add prop for selected notes from parent
  onToggleSelectNote: (noteId: string, isSelected: boolean) => void; // Add prop for toggling selection
  onDeleteSelected: () => void; // Add prop for deleting selected notes
};

import { useState } from "react";

export default function NoteList({ notes, selectedNoteId, onSelectNote, selectedNotes, onToggleSelectNote, onDeleteSelected }: NoteListProps) {
  const [openMonthYear, setOpenMonthYear] = useState<Record<string, boolean>>({});

  const quickNotes = notes.filter((note) => note.source === "quicknote");
  const regularNotes = notes.filter((note) => note.source !== "quicknote");

  return (
    <div className="space-y-4">
      {selectedNotes.length > 0 && (
        <button onClick={onDeleteSelected} className="bg-red-500 text-white px-4 py-2 rounded mb-4 w-full"> {/* Make button full width */}
          Delete Selected ({selectedNotes.length})
        </button>
      )}

      {quickNotes.length > 0 && (
        <details className="mb-4" open> {/* Keep Quick Notes open by default */}
          <summary className="text-lg font-semibold mb-2 cursor-pointer">Quick Notes</summary>
          <div className="space-y-2">
            {quickNotes.map((note: Note) => (
              <div
                key={note.id}
                className={`p-3 rounded-md cursor-pointer hover:bg-[var(--neutral-200)] ${
                  selectedNoteId === note.id ? "bg-[var(--neutral-300)]" : ""
                }`}
              >
                <div className="flex items-center"> {/* Flex container for checkbox and title */}
                  <input
                    type="checkbox"
                    id={`note-${note.id}`}
                    checked={selectedNotes.includes(note.id)}
                    onChange={(e) => onToggleSelectNote(note.id, e.target.checked)}
                    className="mr-2" // Add margin to the right of the checkbox
                  />
                  <label htmlFor={`note-${note.id}`} className="flex-1 cursor-pointer" onClick={() => onSelectNote(note.id)}> {/* Make label take remaining space and clickable */}
                    <h3 className="font-semibold text-sm truncate"> {/* Add truncate for long titles */}
                      {note.title || `${note.content.substring(0, 50)}...`}
                    </h3>
                  </label>
                </div>
                <p className="text-xs text-[var(--neutral-500)] ml-5"> {/* Add margin to align date below title */}
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {regularNotes.length > 0 ? (
        Object.entries(
          regularNotes.reduce((groups, note) => {
            const date = new Date(note.createdAt);
            const monthYear = date.toLocaleString("default", { month: "long", year: "numeric" });
            if (!groups[monthYear]) {
              groups[monthYear] = [];
            }
            groups[monthYear].push(note);
            return groups;
          }, {} as Record<string, Note[]>),
        )
          .sort(([aMonthYear, aNotes], [bMonthYear, bNotes]) => {
            const [aMonth, aYear] = aMonthYear.split(" ");
            const [bMonth, bYear] = bMonthYear.split(" ");
            const aDate = new Date(`${aMonth} 1, ${aYear}`);
            const bDate = new Date(`${bMonth} 1, ${bYear}`);
            return bDate.getTime() - aDate.getTime();
          })
          .map(([monthYear, notesInGroup]) => (
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
                {monthYear}
              </summary>
              <div className="space-y-2">
                {notesInGroup.map((note: Note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-md cursor-pointer hover:bg-[var(--neutral-200)] ${
                      selectedNoteId === note.id ? "bg-[var(--neutral-300)]" : ""
                    }`}
                  >
                    <div className="flex items-center"> {/* Flex container for checkbox and title */}
                      <input
                        type="checkbox"
                        id={`note-${note.id}`}
                        checked={selectedNotes.includes(note.id)}
                        onChange={(e) => onToggleSelectNote(note.id, e.target.checked)}
                        className="mr-2" // Add margin to the right of the checkbox
                      />
                      <label htmlFor={`note-${note.id}`} className="flex-1 cursor-pointer" onClick={() => onSelectNote(note.id)}> {/* Make label take remaining space and clickable */}
                        <h3 className="font-semibold text-sm truncate"> {/* Add truncate for long titles */}
                          {note.title || `${note.content.substring(0, 50)}...`}
                        </h3>
                      </label>
                    </div>
                    <p className="text-xs text-[var(--neutral-500)] ml-5"> {/* Add margin to align date below title */}
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          ))
      ) : (
        <p className="text-[var(--neutral-500)]">No notes found.</p>
      )}
    </div>
  );
}