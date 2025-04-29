"use client";

import React, { useState, useEffect } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote";

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  ataglance: <AtAGlanceWidget />,
  quicknote: <QuickNoteWidget />,
};

// Map widget id to component
const getWidgetComponent = (id: string) => {
  return widgetComponents[id as WidgetType] || null;
};

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {
  const { data: session } = useSession();
  const { isLocked } = useAuth();

  // Define a default layout in react-grid-layout format
  const defaultLayout = [
    { i: "tasks", x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 5 },
    { i: "calendar", x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 5 },
    { i: "ataglance", x: 4, y: 6, w: 4, h: 6, minW: 3, minH: 5 },
    { i: "quicknote", x: 0, y: 6, w: 4, h: 6, minW: 3, minH: 5 },
  ];

  // State to hold the current widget layout
  const [layout, setLayout] = useState(defaultLayout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load layout from Firestore on component mount
  useEffect(() => {
    const fetchLayout = async () => {
      if (session?.user?.email) {
        const layoutRef = doc(db, "users", session.user.email, "settings", "layout");
        try {
          const docSnap = await getDoc(layoutRef);
          if (docSnap.exists()) {
            const savedLayout = docSnap.data()?.layout;
            if (Array.isArray(savedLayout) && savedLayout.every((item: any) => item.i && typeof item.x === 'number' && typeof item.y === 'number' && typeof item.w === 'number' && typeof item.h === 'number')) {
              // Merge saved layout with default layout to include new widgets
              const mergedLayout = defaultLayout.map(defaultWidget => {
                const savedWidget = savedLayout.find((sw: any) => sw.i === defaultWidget.i);
                return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
              });
               // Add any new widgets from savedLayout that are not in defaultLayout
              const finalLayout = [...mergedLayout, ...savedLayout.filter((savedWidget: any) => !defaultLayout.some(defaultWidget => defaultWidget.i === savedWidget.i))];

              setLayout(finalLayout);
            } else {
              console.error("Invalid layout data in Firestore, using default layout.");
              setLayout(defaultLayout); // Fallback to default if data is invalid
            }
          } else {
            // If no layout exists, save the default layout
            await setDoc(layoutRef, { layout: defaultLayout });
          }
        } catch (e) {
          console.error("Error fetching layout:", e);
        }
      }
    };

    fetchLayout();
  }, [session]);

  // Save layout to Firestore whenever the layout state changes
  useEffect(() => {
    const saveLayout = async () => {
      if (session?.user?.email && mounted) { // Save if session exists and component is mounted
        const layoutRef = doc(db, "users", session.user.email, "settings", "layout");
        try {
          await setDoc(layoutRef, { layout });
        } catch (e) {
          console.error("Error saving layout:", e);
        }
      }
    };

    // Add a small delay before saving to avoid excessive writes during rapid changes (e.g., resizing)
    const handler = setTimeout(() => {
      saveLayout();
    }, 500); // Adjust delay as needed

    return () => {
      // Clean up the timeout on unmount or when dependencies change
      clearTimeout(handler);
    };

  }, [layout, session, mounted]); // Save when layout, session, or mounted state changes

  const onLayoutChange = (currentLayout: any) => {
    setLayout(currentLayout);
  };

  return (
    <div className="w-full h-full">
      {mounted && (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          isDraggable={!isLocked}
          isResizable={!isLocked}
          onLayoutChange={onLayoutChange}
          // Prevent collision when dragging
          compactType="vertical" // or "horizontal"
          preventCollision={true}
        >
          {layout.map((item) => (
            <div key={item.i} className="glass p-4 rounded-xl shadow-md flex flex-col overflow-hidden">
              <div className="font-semibold capitalize mb-2">
                 {item.i === "ataglance" ? "Your Day at a Glance" : item.i.charAt(0).toUpperCase() + item.i.slice(1)}
              </div>
              <div className="flex-1 overflow-auto">
                 {getWidgetComponent(item.i)}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
