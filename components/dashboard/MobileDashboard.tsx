"use client";

import { useState, useEffect, lazy, Suspense } from "react";

import { UserSettings } from "@/types/app";
import { ReactElement } from "react";
import { useUser } from "@/lib/hooks/useUser";

// Widget skeleton for loading state
const WidgetSkeleton = () => (
  <div className="animate-pulse w-full">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

// Lazy load widgets
const TaskWidget = lazy(() => import("@/components/widgets/TaskWidget"));
const CalendarWidget = lazy(() => import("@/components/widgets/CalendarWidget"));
const AtAGlanceWidget = lazy(() => import("@/components/widgets/AtAGlanceWidget"));
const QuickNoteWidget = lazy(() => import("@/components/widgets/QuickNoteWidget"));
const HabitTrackerWidget = lazy(() => import("@/components/widgets/HabitTrackerWidget"));

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "habit-tracker";

// Define widget components with Suspense
const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <Suspense fallback={<WidgetSkeleton />}><TaskWidget /></Suspense>,
  calendar: <Suspense fallback={<WidgetSkeleton />}><CalendarWidget /></Suspense>,
  ataglance: <Suspense fallback={<WidgetSkeleton />}><AtAGlanceWidget /></Suspense>,
  quicknote: <Suspense fallback={<WidgetSkeleton />}><QuickNoteWidget /></Suspense>,
  "habit-tracker": <Suspense fallback={<WidgetSkeleton />}><HabitTrackerWidget /></Suspense>,
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
  // (In your original, you had user.primaryEmail. If you’re now using Stack Auth, email is at user.primaryEmail)
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
        } catch (e) {
          console.error("[MobileDashboard] Error fetching user settings:", e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    if (isClient) {
      fetchUserSettings();
    } else {
      setIsLoading(false);
    }
  }, [user, isClient]);

  // Save widget order when it changes
  const saveWidgetOrder = async () => {
    if (isClient && user?.primaryEmail) {
      try {
        const response = await fetch("/api/userSettings/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ activeWidgets: activeWidgets }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[MobileDashboard] Failed to save widget order:", errorData.error);
        }
      } catch (e) {
        console.error("[MobileDashboard] Error saving widget order:", e);
      }
    }
  };

  // Handle widget reordering
  const moveWidgetUp = (widgetId: WidgetType) => {
    const index = activeWidgets.indexOf(widgetId);
    if (index > 0) {
      const newActiveWidgets = [...activeWidgets];
      [newActiveWidgets[index - 1], newActiveWidgets[index]] = [newActiveWidgets[index], newActiveWidgets[index - 1]];
      setActiveWidgets(newActiveWidgets);
      saveWidgetOrder();
    }
  };

  const moveWidgetDown = (widgetId: WidgetType) => {
    const index = activeWidgets.indexOf(widgetId);
    if (index < activeWidgets.length - 1) {
      const newActiveWidgets = [...activeWidgets];
      [newActiveWidgets[index], newActiveWidgets[index + 1]] = [newActiveWidgets[index + 1], newActiveWidgets[index]];
      setActiveWidgets(newActiveWidgets);
      saveWidgetOrder();
    }
  };

  // Progressive loading of widgets with prioritization (client-side only)
  useEffect(() => {
    if (!isClient || isLoading || activeWidgets.length === 0) return;

    setVisibleWidgets([activeWidgets[0]]);
    const loadNextWidgets = () => {
      setVisibleWidgets(prev => {
        if (prev.length >= activeWidgets.length) return prev;
        const nextIndex = prev.length;
        return [...prev, activeWidgets[nextIndex]];
      });
    };
    const timer = setTimeout(loadNextWidgets, 100);
    const timer2 = setTimeout(loadNextWidgets, 200);
    const timer3 = setTimeout(loadNextWidgets, 300);
    const quicknoteIndex = activeWidgets.indexOf("quicknote");
    let quicknoteTimer: NodeJS.Timeout | null = null;
    if (quicknoteIndex > 0) {
      quicknoteTimer = setTimeout(() => {
        setVisibleWidgets(prev => {
          if (prev.includes("quicknote")) return prev;
          if (prev.length < quicknoteIndex) {
            const widgetsBeforeQuicknote = activeWidgets.slice(0, quicknoteIndex);
            const combinedWidgets = [...prev, ...widgetsBeforeQuicknote, "quicknote"] as WidgetType[];
            return combinedWidgets.filter((value, index, self) =>
              self.indexOf(value) === index
            ) as WidgetType[];
          }
          return [...prev, "quicknote" as WidgetType];
        });
      }, 500);
    }
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
  );
}
