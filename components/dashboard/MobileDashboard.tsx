"use client";

import { useState, useEffect } from "react";
import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";
import AtAGlanceWidget from "@/components/widgets/AtAGlanceWidget";
import QuickNoteWidget from "@/components/widgets/QuickNoteWidget";
import DebugWidget from "@/components/widgets/DebugWidget";
import { ReactElement } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserSettings } from "@/types/app";

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "debug";

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  ataglance: <AtAGlanceWidget />,
  quicknote: <QuickNoteWidget />,
  debug: <DebugWidget />,
};

// Default widget order for mobile
const defaultWidgetOrder: WidgetType[] = ["ataglance", "calendar", "tasks", "quicknote", "debug"];

export default function MobileDashboard() {
  const { data: session } = useSession();
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>(defaultWidgetOrder);
  const [isLoading, setIsLoading] = useState(true);
  
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
        activeWidgets.map((widgetId) => (
          <div key={widgetId} className="glass px-2 py-2 rounded-xl shadow-md">
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
    </div>
  );
}