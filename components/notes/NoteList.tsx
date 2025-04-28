"use client";

import type { Note } from "@/types/app"; // Import shared Note type

type NoteListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
};

import { useState } from "react";

export default function NoteList({ notes, selectedNoteId, onSelectNote }: NoteListProps) {
  const [openMonthYear, setOpenMonthYear] = useState<Record<string, boolean>>({});
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

  const quickNotes = notes.filter((note) => note.source === "quicknote");
  const regularNotes = notes.filter((note) => note.source !== "quicknote");

  const handleNoteSelect = (noteId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedNotes([...selectedNotes, noteId]);
    } else {
      setSelectedNotes(selectedNotes.filter((id) => id !== noteId));
    }
  };

  const handleDelete = async () => {
    // Implement API call to delete selected notes
    // For example:
    // await Promise.all(selectedNotes.map(id => fetch(`/api/notes/${id}`, { method: 'DELETE' })));

    // After successful deletion, update the local state
    // const updatedNotes = notes.filter(note => !selectedNotes.includes(note.id));
    // setNotes(updatedNotes); // Assuming you have a setNotes function

    setSelectedNotes([]); // Clear selected notes after deletion
  };

  return (
    <div className="space-y-4">
      {selectedNotes.length > 0 && (
        <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded">
          Delete Selected
        </button>
      )}

      {quickNotes.length > 0 && (
        <details className="mb-4">
          <summary className="text-lg font-semibold mb-2 cursor-pointer">Quick Notes</summary>
          <div className="space-y-2">
            {quickNotes.map((note: Note) => (
              <div
                key={note.id}
                className={`p-3 rounded-md cursor-pointer hover:bg-[var(--neutral-200)] ${
                  selectedNoteId === note.id ? "bg-[var(--neutral-300)]" : ""
                }`}
              >
                <input
                  type="checkbox"
                  id={`note-${note.id}`}
                  checked={selectedNotes.includes(note.id)}
                  onChange={(e) => handleNoteSelect(note.id, e.target.checked)}
                />
                <label htmlFor={`note-${note.id}`} onClick={() => onSelectNote(note.id)}>
                  <h3 className="font-semibold text-sm">
                    {note.title || `${note.content.substring(0, 50)}...`}
                  </h3>
                  <p className="text-xs text-[var(--neutral-500)]">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </label>
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
          .sort(([[aMonthYear, aNotes]], [[bMonthYear, bNotes]]) => {
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
                    <input
                      type="checkbox"
                      id={`note-${note.id}`}
                      checked={selectedNotes.includes(note.id)}
                      onChange={(e) => handleNoteSelect(note.id, e.target.checked)}
                    />
                    <label htmlFor={`note-${note.id}`} onClick={() => onSelectNote(note.id)}>
                      <h3 className="font-semibold text-sm">
                        {note.title || `${note.content.substring(0, 50)}...`}
                      </h3>
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
        <p className="text-[var(--neutral-500)]">No notes found.</p>
      )}
    </div>
  );
}