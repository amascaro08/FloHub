"use client";

import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";
import AtAGlanceWidget from "@/components/widgets/AtAGlanceWidget";
import QuickNoteWidget from "@/components/widgets/QuickNoteWidget"; // Import QuickNoteWidget
import { ReactElement } from "react";

type WidgetType = "tasks" | "calendar" | "chat" | "ataglance" | "quicknote";

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  chat: <ChatWidget />,
  ataglance: <AtAGlanceWidget />,
  quicknote: <QuickNoteWidget />,
};

const widgetOrder: WidgetType[] = ["ataglance", "quicknote", "tasks", "calendar", "chat"]; // Define a default order for mobile

export default function MobileDashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 p-4">
      {widgetOrder.map((widgetId) => (
        <div key={widgetId} className="glass p-4 rounded-xl shadow-md">
          <h2 className="font-semibold capitalize mb-2">{widgetId}</h2>
          <div className="flex-1 overflow-auto">
            {widgetComponents[widgetId]}
          </div>
        </div>
      ))}
    </div>
  );
}