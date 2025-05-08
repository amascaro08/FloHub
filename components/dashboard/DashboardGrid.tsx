"use client";

import { useState, useEffect, useRef, memo, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import {
  CheckSquare,
  Calendar,
  MessageSquare,
  Clock,
  FileText,
  Bug
} from 'lucide-react';

import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";
import AtAGlanceWidget from "@/components/widgets/AtAGlanceWidget";
import QuickNoteWidget from "@/components/widgets/QuickNoteWidget";
import DebugWidget from "@/components/widgets/DebugWidget";
import { ReactElement } from "react";
import { useAuth } from "../ui/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { UserSettings } from "@/types/app";

const ResponsiveGridLayout = WidthProvider(Responsive);

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "debug" | "habit-tracker";

// Define widget components
import HabitTrackerWidget from "@/components/widgets/HabitTrackerWidget";

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  ataglance: <AtAGlanceWidget />,
  quicknote: <QuickNoteWidget />,
  debug: <DebugWidget />,
  "habit-tracker": <HabitTrackerWidget />,
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
    case 'debug':
      return <Bug className="w-5 h-5" />;
    case 'habit-tracker':
      return <Clock className="w-5 h-5" />;
    default:
      return null;
  }
};

const DashboardGrid = () => {
  const { data: session } = useSession();
  const { isLocked } = useAuth();
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  
  // Memoize widget components to prevent unnecessary re-renders
  const memoizedWidgetComponents = useMemo(() => widgetComponents, []);

  // Define a default layout for different breakpoints
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
  
  // Fetch user settings to get active widgets
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (session?.user?.email) {
        try {
          const settingsDocRef = doc(db, "users", session.user.email, "settings", "userSettings");
          const docSnap = await getDoc(settingsDocRef);
          
          if (docSnap.exists()) {
            const userSettings = docSnap.data() as UserSettings;
            // Ensure habit-tracker is always included
            let active = userSettings.activeWidgets || [];
            if (!active.includes("habit-tracker")) {
              active.push("habit-tracker");
            }
            setActiveWidgets(active);
          } else {
            // If no settings exist, use all widgets, including habit-tracker
            setActiveWidgets(Object.keys(widgetComponents) as string[]);
          }
        } catch (e) {
          console.error("[DashboardGrid] Error fetching user settings:", e);
          // Default to all widgets on error, including habit-tracker
          setActiveWidgets(Object.keys(widgetComponents) as string[]);
        }
      }
    };
    
    fetchUserSettings();
  }, [session]);

  // Load layout from Firestore on component mount
  useEffect(() => {
    const fetchLayout = async () => {
      if (session?.user?.email) {
        const layoutRef = doc(db, "users", session.user.email, "settings", "layouts");
        try {
          const docSnap = await getDoc(layoutRef);
          if (docSnap.exists()) {
            const savedLayouts = docSnap.data()?.layouts;
            if (savedLayouts) {
              setLayouts(savedLayouts);
            } else {
              setLayouts(defaultLayouts);
            }
          } else {
            // If no layout exists, save the default layouts
            await setDoc(layoutRef, { layouts: defaultLayouts });
          }
        } catch (e) {
          console.error("[DashboardGrid] Error fetching layout:", e);
        }
      }
    };

    fetchLayout();
  }, [session]);


  // Ref to store the timeout ID for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to store the timeout ID for debouncing state updates
  const layoutChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to update layouts when activeWidgets changes
  useEffect(() => {
    // Only update if we have active widgets and layouts
    if (activeWidgets.length > 0 && Object.keys(layouts).length > 0) {
      // Create new layouts that only include active widgets
      const newLayouts: any = {};
      
      // For each breakpoint (lg, md, sm)
      (Object.keys(layouts) as Array<keyof typeof layouts>).forEach(breakpoint => {
        // Filter layouts to only include active widgets
        newLayouts[breakpoint] = layouts[breakpoint].filter(
          (item: any) => activeWidgets.includes(item.i)
        );
      });
      
      setLayouts(newLayouts);
    }
  }, [activeWidgets]);

  const onLayoutChange = (layout: any, allLayouts: any) => {
    try {
      // Recursively remove undefined values from the layouts object
      const cleanedLayouts = removeUndefined(allLayouts);

      // Clear any existing state update timeout
      if (layoutChangeTimeoutRef.current) {
        clearTimeout(layoutChangeTimeoutRef.current);
      }

      // Set a new timeout to update the state after a short delay
      layoutChangeTimeoutRef.current = setTimeout(() => {
        try {
          setLayouts(cleanedLayouts);
          console.log("[DashboardGrid] Layout state updated after debounce.");
        } catch (err) {
          console.error("[DashboardGrid] Error updating layout state:", err);
        }
      }, 50); // Short debounce time for state update (e.g., 50ms)

      // Clear any existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save the cleaned layout after a longer delay
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          console.log("[DashboardGrid] Attempting to save layout...");
          if (session?.user?.email) {
            const layoutRef = doc(db, "users", session.user.email, "settings", "layouts");
            await setDoc(layoutRef, { layouts: cleanedLayouts }); // Use cleanedLayouts directly
            console.log("[DashboardGrid] Layout saved successfully!");
          }
        } catch (e) {
          console.error("[DashboardGrid] Error saving layout:", e);
        }
      }, 500); // Debounce time for saving (e.g., 500ms)
    } catch (err) {
      console.error("[DashboardGrid] Error in onLayoutChange:", err);
    }
  };

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
          <div key={key} className="glass p-5 rounded-xl flex flex-col">
            <h2 className="widget-header">
              {getWidgetIcon(key)}
              {key === "ataglance" ? "Your Day at a Glance" : key.charAt(0).toUpperCase() + key.slice(1)}
            </h2>
            <div className="widget-content">
              {memoizedWidgetComponents[key as WidgetType]}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default memo(DashboardGrid);
