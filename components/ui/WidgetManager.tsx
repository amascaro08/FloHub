"use client";

import { useState, useEffect } from "react";
import { UserSettings, WidgetConfig } from "@/types/app";

// Define available widgets
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
    description: "Quick overview of your day",
    component: "AtAGlanceWidget",
  },
  {
    id: "quicknote",
    name: "Quick Note",
    description: "Create and view quick notes",
    component: "QuickNoteWidget",
  },
  {
    id: "debug",
    name: "Debug",
    description: "Debug information and tools",
    component: "DebugWidget",
  },
];

interface WidgetManagerProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
}

export default function WidgetManager({ settings, onSettingsChange }: WidgetManagerProps) {
  const [activeWidgets, setActiveWidgets] = useState<string[]>(settings.activeWidgets || []);

  // Update parent component when activeWidgets changes
  useEffect(() => {
    onSettingsChange({
      ...settings,
      activeWidgets,
    });
  }, [activeWidgets]);

  // Toggle widget active state
  const toggleWidget = (widgetId: string) => {
    setActiveWidgets((current) => {
      if (current.includes(widgetId)) {
        return current.filter((id) => id !== widgetId);
      } else {
        return [...current, widgetId];
      }
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium mb-2">Dashboard Widgets</h2>
      <p className="text-sm text-gray-500 mb-4">
        Select which widgets to display on your dashboard
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableWidgets.map((widget) => (
          <div 
            key={widget.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              activeWidgets.includes(widget.id) 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
            }`}
            onClick={() => toggleWidget(widget.id)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{widget.name}</h3>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={activeWidgets.includes(widget.id)}
                  onChange={() => toggleWidget(widget.id)}
                  className="sr-only"
                  id={`widget-${widget.id}`}
                />
                <label
                  htmlFor={`widget-${widget.id}`}
                  className={`block w-10 h-6 rounded-full transition-colors ${
                    activeWidgets.includes(widget.id) ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 mt-1 ml-1 rounded-full bg-white shadow transform transition-transform ${
                      activeWidgets.includes(widget.id) ? "translate-x-4" : ""
                    }`}
                  />
                </label>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{widget.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}