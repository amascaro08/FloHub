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
    name: "Smart At a Glance",
    description: "AI-powered overview with insights and suggestions",
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
  // Debug widget commented out
  // {
  //   id: "debug",
  //   name: "Debug",
  //   description: "Debug information and tools",
  //   component: "DebugWidget",
  // },
];

interface WidgetManagerProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
}

export default function WidgetManager({ settings, onSettingsChange }: WidgetManagerProps) {
  const [activeWidgets, setActiveWidgets] = useState<string[]>(settings.activeWidgets || []);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Update parent component when activeWidgets changes
  useEffect(() => {
    onSettingsChange({
      ...settings,
      activeWidgets,
    });
  }, [activeWidgets, settings, onSettingsChange]);

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

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.setData('text/plain', widgetId);
    // Make the drag image transparent
    const dragImage = document.createElement('div');
    dragImage.style.opacity = '0';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, widgetId: string) => {
    e.preventDefault();
    if (draggedWidget && draggedWidget !== widgetId && activeWidgets.includes(widgetId)) {
      // Reorder the widgets
      const newActiveWidgets = [...activeWidgets];
      const draggedIndex = newActiveWidgets.indexOf(draggedWidget);
      const targetIndex = newActiveWidgets.indexOf(widgetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        newActiveWidgets.splice(draggedIndex, 1);
        newActiveWidgets.splice(targetIndex, 0, draggedWidget);
        setActiveWidgets(newActiveWidgets);
      }
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  // Move widget up in order
  const moveWidgetUp = (widgetId: string) => {
    const index = activeWidgets.indexOf(widgetId);
    if (index > 0) {
      const newActiveWidgets = [...activeWidgets];
      [newActiveWidgets[index - 1], newActiveWidgets[index]] = [newActiveWidgets[index], newActiveWidgets[index - 1]];
      setActiveWidgets(newActiveWidgets);
    }
  };

  // Move widget down in order
  const moveWidgetDown = (widgetId: string) => {
    const index = activeWidgets.indexOf(widgetId);
    if (index < activeWidgets.length - 1) {
      const newActiveWidgets = [...activeWidgets];
      [newActiveWidgets[index], newActiveWidgets[index + 1]] = [newActiveWidgets[index + 1], newActiveWidgets[index]];
      setActiveWidgets(newActiveWidgets);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium mb-2">Dashboard Widgets</h2>
      <p className="text-sm text-gray-500 mb-4">
        Select which widgets to display on your dashboard
      </p>
      
      {/* Widget Selection */}
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

      {/* Widget Order Section */}
      {activeWidgets.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-2">Widget Order</h3>
          <p className="text-sm text-gray-500 mb-4">
            Drag and drop or use the arrows to reorder widgets on your dashboard
          </p>
          
          <div className="border rounded-lg overflow-hidden">
            {activeWidgets.map((widgetId, index) => {
              const widget = availableWidgets.find(w => w.id === widgetId);
              if (!widget) return null;
              
              return (
                <div
                  key={widgetId}
                  className={`flex items-center justify-between p-3 ${
                    index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                  } ${draggedWidget === widgetId ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widgetId)}
                  onDragOver={(e) => handleDragOver(e, widgetId)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center">
                    <div className="mr-3 text-gray-400 cursor-move">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                      </svg>
                    </div>
                    <span>{widget.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveWidgetUp(widgetId);
                      }}
                      disabled={index === 0}
                      className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                        index === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      aria-label="Move widget up"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveWidgetDown(widgetId);
                      }}
                      disabled={index === activeWidgets.length - 1}
                      className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                        index === activeWidgets.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      aria-label="Move widget down"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            Tip: The order here determines how widgets appear on both desktop and mobile views
          </p>
        </div>
      )}
    </div>
  );
}