// components/dashboard/DashboardGrid.tsx
"use client";

import { useState, useEffect } from "react";
import { Responsive, WidthProvider, Layouts, Layout } from "react-grid-layout";

import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useAuth } from "@/components/ui/AuthContext";

const ResponsiveGridLayout = WidthProvider(Responsive);

const defaultItems: Layout[] = [
  { i: "tasks", x: 0, y: 0, w: 4, h: 6 },
  { i: "calendar", x: 4, y: 0, w: 4, h: 6 },
  { i: "chat", x: 8, y: 0, w: 4, h: 6 },
];

const defaultLayouts: Layouts = {
  lg: defaultItems,
  md: defaultItems,
  sm: defaultItems,
  xs: defaultItems,
};

export default function DashboardGrid() {
  const { isLocked } = useAuth();
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);

  useEffect(() => {
    const saved = localStorage.getItem("flohub-layouts");
    if (saved) {
      try {
        setLayouts(JSON.parse(saved));
      } catch {
        console.warn("Ignoring invalid saved layouts");
      }
    }
  }, []);

  const onLayoutChange = (_: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
    localStorage.setItem("flohub-layouts", JSON.stringify(allLayouts));
  };

  return (
    <div className="p-4">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        onLayoutChange={onLayoutChange}
      >
        <div key="tasks" className="glass p-4 rounded-xl overflow-auto">
          <div className="widget-header cursor-move mb-2 font-semibold">Tasks</div>
          <TaskWidget />
        </div>
        <div key="calendar" className="glass p-4 rounded-xl overflow-auto">
          <div className="widget-header cursor-move mb-2 font-semibold">Calendar</div>
          <CalendarWidget />
        </div>
        <div key="chat" className="glass p-4 rounded-xl overflow-auto">
          <div className="widget-header cursor-move mb-2 font-semibold">Chat</div>
          <ChatWidget />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
