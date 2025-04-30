"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import AddNoteModal from "@/components/notes/AddNoteModal"; // Import the modal component
import NoteList from "@/components/notes/NoteList"; // Import NoteList component
import NoteDetail from "@/components/notes/NoteDetail"; // Import NoteDetail component
import type { GetNotesResponse } from "../api/notes/index"; // Import the API response type
import type { Note } from "@/types/app"; // Import shared Note type

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
  // Update useSWR type parameter to GetNotesResponse
  const { data: notesResponse, error, mutate } = useSWR<GetNotesResponse>(
    shouldFetch ? "/api/notes" : null,
    fetcher
  );

  // Log the fetched data and error for debugging
  console.log("Notes data:", notesResponse); // Use notesResponse
  console.log("Notes fetch error:", error);


  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [isSaving, setIsSaving] = useState(false); // State to indicate saving in progress

  // Extract unique tags from notes
  const uniqueTags = useMemo(() => {
    const tags = notesResponse?.notes?.flatMap(note => note.tags) || [];
    return Array.from(new Set(tags)).sort(); // Get unique tags and sort them
  }, [notesResponse]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null); // State for selected note ID

  const handleDeleteNote = async (noteId: string) => {
    setIsSaving(true); // Indicate saving/deleting in progress
    console.log("Attempting to delete note with ID:", noteId); // Add logging
    try {
      const response = await fetch(`/api/notes/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteId }),
      });

      if (response.ok) {
        console.log("Note deleted successfully!");
        mutate(); // Re-fetch notes to update the list
        setSelectedNoteId(null); // Deselect the note after deletion
      } else {
        const errorData = await response.json();
        console.error("Failed to delete note:", errorData.error);
        console.error("Delete API response status:", response.status); // Log response status
        // Optionally show an error message to the user
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      console.error("Error details:", error); // Log error object
       // Optionally show an error message to the user
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNote = async (note: { title: string; content: string; tags: string[] }) => {
    setIsSaving(true);
    try {
      // Note: The current API only supports content and tags, title is not saved.
      // If title needs to be saved, the API needs to be updated.
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: note.title, content: note.content, tags: note.tags }), // Include title
      });

      if (response.ok) {
        console.log("Note saved successfully!");
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

    console.log("Filtered notes computed:", filtered); // Log the computed filtered notes
    return filtered;
  }, [notesResponse, searchContent, filterTag]); // Update dependency to notesResponse

  // Find the selected note object
  const selectedNote = useMemo(() => {
    // filteredNotes is now an array of Note objects
    if (!selectedNoteId || !filteredNotes) return null;
    return filteredNotes.find(note => note.id === selectedNoteId) || null;
  }, [selectedNoteId, filteredNotes]);

  if (status === "loading") {
    return <p>Loading notes…</p>;
  }

  if (!session) {
    return <p>Please sign in to see your notes.</p>;
  }

  if (error) {
    return <p>Error loading notes.</p>;
  }

  const handleUpdateNote = async (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[]) => { // Include updatedTitle
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/update`, { // Assuming update endpoint is /api/notes/update
        method: "PUT", // Or PATCH, depending on API design
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteId, title: updatedTitle, content: updatedContent, tags: updatedTags }), // Include updatedTitle
      });

      if (response.ok) {
        console.log("Note updated successfully!");
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
    <div className="p-4 flex h-full"> {/* Use flex for two-column layout */}
      {/* Left Column: Note List */}
      <div className="w-80 border-r border-[var(--neutral-300)] pr-4 overflow-y-auto flex-shrink-0"> {/* Set a fixed width and prevent shrinking */}
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
          existingTags={uniqueTags} // Pass uniqueTags to the modal
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
             {uniqueTags.map(tag => (
               <option key={tag} value={tag}>{tag}</option>
             ))}
           </select>
        </div>

        {/* Render the NoteList component */}
        <NoteList
          notes={filteredNotes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
        />
      </div>

      {/* Right Column: Note Detail */}
      <div className="flex-1 p-6 overflow-y-auto"> {/* Increase padding */}
        {selectedNote ? (
          // Render the NoteDetail component if a note is selected
          <NoteDetail
            note={selectedNote}
            onSave={handleUpdateNote}
            onDelete={handleDeleteNote} // Pass the delete handler
            isSaving={isSaving} // Pass isSaving state
            existingTags={uniqueTags} // Pass uniqueTags to NoteDetail
          />
        ) : (
          <p className="text-[var(--neutral-500)]">Select a note to view details.</p>
        )}
      </div>
    </div>
  );
}