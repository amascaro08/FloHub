"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
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
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

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

  // Show loading state if either notes or calendar events are loading
  if (status === "loading" || (!notesResponse && !notesError) || (!calendarEvents && !calendarError && shouldFetch) || (!userSettings && !settingsError && shouldFetch)) { // Add userSettings loading check
    return <p>Loading notes and calendar events…</p>;
  }

  if (!session) {
    return <p>Please sign in to see your notes.</p>;
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
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4 w-full" // Make button full width
          onClick={() => setShowModal(true)} // Open modal on button click
        >
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
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-[var(--fg)] leading-tight focus:outline-none focus:shadow-outline bg-transparent" // Use theme color and transparent background
            placeholder="Search note content…"
            value={searchContent}
            onChange={(e) => setSearchContent(e.target.value)}
          />
           {/* Replace input with select dropdown for tags */}
           <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-[var(--fg)] leading-tight focus:outline-none focus:shadow-outline bg-transparent" // Use theme color and transparent background
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
           >
             <option value="">All Tags</option> {/* Option to show all notes */}
             {allAvailableTags.map(tag => ( // Use allAvailableTags for filter
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
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4 w-full" // Add margin top and make button full width
            onClick={handleExportSelected} // Call the export handler
          >
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