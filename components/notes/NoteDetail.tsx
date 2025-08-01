"use client";

import { useState, useEffect, FormEvent } from "react";
import type { Note } from "@/types/app";
import CreatableSelect from 'react-select/creatable';
import RichTextEditor from '../journal/RichTextEditor';
import { 
  TagIcon, 
  ClockIcon, 
  TrashIcon, 
  CheckIcon 
} from '@heroicons/react/24/solid';

type NoteDetailProps = {
  note: Note;
  onSave: (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[]) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  isSaving: boolean;
  existingTags: string[];
};

export default function NoteDetail({ note, onSave, onDelete, isSaving, existingTags }: NoteDetailProps) {
  const [title, setTitle] = useState(note.title || "");
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
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="border-b border-neutral-200/50 dark:border-neutral-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <input
                type="text"
                id="note-detail-title"
                className="w-full text-2xl font-bold bg-transparent border-none outline-none resize-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
                placeholder="Untitled Note..."
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  <TagIcon className="w-4 h-4 inline mr-1" />
                  Tags
                </label>
                <CreatableSelect
                  isMulti
                  options={tagOptions}
                  value={selectedOptions}
                  onChange={handleTagChange}
                  isDisabled={isSaving}
                  isSearchable
                  placeholder="Add tags..."
                  classNamePrefix="react-select"
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      border: '1px solid rgb(203 213 225)',
                      borderRadius: '1rem',
                      minHeight: '40px',
                      fontSize: '0.875rem',
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999,
                    }),
                    multiValue: (base) => ({
                      ...base,
                      backgroundColor: 'rgb(240 253 250)',
                      borderRadius: '0.5rem',
                    }),
                    multiValueLabel: (base) => ({
                      ...base,
                      color: 'rgb(13 148 136)',
                      fontSize: '0.75rem',
                    }),
                    multiValueRemove: (base) => ({
                      ...base,
                      color: 'rgb(13 148 136)',
                      ':hover': {
                        backgroundColor: 'rgb(13 148 136)',
                        color: 'white',
                      },
                    }),
                  }}
                  theme={(theme) => ({
                    ...theme,
                    colors: {
                      ...theme.colors,
                      primary: '#0D9488',
                      primary25: '#F0FDF9',
                    },
                  })}
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                  onClick={() => onDelete(note.id)}
                  disabled={isSaving}
                  title="Delete note"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
                
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Rich Text Editor */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start writing your note..."
          />
        </div>
      </div>

      {/* Footer with metadata */}
      <div className="border-t border-neutral-200/50 dark:border-neutral-700/50 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-3 h-3" />
              <span>Created: {new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          {content && (
            <div className="text-xs">
              {content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length} words
            </div>
          )}
        </div>
      </div>
    </div>
  );
}