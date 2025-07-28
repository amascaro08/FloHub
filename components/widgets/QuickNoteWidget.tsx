'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import type { WidgetProps } from '@/types/app';
import { 
  Plus, 
  Save, 
  Edit3, 
  Trash2, 
  FileText,
  Clock,
  Tag,
  X,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';

interface QuickNote {
  id: string;
  content: string;
  timestamp: string;
  tags?: string[];
}

const QuickNoteWidget: React.FC<WidgetProps> = ({ size = 'medium', colSpan = 4, rowSpan = 3, isCompact = false, isHero = false } = {}) => {
  const { user } = useUser();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load notes from localStorage
  useEffect(() => {
    if (user?.email) {
      const savedNotes = localStorage.getItem(`quickNotes_${user.email}`);
      if (savedNotes) {
        try {
          setNotes(JSON.parse(savedNotes));
        } catch (error) {
          console.error('Error loading quick notes:', error);
        }
      }
      setIsLoading(false);
    }
  }, [user?.email]);

  // Save notes to localStorage
  const saveNotes = (newNotes: QuickNote[]) => {
    if (user?.email) {
      localStorage.setItem(`quickNotes_${user.email}`, JSON.stringify(newNotes));
      setNotes(newNotes);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [currentNote]);

  const handleSaveNote = () => {
    if (!currentNote.trim()) return;

    if (editingNote) {
      // Update existing note
      const updatedNotes = notes.map(note =>
        note.id === editingNote.id
          ? { ...note, content: currentNote.trim(), tags: selectedTags }
          : note
      );
      saveNotes(updatedNotes);
      setEditingNote(null);
    } else {
      // Create new note
      const newNote: QuickNote = {
        id: Date.now().toString(),
        content: currentNote.trim(),
        timestamp: new Date().toISOString(),
        tags: selectedTags
      };
      saveNotes([newNote, ...notes]);
    }

    setCurrentNote('');
    setSelectedTags([]);
    setShowNoteForm(false);
  };

  const handleEditNote = (note: QuickNote) => {
    setEditingNote(note);
    setCurrentNote(note.content);
    setSelectedTags(note.tags || []);
    setShowNoteForm(true);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    saveNotes(updatedNotes);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setCurrentNote('');
    setSelectedTags([]);
    setShowNoteForm(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveNote();
    }
  };

  // Quick add note (for compact mode)
  const quickAddNote = () => {
    const note = prompt("Quick note:");
    if (note && note.trim()) {
      const newNote: QuickNote = {
        id: Date.now().toString(),
        content: note.trim(),
        timestamp: new Date().toISOString(),
        tags: []
      };
      saveNotes([newNote, ...notes]);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  // Responsive note display limit
  const getNoteDisplayLimit = () => {
    if (isCompact) return 3;
    if (size === 'small') return 4;
    return 6;
  };

  // Truncate note content for preview
  const truncateContent = (content: string, limit: number = 80) => {
    if (content.length <= limit) return content;
    return content.slice(0, limit) + '...';
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6 text-primary-500" />
        </div>
        <p className="text-grey-tint font-body">Please sign in to use quick notes.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`${isCompact ? 'space-y-2' : 'space-y-4'} h-full flex flex-col`}>
      {/* Add/Edit Note Form - Responsive design */}
      {(!isCompact || showNoteForm) && (
        <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} flex-shrink-0`}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={editingNote ? "Edit your note..." : "Write a quick note..."}
              className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
                isCompact ? 'min-h-[60px]' : 'min-h-[80px]'
              }`}
              rows={isCompact ? 2 : 3}
            />
            
            {/* Close button for compact mode */}
            {isCompact && (
              <button
                onClick={() => setShowNoteForm(false)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tags Input - Simplified for mobile */}
          {!isCompact && (
            <div>
              <label className="text-xs font-medium text-grey-tint flex items-center space-x-1 mb-2">
                <Tag className="w-3 h-3" />
                <span>Tags (comma separated)</span>
              </label>
              <input
                type="text"
                value={selectedTags.join(', ')}
                onChange={(e) => setSelectedTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                placeholder="work, ideas, todo"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveNote}
                disabled={!currentNote.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-1 text-sm"
              >
                {editingNote ? <Edit3 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span className={`${isCompact ? 'hidden' : 'inline'}`}>
                  {editingNote ? 'Update' : 'Save'}
                </span>
              </button>
              
              {editingNote && (
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-sm"
                >
                  Cancel
                </button>
              )}
            </div>

            {!isCompact && (
              <div className="text-xs text-grey-tint">
                Press ⌘+Enter to save
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact mode: Add note button */}
      {isCompact && !showNoteForm && (
        <div className="flex-shrink-0 flex space-x-2">
          <button
            onClick={() => setShowNoteForm(true)}
            className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 flex items-center justify-center space-x-1 text-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Add Note</span>
          </button>
          <button
            onClick={quickAddNote}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-sm"
          >
            Quick
          </button>
        </div>
      )}

      {/* Notes List - Optimized for mobile */}
      <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} flex-1 overflow-y-auto min-h-0`}>
        {notes.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-dark-base dark:text-soft-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-primary-500" />
              <span>{isCompact ? `Notes (${notes.length})` : `Recent Notes (${notes.length})`}</span>
            </h3>
            {notes.length > getNoteDisplayLimit() && (
              <button
                onClick={() => setShowAllNotes(!showAllNotes)}
                className="text-xs text-primary-500 hover:text-primary-600 transition-colors"
              >
                {showAllNotes ? 'Show Less' : 'Show All'}
              </button>
            )}
          </div>
        )}

        <div className={`${isCompact ? 'space-y-1' : 'space-y-2'}`}>
          {(showAllNotes ? notes : notes.slice(0, getNoteDisplayLimit())).map((note) => (
            <div
              key={note.id}
              className={`${
                isCompact ? 'p-2' : 'p-3'
              } bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 group hover:shadow-sm transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Note content with expand/collapse for long notes */}
                  <div className="mb-2">
                    {isCompact || (note.content.length <= 80) || expandedNote === note.id ? (
                      <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-dark-base dark:text-soft-white whitespace-pre-wrap leading-relaxed`}>
                        {isCompact ? truncateContent(note.content, 60) : note.content}
                      </p>
                    ) : (
                      <div>
                        <p className="text-sm text-dark-base dark:text-soft-white whitespace-pre-wrap leading-relaxed">
                          {truncateContent(note.content, 80)}
                        </p>
                        <button
                          onClick={() => setExpandedNote(note.id)}
                          className="text-xs text-primary-500 hover:text-primary-600 transition-colors mt-1"
                        >
                          Show more
                        </button>
                      </div>
                    )}
                    {expandedNote === note.id && note.content.length > 80 && (
                      <button
                        onClick={() => setExpandedNote(null)}
                        className="text-xs text-primary-500 hover:text-primary-600 transition-colors mt-1"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                  
                  {/* Metadata - More compact on mobile */}
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`${isCompact ? 'text-xs' : 'text-xs'} text-grey-tint flex items-center space-x-1`}>
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(note.timestamp)}</span>
                    </span>
                    
                    {/* Tags - Show fewer on mobile */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, isCompact ? 2 : 3).map((tag, index) => (
                          <span
                            key={index}
                            className={`${
                              isCompact ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
                            } bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full`}
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > (isCompact ? 2 : 3) && (
                          <span className="text-xs text-grey-tint">
                            +{note.tags.length - (isCompact ? 2 : 3)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Actions - Hidden until hover on desktop, always visible on mobile */}
                <div className={`flex items-center space-x-1 ml-3 ${
                  isCompact ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } transition-opacity`}>
                  <button
                    onClick={() => handleEditNote(note)}
                    className="p-1 text-gray-400 hover:text-primary-500 transition-colors rounded"
                  >
                    <Edit3 className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 text-gray-400 hover:text-accent-500 transition-colors rounded"
                  >
                    <Trash2 className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show remaining notes count */}
        {!showAllNotes && notes.length > getNoteDisplayLimit() && (
          <p className="text-xs text-grey-tint text-center">
            +{notes.length - getNoteDisplayLimit()} more notes
          </p>
        )}

        {/* Empty State */}
        {notes.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-grey-tint font-body text-sm">
              No notes yet. Write your first quick note above!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickNoteWidget;