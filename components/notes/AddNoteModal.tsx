"use client";

import { useState, FormEvent } from "react";

type AddNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; tags: string[] }) => Promise<void>;
  isSaving: boolean;
  existingTags: string[]; // Add existingTags prop
};

export default function AddNoteModal({ isOpen, onClose, onSave, isSaving, existingTags }: AddNoteModalProps) { // Receive existingTags prop
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    const tags = tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag !== "");

    await onSave({ title, content, tags });

    // Clear form after saving (assuming onSave handles the actual API call and success)
    setTitle("");
    setContent("");
    setTagsInput("");
    onClose(); // Close modal after saving
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="glass p-6 rounded-xl shadow-elevate-sm w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add New Note</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="note-title" className="block text-sm font-medium text-[var(--fg)] mb-1">Title</label>
            <input
              type="text"
              id="note-title"
              className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="note-content" className="block text-sm font-medium text-[var(--fg)] mb-1">Content</label>
            <textarea
              id="note-content"
              className="w-full border border-[var(--neutral-300)] px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--fg)] bg-transparent"
              rows={4}
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
          {/* Display existing tags */}
          {existingTags && existingTags.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-[var(--fg)] mb-1">Existing Tags:</p>
              <div className="flex flex-wrap gap-1">
                {existingTags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-primary-200 text-primary-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded border border-[var(--neutral-300)] hover:bg-[var(--neutral-200)] transition"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}