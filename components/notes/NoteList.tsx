"use client";

import type { Note } from "@/types/app"; // Import shared Note type

type NoteListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
};

export default function NoteList({ notes, selectedNoteId, onSelectNote }: NoteListProps) {
  return (
    <div className="space-y-2">
      {notes.length > 0 ? (
        notes.map((note: Note) => (
          <div
            key={note.id}
            className={`p-3 rounded-md cursor-pointer hover:bg-[var(--neutral-200)] ${selectedNoteId === note.id ? 'bg-[var(--neutral-300)]' : ''}`}
            onClick={() => onSelectNote(note.id)}
          >
            <h3 className="font-semibold text-sm">{note.content.substring(0, 50)}...</h3> {/* Display truncated content as title */}
            <p className="text-xs text-[var(--neutral-500)]">
              {new Date(note.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))
      ) : (
        <p className="text-[var(--neutral-500)]">No notes found.</p>
      )}
    </div>
  );
}