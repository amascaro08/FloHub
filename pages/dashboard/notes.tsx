"use client";

import { useState, useMemo, useEffect } from "react";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import AddNoteModal from "@/components/notes/AddNoteModal"; // Import the modal component
import NoteList from "@/components/notes/NoteList"; // Import NoteList component
import NoteDetail from "@/components/notes/NoteDetail"; // Import NoteDetail component
import type { GetNotesResponse } from "../api/notes/index"; // Import the API response type
import type { Note, UserSettings } from "@/types/app"; // Import shared Note and UserSettings types

// Define a type for calendar items based on the API response
type CalendarItem = {
  id: string;
  summary: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());


export default function NotesPage() {
  const sessionHookResult = useSession();
  const session = sessionHookResult?.data ? sessionHookResult.data : null;
  const status = sessionHookResult?.status || "unauthenticated";
  const router = useRouter();

  // Handle loading state
  if (status === 'loading') {
    return <p className="text-center p-8">Loading notes...</p>;
  }

  // Handle unauthenticated state
  if (status !== 'authenticated' || !session) {
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
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [isSaving, setIsSaving] = useState(false); // State to indicate saving in progress
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]); // State for selected notes for deletion

  // Use only global tags from settings
  const allAvailableTags = useMemo(() => {
    return userSettings?.globalTags?.sort() || []; // Get global tags and sort them
  }, [userSettings]); // Dependency array includes userSettings

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null); // State for selected note ID

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

    setIsSaving(true); // Indicate saving/deleting in progress
    try {
      // Assuming your delete API can handle multiple IDs or you make multiple calls
      // For now, let's assume the API can take an array of IDs
      const response = await fetch(`/api/notes/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedNotes }), // Send array of IDs
      });

      if (response.ok) {
        mutate(); // Re-fetch notes to update the list
        setSelectedNoteId(null); // Deselect any currently selected note
        setSelectedNotes([]); // Clear selected notes after deletion
      } else {
        console.error("Failed to delete selected notes. Status:", response.status); // Log response status
        try {
          const errorData = await response.json();
          console.error("Error details:", errorData.error);
        } catch (jsonError) {
          console.error("Could not parse error response as JSON:", jsonError);
        }
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error deleting selected notes:", error);
      console.error("Error details:", error); // Log error object
       // Optionally show an error message to the user
    } finally {
      setIsSaving(false);
    }
  };

  // Placeholder function for exporting selected notes as PDF
  const handleExportSelected = async () => {
    if (selectedNotes.length === 0) return;

    setIsSaving(true); // Indicate saving/exporting in progress
    try {
      const response = await fetch("/api/notes/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedNotes }),
      });

      if (response.ok) {
        // Assuming the backend sends the PDF as a Blob
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "exported_notes.pdf"; // Set the desired filename
        document.body.appendChild(a);
        a.click();
        a.remove(); // Clean up the element
        window.URL.revokeObjectURL(url); // Free up memory
      } else {
        console.error("Failed to export notes. Status:", response.status);
        try {
          const errorData = await response.json();
          console.error("Error details:", errorData.error);
        } catch (jsonError) {
          console.error("Could not parse error response as JSON:", jsonError);
        }
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error exporting notes:", error);
      // Optionally show an error message to the user
    } finally {
      setIsSaving(false);
    }
  };


  // Update handleSaveNote to include new fields
  const handleSaveNote = async (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean }) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Include all relevant fields in the body
        body: JSON.stringify({
          title: note.title,
          content: note.content,
          tags: note.tags,
          eventId: note.eventId,
          eventTitle: note.eventTitle,
          isAdhoc: note.isAdhoc,
        }),
      });

      if (response.ok) {
        mutate(); // Re-fetch notes to update the list
      } else {
        const errorData = await response.json();
        console.error("Failed to save note:", errorData.error);
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error saving note:", error);
       // Optionally show an error message to the user
    } finally {
      setIsSaving(false);
    }
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

  // Update handleUpdateNote to include new fields
  const handleUpdateNote = async (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean) => { // Include new fields
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/update`, { // Assuming update endpoint is /api/notes/update
        method: "PUT", // Or PATCH, depending on API design
        headers: { "Content-Type": "application/json" },
        // Include all relevant fields in the body
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
        mutate(); // Re-fetch notes to update the list
      } else {
        const errorData = await response.json();
        console.error("Failed to update note:", errorData.error);
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error updating note:", error);
       // Optionally show an error message to the user
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="p-4 flex flex-col md:flex-row h-full"> {/* Use flex-col on mobile, flex-row on medium and up */}
      {/* Left Column: Note List */}
      <div className="w-full md:w-80 border-r md:border-r-[var(--neutral-300)] pr-4 overflow-y-auto flex-shrink-0 mb-4 md:mb-0"> {/* Adjust width and add bottom margin for mobile */}
        <h1 className="text-2xl font-semibold mb-4">Notes</h1>

        <button
          className="btn-primary mb-4 w-full flex items-center justify-center" // Use btn-primary class and make button full width
          onClick={() => setShowModal(true)} // Open modal on button click
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Note
        </button>

        {/* Add the modal component */}
        <AddNoteModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveNote}
          isSaving={isSaving}
          existingTags={allAvailableTags} // Pass allAvailableTags to the modal
        />


        <div className="flex gap-4 mb-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="input-modern pl-10" // Use input-modern class with padding for the icon
              placeholder="Search note content…"
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
            />
          </div>
          <select
            className="input-modern"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allAvailableTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {/* Render the NoteList component */}
        <NoteList
          notes={filteredNotes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          selectedNotes={selectedNotes} // Pass selected notes state
          onToggleSelectNote={handleToggleSelectNote} // Pass toggle select handler
          onDeleteSelected={handleDeleteSelected} // Pass delete selected handler
        />
        {selectedNotes.length > 0 && (
          <button
            className="btn-secondary mt-4 w-full flex items-center justify-center" // Use btn-secondary class
            onClick={handleExportSelected} // Call the export handler
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
            Export Selected as PDF ({selectedNotes.length})
          </button>
        )}
      </div>

      {/* Right Column: Note Detail */}
      <div className="flex-1 p-6 overflow-y-auto"> {/* Increase padding */}
        {selectedNote ? (
          // Render the NoteDetail component if a note is selected
          <NoteDetail
            note={selectedNote}
            onSave={handleUpdateNote}
            onDelete={handleDeleteSelected} // Pass the delete handler (consider if this should delete single or selected)
            isSaving={isSaving} // Pass isSaving state
            existingTags={allAvailableTags} // Pass allAvailableTags to NoteDetail
          />
        ) : (
          <p className="text-[var(--neutral-500)]">Select a note to view details.</p>
        )}
      </div>
    </div>
  );
}