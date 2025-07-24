
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
import OptimizedSkeleton from '@/components/ui/OptimizedSkeleton';

const WidgetSkeleton = ({ type }: { type?: string }) => (
  <OptimizedSkeleton variant={type as any} />
);

// Lazy load widgets
const TaskWidget = lazy(() => import("@/components/widgets/TaskWidget"));
const CalendarWidget = lazy(() => import("@/components/widgets/CalendarWidget"));
const ChatWidget = lazy(() => import("@/components/assistant/ChatWidget"));
const AtAGlanceWidget = lazy(() => import("@/components/widgets/AtAGlanceWidget"));
const QuickNoteWidget = lazy(() => import("@/components/widgets/QuickNoteWidget"));
const HabitTrackerWidget = lazy(() => import("@/components/widgets/HabitTrackerWidget"));

import { ReactElement } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { UserSettings } from "@/types/app";

const ResponsiveGridLayout = WidthProvider(Responsive);

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "habit-tracker";

// Define widget components with Suspense and specific skeletons
const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <Suspense fallback={<WidgetSkeleton type="tasks" />}><TaskWidget /></Suspense>,
  calendar: <Suspense fallback={<WidgetSkeleton type="calendar" />}><CalendarWidget /></Suspense>,
  ataglance: <Suspense fallback={<WidgetSkeleton type="ataglance" />}><AtAGlanceWidget /></Suspense>,
  quicknote: <Suspense fallback={<WidgetSkeleton type="generic" />}><QuickNoteWidget /></Suspense>,
  "habit-tracker": <Suspense fallback={<WidgetSkeleton type="generic" />}><HabitTrackerWidget /></Suspense>,
};

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

  // Progressive loading state
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Not signed in? Show loading or redirect to login
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Locking: Read lock state from localStorage
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (isClient) {
      const saved = localStorage.getItem("dashboardLocked");
      setIsLocked(saved === "true");

      // Listen for storage changes to sync lock state across components
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "dashboardLocked") {
          setIsLocked(e.newValue === "true");
        }
      };

      window.addEventListener('storage', handleStorageChange);
      
      // Also listen for custom events for same-tab updates
      const handleLockChange = () => {
        const saved = localStorage.getItem("dashboardLocked");
        setIsLocked(saved === "true");
      };

      window.addEventListener('lockStateChanged', handleLockChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('lockStateChanged', handleLockChange);
      };
    }
  }, [isClient]);

  // user logic (Stack Auth: user object replaces user)
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(["ataglance", "calendar", "tasks", "habit-tracker", "quicknote"]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Fetch user settings to get active widgets (client-side only)
  useEffect(() => {
    const fetchUserSettings = async () => {
      setIsLoadingSettings(true);
      if (isClient && user?.primaryEmail) {
        try {
          const response = await fetch(`/api/userSettings?userId=${user.primaryEmail}`);
          if (response.ok) {
            const userSettings = await response.json() as UserSettings;
            if (userSettings.activeWidgets && userSettings.activeWidgets.length > 0) {
              const validWidgets = userSettings.activeWidgets.filter(
                widget => Object.keys(widgetComponents).includes(widget)
              ) as WidgetType[];
              setActiveWidgets(validWidgets);
            }
          } else {
            console.error("[DashboardGrid] Failed to fetch user settings, using defaults.");
          }
        } catch (error) {
          console.error("[DashboardGrid] Error fetching user settings:", error);
        }
      }
      setIsLoadingSettings(false);
    };

    fetchUserSettings();
  }, [isClient, user]);

  // Progressive loading of widgets
  useEffect(() => {
    if (activeWidgets.length === 0) return;

    const loadNextWidgets = () => {
      const loadSequence = [
        { widget: 'ataglance', delay: 0 },
        { widget: 'calendar', delay: 200 },
        { widget: 'tasks', delay: 400 },
        { widget: 'habit-tracker', delay: 600 },
        { widget: 'quicknote', delay: 800 }
      ];

      loadSequence.forEach(({ widget, delay }) => {
        if (activeWidgets.includes(widget as WidgetType)) {
          setTimeout(() => {
            setVisibleWidgets(prev => [...prev, widget]);
            setLoadingProgress(prev => prev + (100 / activeWidgets.length));
          }, delay);
        }
      });
    };

    loadNextWidgets();
  }, [activeWidgets]);

  const saveWidgetOrder = async () => {
    if (!user?.primaryEmail) return;

    try {
      const response = await fetch(`/api/userSettings?userId=${user.primaryEmail}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activeWidgets: activeWidgets
        })
      });

      if (!response.ok) {
        console.error("[DashboardGrid] Failed to save widget order");
      }
    } catch (error) {
      console.error("[DashboardGrid] Error saving widget order:", error);
    }
  };

  const moveWidgetUp = (widgetId: WidgetType) => {
    const currentIndex = activeWidgets.indexOf(widgetId);
    if (currentIndex > 0) {
      const newWidgets = [...activeWidgets];
      [newWidgets[currentIndex], newWidgets[currentIndex - 1]] = [newWidgets[currentIndex - 1], newWidgets[currentIndex]];
      setActiveWidgets(newWidgets);
      saveWidgetOrder();
    }
  };

  const moveWidgetDown = (widgetId: WidgetType) => {
    const currentIndex = activeWidgets.indexOf(widgetId);
    if (currentIndex < activeWidgets.length - 1) {
      const newWidgets = [...activeWidgets];
      [newWidgets[currentIndex], newWidgets[currentIndex + 1]] = [newWidgets[currentIndex + 1], newWidgets[currentIndex]];
      setActiveWidgets(newWidgets);
      saveWidgetOrder();
    }
  };

  // Responsive layouts for different screen sizes
  const layouts = useMemo(() => {
    const baseLayout = {
      lg: [
        { i: 'ataglance', x: 0, y: 0, w: 12, h: 3 },
        { i: 'calendar', x: 0, y: 3, w: 8, h: 5 },
        { i: 'tasks', x: 8, y: 3, w: 4, h: 5 },
        { i: 'habit-tracker', x: 0, y: 8, w: 6, h: 4 },
        { i: 'quicknote', x: 6, y: 8, w: 6, h: 4 }
      ],
      md: [
        { i: 'ataglance', x: 0, y: 0, w: 10, h: 3 },
        { i: 'calendar', x: 0, y: 3, w: 10, h: 5 },
        { i: 'tasks', x: 0, y: 8, w: 10, h: 4 },
        { i: 'habit-tracker', x: 0, y: 12, w: 5, h: 4 },
        { i: 'quicknote', x: 5, y: 12, w: 5, h: 4 }
      ],
      sm: [
        { i: 'ataglance', x: 0, y: 0, w: 6, h: 3 },
        { i: 'calendar', x: 0, y: 3, w: 6, h: 5 },
        { i: 'tasks', x: 0, y: 8, w: 6, h: 4 },
        { i: 'habit-tracker', x: 0, y: 12, w: 6, h: 4 },
        { i: 'quicknote', x: 0, y: 16, w: 6, h: 4 }
      ],
      xs: [
        { i: 'ataglance', x: 0, y: 0, w: 4, h: 3 },
        { i: 'calendar', x: 0, y: 3, w: 4, h: 5 },
        { i: 'tasks', x: 0, y: 8, w: 4, h: 4 },
        { i: 'habit-tracker', x: 0, y: 12, w: 4, h: 4 },
        { i: 'quicknote', x: 0, y: 16, w: 4, h: 4 }
      ]
    };

    // Filter layouts to only include active widgets
    const filteredLayouts: any = {};
    Object.keys(baseLayout).forEach(breakpoint => {
      filteredLayouts[breakpoint] = baseLayout[breakpoint as keyof typeof baseLayout].filter(
        item => activeWidgets.includes(item.i as WidgetType)
      );
    });

    return filteredLayouts;
  }, [activeWidgets]);

  const onLayoutChange = (layout: any, allLayouts: any) => {
    if (isLocked) return;
    
    // Update active widgets based on layout order
    const newWidgetOrder = layout.map((item: any) => item.i) as WidgetType[];
    setActiveWidgets(newWidgetOrder);
    saveWidgetOrder();
  };

  if (isLoadingSettings) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Loading Progress */}
      {loadingProgress < 100 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#00C9A7] to-[#00A8A7] h-1 transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
      )}

      {/* Widget Grid */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={120}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        onLayoutChange={onLayoutChange}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        useCSSTransforms={true}
        preventCollision={false}
        compactType="vertical"
      >
        {activeWidgets.map((widgetKey) => (
          <div key={widgetKey} className="widget-container">
            {visibleWidgets.includes(widgetKey) ? (
              widgetComponents[widgetKey]
            ) : (
              <WidgetSkeleton type={widgetKey} />
            )}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Widget Controls (only show when not locked) */}
      {!isLocked && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold mb-2">Widget Order</h3>
            <div className="space-y-1">
              {activeWidgets.map((widget, index) => (
                <div key={widget} className="flex items-center justify-between text-xs">
                  <span className="flex items-center">
                    {getWidgetIcon(widget)}
                    <span className="ml-2 capitalize">{widget.replace('-', ' ')}</span>
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => moveWidgetUp(widget)}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveWidgetDown(widget)}
                      disabled={index === activeWidgets.length - 1}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(DashboardGrid);
