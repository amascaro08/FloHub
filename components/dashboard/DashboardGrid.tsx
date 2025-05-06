"use client";

import { useState, useEffect, useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";

import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";
import AtAGlanceWidget from "@/components/widgets/AtAGlanceWidget";
import QuickNoteWidget from "@/components/widgets/QuickNoteWidget";
import { ReactElement } from "react";
import { useAuth } from "../ui/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";

const ResponsiveGridLayout = WidthProvider(Responsive);

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote";

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  ataglance: <AtAGlanceWidget />,
  quicknote: <QuickNoteWidget />,
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

export default function DashboardGrid() {
  const { data: session } = useSession();
  const { isLocked } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define a default layout for different breakpoints
  const defaultLayouts = {
    lg: [
      { i: "tasks", x: 0, y: 0, w: 3, h: 5 },
      { i: "calendar", x: 3, y: 0, w: 3, h: 5 },
      { i: "ataglance", x: 0, y: 5, w: 3, h: 5 },
      { i: "quicknote", x: 3, y: 5, w: 3, h: 5 },
    ],
    md: [
      { i: "tasks", x: 0, y: 0, w: 4, h: 5 },
      { i: "calendar", x: 4, y: 0, w: 4, h: 5 },
      { i: "ataglance", x: 0, y: 5, w: 4, h: 5 },
      { i: "quicknote", x: 4, y: 5, w: 4, h: 5 },
    ],
    sm: [
      { i: "tasks", x: 0, y: 0, w: 6, h: 5 },
      { i: "calendar", x: 0, y: 5, w: 6, h: 5 },
      { i: "ataglance", x: 0, y: 10, w: 6, h: 5 },
      { i: "quicknote", x: 0, y: 15, w: 6, h: 5 },
    ],
  };

  const [layouts, setLayouts] = useState(defaultLayouts);

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

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [session]);


  const onLayoutChange = (layout: any, allLayouts: any) => {
    // Recursively remove undefined values from the layouts object
    const cleanedLayouts = removeUndefined(allLayouts);

    // Update the state immediately for responsiveness
    setLayouts(cleanedLayouts);

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout to save the cleaned layout after a delay
    saveTimeoutRef.current = setTimeout(async () => {
      console.log("[DashboardGrid] Attempting to save layout...");
      if (session?.user?.email) {
        const layoutRef = doc(db, "users", session.user.email, "settings", "layouts");
        try {
          await setDoc(layoutRef, { layouts: cleanedLayouts }); // Use cleanedLayouts directly
          console.log("[DashboardGrid] Layout saved successfully!");
        } catch (e) {
          console.error("[DashboardGrid] Error saving layout:", e);
        }
      }
    }, 500);
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 8, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
      isDraggable={!isLocked}
      isResizable={!isLocked}
    >
      {Object.keys(widgetComponents).map((key) => (
        <div key={key} className="glass p-4 rounded-xl shadow-md flex flex-col">
          <h2 className="font-semibold capitalize mb-2">
            {key === "ataglance" ? "Your Day at a Glance" : key.charAt(0).toUpperCase() + key.slice(1)}
          </h2>
          <div className="flex-1 overflow-auto">
            {widgetComponents[key as WidgetType]}
          </div>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
