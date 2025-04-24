// components/dashboard/DashboardGrid.tsx
"use client";

import { useState, useEffect } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";

import TaskWidget     from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget     from "@/components/assistant/ChatWidget";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

type Item    = { i: string; x: number; y: number; w: number; h: number };
type Layouts = Record<string, Item[]>;

const defaultItems: Item[] = [
  { i: "tasks",    x: 0, y: 0, w: 4, h: 6 },
  { i: "calendar", x: 4, y: 0, w: 4, h: 6 },
  { i: "chat",     x: 8, y: 0, w: 4, h: 6 },
];

const defaultLayouts: Layouts = {
  lg: defaultItems,
  md: defaultItems,
  sm: defaultItems,
  xs: defaultItems,
};

export default function DashboardGrid() {
  // ─── Hooks (always in the same order) ─────────────────────
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);

  // Hydrate once on mount
  useEffect(() => {
    const saved = localStorage.getItem("flohub-layouts");
    if (saved) {
      try { setLayouts(JSON.parse(saved)); }
      catch { console.warn("Ignoring invalid saved layouts"); }
    }
  }, []);

  // Persist on every change
  const onLayoutChange = (_: Item[], all: Layouts) => {
    setLayouts(all);
    localStorage.setItem("flohub-layouts", JSON.stringify(all));
  };

  // ─── Render the grid ───────────────────────────────────────
  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={{ lg:1200, md:996, sm:768, xs:480 }}
      cols={{ lg:12, md:10, sm:6, xs:4 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
      draggableHandle=".widget-header"
      resizeHandles={["se"]}
      isBounded
    >
      <div key="tasks" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Tasks</div>
        <TaskWidget/>
      </div>

      <div key="calendar" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Calendar</div>
        <CalendarWidget/>
      </div>

      <div key="chat" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Chat</div>
        <ChatWidget/>
      </div>
    </ResponsiveGridLayout>
  );
}
