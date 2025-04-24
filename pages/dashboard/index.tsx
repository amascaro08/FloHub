"use client";

import { useState, useEffect } from "react";
import TaskWidget      from "@/components/widgets/TaskWidget";
import CalendarWidget  from "@/components/widgets/CalendarWidget";
import ChatWidget      from "@/components/assistant/ChatWidget";

// types for layouts
type Item    = { i: string; x: number; y: number; w: number; h: number };
type Layouts = Record<string, Item[]>;

// your default layout
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

export default function Dashboard() {
  // 1) grid component, once loaded
  const [Grid, setGrid]       = useState<React.ComponentType<any> | null>(null);
  // 2) your layouts state
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);

  // load react-grid-layout on client
  useEffect(() => {
    import("react-grid-layout").then((mod) => {
      const pkg = (mod as any).default || mod;
      setGrid(pkg.WidthProvider(pkg.Responsive));
    });
  }, []);

  // hydrate stored layouts
  useEffect(() => {
    const saved = localStorage.getItem("flohub-layouts");
    if (saved) {
      try {
        setLayouts(JSON.parse(saved));
      } catch {
        console.warn("Bad saved layouts, ignoring");
      }
    }
  }, []);

  // persist on change
  const onLayoutChange = (_: Item[], all: Layouts) => {
    setLayouts(all);
    localStorage.setItem("flohub-layouts", JSON.stringify(all));
  };

  // until the grid library is loaded, render nothing
  if (!Grid) return null;

  return (
    <Grid
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
      draggableHandle=".widget-header"
      resizeHandles={["se"]}
      isBounded
    >
      <div key="tasks" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Tasks</div>
        <TaskWidget />
      </div>

      <div key="calendar" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Calendar
        </div>
        <CalendarWidget />
      </div>

      <div key="chat" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Chat</div>
        <ChatWidget />
      </div>
    </Grid>
  );
}
