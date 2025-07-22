
import { useState, useEffect, useRef, memo, useMemo, lazy, Suspense } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import {
  CheckSquare,
  Calendar,
  Clock,
  FileText,
} from 'lucide-react';

const WidgetSkeleton = () => (
  <div className="animate-pulse w-full h-full flex flex-col">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

// Lazy load widgets
const TaskWidget = lazy(() => import("@/components/widgets/TaskWidget"));
const CalendarWidget = lazy(() => import("@/components/widgets/CalendarWidget"));
const ChatWidget = lazy(() => import("@/components/assistant/ChatWidget"));
const AtAGlanceWidget = lazy(() => import("@/components/widgets/AtAGlanceWidget"));
const QuickNoteWidget = lazy(() => import("@/components/widgets/QuickNoteWidget"));
const HabitTrackerWidget = lazy(() => import("@/components/widgets/HabitTrackerWidget"));

console.log("DashboardGrid: Lazy widgets imported");

import { ReactElement } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { UserSettings } from "@/types/app";

const ResponsiveGridLayout = WidthProvider(Responsive);

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "habit-tracker";

// Define widget components with Suspense
const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <Suspense fallback={<WidgetSkeleton />}><TaskWidget /></Suspense>,
  calendar: <Suspense fallback={<WidgetSkeleton />}><CalendarWidget /></Suspense>,
  ataglance: <Suspense fallback={<WidgetSkeleton />}><AtAGlanceWidget /></Suspense>,
  quicknote: <Suspense fallback={<WidgetSkeleton />}><QuickNoteWidget /></Suspense>,
  "habit-tracker": <Suspense fallback={<WidgetSkeleton />}><HabitTrackerWidget /></Suspense>,
};

console.log("DashboardGrid: Widget components defined", Object.keys(widgetComponents));

// Helper function to recursively remove undefined values from an object
function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }

  const cleanedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const cleanedValue = removeUndefined(obj[key]);
      if (cleanedValue !== undefined) {
        cleanedObj[key] = cleanedValue;
      }
    }
  }
  return cleanedObj;
}

// Helper function to get the appropriate icon for each widget
const getWidgetIcon = (widgetKey: string) => {
  switch(widgetKey) {
    case 'tasks':
      return <CheckSquare className="w-5 h-5" />;
    case 'calendar':
      return <Calendar className="w-5 h-5" />;
    case 'ataglance':
      return <Clock className="w-5 h-5" />;
    case 'quicknote':
      return <FileText className="w-5 h-5" />;
    case 'habit-tracker':
      return <Clock className="w-5 h-5" />;
    default:
      return null;
  }
};

const DashboardGrid = () => {
  const isClient = typeof window !== 'undefined';

  // Use Stack Auth
  const { user, isLoading } = useUser();

  console.log("DashboardGrid: User state", { user, isLoading });

  // Show loading state while user is loading
  if (isLoading) {
    return (
      <div className="grid-bg">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Locking: If you store this per user, add logic here. Otherwise, just default to false.
  const isLocked = false;

  // If no user, show a message
  if (!user) {
    return (
      <div className="grid-bg">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-400">Please sign in to view your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  
  // Debug activeWidgets changes
  useEffect(() => {
    console.log("DashboardGrid: activeWidgets changed to", activeWidgets);
  }, [activeWidgets]);
  const memoizedWidgetComponents = useMemo(() => {
    console.log("DashboardGrid: Creating memoized widget components");
    return widgetComponents;
  }, []);

  // Default layouts
  const defaultLayouts = {
    lg: [
      { i: "tasks", x: 0, y: 0, w: 3, h: 5 },
      { i: "calendar", x: 3, y: 0, w: 3, h: 5 },
      { i: "ataglance", x: 0, y: 5, w: 3, h: 5 },
      { i: "quicknote", x: 3, y: 5, w: 3, h: 5 },
      { i: "habit-tracker", x: 0, y: 10, w: 6, h: 5 },
    ],
    md: [
      { i: "tasks", x: 0, y: 0, w: 4, h: 5 },
      { i: "calendar", x: 4, y: 0, w: 4, h: 5 },
      { i: "ataglance", x: 0, y: 5, w: 4, h: 5 },
      { i: "quicknote", x: 4, y: 5, w: 4, h: 5 },
      { i: "habit-tracker", x: 0, y: 10, w: 8, h: 5 },
    ],
    sm: [
      { i: "tasks", x: 0, y: 0, w: 6, h: 5 },
      { i: "calendar", x: 0, y: 5, w: 6, h: 5 },
      { i: "ataglance", x: 0, y: 10, w: 6, h: 5 },
      { i: "quicknote", x: 0, y: 15, w: 6, h: 5 },
      { i: "habit-tracker", x: 0, y: 20, w: 6, h: 5 },
    ],
  };

  const [layouts, setLayouts] = useState(defaultLayouts);
  const [loadedSettings, setLoadedSettings] = useState(false);

  // Fetch user settings to get active widgets (client-side only)
  useEffect(() => {
    const fetchUserSettings = async () => {
      console.log("DashboardGrid: User object", user);
      if (isClient && user) {
        try {
          console.log("DashboardGrid: Fetching user settings");
          const response = await fetch(`/api/userSettings`);
          console.log("DashboardGrid: Response status", response.status);
          if (response.ok) {
            const userSettings = await response.json() as UserSettings;
            console.log("DashboardGrid: Loaded user settings", userSettings);
            const widgets = userSettings.activeWidgets || ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"];
            console.log("DashboardGrid: Setting activeWidgets to", widgets);
            setActiveWidgets(widgets);
          } else {
            const errorText = await response.text();
            console.log("DashboardGrid: Failed to fetch user settings, status:", response.status, "error:", errorText);
            const defaultWidgets = ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"];
            setActiveWidgets(defaultWidgets);
          }
        } catch (e) {
          console.log("DashboardGrid: Error fetching user settings, using defaults", e);
          const defaultWidgets = ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"];
          setActiveWidgets(defaultWidgets);
        } finally {
          setLoadedSettings(true);
        }
      } else {
        console.log("DashboardGrid: No user found, using defaults");
        const defaultWidgets = ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"];
        setActiveWidgets(defaultWidgets);
        setLoadedSettings(true);
      }
    };

    if (isClient) {
      fetchUserSettings();
    } else {
      const defaultWidgets = ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"];
      setActiveWidgets(defaultWidgets);
      setLoadedSettings(true);
    }
  }, [user, isClient]);

  // Load layout from Firestore on component mount (client-side only)
  useEffect(() => {
    const fetchLayout = async () => {
      if (isClient && user) {
        try {
          const response = await fetch(`/api/userSettings/layouts`);
          if (response.ok) {
            const { layouts: savedLayouts } = await response.json();
            if (savedLayouts) {
              setLayouts(savedLayouts);
            } else {
              setLayouts(defaultLayouts);
              await fetch('/api/userSettings/layouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layouts: defaultLayouts }),
              });
            }
          } else {
            setLayouts(defaultLayouts);
          }
        } catch (e) {
          console.log("DashboardGrid: Error loading layouts, using defaults", e);
          setLayouts(defaultLayouts);
        }
      } else {
        console.log("DashboardGrid: No user for layout loading, using defaults");
        setLayouts(defaultLayouts);
      }
    };

    if (isClient) {
      fetchLayout();
    }
  }, [user, isClient]);

  // Ref to store the timeout ID for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update layouts when activeWidgets changes
  useEffect(() => {
    console.log("DashboardGrid: Layout effect triggered with activeWidgets", activeWidgets);
    if (activeWidgets.length > 0 && Object.keys(layouts).length > 0) {
      const newLayouts: any = {};
      (Object.keys(layouts) as Array<keyof typeof layouts>).forEach(breakpoint => {
        newLayouts[breakpoint] = layouts[breakpoint].filter(
          (item: any) => activeWidgets.includes(item.i)
        );
      });
      console.log("DashboardGrid: Setting new layouts", newLayouts);
      setLayouts(newLayouts);
    }
  }, [activeWidgets]);

  const onLayoutChange = (layout: any, allLayouts: any) => {
    try {
      const cleanedLayouts = removeUndefined(allLayouts);

      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }
      layoutChangeTimeoutRef.current = setTimeout(() => {
        try {
          setLayouts(cleanedLayouts);
        } catch (err) {
          // noop
        }
      }, 50);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          if (isClient && user) {
            await fetch('/api/userSettings/layouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ layouts: cleanedLayouts }),
            });
          }
        } catch (e) {
          console.log("DashboardGrid: Error saving layouts", e);
        }
      }, 500);
    } catch (err) {
      // noop
    }
  };

  if (!loadedSettings) {
    return (
      <div className="grid-bg">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass p-5 rounded-xl animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  console.log("DashboardGrid: Rendering with activeWidgets", activeWidgets);

  const fixWidgets = async () => {
    try {
      const response = await fetch('/api/userSettings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        console.log("Widgets fixed successfully");
        // Reload the page to refresh the widgets
        window.location.reload();
      } else {
        console.error("Failed to fix widgets");
      }
    } catch (e) {
      console.error("Error fixing widgets:", e);
    }
  };

  return (
    <div className="grid-bg">
      {activeWidgets.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">No widgets configured</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please visit settings to configure your dashboard widgets.</p>
            <button 
              onClick={fixWidgets}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Fix Widgets (Temporary)
            </button>
          </div>
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          onLayoutChange={onLayoutChange}
          isDraggable={!isLocked}
          isResizable={!isLocked}
          margin={[16, 16]}
        >
          {activeWidgets.map((key) => {
            console.log("DashboardGrid: Rendering widget", key);
            return (
              <div key={key} className="glass p-5 rounded-xl flex flex-col">
                <h2 className="widget-header">
                  {getWidgetIcon(key)}
                  {key === "ataglance" ? "Your Day at a Glance" : key.charAt(0).toUpperCase() + key.slice(1)}
                </h2>
                <div className="widget-content">
                  {(() => {
                    const widgetComponent = memoizedWidgetComponents[key as WidgetType];
                    console.log("DashboardGrid: Widget component for", key, "is", widgetComponent ? "defined" : "undefined");
                    if (!widgetComponent) {
                      return <div className="text-red-500">Widget {key} not found</div>;
                    }
                    return widgetComponent;
                  })()}
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
};

export default memo(DashboardGrid);
