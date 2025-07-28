
import { useState, useEffect, useRef, memo, useMemo, lazy, Suspense, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import ErrorBoundary from '../ui/ErrorBoundary';
import {
  CheckSquare,
  Calendar,
  Clock,
  FileText,
  Lock,
  Unlock,
  Settings,
  Sparkles,
  Plus,
  Grid3X3,
  LayoutGrid,
  Smartphone,
  Monitor,
} from 'lucide-react';
import OptimizedSkeleton from '@/components/ui/OptimizedSkeleton';
import { CalendarProvider } from '@/contexts/CalendarContext';

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

// Define widget components as factory functions to avoid React element creation issues
const createWidgetComponent = (type: WidgetType): ReactElement => {
  switch (type) {
    case 'tasks':
      return <Suspense fallback={<WidgetSkeleton type="tasks" />}><TaskWidget /></Suspense>;
    case 'calendar':
      return <Suspense fallback={<WidgetSkeleton type="calendar" />}><CalendarWidget /></Suspense>;
    case 'ataglance':
      return <Suspense fallback={<WidgetSkeleton type="ataglance" />}><SmartAtAGlanceWidget /></Suspense>;
    case 'quicknote':
      return <Suspense fallback={<WidgetSkeleton type="generic" />}><QuickNoteWidget /></Suspense>;
    case 'habit-tracker':
      return <Suspense fallback={<WidgetSkeleton type="generic" />}><HabitTrackerWidget /></Suspense>;
    default:
      return <div>Unknown widget</div>;
  }
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
      return <Sparkles className="w-5 h-5" />;
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-grey-tint font-body">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
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

  // Default layouts with improved responsive design and larger default sizes
  const defaultLayouts = {
    lg: [
      { i: "tasks", x: 0, y: 0, w: 4, h: 12, minW: 4, minH: 10, maxW: 12, maxH: 20 },
      { i: "calendar", x: 4, y: 0, w: 4, h: 12, minW: 4, minH: 10, maxW: 12, maxH: 20 },
      { i: "ataglance", x: 8, y: 0, w: 4, h: 12, minW: 4, minH: 10, maxW: 12, maxH: 20 },
      { i: "quicknote", x: 0, y: 12, w: 6, h: 10, minW: 4, minH: 8, maxW: 12, maxH: 16 },
      { i: "habit-tracker", x: 6, y: 12, w: 6, h: 10, minW: 4, minH: 8, maxW: 12, maxH: 16 },
    ],
    md: [
      { i: "tasks", x: 0, y: 0, w: 4, h: 12, minW: 4, minH: 10, maxW: 8, maxH: 20 },
      { i: "calendar", x: 4, y: 0, w: 4, h: 12, minW: 4, minH: 10, maxW: 8, maxH: 20 },
      { i: "ataglance", x: 0, y: 12, w: 4, h: 12, minW: 4, minH: 10, maxW: 8, maxH: 20 },
      { i: "quicknote", x: 4, y: 12, w: 4, h: 12, minW: 4, minH: 10, maxW: 8, maxH: 20 },
      { i: "habit-tracker", x: 0, y: 24, w: 8, h: 10, minW: 6, minH: 8, maxW: 8, maxH: 16 },
    ],
    sm: [
      { i: "tasks", x: 0, y: 0, w: 6, h: 12, minW: 6, minH: 10, maxW: 6, maxH: 20 },
      { i: "calendar", x: 0, y: 12, w: 6, h: 12, minW: 6, minH: 10, maxW: 6, maxH: 20 },
      { i: "ataglance", x: 0, y: 24, w: 6, h: 12, minW: 6, minH: 10, maxW: 6, maxH: 20 },
      { i: "quicknote", x: 0, y: 36, w: 6, h: 10, minW: 6, minH: 8, maxW: 6, maxH: 16 },
      { i: "habit-tracker", x: 0, y: 46, w: 6, h: 10, minW: 6, minH: 8, maxW: 6, maxH: 16 },
    ],
    xs: [
      { i: "tasks", x: 0, y: 0, w: 4, h: 12, minW: 4, minH: 10, maxW: 4, maxH: 20 },
      { i: "calendar", x: 0, y: 12, w: 4, h: 12, minW: 4, minH: 10, maxW: 4, maxH: 20 },
      { i: "ataglance", x: 0, y: 24, w: 4, h: 12, minW: 4, minH: 10, maxW: 4, maxH: 20 },
      { i: "quicknote", x: 0, y: 36, w: 4, h: 10, minW: 4, minH: 8, maxW: 4, maxH: 16 },
      { i: "habit-tracker", x: 0, y: 46, w: 4, h: 10, minW: 4, minH: 8, maxW: 4, maxH: 16 },
    ],
    xxs: [
      { i: "tasks", x: 0, y: 0, w: 2, h: 12, minW: 2, minH: 10, maxW: 2, maxH: 20 },
      { i: "calendar", x: 0, y: 12, w: 2, h: 12, minW: 2, minH: 10, maxW: 2, maxH: 20 },
      { i: "ataglance", x: 0, y: 24, w: 2, h: 12, minW: 2, minH: 10, maxW: 2, maxH: 20 },
      { i: "quicknote", x: 0, y: 36, w: 2, h: 10, minW: 2, minH: 8, maxW: 2, maxH: 16 },
      { i: "habit-tracker", x: 0, y: 46, w: 2, h: 10, minW: 2, minH: 8, maxW: 2, maxH: 16 },
    ],
  };

  const [layouts, setLayouts] = useState(defaultLayouts);
  const [loadedSettings, setLoadedSettings] = useState(false);

  // Fetch user settings to get active widgets (client-side only) with caching
  const fetchUserSettings = useCallback(async () => {
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
  }, [isClient, user?.email]);

  useEffect(() => {
    if (isClient) {
      fetchUserSettings();
    } else {
      setActiveWidgets([]);
      setLoadedSettings(true);
    }
  }, [user?.email, isClient, fetchUserSettings]);

  // Listen for widget settings changes from WidgetToggle
  useEffect(() => {
    const handleWidgetSettingsChanged = () => {
      fetchUserSettings();
    };

    window.addEventListener('widgetSettingsChanged', handleWidgetSettingsChanged);
    return () => {
      window.removeEventListener('widgetSettingsChanged', handleWidgetSettingsChanged);
    };
  }, []);

  // Load layout from database on component mount (client-side only)
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

    // Set all widgets as visible immediately to fix visibility issue
    setVisibleWidgets(sortedWidgets);
    setLoadingProgress(100);

    // If we want progressive loading, we can enable it with faster loading:
    // setVisibleWidgets([]);
    // setLoadingProgress(0);
    // sortedWidgets.forEach((widget, index) => {
    //   setTimeout(() => {
    //     setVisibleWidgets(prev => [...prev, widget]);
    //     setLoadingProgress(((index + 1) / sortedWidgets.length) * 100);
    //   }, index * 100); // Reduced delay to 100ms
    // });
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

  // Calculate calendar date range for shared context
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekFromNow = new Date(startOfToday);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  oneWeekFromNow.setHours(23, 59, 59, 999);

  if (!loadedSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass p-6 rounded-2xl animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-4"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <CalendarProvider
      startDate={startOfToday}
      endDate={oneWeekFromNow}
      enabled={!!user?.email}
    >
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        {/* Dashboard Header */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-heading font-bold text-dark-base dark:text-soft-white mb-2">
                Dashboard
              </h1>
              <p className="text-grey-tint font-body">
                Welcome back! Here's your personalized overview.
              </p>
            </div>
            
            {/* Dashboard Controls */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const newLockState = !isLocked;
                  setIsLocked(newLockState);
                  localStorage.setItem("dashboardLocked", newLockState.toString());
                  window.dispatchEvent(new Event('lockStateChanged'));
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  isLocked 
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300' 
                    : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                }`}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span className="hidden sm:inline">{isLocked ? 'Unlock' : 'Lock'} Layout</span>
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard/settings'}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>

          {/* Dashboard Grid */}
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={40}
            onLayoutChange={onLayoutChange}
            isDraggable={!isLocked}
            isResizable={!isLocked}
            margin={[20, 20]}
            containerPadding={[20, 20]}
            compactType="vertical"
            preventCollision={false}
            useCSSTransforms={true}
          >
            {activeWidgets.map((key) => (
              <div key={key} className="glass p-4 rounded-2xl border border-white/20 backdrop-blur-sm flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex-shrink-0">
                      {getWidgetIcon(key)}
                    </div>
                    <h2 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white truncate">
                      {key === "ataglance" ? "Your Day at a Glance" : 
                       key === "habit-tracker" ? "Habit Tracker" :
                       key.charAt(0).toUpperCase() + key.slice(1)}
                    </h2>
                  </div>
                  
                  {!isLocked && (
                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                      <span className="text-xs text-grey-tint hidden sm:inline">Resizable</span>
                    </div>
                  )}
                </div>
                
                <div className="widget-content flex-1 overflow-hidden">
                  {visibleWidgets.includes(key) ? (
                    <ErrorBoundary>
                      <div className="h-full overflow-y-auto overflow-x-hidden">
                        {createWidgetComponent(key as WidgetType)}
                      </div>
                    </ErrorBoundary>
                  ) : (
                    <WidgetSkeleton type={key} />
                  )}
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>

          {/* Empty State */}
          {activeWidgets.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Grid3X3 className="w-12 h-12 text-primary-500" />
              </div>
              <h3 className="text-2xl font-heading font-semibold text-dark-base dark:text-soft-white mb-2">
                No widgets configured
              </h3>
              <p className="text-grey-tint font-body mb-6">
                Add widgets to your dashboard to get started
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/settings'}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>Configure Widgets</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </CalendarProvider>
  );
};

export default memo(DashboardGrid);
