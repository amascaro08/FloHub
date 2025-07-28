
import { useState, useEffect, useRef, memo, lazy, Suspense, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import ErrorBoundary from '../ui/ErrorBoundary';
import LayoutTemplateSelector, { LayoutTemplate } from '../ui/LayoutTemplateSelector';
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

  // Component mount state to prevent updates after unmount
  const isMountedRef = useRef(true);

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

  // Template-based layouts (no manual lock/unlock needed)

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<LayoutTemplate>('auto');

  // Smart layout templates based on number of active widgets and template type
  const generateSmartLayout = (widgets: string[], template: LayoutTemplate = 'auto') => {
    const widgetCount = widgets.length;
    
    // Choose template based on type and widget count
    let selectedTemplateKey = template;
    if (template === 'auto') {
      // Auto-select best template based on widget count
      selectedTemplateKey = widgetCount <= 2 ? 'grid' : widgetCount === 3 ? 'focus' : 'balanced';
    }
    
    // Template configurations for different widget counts and types
    const templates = {
      1: { // Single widget - full width focus
        lg: (w: string) => ({ i: w, x: 2, y: 0, w: 8, h: 15, minW: 6, minH: 12, maxW: 12, maxH: 20 }),
        md: (w: string) => ({ i: w, x: 1, y: 0, w: 6, h: 15, minW: 4, minH: 12, maxW: 8, maxH: 20 }),
        sm: (w: string) => ({ i: w, x: 0, y: 0, w: 6, h: 15, minW: 6, minH: 12, maxW: 6, maxH: 20 }),
        xs: (w: string) => ({ i: w, x: 0, y: 0, w: 4, h: 15, minW: 4, minH: 12, maxW: 4, maxH: 20 }),
        xxs: (w: string) => ({ i: w, x: 0, y: 0, w: 2, h: 15, minW: 2, minH: 12, maxW: 2, maxH: 20 }),
      },
      2: { // Two widgets - side by side
        lg: (w: string, i: number) => ({ 
          i: w, x: i * 6, y: 0, w: 6, h: 15, minW: 4, minH: 12, maxW: 8, maxH: 20 
        }),
        md: (w: string, i: number) => ({ 
          i: w, x: i * 4, y: 0, w: 4, h: 15, minW: 4, minH: 12, maxW: 6, maxH: 20 
        }),
        sm: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 15, w: 6, h: 15, minW: 6, minH: 12, maxW: 6, maxH: 20 
        }),
        xs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 15, w: 4, h: 15, minW: 4, minH: 12, maxW: 4, maxH: 20 
        }),
        xxs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 15, w: 2, h: 15, minW: 2, minH: 12, maxW: 2, maxH: 20 
        }),
      },
      3: { // Three widgets - one large, two smaller
        lg: (w: string, i: number) => {
          if (i === 0) return { i: w, x: 0, y: 0, w: 6, h: 15, minW: 4, minH: 12, maxW: 8, maxH: 20 };
          return { i: w, x: 6, y: (i-1) * 7, w: 6, h: 7, minW: 4, minH: 6, maxW: 8, maxH: 12 };
        },
        md: (w: string, i: number) => {
          if (i === 0) return { i: w, x: 0, y: 0, w: 4, h: 15, minW: 4, minH: 12, maxW: 6, maxH: 20 };
          return { i: w, x: 4, y: (i-1) * 7, w: 4, h: 7, minW: 4, minH: 6, maxW: 6, maxH: 12 };
        },
        sm: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 12, w: 6, h: 12, minW: 6, minH: 10, maxW: 6, maxH: 18 
        }),
        xs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 12, w: 4, h: 12, minW: 4, minH: 10, maxW: 4, maxH: 18 
        }),
        xxs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 12, w: 2, h: 12, minW: 2, minH: 10, maxW: 2, maxH: 18 
        }),
      },
      4: { // Four widgets - 2x2 grid
        lg: (w: string, i: number) => ({ 
          i: w, x: (i % 2) * 6, y: Math.floor(i / 2) * 12, w: 6, h: 12, minW: 4, minH: 10, maxW: 8, maxH: 16 
        }),
        md: (w: string, i: number) => ({ 
          i: w, x: (i % 2) * 4, y: Math.floor(i / 2) * 12, w: 4, h: 12, minW: 4, minH: 10, maxW: 6, maxH: 16 
        }),
        sm: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 10, w: 6, h: 10, minW: 6, minH: 8, maxW: 6, maxH: 14 
        }),
        xs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 10, w: 4, h: 10, minW: 4, minH: 8, maxW: 4, maxH: 14 
        }),
        xxs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 10, w: 2, h: 10, minW: 2, minH: 8, maxW: 2, maxH: 14 
        }),
      },
      5: { // Five widgets - optimized layout
        lg: (w: string, i: number) => {
          if (i < 3) return { i: w, x: i * 4, y: 0, w: 4, h: 12, minW: 3, minH: 10, maxW: 6, maxH: 16 };
          return { i: w, x: (i - 3) * 6, y: 12, w: 6, h: 10, minW: 4, minH: 8, maxW: 8, maxH: 14 };
        },
        md: (w: string, i: number) => {
          if (i < 2) return { i: w, x: i * 4, y: 0, w: 4, h: 12, minW: 4, minH: 10, maxW: 6, maxH: 16 };
          return { i: w, x: ((i - 2) % 2) * 4, y: 12 + Math.floor((i - 2) / 2) * 10, w: 4, h: 10, minW: 4, minH: 8, maxW: 6, maxH: 14 };
        },
        sm: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 9, w: 6, h: 9, minW: 6, minH: 7, maxW: 6, maxH: 12 
        }),
        xs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 9, w: 4, h: 9, minW: 4, minH: 7, maxW: 4, maxH: 12 
        }),
        xxs: (w: string, i: number) => ({ 
          i: w, x: 0, y: i * 9, w: 2, h: 9, minW: 2, minH: 7, maxW: 2, maxH: 12 
        }),
             },
       
       // Additional template types
       grid: { // Equal sized grid
         lg: (w: string, i: number) => ({ 
           i: w, x: (i % 3) * 4, y: Math.floor(i / 3) * 12, w: 4, h: 12, minW: 3, minH: 10, maxW: 6, maxH: 16 
         }),
         md: (w: string, i: number) => ({ 
           i: w, x: (i % 2) * 4, y: Math.floor(i / 2) * 12, w: 4, h: 12, minW: 4, minH: 10, maxW: 6, maxH: 16 
         }),
         sm: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 10, w: 6, h: 10, minW: 6, minH: 8, maxW: 6, maxH: 14 
         }),
         xs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 10, w: 4, h: 10, minW: 4, minH: 8, maxW: 4, maxH: 14 
         }),
         xxs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 10, w: 2, h: 10, minW: 2, minH: 8, maxW: 2, maxH: 14 
         }),
       },
       
       focus: { // One large widget, others smaller
         lg: (w: string, i: number) => {
           if (i === 0) return { i: w, x: 0, y: 0, w: 8, h: 16, minW: 6, minH: 14, maxW: 10, maxH: 20 };
           return { i: w, x: 8, y: (i-1) * 8, w: 4, h: 8, minW: 3, minH: 6, maxW: 6, maxH: 12 };
         },
         md: (w: string, i: number) => {
           if (i === 0) return { i: w, x: 0, y: 0, w: 5, h: 16, minW: 4, minH: 14, maxW: 7, maxH: 20 };
           return { i: w, x: 5, y: (i-1) * 8, w: 3, h: 8, minW: 3, minH: 6, maxW: 5, maxH: 12 };
         },
         sm: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 12, w: 6, h: i === 0 ? 16 : 10, minW: 6, minH: i === 0 ? 14 : 8, maxW: 6, maxH: i === 0 ? 20 : 14 
         }),
         xs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 12, w: 4, h: i === 0 ? 16 : 10, minW: 4, minH: i === 0 ? 14 : 8, maxW: 4, maxH: i === 0 ? 20 : 14 
         }),
         xxs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 12, w: 2, h: i === 0 ? 16 : 10, minW: 2, minH: i === 0 ? 14 : 8, maxW: 2, maxH: i === 0 ? 20 : 14 
         }),
       },
       
       stack: { // Vertical stack
         lg: (w: string, i: number) => ({ 
           i: w, x: 3, y: i * 8, w: 6, h: 8, minW: 4, minH: 6, maxW: 8, maxH: 12 
         }),
         md: (w: string, i: number) => ({ 
           i: w, x: 2, y: i * 8, w: 4, h: 8, minW: 4, minH: 6, maxW: 6, maxH: 12 
         }),
         sm: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 8, w: 6, h: 8, minW: 6, minH: 6, maxW: 6, maxH: 12 
         }),
         xs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 8, w: 4, h: 8, minW: 4, minH: 6, maxW: 4, maxH: 12 
         }),
         xxs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 8, w: 2, h: 8, minW: 2, minH: 6, maxW: 2, maxH: 12 
         }),
       },
       
       balanced: { // Mixed balanced layout
         lg: (w: string, i: number) => {
           const positions = [
             { x: 0, y: 0, w: 6, h: 12 }, // Top left
             { x: 6, y: 0, w: 6, h: 8 },  // Top right
             { x: 6, y: 8, w: 6, h: 8 },  // Mid right
             { x: 0, y: 12, w: 4, h: 8 }, // Bottom left
             { x: 4, y: 12, w: 4, h: 8 }  // Bottom mid
           ];
           const pos = positions[i] || positions[positions.length - 1];
           return { i: w, ...pos, minW: 3, minH: 6, maxW: 8, maxH: 16 };
         },
         md: (w: string, i: number) => {
           const positions = [
             { x: 0, y: 0, w: 4, h: 12 }, 
             { x: 4, y: 0, w: 4, h: 8 },  
             { x: 4, y: 8, w: 4, h: 8 },  
             { x: 0, y: 12, w: 4, h: 8 }, 
             { x: 4, y: 16, w: 4, h: 8 }  
           ];
           const pos = positions[i] || positions[positions.length - 1];
           return { i: w, ...pos, minW: 4, minH: 6, maxW: 6, maxH: 16 };
         },
         sm: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 9, w: 6, h: 9, minW: 6, minH: 7, maxW: 6, maxH: 12 
         }),
         xs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 9, w: 4, h: 9, minW: 4, minH: 7, maxW: 4, maxH: 12 
         }),
         xxs: (w: string, i: number) => ({ 
           i: w, x: 0, y: i * 9, w: 2, h: 9, minW: 2, minH: 7, maxW: 2, maxH: 12 
         }),
       }
     };

     // Get the appropriate template configuration
     const getTemplateConfig = () => {
       if (widgetCount === 1) return templates[1];
       if (templates[selectedTemplateKey as keyof typeof templates]) {
         return templates[selectedTemplateKey as keyof typeof templates];
       }
       // Fallback to count-based template
       return templates[Math.min(widgetCount, 5) as keyof typeof templates];
     };

     const templateConfig = getTemplateConfig();
     
     const layouts: any = {};
     (['lg', 'md', 'sm', 'xs', 'xxs'] as const).forEach(breakpoint => {
       layouts[breakpoint] = widgets.map((widget, index) => 
         templateConfig[breakpoint](widget, index)
       );
     });

     return layouts;
  };

  const [layouts, setLayouts] = useState({});
  const [loadedSettings, setLoadedSettings] = useState(false);

  // Fetch user settings to get active widgets (client-side only) with caching
  const fetchUserSettings = useCallback(async () => {
    if (!isMountedRef.current || !isClient || !user?.email) return;
    
    try {
      // Check cache first
      const cacheKey = `userSettings_${user.email}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          if (Date.now() - cachedData.timestamp < 300000) { // 5 minutes cache
            if (isMountedRef.current) {
              setActiveWidgets(cachedData.activeWidgets || []);
              setLoadedSettings(true);
            }
            return;
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }

      const response = await fetch(`/api/userSettings?userId=${user.email}`);
      if (response.ok && isMountedRef.current) {
        const userSettings = await response.json() as UserSettings;
        const activeWidgets = userSettings.activeWidgets || [];
        setActiveWidgets(activeWidgets);
        
        // Cache the result
        sessionStorage.setItem(cacheKey, JSON.stringify({
          activeWidgets,
          timestamp: Date.now()
        }));
      } else if (isMountedRef.current) {
        setActiveWidgets([]);
      }
    } catch (e) {
      if (isMountedRef.current) {
        setActiveWidgets([]);
      }
    } finally {
      if (isMountedRef.current) {
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

  // Generate layouts when active widgets or template changes
  useEffect(() => {
    console.log('Layout generation effect triggered:', { activeWidgets, currentTemplate });
    if (activeWidgets.length > 0) {
      const smartLayouts = generateSmartLayout(activeWidgets, currentTemplate);
      console.log('Generated smart layouts:', smartLayouts);
      setLayouts(smartLayouts);
    } else {
      console.log('No active widgets, setting empty layouts');
      setLayouts({});
    }
  }, [activeWidgets, currentTemplate]);

  // Ref to store the timeout ID for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update layouts when activeWidgets changes (DISABLED - causing layout resets)
  // This effect was causing layout resets when navigating back to dashboard
  // Layout filtering should be handled at render time instead
  /*
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
  */

  // Progressive loading effect - prioritize important widgets
  useEffect(() => {
    if (!loadedSettings || activeWidgets.length === 0) {
      setVisibleWidgets([]);
      setLoadingProgress(0);
      return;
    }

    // Priority order for widget loading
    const priority = ["ataglance", "calendar", "tasks", "quicknote", "habit-tracker"];
    const sortedWidgets = [...activeWidgets].sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    // Set all widgets as visible immediately to fix visibility issue
    setVisibleWidgets(sortedWidgets);
    setLoadingProgress(100);
  }, [activeWidgets, loadedSettings]);

  const onLayoutChange = (layout: any, allLayouts: any) => {
    try {
      const cleanedLayouts = removeUndefined(allLayouts);

      // Only update if we have valid layouts with proper dimensions
      const hasValidLayouts = Object.keys(cleanedLayouts).some(breakpoint => {
        const bpLayouts = cleanedLayouts[breakpoint];
        return Array.isArray(bpLayouts) && bpLayouts.some(item => 
          item && item.w >= 2 && item.h >= 8 // Ensure minimum sizes
        );
      });

      if (!hasValidLayouts) {
        console.warn('Invalid layout change detected, ignoring');
        return;
      }

      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }
      layoutChangeTimeoutRef.current = setTimeout(() => {
        try {
          setLayouts(cleanedLayouts);
        } catch (err) {
          console.error('Error setting layouts:', err);
        }
      }, 100); // Increased debounce

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
          console.error('Error saving layouts:', e);
        }
      }, 1000); // Increased save delay
    } catch (err) {
      console.error('Error in onLayoutChange:', err);
    }
  };

  // Calculate calendar date range for shared context
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekFromNow = new Date(startOfToday);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  oneWeekFromNow.setHours(23, 59, 59, 999);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }
    };
  }, []);

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
                onClick={() => window.location.href = '/dashboard/settings'}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Widget Settings</span>
              </button>
            </div>
          </div>

          {/* Layout Template Selector */}
          <LayoutTemplateSelector
            currentTemplate={currentTemplate}
            widgetCount={activeWidgets.length}
            onTemplateChange={setCurrentTemplate}
            isVisible={activeWidgets.length > 1}
          />

          {/* Dashboard Grid */}
          <ResponsiveGridLayout
            className="layout"
            layouts={(() => {
              // Filter layouts to only include active widgets at render time
              console.log('Render time layout filtering:', { activeWidgets, layoutsKeys: Object.keys(layouts) });
              if (activeWidgets.length === 0 || Object.keys(layouts).length === 0) {
                console.log('Returning empty layouts due to no active widgets or no layouts');
                return {};
              }
              
              const filteredLayouts: any = {};
              Object.keys(layouts).forEach(breakpoint => {
                const layoutForBreakpoint = (layouts as any)[breakpoint];
                if (Array.isArray(layoutForBreakpoint)) {
                  filteredLayouts[breakpoint] = layoutForBreakpoint.filter(
                    (item: any) => activeWidgets.includes(item.i)
                  );
                }
              });
              console.log('Filtered layouts for render:', filteredLayouts);
              return filteredLayouts;
            })()}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={40}
            onLayoutChange={onLayoutChange}
            isDraggable={false}
            isResizable={false}
            margin={[20, 20]}
            containerPadding={[20, 20]}
            compactType="vertical"
            preventCollision={false}
            useCSSTransforms={true}
          >
            {(() => {
              console.log('Rendering widgets:', { activeWidgets, visibleWidgets });
              return activeWidgets.map((key) => (
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
                  
                  <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                    <span className="text-xs text-grey-tint hidden sm:inline">Template</span>
                  </div>
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
            ));
            })()}
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
