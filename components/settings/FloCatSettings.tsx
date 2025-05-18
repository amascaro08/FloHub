import React from 'react';
import { UserSettings } from '../../types/app';

interface FloCatSettingsProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  newPersonalityKeyword: string;
  setNewPersonalityKeyword: React.Dispatch<React.SetStateAction<string>>;
}

const FloCatSettings: React.FC<FloCatSettingsProps> = ({
  settings,
  setSettings,
  newPersonalityKeyword,
  setNewPersonalityKeyword
}) => {
  return (
    <div className="space-y-6">
      {/* FloCat Communication Style */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">FloCat Communication Style</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Choose how FloCat communicates with you across the application, including at-a-glance summaries, meeting notes, and direct interactions.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="floCatStyle"
                value="default"
                checked={settings.floCatStyle === "default"}
                onChange={() => setSettings(s => ({ ...s, floCatStyle: "default" }))}
                className="h-4 w-4 text-blue-500"
              />
              <div>
                <span className="text-gray-900 dark:text-gray-100 font-medium">Default</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Friendly and helpful with a touch of cat personality</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="floCatStyle"
                value="more_catty"
                checked={settings.floCatStyle === "more_catty"}
                onChange={() => setSettings(s => ({ ...s, floCatStyle: "more_catty" }))}
                className="h-4 w-4 text-blue-500"
              />
              <div>
                <span className="text-gray-900 dark:text-gray-100 font-medium">More Catty</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Extra playful with lots of cat puns and personality</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="floCatStyle"
                value="less_catty"
                checked={settings.floCatStyle === "less_catty"}
                onChange={() => setSettings(s => ({ ...s, floCatStyle: "less_catty" }))}
                className="h-4 w-4 text-blue-500"
              />
              <div>
                <span className="text-gray-900 dark:text-gray-100 font-medium">Less Catty</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Helpful and friendly with minimal cat references</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="floCatStyle"
                value="professional"
                checked={settings.floCatStyle === "professional"}
                onChange={() => setSettings(s => ({ ...s, floCatStyle: "professional" }))}
                className="h-4 w-4 text-blue-500"
              />
              <div>
                <span className="text-gray-900 dark:text-gray-100 font-medium">Professional</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">Concise and business-like with no cat personality</p>
              </div>
            </label>
          </div>
        </div>
      </section>
      
      {/* FloCat Personality Keywords */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Personality Keywords</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add keywords to further customize FloCat's personality (e.g., humorous, sarcastic, serious, enthusiastic)
        </p>
        
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Add a personality keyword"
            value={newPersonalityKeyword}
            onChange={(e) => setNewPersonalityKeyword(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md flex-grow bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newPersonalityKeyword.trim()) {
                if (!settings.floCatPersonality?.includes(newPersonalityKeyword.trim())) {
                  setSettings(s => ({
                    ...s,
                    floCatPersonality: [...(s.floCatPersonality || []), newPersonalityKeyword.trim()]
                  }));
                }
                setNewPersonalityKeyword("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newPersonalityKeyword.trim() && !settings.floCatPersonality?.includes(newPersonalityKeyword.trim())) {
                setSettings(s => ({
                  ...s,
                  floCatPersonality: [...(s.floCatPersonality || []), newPersonalityKeyword.trim()]
                }));
                setNewPersonalityKeyword("");
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Add Keyword
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {settings.floCatPersonality && settings.floCatPersonality.length > 0 ? (
            settings.floCatPersonality.map(keyword => (
              <span key={keyword} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center gap-1">
                {keyword}
                <button
                  onClick={() => setSettings(s => ({
                    ...s,
                    floCatPersonality: (s.floCatPersonality || []).filter(k => k !== keyword)
                  }))}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 ml-1"
                  aria-label={`Remove ${keyword} keyword`}
                >
                  &times;
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No personality keywords added yet.</p>
          )}
        </div>
      </section>
      
      {/* Preferred Name */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Preferred Name</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Set your preferred name for FloCat to use when addressing you
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Your Name</label>
          <input
            type="text"
            value={settings.preferredName || ""}
            onChange={(e) => setSettings(s => ({ ...s, preferredName: e.target.value }))}
            className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Enter your preferred name"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Leave blank to use your account name
          </p>
        </div>
      </section>
    </div>
  );
};

export default FloCatSettings;