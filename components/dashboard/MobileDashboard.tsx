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
  
  // Fetch user settings to get active widgets
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (session?.user?.email) {
        try {
          const settingsDocRef = doc(db, "users", session.user.email, "settings", "userSettings");
          const docSnap = await getDoc(settingsDocRef);
          
          if (docSnap.exists()) {
            const userSettings = docSnap.data() as UserSettings;
            if (userSettings.activeWidgets) {
              // Filter to only include valid widget types and maintain order
              const validWidgets = userSettings.activeWidgets.filter(
                widget => Object.keys(widgetComponents).includes(widget)
              ) as WidgetType[];
              
              setActiveWidgets(validWidgets);
            }
          }
        } catch (e) {
          console.error("[MobileDashboard] Error fetching user settings:", e);
        }
      }
    };
    
    fetchUserSettings();
  }, [session]);
  
  return (
    <div className="grid grid-cols-1 gap-4 px-2 py-4">
      {activeWidgets.map((widgetId) => (
        <div key={widgetId} className="glass px-2 py-2 rounded-xl shadow-md">
          <h2 className="font-semibold capitalize mb-2">
            {widgetId === "ataglance" ? "Your Day at a Glance" : widgetId.charAt(0).toUpperCase() + widgetId.slice(1)}
          </h2> {/* Customize header for ataglance */}
          <div className="flex-1 overflow-auto">
            {widgetComponents[widgetId]}
          </div>
        </div>
      ))}
    </div>
  );
}