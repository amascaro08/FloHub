// pages/dashboard/index.tsx
"use client";

import { useState, useEffect } from "react";
import TaskWidget      from "@/components/widgets/TaskWidget";
import CalendarWidget  from "@/components/widgets/CalendarWidget";
import ChatWidget      from "@/components/assistant/ChatWidget";

// Pull in the CSS for react-grid-layout (bundled at build time)
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type Item    = { i: string; x: number; y: number; w: number; h: number };
type Layouts = Record<string, Item[]>;

// Default widget positions
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
  // 1) Hold our grid component once loaded
  const [Grid, setGrid] = useState<React.ComponentType<any> | null>(null);

  // 2) Hold our layouts state
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);

  useEffect(() => {
    // Hydrate saved layouts
    const saved = localStorage.getItem("flohub-layouts");
    if (saved) {
      try {
        setLayouts(JSON.parse(saved));
      } catch {
        console.warn("Invalid layouts in localStorage, using defaults");
      }
    }

    // Dynamically import ReactGridLayout on the client
    import("react-grid-layout").then((mod) => {
      const Responsive = mod.Responsive;
      const Wrapped    = mod.WidthProvider(Responsive);
      setGrid(() => Wrapped);
    });
  }, []);

  // Persist when user moves/resizes
  const onLayoutChange = (_: Item[], allLayouts: Layouts) => {
    setLayouts(allLayouts);
    localStorage.setItem("flohub-layouts", JSON.stringify(allLayouts));
  };

  // Until our grid component is loaded, render nothing
  if (!Grid) {
    return null;
  }

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
        <div className="widget-header cursor-move mb-2 font-semibold">
          Tasks
        </div>
        <TaskWidget />
      </div>

      <div key="calendar" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Calendar
        </div>
        <CalendarWidget />
      </div>

      <div key="chat" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Chat
        </div>
        <ChatWidget />
      </div>
    </Grid>
  );
}
