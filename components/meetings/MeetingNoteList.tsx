// components/meetings/MeetingNoteList.tsx
"use client";

import { useState, useMemo } from "react";
import type { Note } from "@/types/app";

type MeetingNoteListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onDeleteNotes: (noteIds: string[]) => Promise<void>;
  isSaving: boolean;
  viewMode?: 'list' | 'grid';
};

export default function MeetingNoteList({ 
  notes, 
  selectedNoteId, 
  onSelectNote, 
  onDeleteNotes, 
  isSaving,
  viewMode = 'list'
}: MeetingNoteListProps) {
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
      setSelectedNotes([]);
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

  const renderNoteCard = (note: Note, isGrouped: boolean = true) => (
    <div
      key={note.id}
      className={`
        group relative bg-white rounded-xl border border-[var(--neutral-200)] 
        hover:border-[var(--primary-color)] hover:shadow-md transition-all duration-200 cursor-pointer
        ${selectedNoteId === note.id 
          ? "border-[var(--primary-color)] shadow-md ring-2 ring-[var(--primary-color)]/20" 
          : ""
        }
        ${viewMode === 'grid' ? 'p-4' : isGrouped ? 'mx-4 mb-3' : 'p-4 mb-3'}
      `}
      onClick={() => onSelectNote(note.id)}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <input
          type="checkbox"
          checked={selectedNotes.includes(note.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleNoteSelect(note.id, e.target.checked);
          }}
          disabled={isSaving}
          className="h-4 w-4 rounded border-[var(--neutral-300)] text-[var(--primary-color)] focus:ring-[var(--primary-color)]"
        />
      </div>

      {/* Note content */}
      <div className={`${viewMode === 'grid' ? 'pl-0' : 'pl-8'}`}>
        {/* Header with title and status badges */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-[var(--neutral-900)] text-sm line-clamp-2 flex-1 pr-2">
            {note.title || note.eventTitle || `${note.content.substring(0, 50)}...`}
          </h3>
          {(note.eventId || note.isAdhoc) && (
            <div className="flex gap-1 flex-shrink-0">
              {note.eventId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Event
                </span>
              )}
              {note.isAdhoc && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Ad-hoc
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content preview */}
        <p className="text-[var(--neutral-600)] text-sm line-clamp-2 mb-3">
          {note.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
        </p>

        {/* Footer with metadata */}
        <div className="flex items-center justify-between text-xs text-[var(--neutral-500)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {new Date(note.createdAt).toLocaleDateString()}
            </span>
            {note.actions && note.actions.length > 0 && (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {note.actions.length} action{note.actions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {/* AI Summary indicator */}
          {note.aiSummary && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary-color)]/10 text-[var(--primary-color)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              AI Summary
            </span>
          )}
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)]"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[var(--neutral-100)] text-[var(--neutral-700)]">
                +{note.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (sortedGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--neutral-100)] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--neutral-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--neutral-900)] mb-2">No meeting notes yet</h3>
        <p className="text-[var(--neutral-600)]">Create your first meeting note to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      {selectedNotes.length > 0 && (
        <div className="bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--primary-color)]">
              {selectedNotes.length} note{selectedNotes.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleDelete}
              className={`
                bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium 
                transition-colors flex items-center
                ${isSaving ? "opacity-50 cursor-not-allowed" : ""}
              `}
              disabled={isSaving}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Notes display */}
      {viewMode === 'grid' ? (
        // Grid view - show all notes without grouping
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {notes.map((note) => renderNoteCard(note, false))}
        </div>
      ) : (
        // List view - show grouped by month/year
        <div className="space-y-4">
          {sortedGroups.map(([monthYear, notesInGroup]) => (
            <div key={monthYear} className="bg-white rounded-xl border border-[var(--neutral-200)] overflow-hidden shadow-sm">
              <div
                className={`
                  bg-[var(--neutral-50)] px-4 py-3 flex items-center justify-between cursor-pointer 
                  transition-colors hover:bg-[var(--neutral-100)]
                `}
                onClick={() =>
                  setOpenMonthYear((prevState) => ({
                    ...prevState,
                    [monthYear]: !prevState[monthYear],
                  }))
                }
              >
                <h3 className="text-lg font-semibold text-[var(--neutral-900)]">
                  {monthYear}
                  <span className="text-sm text-[var(--neutral-500)] ml-2 font-normal">
                    ({notesInGroup.length} note{notesInGroup.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 text-[var(--neutral-500)] transition-transform ${
                    openMonthYear[monthYear] ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              {(openMonthYear[monthYear] !== false) && (
                <div className="py-2">
                  {notesInGroup.map((note: Note) => renderNoteCard(note, true))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}