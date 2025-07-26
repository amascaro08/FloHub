"use client";

import { useState, useEffect } from "react";
import { Settings, X, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { UserSettings, WidgetConfig } from "@/types/app";
import { useUser } from "@/lib/hooks/useUser";

// Define available widgets (same as WidgetManager)
const availableWidgets: WidgetConfig[] = [
  {
    id: "tasks",
    name: "Tasks",
    description: "View and manage your tasks",
    component: "TaskWidget",
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "View your upcoming events",
    component: "CalendarWidget",
  },
  {
    id: "ataglance",
    name: "At a Glance",
    description: "AI-powered intelligent dashboard with insights",
    component: "SmartAtAGlanceWidget",
  },
  {
    id: "quicknote",
    name: "Quick Note",
    description: "Create and view quick notes",
    component: "QuickNoteWidget",
  },
  {
    id: "habit-tracker",
    name: "Habit Tracker",
    description: "Track and manage your daily habits",
    component: "HabitTrackerWidget",
  },
];

interface WidgetToggleProps {
  isLocked: boolean;
}

export default function WidgetToggle({ isLocked }: WidgetToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch current widget settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (user?.primaryEmail) {
        try {
          const response = await fetch(`/api/userSettings?userId=${user.primaryEmail}`);
          if (response.ok) {
            const userSettings = await response.json() as UserSettings;
            setActiveWidgets(userSettings.activeWidgets || []);
          }
        } catch (error) {
          console.error("Error fetching user settings:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserSettings();
  }, [user?.primaryEmail]);

  // Save widget settings
  const saveWidgetSettings = async (newActiveWidgets: string[]) => {
    if (user?.primaryEmail) {
      try {
        await fetch('/api/userSettings/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.primaryEmail,
            activeWidgets: newActiveWidgets
          }),
        });
        
        // Clear the cache to force refresh
        const cacheKey = `userSettings_${user.primaryEmail}`;
        sessionStorage.removeItem(cacheKey);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('widgetSettingsChanged'));
      } catch (error) {
        console.error("Error saving widget settings:", error);
      }
    }
  };

  // Toggle widget visibility
  const toggleWidget = (widgetId: string) => {
    const newActiveWidgets = activeWidgets.includes(widgetId)
      ? activeWidgets.filter(id => id !== widgetId)
      : [...activeWidgets, widgetId];
    
    setActiveWidgets(newActiveWidgets);
    saveWidgetSettings(newActiveWidgets);
  };

  // Move widget up in order (mobile)
  const moveWidgetUp = (widgetId: string) => {
    const index = activeWidgets.indexOf(widgetId);
    if (index > 0) {
      const newActiveWidgets = [...activeWidgets];
      [newActiveWidgets[index - 1], newActiveWidgets[index]] = [newActiveWidgets[index], newActiveWidgets[index - 1]];
      setActiveWidgets(newActiveWidgets);
      saveWidgetSettings(newActiveWidgets);
    }
  };

  // Move widget down in order (mobile)
  const moveWidgetDown = (widgetId: string) => {
    const index = activeWidgets.indexOf(widgetId);
    if (index < activeWidgets.length - 1) {
      const newActiveWidgets = [...activeWidgets];
      [newActiveWidgets[index], newActiveWidgets[index + 1]] = [newActiveWidgets[index + 1], newActiveWidgets[index]];
      setActiveWidgets(newActiveWidgets);
      saveWidgetSettings(newActiveWidgets);
    }
  };

  // Don't show if layout is locked
  if (isLocked) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-full shadow-lg transition-colors flex items-center justify-center"
        aria-label="Widget Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Widget Toggle Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {isMobile ? "Widget Order" : "Widget Visibility"}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {isMobile 
              ? "Reorder widgets by moving them up or down. Toggle to show/hide."
              : "Toggle widgets on or off for your dashboard."
            }
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show all widgets for desktop, active widgets first for mobile */}
              {(isMobile ? activeWidgets : availableWidgets.map(w => w.id)).map((widgetId, index) => {
                const widget = availableWidgets.find(w => w.id === widgetId);
                if (!widget) return null;
                
                const isActive = activeWidgets.includes(widgetId);
                
                return (
                  <div
                    key={widgetId}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isActive 
                        ? "border-primary-200 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20"
                        : "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <button
                        onClick={() => toggleWidget(widgetId)}
                        className="flex items-center flex-1 text-left"
                      >
                        {isActive ? (
                          <Eye className="w-4 h-4 text-primary-500 mr-2" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400 mr-2" />
                        )}
                        <span className={`font-medium ${
                          isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {widget.name}
                        </span>
                      </button>
                    </div>

                    {/* Mobile reordering controls */}
                    {isMobile && isActive && (
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => moveWidgetUp(widgetId)}
                          disabled={index === 0}
                          className={`p-1 rounded hover:bg-white dark:hover:bg-gray-600 ${
                            index === 0 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveWidgetDown(widgetId)}
                          disabled={index === activeWidgets.length - 1}
                          className={`p-1 rounded hover:bg-white dark:hover:bg-gray-600 ${
                            index === activeWidgets.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Show inactive widgets at bottom for mobile */}
              {isMobile && availableWidgets.filter(w => !activeWidgets.includes(w.id)).map(widget => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                >
                  <button
                    onClick={() => toggleWidget(widget.id)}
                    className="flex items-center flex-1 text-left"
                  >
                    <EyeOff className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      {widget.name}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Changes sync with your settings page automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}