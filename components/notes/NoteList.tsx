"use client";

import type { Note } from "@/types/app";
import { useState } from "react";
import { 
  ChevronDownIcon, 
  ClockIcon, 
  TagIcon,
  DocumentTextIcon,
  SparklesIcon,
  TrashIcon
} from '@heroicons/react/24/solid';

type NoteListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  selectedNotes: string[];
  onToggleSelectNote: (noteId: string, isSelected: boolean) => void;
  onDeleteSelected: () => void;
};

export default function NoteList({ 
  notes, 
  selectedNoteId, 
  onSelectNote, 
  selectedNotes, 
  onToggleSelectNote, 
  onDeleteSelected 
}: NoteListProps) {
  const [openMonthYear, setOpenMonthYear] = useState<Record<string, boolean>>({});

  const quickNotes = notes.filter((note) => note.source === "quicknote");
  const regularNotes = notes.filter((note) => note.source !== "quicknote");

  // Helper function to extract text content from HTML
  const getTextContent = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Helper function to get note preview
  const getNotePreview = (note: Note) => {
    const textContent = getTextContent(note.content);
    return textContent.substring(0, 120) + (textContent.length > 120 ? '...' : '');
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <DocumentTextIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No notes yet</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Create your first note to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete Selected Button */}
      {selectedNotes.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <button
            onClick={onDeleteSelected}
            className="w-full flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Delete Selected ({selectedNotes.length})</span>
          </button>
        </div>
      )}

      {/* Quick Notes Section */}
      {quickNotes.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-700/50">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Quick Notes
              </h3>
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-medium">
                {quickNotes.length}
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
            {quickNotes.map((note: Note) => (
              <div
                key={note.id}
                className={`group relative transition-all duration-200 ${
                  selectedNoteId === note.id 
                    ? "bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500" 
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <div className="flex items-start p-4 space-x-3">
                  <div className="flex items-center mt-1">
                    <input
                      type="checkbox"
                      id={`note-${note.id}`}
                      checked={selectedNotes.includes(note.id)}
                      onChange={(e) => onToggleSelectNote(note.id, e.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                    />
                  </div>
                  
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelectNote(note.id)}
                  >
                    <h4 className="font-medium text-slate-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {note.title || "Untitled Note"}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {getNotePreview(note)}
                    </p>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                        <ClockIcon className="w-3 h-3" />
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-medium">
                        Quick Note
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Notes by Month/Year */}
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
          .sort(([aMonthYear], [bMonthYear]) => {
            const [aMonth, aYear] = aMonthYear.split(" ");
            const [bMonth, bYear] = bMonthYear.split(" ");
            const aDate = new Date(`${aMonth} 1, ${aYear}`);
            const bDate = new Date(`${bMonth} 1, ${bYear}`);
            return bDate.getTime() - aDate.getTime();
          })
          .map(([monthYear, notesInGroup]) => (
            <div key={monthYear} className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm overflow-hidden">
              <button
                className="w-full bg-gradient-to-r from-slate-50 to-neutral-50 dark:from-slate-800 dark:to-slate-900 px-4 py-3 flex items-center justify-between hover:from-slate-100 hover:to-neutral-100 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-200 border-b border-neutral-200/50 dark:border-neutral-700/50"
                onClick={() =>
                  setOpenMonthYear((prevState) => ({
                    ...prevState,
                    [monthYear]: !prevState[monthYear],
                  }))
                }
              >
                <div className="flex items-center space-x-2">
                  <DocumentTextIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {monthYear}
                  </h3>
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-medium">
                    {notesInGroup.length}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${
                    openMonthYear[monthYear] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {(openMonthYear[monthYear] !== false) && (
                <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
                  {notesInGroup.map((note: Note) => (
                    <div
                      key={note.id}
                      className={`group relative transition-all duration-200 ${
                        selectedNoteId === note.id 
                          ? "bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-start p-4 space-x-3">
                        <div className="flex items-center mt-1">
                          <input
                            type="checkbox"
                            id={`note-${note.id}`}
                            checked={selectedNotes.includes(note.id)}
                            onChange={(e) => onToggleSelectNote(note.id, e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                          />
                        </div>
                        
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => onSelectNote(note.id)}
                        >
                          <h4 className="font-medium text-slate-900 dark:text-white mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {note.title || "Untitled Note"}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {getNotePreview(note)}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                              <ClockIcon className="w-3 h-3" />
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <TagIcon className="w-3 h-3 text-slate-400" />
                                <div className="flex flex-wrap gap-1">
                                  {note.tags.slice(0, 2).map((tag, index) => (
                                    <span
                                      key={index}
                                      className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs px-2 py-1 rounded-full font-medium"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {note.tags.length > 2 && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      +{note.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
      ) : quickNotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No notes found</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : null}
    </div>
  );
}