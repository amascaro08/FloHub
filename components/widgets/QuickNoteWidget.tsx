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
  Tag
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
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
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
  };

  const handleEditNote = (note: QuickNote) => {
    setEditingNote(note);
    setCurrentNote(note.content);
    setSelectedTags(note.tags || []);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter(note => note.id !== noteId);
    saveNotes(updatedNotes);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setCurrentNote('');
    setSelectedTags([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveNote();
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
    } else {
      return date.toLocaleDateString();
    }
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
      {/* Add/Edit Note Form */}
      <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} flex-shrink-0`}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={editingNote ? "Edit your note..." : "Write a quick note..."}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[80px]"
            rows={3}
          />
          
          {/* Tags Input */}
          <div className="mt-2">
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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveNote}
              disabled={!currentNote.trim()}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-1"
            >
              {editingNote ? <Edit3 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{editingNote ? 'Update' : 'Save'}</span>
            </button>
            
            {editingNote && (
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="text-xs text-grey-tint">
            Press ⌘+Enter to save
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length > 0 && (
          <h3 className="text-sm font-medium text-dark-base dark:text-soft-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-primary-500" />
            <span>Recent Notes ({notes.length})</span>
          </h3>
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-base dark:text-soft-white whitespace-pre-wrap">
                  {note.content}
                </p>
                
                <div className="flex items-center space-x-3 mt-3">
                  <span className="text-xs text-grey-tint flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimestamp(note.timestamp)}</span>
                  </span>
                  
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-3">
                <button
                  onClick={() => handleEditNote(note)}
                  className="p-1 text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-gray-400 hover:text-accent-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

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