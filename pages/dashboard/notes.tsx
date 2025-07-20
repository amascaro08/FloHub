
import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import RichNoteEditor from "@/components/notes/RichNoteEditor";
import type { GetNotesResponse } from "../api/notes/index";
import type { Note, UserSettings } from "@/types/app";

type CalendarItem = {
  id: string;
  summary: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotesPage() {
  const { user, isLoading } = useUser();
  const status = user ? "authenticated" : "unauthenticated";
  const router = useRouter();

  // Handle loading state
  if (status === 'unauthenticated') {
    return <p className="text-center p-8">Loading notes...</p>;
  }

  // Handle unauthenticated state
  if (status !== 'authenticated' || !user) {
    return <p className="text-center p-8">Please sign in to access your notes.</p>;
  }

  const shouldFetch = status === "authenticated";
  
  // Fetch notes
  const { data: notesResponse, error: notesError, mutate } = useSWR<GetNotesResponse>(
    shouldFetch ? "/api/notes" : null,
    fetcher
  );

  // Fetch user settings to get global tags
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher
  );

  // Fetch calendar events
  const { data: calendarEvents, error: calendarError } = useSWR<CalendarItem[]>(
    shouldFetch ? "/api/calendar/list" : null,
    fetcher
  );

  // State management
  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Use only global tags from settings
  const allAvailableTags = useMemo(() => {
    return userSettings?.globalTags?.sort() || [];
  }, [userSettings]);

  // Handle saving a new note
  const handleSaveNewNote = async (note: { title: string; content: string; tags: string[] }) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: note.title,
          content: note.content,
          tags: note.tags,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        mutate();
        setShowNewNote(false);
        setSelectedNoteId(result.noteId);
      } else {
        const errorData = await response.json();
        console.error("Failed to save note:", errorData.error);
      }
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle updating an existing note
  const handleUpdateNote = async (note: { title: string; content: string; tags: string[] }) => {
    if (!selectedNote) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedNote.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
        }),
      });

      if (response.ok) {
        mutate();
      } else {
        const errorData = await response.json();
        console.error("Failed to update note:", errorData.error);
      }
    } catch (error) {
      console.error("Error updating note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deleting a note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [noteId] }),
      });

      if (response.ok) {
        setSelectedNoteId(null);
        setShowNewNote(false);
        await mutate();
      } else {
        const errorData = await response.json();
        console.error("Failed to delete note:", errorData.error);
        alert("Failed to delete note. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Error deleting note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedNotes.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedNotes.size} note(s)?`)) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedNotes) }),
      });

      if (response.ok) {
        setSelectedNotes(new Set());
        setIsBulkMode(false);
        if (selectedNoteId && selectedNotes.has(selectedNoteId)) {
          setSelectedNoteId(null);
          setShowNewNote(false);
        }
        await mutate();
      } else {
        const errorData = await response.json();
        console.error("Failed to delete notes:", errorData.error);
        alert("Failed to delete notes. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting notes:", error);
      alert("Error deleting notes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle creating a new note
  const handleCreateNewNote = () => {
    setSelectedNoteId(null);
    setShowNewNote(true);
    setIsBulkMode(false);
    setSelectedNotes(new Set());
  };

  // Handle note selection
  const handleNoteSelect = (noteId: string) => {
    if (isBulkMode) {
      const newSelected = new Set(selectedNotes);
      if (newSelected.has(noteId)) {
        newSelected.delete(noteId);
      } else {
        newSelected.add(noteId);
      }
      setSelectedNotes(newSelected);
    } else {
      setSelectedNoteId(noteId);
      setShowNewNote(false);
    }
  };

  // Handle bulk mode toggle
  const handleBulkModeToggle = () => {
    setIsBulkMode(!isBulkMode);
    setSelectedNotes(new Set());
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    const notesArray = notesResponse?.notes || [];

    if (notesArray.length === 0) return [];

    let filtered = notesArray;

    // Filter by content
    if (searchContent.trim() !== "") {
      filtered = filtered.filter((note: Note) =>
        note.content.toLowerCase().includes(searchContent.toLowerCase())
      );
    }

    // Filter by tag
    if (filterTag.trim() !== "") {
      filtered = filtered.filter((note: Note) =>
        note.tags.some((tag: string) => tag.toLowerCase() === filterTag.toLowerCase())
      );
    }

    return filtered;
  }, [notesResponse, searchContent, filterTag]);

  // Find the selected note object
  const selectedNote = useMemo(() => {
    if (!selectedNoteId || !filteredNotes) return null;
    return filteredNotes.find(note => note.id === selectedNoteId) || null;
  }, [selectedNoteId, filteredNotes]);

  // Show loading state if data is still loading
  if ((!notesResponse && !notesError) || (!calendarEvents && !calendarError && shouldFetch) || (!userSettings && !settingsError && shouldFetch)) {
    return <p>Loading notes and calendar events…</p>;
  }

  // Show error state if either notes or calendar events failed to load
  if (notesError || calendarError || settingsError) {
    return <p>Error loading data.</p>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-neutral-900">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Notes</h1>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isBulkMode 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
                onClick={handleBulkModeToggle}
              >
                {isBulkMode ? 'Cancel' : 'Select'}
              </button>
              <button
                className="btn-primary text-sm"
                onClick={handleCreateNewNote}
                disabled={isSaving}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Search notes..."
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
            />
          </div>

          {/* Tag Filter */}
          <select
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allAvailableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          {/* Bulk Actions */}
          {isBulkMode && selectedNotes.size > 0 && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700 dark:text-red-300">
                  {selectedNotes.size} note(s) selected
                </span>
                <button
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                  onClick={handleBulkDelete}
                  disabled={isSaving}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">No notes found</p>
                <button
                  className="btn-primary mt-4 text-sm"
                  onClick={handleCreateNewNote}
                >
                  Create your first note
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotes.map((note) => {
                  const title = note.title || note.content.split('\n')[0].replace(/^#+\s*/, '').trim() || "Untitled Note";
                  const preview = note.content.split('\n').slice(1).join('\n').substring(0, 80);
                  const isSelected = isBulkMode ? selectedNotes.has(note.id) : selectedNoteId === note.id;
                  
                  return (
                    <button
                      key={note.id}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-primary-100 dark:bg-primary-900 border border-primary-200 dark:border-primary-700'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                      onClick={() => handleNoteSelect(note.id)}
                      disabled={isSaving}
                    >
                      <div className="flex items-start gap-3">
                        {isBulkMode && (
                          <input
                            type="checkbox"
                            checked={selectedNotes.has(note.id)}
                            onChange={() => {}} // Handled by onClick
                            className="mt-1 flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate text-sm">
                            {title}
                          </div>
                          {preview && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                              {preview}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                            {note.tags.length > 0 && (
                              <div className="flex gap-1">
                                {note.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {note.tags.length > 2 && (
                                  <span className="px-1.5 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                                    +{note.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Editor */}
      <div className="flex-1 flex flex-col">
        {showNewNote ? (
          <div className="flex-1 overflow-hidden">
            <RichNoteEditor
              onSave={handleSaveNewNote}
              isSaving={isSaving}
              existingTags={allAvailableTags}
              isNewNote={true}
            />
          </div>
        ) : selectedNote ? (
          <div className="flex-1 overflow-hidden">
            <RichNoteEditor
              note={selectedNote}
              onSave={handleUpdateNote}
              onDelete={handleDeleteNote}
              isSaving={isSaving}
              existingTags={allAvailableTags}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 p-8">
            <div className="text-center max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-neutral-400 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Select a note to edit
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                Choose a note from the sidebar or create a new one to get started
              </p>
              <button
                className="btn-primary"
                onClick={handleCreateNewNote}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}