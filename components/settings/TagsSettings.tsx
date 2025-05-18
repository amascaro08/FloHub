import React from 'react';
import { UserSettings } from '../../types/app';

interface TagsSettingsProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

const TagsSettings: React.FC<TagsSettingsProps> = ({
  settings,
  setSettings
}) => {
  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Global Tags</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Add a new tag"
            id="newTagInput"
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement;
                const newTag = input.value.trim();
                if (newTag && !settings.globalTags.includes(newTag)) {
                  setSettings(s => ({
                    ...s,
                    globalTags: [...s.globalTags, newTag]
                  }));
                  input.value = ''; // Clear input
                }
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById('newTagInput') as HTMLInputElement;
              const newTag = input.value.trim();
              if (newTag && !settings.globalTags.includes(newTag)) {
                setSettings(s => ({
                  ...s,
                  globalTags: [...s.globalTags, newTag]
                }));
                input.value = ''; // Clear input
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Add Tag
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.globalTags.map(tag => (
            <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center gap-1">
              {tag}
              <button
                onClick={() => setSettings(s => ({
                  ...s,
                  globalTags: s.globalTags.filter(t => t !== tag)
                }))}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-1"
                aria-label={`Remove ${tag} tag`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TagsSettings;