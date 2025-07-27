"use client";

import { useState, FormEvent } from "react";
import CreatableSelect from 'react-select/creatable';
import RichTextEditor from '../journal/RichTextEditor';
import { 
  XMarkIcon, 
  PlusIcon, 
  TagIcon,
  DocumentTextIcon 
} from '@heroicons/react/24/solid';

type AddNoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; tags: string[] }) => Promise<void>;
  isSaving: boolean;
  existingTags: string[];
};

export default function AddNoteModal({ isOpen, onClose, onSave, isSaving, existingTags }: AddNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSaving) return;

    await onSave({ title, content, tags: selectedTags });

    // Clear form after saving
    setTitle("");
    setContent("");
    setSelectedTags([]);
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setSelectedTags([]);
    onClose();
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-neutral-200/50 dark:border-neutral-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200/50 dark:border-neutral-700/50 bg-gradient-to-r from-primary-50 to-accent-50/30 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Note</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Write your thoughts with rich formatting</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
            disabled={isSaving}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(90vh-120px)]">
          {/* Title and Tags */}
          <div className="p-6 border-b border-neutral-200/50 dark:border-neutral-700/50 space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="note-title" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Title
              </label>
              <input
                type="text"
                id="note-title"
                className="w-full text-lg font-semibold bg-transparent border border-neutral-200 dark:border-neutral-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-white"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
                placeholder="Give your note a title..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                <TagIcon className="w-4 h-4 inline mr-1" />
                Tags
              </label>
              <CreatableSelect
                isMulti
                options={tagOptions}
                onChange={handleTagChange}
                placeholder="Add tags to organize your note..."
                isDisabled={isSaving}
                isSearchable
                classNamePrefix="react-select"
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    border: '1px solid rgb(203 213 225)',
                    borderRadius: '0.75rem',
                    minHeight: '44px',
                    fontSize: '0.875rem',
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
          </div>

          {/* Rich Text Editor */}
          <div className="flex-1 overflow-hidden">
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your note... Use the toolbar above to format your text."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-neutral-200/50 dark:border-neutral-700/50 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-all duration-200"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              disabled={isSaving || !content.trim()}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}