"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserSettings } from "@/types/app";
import { ReactElement } from "react";

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
const defaultWidgetOrder: WidgetType[] = ["ataglance", "calendar", "tasks", "quicknote", "habit-tracker"];

export default function MobileDashboard() {
  const { data: session } = useSession();
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(defaultWidgetOrder);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetType[]>([]);
  
  // Fetch user settings to get active widgets
  useEffect(() => {
    const fetchUserSettings = async () => {
      setIsLoading(true);
      if (session?.user?.email) {
        try {
          const settingsDocRef = doc(db, "users", session.user.email, "settings", "userSettings");
          const docSnap = await getDoc(settingsDocRef);
          
          if (docSnap.exists()) {
            const userSettings = docSnap.data() as UserSettings;
            if (userSettings.activeWidgets && userSettings.activeWidgets.length > 0) {
              // Filter to only include valid widget types and maintain order
              const validWidgets = userSettings.activeWidgets.filter(
                widget => Object.keys(widgetComponents).includes(widget)
              ) as WidgetType[];
              
              setActiveWidgets(validWidgets);
            }
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
    
    fetchUserSettings();
  }, [session]);

  // Progressive loading of widgets
  useEffect(() => {
    if (isLoading || activeWidgets.length === 0) return;

    // First, immediately show the first widget (usually "at a glance")
    setVisibleWidgets([activeWidgets[0]]);
    
    // Then progressively show the rest of the widgets
    const loadNextWidgets = () => {
      setVisibleWidgets(prev => {
        if (prev.length >= activeWidgets.length) return prev;
        
        // Add the next widget
        const nextIndex = prev.length;
        return [...prev, activeWidgets[nextIndex]];
      });
    };
    
    // Load the next widget after a short delay
    const timer = setTimeout(loadNextWidgets, 100);
    
    // Set up intersection observer for lazy loading remaining widgets
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadNextWidgets();
        }
      });
    }, { rootMargin: '200px' });
    
    // Observe the last visible widget
    const lastWidget = document.querySelector('.mobile-widget:last-child');
    if (lastWidget) {
      observer.observe(lastWidget);
    }
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isLoading, activeWidgets]);
  
  if (isLoading) {
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
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {/* Optional: Add a small indicator for drag-to-reorder in settings */}
                Reorder in settings
              </span>
            </h2>
            <div className="flex-1 overflow-auto">
              {widgetComponents[widgetId]}
            </div>
          </div>
        ))
      )}
      {/* Loading indicator for remaining widgets */}
      {visibleWidgets.length < activeWidgets.length && (
        <div className="glass px-2 py-2 rounded-xl shadow-md animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      )}
    </div>
  );
}