"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Note } from "@/types/app"; // Import shared Note type

type NoteDetailProps = {
  note: Note;
  onSave: (noteId: string, updatedContent: string, updatedTags: string[]) => Promise<void>;
  isSaving: boolean;
};

export default function NoteDetail({ note, onSave, isSaving }: NoteDetailProps) {
  const [content, setContent] = useState(note.content);
  const [tagsInput, setTagsInput] = useState(note.tags.join(", ")); // Join tags for input

  // Update state when a different note is selected
  useEffect(() => {
    setContent(note.content);
    setTagsInput(note.tags.join(", "));
  }, [note]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    const tags = tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag !== "");

    await onSave(note.id, content, tags);
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4">{note.content.substring(0, 50)}...</h2> {/* Display truncated content as title */}
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
          <label htmlFor="note-tags" className="block text-sm font-medium text-[var(--fg)] mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            id="note-tags"
            className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="flex justify-end">
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