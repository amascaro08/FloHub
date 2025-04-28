"use client";

import type { Note } from "@/types/app"; // Import shared Note type

type NoteListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
};

export default function NoteList({ notes, selectedNoteId, onSelectNote }: NoteListProps) {
  return (
    <div className="space-y-4"> {/* Adjust spacing for groups */}
      {notes.length > 0 ? (
        // Group notes by month and year
        Object.entries(
          notes.reduce((groups, note) => {
            const date = new Date(note.createdAt);
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) {
              groups[monthYear] = [];
            }
            groups[monthYear].push(note);
            return groups;
          }, {} as Record<string, Note[]>)
        )
        .sort(([aMonthYear], [bMonthYear]) => {
            // Sort groups chronologically (most recent first)
            const [aMonth, aYear] = aMonthYear.split(' ');
            const [bMonth, bYear] = bMonthYear.split(' ');
            const aDate = new Date(`${aMonth} 1, ${aYear}`);
            const bDate = new Date(`${bMonth} 1, ${bYear}`);
            return bDate.getTime() - aDate.getTime();
        })
        .map(([monthYear, notesInGroup]) => (
          <div key={monthYear}>
            <h4 className="text-lg font-semibold mb-2">{monthYear}</h4> {/* Month/Year heading */}
            <div className="space-y-2"> {/* Spacing for notes within a group */}
              {notesInGroup.map((note: Note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-md cursor-pointer hover:bg-[var(--neutral-200)] ${selectedNoteId === note.id ? 'bg-[var(--neutral-300)]' : ''}`}
                  onClick={() => onSelectNote(note.id)}
                >
                  <h3 className="font-semibold text-sm">{note.title || `${note.content.substring(0, 50)}...`}</h3> {/* Display title, fallback to truncated content */}
                  <p className="text-xs text-[var(--neutral-500)]">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-[var(--neutral-500)]">No notes found.</p>
      )}
    </div>
  );
}