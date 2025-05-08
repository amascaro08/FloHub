"use client";

import { useState, FormEvent } from "react";
import CreatableSelect from 'react-select/creatable';

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    await onSave({ title, content, tags: selectedTags });

    // Clear form after saving (assuming onSave handles the actual API call and success)
    setTitle("");
    setContent("");
    setSelectedTags([]);
    onClose(); // Close modal after saving
  };

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));

  const handleTagChange = (selectedOptions: any, actionMeta: any) => {
    if (actionMeta.action === 'create-option') {
      setSelectedTags([...selectedTags, actionMeta.option.value]);
    } else {
      setSelectedTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] p-5 md:p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-700 animate-slide-up">
        <h2 className="text-xl font-semibold mb-5 pb-2 border-b border-neutral-200 dark:border-neutral-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          Add New Note
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="note-title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Title</label>
            <input
              type="text"
              id="note-title"
              className="input-modern"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              placeholder="Note title"
            />
          </div>
          <div>
            <label htmlFor="note-content" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Content
            </label>
            <textarea
              id="note-content"
              className="input-modern"
              rows={4}
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="note-tags" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Tags
            </label>
            <CreatableSelect
              isMulti
              options={tagOptions}
              onChange={handleTagChange}
              placeholder="Select or create tags..."
              isDisabled={isSaving}
              isSearchable
              classNamePrefix="react-select"
              theme={(theme) => ({
                ...theme,
                colors: {
                  ...theme.colors,
                  primary: '#14B8A6',
                  primary25: '#99F6E4',
                },
              })}
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-primary flex items-center justify-center ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}