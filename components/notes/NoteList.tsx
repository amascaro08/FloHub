"use client";

import type { Note, GroupingOption } from "@/types/app";
import { useState } from "react";
import { 
  ChevronDownIcon, 
  ClockIcon, 
  TagIcon,
  DocumentTextIcon,
  SparklesIcon,
  TrashIcon,
  CalendarDaysIcon,
  CalendarIcon,
  HashtagIcon,
  ListBulletIcon
} from '@heroicons/react/24/solid';

type NoteListProps = {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  selectedNotes: string[];
  onToggleSelectNote: (noteId: string, isSelected: boolean) => void;
  onDeleteSelected: () => void;
  groupBy?: GroupingOption;
  onGroupByChange?: (groupBy: GroupingOption) => void;
};

// Helper function to get week key
const getWeekKey = (date: Date) => {
  const year = date.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  return `Week ${weekNumber}, ${year}`;
};

// Helper function to get date key
const getDateKey = (date: Date) => {
  return date.toLocaleDateString('default', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

export default function NoteList({ 
  notes, 
  selectedNoteId, 
  onSelectNote, 
  selectedNotes, 
  onToggleSelectNote, 
  onDeleteSelected,
  groupBy = 'month',
  onGroupByChange
}: NoteListProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  // Group notes based on selected grouping option
  const groupNotes = (notesToGroup: Note[]) => {
    if (groupBy === 'none') {
      return { 'All Notes': notesToGroup };
    }

    return notesToGroup.reduce((groups, note) => {
      const date = new Date(note.createdAt);
      let groupKey: string;

      switch (groupBy) {
        case 'month':
          groupKey = date.toLocaleString("default", { month: "long", year: "numeric" });
          break;
        case 'date':
          groupKey = getDateKey(date);
          break;
        case 'week':
          groupKey = getWeekKey(date);
          break;
        case 'tag':
          // For tag grouping, create a group for each tag, notes can appear in multiple groups
          if (note.tags && note.tags.length > 0) {
            note.tags.forEach(tag => {
              if (!groups[tag]) {
                groups[tag] = [];
              }
              groups[tag].push(note);
            });
          } else {
            // Notes without tags go to "Untagged" group
            if (!groups['Untagged']) {
              groups['Untagged'] = [];
            }
            groups['Untagged'].push(note);
          }
          return groups;
        default:
          groupKey = 'All Notes';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(note);
      return groups;
    }, {} as Record<string, Note[]>);
  };

  // Sort grouped notes
  const sortGroupedNotes = (groupedNotes: Record<string, Note[]>) => {
    return Object.entries(groupedNotes)
      .sort(([aKey], [bKey]) => {
        if (groupBy === 'none') return 0;
        if (groupBy === 'tag') return aKey.localeCompare(bKey);
        
        // For date-based grouping, sort by most recent first
        try {
          let aDate: Date, bDate: Date;
          
          if (groupBy === 'month') {
            const [aMonth, aYear] = aKey.split(" ");
            const [bMonth, bYear] = bKey.split(" ");
            aDate = new Date(`${aMonth} 1, ${aYear}`);
            bDate = new Date(`${bMonth} 1, ${bYear}`);
          } else if (groupBy === 'week') {
            const [, aWeekNum, aYear] = aKey.match(/Week (\d+), (\d+)/) || [];
            const [, bWeekNum, bYear] = bKey.match(/Week (\d+), (\d+)/) || [];
            aDate = new Date(parseInt(aYear), 0, 1 + (parseInt(aWeekNum) - 1) * 7);
            bDate = new Date(parseInt(bYear), 0, 1 + (parseInt(bWeekNum) - 1) * 7);
          } else {
            aDate = new Date(aKey);
            bDate = new Date(bKey);
          }
          
          return bDate.getTime() - aDate.getTime();
        } catch {
          return aKey.localeCompare(bKey);
        }
      });
  };

  const groupedRegularNotes = groupNotes(regularNotes);
  const sortedGroups = sortGroupedNotes(groupedRegularNotes);

  const renderGroupingSelector = () => {
    if (!onGroupByChange) return null;

    const groupingOptions = [
      { value: 'month' as GroupingOption, label: 'Month Created', icon: CalendarDaysIcon },
      { value: 'date' as GroupingOption, label: 'Date Created', icon: CalendarIcon },
      { value: 'tag' as GroupingOption, label: 'Tag Grouping', icon: HashtagIcon },
      { value: 'week' as GroupingOption, label: 'Week Created', icon: CalendarDaysIcon },
      { value: 'none' as GroupingOption, label: 'No Grouping', icon: ListBulletIcon },
    ];

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Group by:
        </label>
        <div className="grid grid-cols-1 gap-2">
          {groupingOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onGroupByChange(option.value)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                groupBy === option.value
                  ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-neutral-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <option.icon className="w-4 h-4" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
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
      {/* Grouping Selector */}
      {renderGroupingSelector()}

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
                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <ClockIcon className="w-3 h-3 flex-shrink-0" />
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

      {/* Regular Notes with Grouping */}
      {regularNotes.length > 0 ? (
        groupBy === 'none' ? (
          // No grouping - flat list
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-neutral-50 dark:from-slate-800 dark:to-slate-900 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-700/50">
              <div className="flex items-center space-x-2">
                <DocumentTextIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white">All Notes</h3>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-medium">
                  {regularNotes.length}
                </span>
              </div>
            </div>
            <div className="divide-y divide-neutral-200/50 dark:divide-neutral-700/50">
              {regularNotes.map((note: Note) => (
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
          </div>
        ) : (
          // Grouped view - groups start collapsed by default
          sortedGroups.map(([groupKey, notesInGroup]) => (
            <div key={groupKey} className="bg-white dark:bg-slate-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm overflow-hidden">
              <button
                className="w-full bg-gradient-to-r from-slate-50 to-neutral-50 dark:from-slate-800 dark:to-slate-900 px-4 py-3 flex items-center justify-between hover:from-slate-100 hover:to-neutral-100 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-200 border-b border-neutral-200/50 dark:border-neutral-700/50"
                onClick={() =>
                  setOpenGroups((prevState) => ({
                    ...prevState,
                    [groupKey]: !prevState[groupKey],
                  }))
                }
              >
                <div className="flex items-center space-x-2">
                  {groupBy === 'tag' ? (
                    <HashtagIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <DocumentTextIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  )}
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {groupKey}
                  </h3>
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full font-medium">
                    {notesInGroup.length}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${
                    openGroups[groupKey] ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {/* Groups are collapsed by default - only show when explicitly opened */}
              {openGroups[groupKey] && (
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
        )
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