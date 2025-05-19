"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserSettings } from "@/types/app";
import { ReactElement } from "react";
import { useAuth } from "../ui/AuthContext";

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

// Default widget order for mobile - putting quicknote later in the order to improve initial load time
const defaultWidgetOrder: WidgetType[] = ["ataglance", "calendar", "tasks", "habit-tracker", "quicknote"];

export default function MobileDashboard() {
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  
  // Use useSession with required: false to handle SSR
  const { data: session } = useSession({ required: false });

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  // Safely use useAuth only on client side
  const auth = isClient ? useAuth() : null;
  const isLocked = auth?.isLocked || false;
  
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(defaultWidgetOrder);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetType[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  
  // Fetch user settings to get active widgets (client-side only)
  useEffect(() => {
    const fetchUserSettings = async () => {
      setIsLoading(true);
      if (isClient && session?.user?.email) {
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
    
    if (isClient) {
      fetchUserSettings();
    } else {
      // For SSR, use default widgets
      setIsLoading(false);
    }
  }, [session, isClient]);
  
  // Save widget order when it changes
  const saveWidgetOrder = async () => {
    if (isClient && session?.user?.email) {
      try {
        const settingsDocRef = doc(db, "users", session.user.email, "settings", "userSettings");
        const docSnap = await getDoc(settingsDocRef);
        
        if (docSnap.exists()) {
          const userSettings = docSnap.data() as UserSettings;
          await setDoc(settingsDocRef, {
            ...userSettings,
            activeWidgets: activeWidgets
          });
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

    // First, immediately show the first widget (usually "at a glance")
    setVisibleWidgets([activeWidgets[0]]);
    
    // Then progressively show the rest of the widgets, with priority
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
    
    // Load the second and third widgets quickly
    const timer2 = setTimeout(loadNextWidgets, 200);
    const timer3 = setTimeout(loadNextWidgets, 300);
    
    // Delay loading the QuickNoteWidget (if it exists in the active widgets)
    const quicknoteIndex = activeWidgets.indexOf("quicknote");
    let quicknoteTimer: NodeJS.Timeout | null = null;
    
    if (quicknoteIndex > 0) {
      quicknoteTimer = setTimeout(() => {
        setVisibleWidgets(prev => {
          if (prev.includes("quicknote")) return prev;
          if (prev.length < quicknoteIndex) {
            // Make sure all widgets before quicknote are loaded
            const widgetsBeforeQuicknote = activeWidgets.slice(0, quicknoteIndex);
            // Create a unique array without using Set
            const combinedWidgets = [...prev, ...widgetsBeforeQuicknote, "quicknote"] as WidgetType[];
            return combinedWidgets.filter((value, index, self) =>
              self.indexOf(value) === index
            ) as WidgetType[];
          }
          return [...prev, "quicknote" as WidgetType];
        });
      }, 500); // Delay loading QuickNoteWidget
    }
    
    // Set up intersection observer for lazy loading remaining widgets (client-side only)
    const observer = isClient && 'IntersectionObserver' in window ?
      new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadNextWidgets();
        }
      });
      }, { rootMargin: '200px' }) : null;
    
    // Observe the last visible widget (client-side only)
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