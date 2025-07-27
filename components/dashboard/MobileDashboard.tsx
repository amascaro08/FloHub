"use client";

import { useState, useEffect, lazy, Suspense } from "react";

import { UserSettings } from "@/types/app";
import { ReactElement } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { CalendarProvider } from "@/contexts/CalendarContext";

import OptimizedSkeleton from '@/components/ui/OptimizedSkeleton';
import { 
  Lock, 
  Unlock, 
  Settings, 
  Sparkles, 
  Plus, 
  Grid3X3,
  ChevronUp,
  ChevronDown,
  Move,
  CheckSquare,
  Calendar,
  Clock,
  FileText
} from 'lucide-react';

// Widget skeleton for loading state
const WidgetSkeleton = ({ type }: { type?: string }) => (
  <OptimizedSkeleton variant={type as any} />
);

// Lazy load widgets
const TaskWidget = lazy(() => import("@/components/widgets/TaskWidget"));
const CalendarWidget = lazy(() => import("@/components/widgets/CalendarWidget"));
const SmartAtAGlanceWidget = lazy(() => import("@/components/widgets/SmartAtAGlanceWidget"));
const QuickNoteWidget = lazy(() => import("@/components/widgets/QuickNoteWidget"));
const HabitTrackerWidget = lazy(() => import("@/components/widgets/HabitTrackerWidget"));

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "habit-tracker";

// Define widget components with Suspense and optimized skeletons
const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <Suspense fallback={<WidgetSkeleton type="tasks" />}><TaskWidget /></Suspense>,
  calendar: <Suspense fallback={<WidgetSkeleton type="calendar" />}><CalendarWidget /></Suspense>,
  ataglance: <Suspense fallback={<WidgetSkeleton type="ataglance" />}><SmartAtAGlanceWidget /></Suspense>,
  quicknote: <Suspense fallback={<WidgetSkeleton type="generic" />}><QuickNoteWidget /></Suspense>,
  "habit-tracker": <Suspense fallback={<WidgetSkeleton type="generic" />}><HabitTrackerWidget /></Suspense>,
};

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

  // user logic (Stack Auth: user object replaces user)
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(defaultWidgetOrder);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleWidgets, setVisibleWidgets] = useState<WidgetType[]>([]);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Fetch user settings to get active widgets (client-side only)
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

  useEffect(() => {
    fetchUserSettings();
  }, [user?.primaryEmail, isClient]);

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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass p-4 rounded-2xl animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-3"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
      enabled={!!user?.primaryEmail}
    >
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        {/* Mobile Dashboard Header */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-heading font-bold text-dark-base dark:text-soft-white">
                Dashboard
              </h1>
              <p className="text-grey-tint font-body text-sm">
                Your mobile overview
              </p>
            </div>
            
            {/* Mobile Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newLockState = !isLocked;
                  setIsLocked(newLockState);
                  localStorage.setItem("dashboardLocked", newLockState.toString());
                  window.dispatchEvent(new Event('lockStateChanged'));
                }}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  isLocked 
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300' 
                    : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                }`}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard/settings'}
                className="p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Widgets */}
          <div className="space-y-4">
            {activeWidgets.length === 0 ? (
              <div className="glass p-6 rounded-2xl text-center">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Grid3X3 className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-2">
                  No widgets configured
                </h3>
                <p className="text-grey-tint font-body text-sm mb-4">
                  Add widgets to your dashboard to get started
                </p>
                <button
                  onClick={() => window.location.href = '/dashboard/settings'}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure Widgets</span>
                </button>
              </div>
            ) : (
              visibleWidgets.map((widgetId, index) => (
                <div key={widgetId} className="glass p-4 rounded-2xl mobile-widget">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                        {getWidgetIcon(widgetId)}
                      </div>
                      <h2 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white">
                        {widgetId === "ataglance" ? "Your Day at a Glance" : 
                         widgetId === "habit-tracker" ? "Habit Tracker" :
                         widgetId.charAt(0).toUpperCase() + widgetId.slice(1)}
                      </h2>
                    </div>
                    
                    {!isLocked && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => moveWidgetUp(widgetId)}
                          disabled={index === 0}
                          className={`p-1 rounded-lg transition-all duration-200 ${
                            index === 0 
                              ? 'opacity-30 text-grey-tint' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-grey-tint'
                          }`}
                          aria-label="Move widget up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveWidgetDown(widgetId)}
                          disabled={index === activeWidgets.length - 1}
                          className={`p-1 rounded-lg transition-all duration-200 ${
                            index === activeWidgets.length - 1 
                              ? 'opacity-30 text-grey-tint' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-grey-tint'
                          }`}
                          aria-label="Move widget down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-auto">
                    {widgetComponents[widgetId]}
                  </div>
                </div>
              ))
            )}
            
            {visibleWidgets.length < activeWidgets.length && (
              <div className="glass p-4 rounded-2xl animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-3"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </CalendarProvider>
  );
}
