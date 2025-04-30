"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Note } from "@/types/app"; // Import shared Note type

type NoteDetailProps = {
  note: Note;
  onSave: (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[]) => Promise<void>; // Include updatedTitle
  onDelete: (noteId: string) => Promise<void>; // Add onDelete prop
  isSaving: boolean;
  existingTags: string[]; // Add existingTags to props
};

export default function NoteDetail({ note, onSave, onDelete, isSaving, existingTags }: NoteDetailProps) { // Destructure existingTags
  const [title, setTitle] = useState(note.title || ""); // Add state for title
  const [content, setContent] = useState(note.content);
  const [selectedTag, setSelectedTag] = useState(note.tags[0] || ""); // State for selected tag (assuming single select for now)

  // Update state when a different note is selected
  useEffect(() => {
    setTitle(note.title || ""); // Update title state
    setContent(note.content);
    setSelectedTag(note.tags[0] || ""); // Update selected tag state
  }, [note]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    const tags = selectedTag ? [selectedTag] : []; // Use selectedTag for tags (assuming single select)

    await onSave(note.id, title, content, tags); // Include title in onSave call
  };

  return (
    <div className="flex flex-col h-full">
      {/* Add input for title */}
      <div className="mb-4">
        <label htmlFor="note-detail-title" className="block text-sm font-medium text-[var(--fg)] mb-1">Title</label>
        <input
          type="text"
          id="note-detail-title"
          className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent text-xl font-semibold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          placeholder="Note Title"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1"> {/* Use flex-1 to make form take available space */}
        <div>
          <label htmlFor="note-content" className="block text-sm font-medium text-[var(--fg)] mb-1">Content</label>
          <textarea
            id="note-content"
            className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent flex-1" // Use flex-1 to make textarea grow
            rows={10} // Adjust rows as needed
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div>
          <label htmlFor="note-tags" className="block text-sm font-medium text-[var(--fg)] mb-1">Tag</label> {/* Change label */}
          <select // Use select dropdown for tags
            id="note-tags"
            className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            disabled={isSaving}
          >
            <option value="">No Tag</option> {/* Option for no tag */}
            {existingTags.map(tag => ( // Populate with existing tags
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2"> {/* Add gap for spacing */}
          <button
            type="button" // Change type to button to prevent form submission
            className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => onDelete(note.id)} // Call onDelete with note ID
            disabled={isSaving}
          >
            Delete Note
          </button>
          <button
            type="submit"
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
      <p className="text-xs text-[var(--neutral-500)] mt-4">
        Created: {new Date(note.createdAt).toLocaleString()}
      </p>
    </div>
  );
}