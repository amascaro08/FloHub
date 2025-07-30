'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import type { WidgetProps, Note } from '@/types/app';
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
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import useSWR from 'swr';
import { 
  syncQuickNotesToDatabase, 
  saveQuickNoteToDatabase, 
  updateQuickNoteInDatabase, 
  deleteQuickNoteFromDatabase 
} from '@/lib/quickNotesSync';

// Legacy interface for localStorage notes
interface LegacyQuickNote {
  id: string;
  content: string;
  timestamp: string;
  tags?: string[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const QuickNoteWidget: React.FC<WidgetProps> = ({ size = 'medium', colSpan = 4, rowSpan = 3, isCompact = false, isHero = false } = {}) => {
  const { user } = useUser();
  const [currentNote, setCurrentNote] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(true);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch quick notes from API
  const { data: notesResponse, error, mutate } = useSWR(
    user?.email ? '/api/notes' : null,
    fetcher
  );

  // Filter only quick notes
  const quickNotes = notesResponse?.notes?.filter((note: Note) => note.source === 'quicknote') || [];

  // Sync localStorage notes to database on mount
  useEffect(() => {
    const syncLocalStorageNotes = async () => {
      if (!user?.email) return;
      
      setSyncStatus('syncing');
      try {
        const result = await syncQuickNotesToDatabase(user.email);
        if (result.success && result.synced && result.synced > 0) {
          console.log(`Synced ${result.synced} notes from localStorage to database`);
          // Refresh the notes list after sync
          mutate();
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
          setSyncStatus('idle');
        }
      } catch (error) {
        console.error('Error syncing localStorage notes:', error);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    };

    syncLocalStorageNotes();
  }, [user?.email, mutate]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [currentNote]);

  const handleSaveNote = async () => {
    if (!currentNote.trim()) return;

    setIsSaving(true);
    try {
      if (editingNote) {
        // Update existing note
        const result = await updateQuickNoteInDatabase(editingNote.id, currentNote.trim(), selectedTags);
        if (result.success) {
          mutate(); // Refresh the notes list
          setEditingNote(null);
        } else {
          console.error('Failed to update note:', result.error);
        }
      } else {
        // Create new note
        const result = await saveQuickNoteToDatabase(currentNote.trim(), selectedTags);
        if (result.success) {
          mutate(); // Refresh the notes list
        } else {
          console.error('Failed to save note:', result.error);
        }
      }

      setCurrentNote('');
      setSelectedTags([]);
      setShowNoteForm(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    // Extract text content from HTML
    const div = document.createElement('div');
    div.innerHTML = note.content;
    setCurrentNote(div.textContent || div.innerText || '');
    setSelectedTags(note.tags || []);
    setShowNoteForm(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    setIsSaving(true);
    try {
      const result = await deleteQuickNoteFromDatabase(noteId);
      if (result.success) {
        mutate(); // Refresh the notes list
      } else {
        console.error('Failed to delete note:', result.error);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setIsSaving(false);
    }
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
  const quickAddNote = async () => {
    const note = prompt("Quick note:");
    if (note && note.trim()) {
      setIsSaving(true);
      try {
        const result = await saveQuickNoteToDatabase(note.trim(), []);
        if (result.success) {
          mutate(); // Refresh the notes list
        } else {
          console.error('Failed to save quick note:', result.error);
        }
      } catch (error) {
        console.error('Error saving quick note:', error);
      } finally {
        setIsSaving(false);
      }
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
    // Extract text content from HTML
    const div = document.createElement('div');
    div.innerHTML = content;
    const textContent = div.textContent || div.innerText || '';
    
    if (textContent.length <= limit) return textContent;
    return textContent.slice(0, limit) + '...';
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

  if (!notesResponse && !error) {
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
      {/* Sync status indicator */}
      {syncStatus !== 'idle' && (
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
          syncStatus === 'syncing' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
          syncStatus === 'synced' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
          'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        }`}>
          {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
          <span>
            {syncStatus === 'syncing' && 'Syncing notes...'}
            {syncStatus === 'synced' && 'Notes synced successfully!'}
            {syncStatus === 'error' && 'Error syncing notes'}
          </span>
        </div>
      )}

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
                disabled={!currentNote.trim() || isSaving}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-1 text-sm"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : editingNote ? (
                  <Edit3 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className={`${isCompact ? 'hidden' : 'inline'}`}>
                  {isSaving ? 'Saving...' : editingNote ? 'Update' : 'Save'}
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
            disabled={isSaving}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-sm disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Quick'}
          </button>
        </div>
      )}

      {/* Notes List - Optimized for mobile */}
      <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} flex-1 overflow-y-auto min-h-0`}>
        {quickNotes.length > 0 && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-dark-base dark:text-soft-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-primary-500" />
              <span>{isCompact ? `Notes (${quickNotes.length})` : `Recent Notes (${quickNotes.length})`}</span>
            </h3>
            {quickNotes.length > getNoteDisplayLimit() && (
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
          {(showAllNotes ? quickNotes : quickNotes.slice(0, getNoteDisplayLimit())).map((note: Note) => (
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
                        {isCompact ? truncateContent(note.content, 60) : truncateContent(note.content, 200)}
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
                      <span>{formatTimestamp(note.createdAt)}</span>
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
                    disabled={isSaving}
                    className="p-1 text-gray-400 hover:text-primary-500 transition-colors rounded disabled:opacity-50"
                  >
                    <Edit3 className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={isSaving}
                    className="p-1 text-gray-400 hover:text-accent-500 transition-colors rounded disabled:opacity-50"
                  >
                    <Trash2 className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show remaining notes count */}
        {!showAllNotes && quickNotes.length > getNoteDisplayLimit() && (
          <p className="text-xs text-grey-tint text-center">
            +{quickNotes.length - getNoteDisplayLimit()} more notes
          </p>
        )}

        {/* Empty State */}
        {quickNotes.length === 0 && !error && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-grey-tint font-body text-sm">
              No notes yet. Write your first quick note above!
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-body text-sm">
              Error loading notes. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickNoteWidget;