
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
const SmartAtAGlanceWidget = lazy(() => import("@/components/widgets/SmartAtAGlanceWidget"));
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
  ataglance: <Suspense fallback={<WidgetSkeleton type="ataglance" />}><SmartAtAGlanceWidget /></Suspense>,
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
    // Load lock state from localStorage on component mount
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
  }, []);

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const memoizedWidgetComponents = useMemo(() => widgetComponents, []);

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

  // Fetch user settings to get active widgets (client-side only) with caching
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (isClient && user?.email) {
        try {
          // Check cache first
          const cacheKey = `userSettings_${user.email}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            try {
              const cachedData = JSON.parse(cached);
              if (Date.now() - cachedData.timestamp < 300000) { // 5 minutes cache
                setActiveWidgets(cachedData.activeWidgets || []);
                setLoadedSettings(true);
                return;
              }
            } catch (e) {
              // Invalid cache, continue to fetch
            }
          }

          const response = await fetch(`/api/userSettings?userId=${user.email}`);
          if (response.ok) {
            const userSettings = await response.json() as UserSettings;
            const activeWidgets = userSettings.activeWidgets || [];
            setActiveWidgets(activeWidgets);
            
            // Cache the result
            sessionStorage.setItem(cacheKey, JSON.stringify({
              activeWidgets,
              timestamp: Date.now()
            }));
          } else {
            setActiveWidgets([]);
          }
        } catch (e) {
          setActiveWidgets([]);
        } finally {
          setLoadedSettings(true);
        }
      }
    };

    if (isClient) {
      fetchUserSettings();
    } else {
      setActiveWidgets([]);
      setLoadedSettings(true);
    }
  }, [user, isClient]);

  // Load layout from Firestore on component mount (client-side only)
  useEffect(() => {
    const fetchLayout = async () => {
      if (isClient && user?.email) {
        try {
          const response = await fetch(`/api/userSettings/layouts?userId=${user.email}`);
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
          setLayouts(defaultLayouts);
        }
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
    if (activeWidgets.length > 0 && Object.keys(layouts).length > 0) {
      const newLayouts: any = {};
      (Object.keys(layouts) as Array<keyof typeof layouts>).forEach(breakpoint => {
        newLayouts[breakpoint] = layouts[breakpoint].filter(
          (item: any) => activeWidgets.includes(item.i)
        );
      });
      setLayouts(newLayouts);
    }
  }, [activeWidgets]);

  // Progressive loading effect - prioritize important widgets
  useEffect(() => {
    if (!loadedSettings || activeWidgets.length === 0) return;

    // Priority order for widget loading
    const priority = ["ataglance", "calendar", "tasks", "quicknote", "habit-tracker"];
    const sortedWidgets = activeWidgets.sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    setVisibleWidgets([]);
    setLoadingProgress(0);

    // Load widgets progressively
    sortedWidgets.forEach((widget, index) => {
      setTimeout(() => {
        setVisibleWidgets(prev => [...prev, widget]);
        setLoadingProgress(((index + 1) / sortedWidgets.length) * 100);
      }, index * 200); // 200ms delay between widgets
    });
  }, [activeWidgets, loadedSettings]);

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
          if (isClient && user?.email) {
            await fetch('/api/userSettings/layouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ layouts: cleanedLayouts }),
            });
          }
        } catch (e) {
          // noop
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

  return (
    <div className="grid-bg">
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
        {activeWidgets.map((key) => (
          <div key={key} className="glass p-5 rounded-2xl flex flex-col">
            <h2 className="widget-header">
              {getWidgetIcon(key)}
              {key === "ataglance" ? "Your Day at a Glance" : key.charAt(0).toUpperCase() + key.slice(1)}
            </h2>
            <div className="widget-content">
              {visibleWidgets.includes(key) ? (
                memoizedWidgetComponents[key as WidgetType]
              ) : (
                <WidgetSkeleton type={key} />
              )}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default memo(DashboardGrid);
