"use client";

import { useState, useEffect, lazy, Suspense } from "react";

import { UserSettings } from "@/types/app";
import { ReactElement } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { CalendarProvider } from "@/contexts/CalendarContext";

import OptimizedSkeleton from '@/components/ui/OptimizedSkeleton';

// Widget skeleton for loading state
const WidgetSkeleton = ({ type }: { type?: string }) => (
  <OptimizedSkeleton variant={type as any} />
);

// Lazy load widgets
const TaskWidget = lazy(() => import("@/components/widgets/TaskWidget"));
const CalendarWidget = lazy(() => import("@/components/widgets/CalendarWidget"));
const AtAGlanceWidget = lazy(() => import("@/components/widgets/AtAGlanceWidget"));
const SmartAtAGlanceWidget = lazy(() => import("@/components/widgets/SmartAtAGlanceWidget"));
const QuickNoteWidget = lazy(() => import("@/components/widgets/QuickNoteWidget"));
const HabitTrackerWidget = lazy(() => import("@/components/widgets/HabitTrackerWidget"));

type WidgetType = "tasks" | "calendar" | "ataglance" | "smart-ataglance" | "quicknote" | "habit-tracker";

// Define widget components with Suspense and optimized skeletons
const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <Suspense fallback={<WidgetSkeleton type="tasks" />}><TaskWidget /></Suspense>,
  calendar: <Suspense fallback={<WidgetSkeleton type="calendar" />}><CalendarWidget /></Suspense>,
  ataglance: <Suspense fallback={<WidgetSkeleton type="ataglance" />}><AtAGlanceWidget /></Suspense>,
  "smart-ataglance": <Suspense fallback={<WidgetSkeleton type="ataglance" />}><SmartAtAGlanceWidget /></Suspense>,
  quicknote: <Suspense fallback={<WidgetSkeleton type="generic" />}><QuickNoteWidget /></Suspense>,
  "habit-tracker": <Suspense fallback={<WidgetSkeleton type="generic" />}><HabitTrackerWidget /></Suspense>,
};

// Default widget order for mobile
const defaultWidgetOrder: WidgetType[] = ["ataglance", "calendar", "tasks", "habit-tracker", "quicknote"];

export default function MobileDashboard() {
  const isClient = typeof window !== 'undefined';

  // === LOCK STATE: read from shared storage ===
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
        window.removeEventListener('storage', handleLockChange);
        window.removeEventListener('lockStateChanged', handleLockChange);
      };
    }
  }, [isClient]);

  // Use useUser to trigger auth state, but NOT for lock
  const { user, isLoading: isUserLoading } = useUser();

  // ----
  // (In your original, you had user.primaryEmail. If you're now using Stack Auth, email is at user.primaryEmail)
  // ----

  // user logic (Stack Auth: user object replaces user)
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(defaultWidgetOrder);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetType[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Fetch user settings to get active widgets (client-side only)
  useEffect(() => {
    const fetchUserSettings = async () => {
      setIsLoading(true);
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
            console.error("[MobileDashboard] Failed to fetch user settings, using defaults.");
          }
        } catch (error) {
          console.error("[MobileDashboard] Error fetching user settings:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchUserSettings();
  }, [user?.primaryEmail, isClient]);

  // Save widget order when it changes
  const saveWidgetOrder = async () => {
    if (isClient && user?.primaryEmail) {
      try {
        await fetch('/api/userSettings/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.primaryEmail,
            activeWidgets: activeWidgets
          }),
        });
      } catch (error) {
        console.error("[MobileDashboard] Error saving widget order:", error);
      }
    }
  };

  // Widget reordering functions
  const moveWidgetUp = (widgetId: WidgetType) => {
    setActiveWidgets(prev => {
      const newOrder = [...prev];
      const index = newOrder.indexOf(widgetId);
      if (index > 0) {
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      }
      return newOrder;
    });
  };

  const moveWidgetDown = (widgetId: WidgetType) => {
    setActiveWidgets(prev => {
      const newOrder = [...prev];
      const index = newOrder.indexOf(widgetId);
      if (index < newOrder.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      return newOrder;
    });
  };

  // Progressive loading of widgets
  useEffect(() => {
    if (isLoading) return;

    let timer: NodeJS.Timeout;
    let timer2: NodeJS.Timeout;
    let timer3: NodeJS.Timeout;
    let quicknoteTimer: NodeJS.Timeout | undefined;

    const loadNextWidgets = () => {
      setVisibleWidgets(prev => {
        if (prev.length >= activeWidgets.length) return prev;
        return activeWidgets.slice(0, prev.length + 1);
      });
    };

    // Load first widget immediately
    timer = setTimeout(() => {
      setVisibleWidgets(activeWidgets.slice(0, 1));
    }, 100);

    // Load second widget after a short delay
    timer2 = setTimeout(() => {
      setVisibleWidgets(prev => {
        if (prev.length >= activeWidgets.length) return prev;
        return activeWidgets.slice(0, 2);
      });
    }, 300);

    // Load remaining widgets progressively
    timer3 = setTimeout(() => {
      setVisibleWidgets(prev => {
        if (prev.length >= activeWidgets.length) return prev;
        const combinedWidgets = [...prev, ...activeWidgets.slice(2)];
        // Remove duplicates and ensure quicknote is always last
        if (combinedWidgets.includes("quicknote" as WidgetType)) {
          return combinedWidgets.filter((value, index, self) =>
            self.indexOf(value) === index
          ) as WidgetType[];
        }
        return [...prev, "quicknote" as WidgetType];
      });
    }, 500);
    const observer = isClient && 'IntersectionObserver' in window ?
      new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadNextWidgets();
          }
        });
      }, { rootMargin: '200px' }) : null;
    if (isClient && observer) {
      const lastWidget = document.querySelector('.mobile-widget:last-child');
      if (lastWidget) {
        observer.observe(lastWidget);
      }
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (quicknoteTimer) clearTimeout(quicknoteTimer);
      if (observer) observer.disconnect();
    };
  }, [isLoading, activeWidgets, isClient]);

  // Calculate calendar date range for shared context
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekFromNow = new Date(startOfToday);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  oneWeekFromNow.setHours(23, 59, 59, 999);

  if (isUserLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-2 py-4">
        <div className="glass px-2 py-2 rounded-xl shadow-md animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="glass px-2 py-2 rounded-xl shadow-md animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <CalendarProvider
      startDate={startOfToday}
      endDate={oneWeekFromNow}
      enabled={!!user?.primaryEmail}
    >
      <div className="grid grid-cols-1 gap-4 px-2 py-4">
        {activeWidgets.length === 0 ? (
          <div className="glass px-4 py-4 rounded-xl shadow-md text-center">
            <p className="text-gray-500 dark:text-gray-400">No widgets selected. Visit settings to add widgets.</p>
          </div>
        ) : (
          visibleWidgets.map((widgetId, index) => (
            <div key={widgetId} className="glass px-2 py-2 rounded-xl shadow-md mobile-widget">
              <h2 className="font-semibold capitalize mb-2 flex justify-between items-center">
                <span>
                  {widgetId === "ataglance" ? "Your Day at a Glance" : widgetId.charAt(0).toUpperCase() + widgetId.slice(1)}
                </span>
                {!isLocked && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => moveWidgetUp(widgetId)}
                      disabled={index === 0}
                      className={`p-1 rounded ${index === 0 ? 'opacity-50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      aria-label="Move widget up"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => moveWidgetDown(widgetId)}
                      disabled={index === activeWidgets.length - 1}
                      className={`p-1 rounded ${index === activeWidgets.length - 1 ? 'opacity-50' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                      aria-label="Move widget down"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                )}
              </h2>
              <div className="flex-1 overflow-auto">
                {widgetComponents[widgetId]}
              </div>
            </div>
          ))
        )}
        {visibleWidgets.length < activeWidgets.length && (
          <div className="glass px-2 py-2 rounded-xl shadow-md animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        )}
      </div>
    </CalendarProvider>
  );
}
