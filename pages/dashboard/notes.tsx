
import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import NoteList from "@/components/notes/NoteList";
import NoteDetail from "@/components/notes/NoteDetail";
import type { GetNotesResponse } from "../api/notes/index";
import type { Note, UserSettings } from "@/types/app";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  TagIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full mx-auto mb-4"></div>
          <p className="text-grey-tint">Loading your notes...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-grey-tint">Please sign in to access your notes.</p>
        </div>
      </div>
    );
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

  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Use only global tags from settings
  const allAvailableTags = useMemo(() => {
    return userSettings?.globalTags?.sort() || [];
  }, [userSettings]);

  // Function to handle toggling selection of a note for deletion
  const handleToggleSelectNote = (noteId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedNotes([...selectedNotes, noteId]);
    } else {
      setSelectedNotes(selectedNotes.filter((id) => id !== noteId));
    }
  };

  // Function to handle deleting selected notes
  const handleDeleteSelected = async () => {
    if (selectedNotes.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedNotes }),
      });

      if (response.ok) {
        mutate();
        setSelectedNoteId(null);
        setSelectedNotes([]);
      } else {
        console.error("Failed to delete selected notes. Status:", response.status);
        try {
          const errorData = await response.json();
          console.error("Error details:", errorData.error);
        } catch (jsonError) {
          console.error("Could not parse error response as JSON:", jsonError);
        }
      }
    } catch (error) {
      console.error("Error deleting selected notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Placeholder function for exporting selected notes as PDF
  const handleExportSelected = async () => {
    if (selectedNotes.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/notes/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedNotes }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "exported_notes.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Failed to export notes. Status:", response.status);
        try {
          const errorData = await response.json();
          console.error("Error details:", errorData.error);
        } catch (jsonError) {
          console.error("Could not parse error response as JSON:", jsonError);
        }
      }
    } catch (error) {
      console.error("Error exporting notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // OneNote-style note creation - immediately create and open new note
  const handleCreateNewNote = async () => {
    if (isCreatingNote) return;
    
    setIsCreatingNote(true);
    setIsSaving(true);
    
    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "",
          content: "<p></p>", // Provide minimal HTML content for the rich text editor
          tags: [],
          isAdhoc: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh the notes list and wait for it to complete
        const refreshedData = await mutate();
        
        // Select the new note with a small delay to ensure data is available
        if (result.noteId) {
          // Small delay to ensure the mutated data is available
          setTimeout(() => {
            setSelectedNoteId(result.noteId);
          }, 150);
        }
      } else {
        const errorData = await response.json();
        console.error("Failed to create note:", errorData.error);
      }
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setIsSaving(false);
      setIsCreatingNote(false);
    }
  };

  const filteredNotes = useMemo(() => {
    const notesArray = notesResponse?.notes || [];

    if (notesArray.length === 0) return [];

    let filtered = notesArray;

    // Filter by content
    if (searchContent.trim() !== "") {
      filtered = filtered.filter((note: Note) =>
        note.content.toLowerCase().includes(searchContent.toLowerCase()) ||
        note.title?.toLowerCase().includes(searchContent.toLowerCase())
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full mx-auto mb-4"></div>
          <p className="text-grey-tint">Loading your notes...</p>
        </div>
      </div>
    );
  }

  // Show error state if either notes or calendar events failed to load
  if (notesError || calendarError || settingsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-grey-tint">Error loading your notes. Please try again.</p>
        </div>
      </div>
    );
  }

  // Update handleUpdateNote to include new fields
  const handleUpdateNote = async (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noteId,
          title: updatedTitle,
          content: updatedContent,
          tags: updatedTags,
          eventId: updatedEventId,
          eventTitle: updatedEventTitle,
          isAdhoc: updatedIsAdhoc,
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

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="border-b border-neutral-200/50 dark:border-neutral-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-sm">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notes</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleCreateNewNote}
              disabled={isCreatingNote}
              className="btn-primary flex items-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {isCreatingNote ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <PlusIcon className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isCreatingNote ? 'Creating...' : 'New Note'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-81px)]"> {/* Adjust height for header */}
        {/* Sidebar */}
        <div className={`${isMobile && selectedNote ? 'hidden' : 'flex'} flex-col bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-r border-neutral-200/50 dark:border-neutral-700/50 ${isMobile ? 'w-full' : 'w-80 flex-shrink-0'}`}>
          {/* Search and Filter */}
          <div className="p-4 border-b border-neutral-200/50 dark:border-neutral-700/50">
            <div className="space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  className="input-modern pl-11 text-sm"
                  placeholder="Search notes..."
                  value={searchContent}
                  onChange={(e) => setSearchContent(e.target.value)}
                />
              </div>
              
              <div className="relative">
                <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10 flex-shrink-0" />
                <select
                  className="input-modern pl-11 text-sm appearance-none"
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
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <NoteList
                notes={filteredNotes}
                selectedNoteId={selectedNoteId}
                onSelectNote={setSelectedNoteId}
                selectedNotes={selectedNotes}
                onToggleSelectNote={handleToggleSelectNote}
                onDeleteSelected={handleDeleteSelected}
              />
              
              {selectedNotes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <button
                    className="btn-secondary w-full flex items-center justify-center space-x-2 text-sm"
                    onClick={handleExportSelected}
                    disabled={isSaving}
                  >
                    <ArchiveBoxIcon className="w-4 h-4" />
                    <span>Export Selected ({selectedNotes.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col ${isMobile && !selectedNote ? 'hidden' : ''}`}>
          {selectedNote ? (
            <>
              {/* Mobile back button */}
              {isMobile && (
                <div className="p-4 border-b border-neutral-200/50 dark:border-neutral-700/50 bg-white/90 dark:bg-slate-800/90">
                  <button
                    onClick={() => setSelectedNoteId(null)}
                    className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back to Notes</span>
                  </button>
                </div>
              )}
              
              {/* Note Detail */}
              <div className="flex-1 overflow-hidden">
                <NoteDetail
                  note={selectedNote}
                  onSave={handleUpdateNote}
                  onDelete={handleDeleteSelected}
                  isSaving={isSaving}
                  existingTags={allAvailableTags}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50/20 dark:from-slate-800 dark:to-slate-900">
              <div className="text-center max-w-md px-8">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <SparklesIcon className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Ready to capture your thoughts?
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Click "New Note" to start writing with our rich text editor and slash commands.
                </p>
                <button
                  onClick={handleCreateNewNote}
                  disabled={isCreatingNote}
                  className="btn-primary flex items-center space-x-2 mx-auto disabled:opacity-50"
                >
                  {isCreatingNote ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <PlusIcon className="w-4 h-4" />
                  )}
                  <span>{isCreatingNote ? 'Creating Note...' : 'Create Your First Note'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}