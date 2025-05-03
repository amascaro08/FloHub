"use client";

import { useState, useEffect } from "react";
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

export default function DashboardGrid() {
  const { data: session } = useSession();
  const { isLocked } = useAuth();

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
  }, [session]);

  // Save layout to Firestore whenever the layouts state changes
  useEffect(() => {
    const saveLayout = async () => {
      console.log("[DashboardGrid] Attempting to save layout...");
      if (session?.user?.email) {
        const layoutRef = doc(db, "users", session.user.email, "settings", "layouts");
        try {
          await setDoc(layoutRef, { layouts });
          console.log("[DashboardGrid] Layout saved successfully!");
        } catch (e) {
          console.error("[DashboardGrid] Error saving layout:", e);
        }
      }
    };

    const handler = setTimeout(() => {
      saveLayout();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [layouts, session]);

  const onLayoutChange = (layout: any, allLayouts: any) => {
    // Clean the layouts object before saving
    const cleanedLayouts: any = {};
    for (const breakpoint in allLayouts) {
      if (Array.isArray(allLayouts[breakpoint])) {
        cleanedLayouts[breakpoint] = allLayouts[breakpoint].filter(
          (item: any) =>
            item !== undefined &&
            item !== null &&
            typeof item.i === 'string' && // Ensure 'i' is a string
            typeof item.x === 'number' && // Ensure 'x' is a number
            typeof item.y === 'number' && // Ensure 'y' is a number
            typeof item.w === 'number' && // Ensure 'w' is a number
            typeof item.h === 'number'    // Ensure 'h' is a number
        );
      }
    }
    setLayouts(cleanedLayouts);
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
