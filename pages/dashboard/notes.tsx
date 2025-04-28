"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import AddNoteModal from "@/components/notes/AddNoteModal"; // Import the modal component

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Note = {
  id: string;
  content: string;
  tags: string[];
  createdAt: string; // Use string for simplicity in display, can format later
};

export default function NotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const shouldFetch = status === "authenticated";
  const { data: notes, error, mutate } = useSWR<Note[]>( // Destructure mutate
    shouldFetch ? "/api/notes" : null,
    fetcher
  );

  // Log the fetched data and error for debugging
  console.log("Notes data:", notes);
  console.log("Notes fetch error:", error);


  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [isSaving, setIsSaving] = useState(false); // State to indicate saving in progress

  const handleSaveNote = async (note: { title: string; content: string; tags: string[] }) => {
    setIsSaving(true);
    try {
      // Note: The current API only supports content and tags, title is not saved.
      // If title needs to be saved, the API needs to be updated.
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.content, tags: note.tags }),
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
    if (!notes) return [];

    let filtered = notes;

    // Filter by content
    if (searchContent.trim() !== "") {
      filtered = filtered.filter((note) =>
        note.content.toLowerCase().includes(searchContent.toLowerCase())
      );
    }

    // Filter by tag
    if (filterTag.trim() !== "") {
      filtered = filtered.filter((note) =>
        note.tags.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()))
      );
    }

    return filtered;
  }, [notes, searchContent, filterTag]);

  if (status === "loading") {
    return <p>Loading notes…</p>;
  }

  if (!session) {
    return <p>Please sign in to see your notes.</p>;
  }

  if (error) {
    return <p>Error loading notes.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Notes</h1>

      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
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
      />


      <div className="flex gap-4 mb-4">
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Search note content…"
          value={searchContent}
          onChange={(e) => setSearchContent(e.target.value)}
        />
         <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Filter by tag…"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
        />
      </div>


      <div className="space-y-4">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            // Render a simple test element for each note
            <div key={note.id} className="border border-red-500 p-2 mb-2">
              Test Note: {note.id}
            </div>
          ))
        ) : (
          <p className="text-[var(--neutral-500)]">No notes found.</p>
        )}
      </div>
    </div>
  );
}