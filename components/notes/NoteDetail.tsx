"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Note } from "@/types/app"; // Import shared Note type
import CreatableSelect from 'react-select/creatable';

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
  const [tags, setTags] = useState(note.tags);

  useEffect(() => {
    setTitle(note.title || "");
    setContent(note.content);
    setTags(note.tags);
  }, [note]);

  // Convert existingTags to options for select
  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));

  // State for selected options in react-select format
  const [selectedOptions, setSelectedOptions] = useState(
    tags.map(tag => ({ value: tag, label: tag }))
  );

  useEffect(() => {
    setSelectedOptions(tags.map(tag => ({ value: tag, label: tag })));
  }, [tags]);

  const handleTagChange = (selected: any) => {
    setSelectedOptions(selected || []);
    setTags((selected || []).map((option: any) => option.value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    await onSave(note.id, title, content, tags);
  };

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Title input */}
      <div>
        <label htmlFor="note-detail-title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Title</label>
        <input
          type="text"
          id="note-detail-title"
          className="input-modern text-xl font-semibold"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSaving}
          placeholder="Note Title"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
        <div>
          <label htmlFor="note-content" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              Content
            </span>
          </label>
          <textarea
            id="note-content"
            className="input-modern flex-1"
            rows={10}
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSaving}
          />
        </div>
        
        <div>
          <label htmlFor="note-tags" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Tags
            </span>
          </label>
          <CreatableSelect
            isMulti
            options={tagOptions}
            value={selectedOptions}
            onChange={handleTagChange}
            isDisabled={isSaving}
            isSearchable
            placeholder="Select or create tags..."
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

        <div className="flex flex-wrap justify-between items-center gap-3 mt-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">
          {/* Created date */}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Created: {new Date(note.createdAt).toLocaleString()}
          </p>
          
          <div className="flex flex-wrap gap-2 ml-auto">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                onClick={() => onDelete(note.id)}
                disabled={isSaving}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center"
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
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}