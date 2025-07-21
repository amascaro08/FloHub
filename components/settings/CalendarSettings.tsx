import React from 'react';
import { UserSettings, CalendarSource } from '../../types/app';

type CalItem = { id: string; summary: string; primary?: boolean };
type CalendarSourceType = "google" | "o365" | "apple" | "other";

interface CalendarSettingsProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
  calendars: CalItem[];
  newCalendarSource: Partial<CalendarSource>;
  setNewCalendarSource: React.Dispatch<React.SetStateAction<Partial<CalendarSource>>>;
  editingCalendarSourceIndex: number | null;
  setEditingCalendarSourceIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showCalendarForm: boolean;
  setShowCalendarForm: React.Dispatch<React.SetStateAction<boolean>>;
  newCalendarTag: string;
  setNewCalendarTag: React.Dispatch<React.SetStateAction<string>>;
}

const CalendarSettings: React.FC<CalendarSettingsProps> = ({
  settings,
  onSettingsChange,
  calendars,
  newCalendarSource,
  setNewCalendarSource,
  editingCalendarSourceIndex,
  setEditingCalendarSourceIndex,
  showCalendarForm,
  setShowCalendarForm,
  newCalendarTag,
  setNewCalendarTag
}) => {
  return (
    <div className="space-y-6">
      {/* Calendar Sources */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 overflow-hidden">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h2 className="text-lg font-medium">Calendar Sources</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const googleAuthUrl = `/api/calendar/connect?provider=google`;
                window.location.href = googleAuthUrl;
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Add Google Calendar
            </button>
            <button
              onClick={() => {
                const powerAutomateUrl = prompt("Please enter your Power Automate URL");
                if (powerAutomateUrl) {
                  // Create a new calendar source for the Power Automate URL
                  const newSource: CalendarSource = {
                    id: `o365_${Date.now()}`,
                    name: "Work Calendar (O365)",
                    type: "o365",
                    sourceId: "default",
                    connectionData: powerAutomateUrl,
                    tags: ["work"],
                    isEnabled: true,
                  };
                  
                  const updatedSources = settings.calendarSources ? [...settings.calendarSources, newSource] : [newSource];
                  
                  onSettingsChange({
                    ...settings,
                    calendarSources: updatedSources,
                    powerAutomateUrl: powerAutomateUrl, // Keep legacy field for backward compatibility
                  });
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Add Power Automate URL
            </button>
          </div>
        </div>
        
        {/* Calendar Sources List */}
        <div className="space-y-4 mb-6">
          {settings.calendarSources && settings.calendarSources.length > 0 ? (
            settings.calendarSources.map((source, index) => (
              <div key={source.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                  <div>
                    <h3 className="font-medium text-lg">{source.name}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {source.type === "google" ? "Google Calendar" :
                       source.type === "o365" ? "Microsoft 365" :
                       source.type === "apple" ? "Apple Calendar" : "Other Calendar"}
                    </div>
                    {source.connectionData && source.type === "o365" && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 break-all">
                        URL: {source.connectionData}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={source.isEnabled}
                        onChange={() => {
                          onSettingsChange({
                            ...settings,
                            calendarSources: settings.calendarSources?.map((source, i) => 
                              i === index ? { ...source, isEnabled: !source.isEnabled } : source
                            )
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        {source.isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                    <button
                      onClick={() => {
                        setNewCalendarSource({...source});
                        setEditingCalendarSourceIndex(index);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove "${source.name}"?`)) {
                          onSettingsChange({
                            ...settings,
                            calendarSources: settings.calendarSources?.filter((_, i) => i !== index)
                          });
                        }
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="mt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tags:</div>
                  <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                    {source.tags && source.tags.length > 0 ? (
                      source.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No calendar sources added yet. Click "Add Google Calendar" or "Add Power Automate URL" to get started.
            </div>
          )}
        </div>
        
        {/* Legacy Power Automate URL Display */}
        {settings.powerAutomateUrl && (!settings.calendarSources || settings.calendarSources.length === 0) && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium text-lg mb-2">Legacy Power Automate URL</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              URL: {settings.powerAutomateUrl}
            </div>
            <button
              onClick={() => {
                // Convert legacy URL to calendar source
                const newSource: CalendarSource = {
                  id: `o365_legacy_${Date.now()}`,
                  name: "Work Calendar (O365) - Legacy",
                  type: "o365",
                  sourceId: "default",
                  connectionData: settings.powerAutomateUrl,
                  tags: ["work"],
                  isEnabled: true,
                };
                
                onSettingsChange({
                  ...settings,
                  calendarSources: [newSource],
                });
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
            >
              Convert to Calendar Source
            </button>
          </div>
        )}
      </section>
      
      {/* Default view filter */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 overflow-hidden">
        <h2 className="text-lg font-medium mb-4">Default Date Filter</h2>
        <select
          value={settings.defaultView}
          onChange={(e) =>
            onSettingsChange({ ...settings, defaultView: e.target.value as any })
          }
          className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full md:w-auto"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>

        {settings.defaultView === "custom" && (
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={settings.customRange?.start || ''}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    customRange: { ...settings.customRange, start: e.target.value, end: settings.customRange?.end || '' },
                  })
                }
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={settings.customRange?.end || ''}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    customRange: { ...settings.customRange, start: settings.customRange?.start || '', end: e.target.value },
                  })
                }
                className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CalendarSettings;