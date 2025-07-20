
import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import RichNoteEditor from "@/components/notes/RichNoteEditor";
import type { GetNotesResponse } from "../api/notes/index"; // Import the API response type
import type { Note, UserSettings } from "@/types/app"; // Import shared Note and UserSettings types

// Define a type for calendar items based on the API response
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
    // Redirect to login or show a message
    // For now, showing a message
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

  // Log the fetched data and errors for debugging


  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [isSaving, setIsSaving] = useState(false); // State to indicate saving in progress
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null); // State for selected note ID
  const [showNewNote, setShowNewNote] = useState(false);

  // Use only global tags from settings
  const allAvailableTags = useMemo(() => {
    return userSettings?.globalTags?.sort() || []; // Get global tags and sort them
  }, [userSettings]); // Dependency array includes userSettings

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
        // Clear the selected note first
        setSelectedNoteId(null);
        setShowNewNote(false);
        // Then refresh the data
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

  // Handle creating a new note
  const handleCreateNewNote = () => {
    setSelectedNoteId(null);
    setShowNewNote(true);
  };

  const filteredNotes = useMemo(() => {
    // Extract the notes array from the fetched data
    const notesArray = notesResponse?.notes || [];

    if (notesArray.length === 0) return [];

    let filtered = notesArray;

    // Filter by content
    if (searchContent.trim() !== "") {
      filtered = filtered.filter((note: Note) => // Explicitly type note
        note.content.toLowerCase().includes(searchContent.toLowerCase())
      );
    }

    // Filter by tag
    if (filterTag.trim() !== "") {
      filtered = filtered.filter((note: Note) => // Explicitly type note
        note.tags.some((tag: string) => tag.toLowerCase() === filterTag.toLowerCase()) // Exact match for tag filter
      );
    }


    return filtered;
  }, [notesResponse, searchContent, filterTag]); // Update dependency to notesResponse

  // Find the selected note object
  const selectedNote = useMemo(() => {
    // filteredNotes is now an array of Note objects
    if (!selectedNoteId || !filteredNotes) return null;
    return filteredNotes.find(note => note.id === selectedNoteId) || null;
  }, [selectedNoteId, filteredNotes]);

  // Show loading state if data is still loading
  if ((!notesResponse && !notesError) || (!calendarEvents && !calendarError && shouldFetch) || (!userSettings && !settingsError && shouldFetch)) {
    return <p>Loading notes and calendar events…</p>;
  }

  // Show error state if either notes or calendar events failed to load
  if (notesError || calendarError || settingsError) { // Add settingsError check
    return <p>Error loading data.</p>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 p-4 bg-white dark:bg-neutral-900 flex-shrink-0">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100">Notes</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Write, organize, and collaborate on your ideas
            </p>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            <button
              className="btn-secondary"
              onClick={handleCreateNewNote}
              disabled={isSaving}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">New Note</span>
            </button>
          </div>
        </div>

        {/* Search and filter - Much larger search bar */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="input-modern pl-12 w-full h-12 text-base"
              placeholder="Search notes..."
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
            />
          </div>
          <select
            className="input-modern flex-shrink-0 h-12 text-base w-48"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allAvailableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Note list */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex-shrink-0">
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-neutral-500 dark:text-neutral-400">No notes found</p>
                  <button
                    className="btn-primary mt-4"
                    onClick={handleCreateNewNote}
                  >
                    Create your first note
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotes.map((note) => {
                    const title = note.title || note.content.split('\n')[0].replace(/^#+\s*/, '').trim() || "Untitled Note";
                    const preview = note.content.split('\n').slice(1).join('\n').substring(0, 100);
                    
                    return (
                      <button
                        key={note.id}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedNoteId === note.id
                            ? 'bg-primary-100 dark:bg-primary-900 border border-primary-200 dark:border-primary-700'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                        onClick={() => {
                          setSelectedNoteId(note.id);
                          setShowNewNote(false);
                        }}
                        disabled={isSaving}
                      >
                        <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {title}
                        </div>
                        {preview && (
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
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
                                  className="px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {note.tags.length > 2 && (
                                <span className="px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                                  +{note.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main editor area */}
        <div className="flex-1 bg-white dark:bg-neutral-900 min-h-0 flex flex-col overflow-hidden">
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
            <div className="flex items-center justify-center flex-1 p-4">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 md:h-16 md:w-16 text-neutral-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-base md:text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Select a note to edit
                </h3>
                <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 mb-4">
                  Choose a note from the sidebar or create a new one
                </p>
                <button
                  className="btn-primary"
                  onClick={handleCreateNewNote}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}