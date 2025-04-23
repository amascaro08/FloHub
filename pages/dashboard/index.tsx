// pages/dashboard/index.tsx tweak
"use client";

// pages/dashboard/index.tsx tweak
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import TaskWidget      from "@/components/widgets/TaskWidget";
import CalendarWidget  from "@/components/widgets/CalendarWidget";
import ChatWidget      from "@/components/assistant/ChatWidget";

// pull in the CSS for react-grid-layout
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// dynamically import Responsive + wrap in WidthProvider, client-only
const ResponsiveGridLayout = dynamic(
  async () => {
    const { Responsive, WidthProvider } = await import("react-grid-layout");
    return WidthProvider(Responsive);
  },
  { ssr: false, loading: () => <p>Loading layout…</p> }
);

// types
type Item    = { i: string; x: number; y: number; w: number; h: number };
type Layouts = Record<string, Item[]>;

// your default positions
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
  // HOOKS — always in this order
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [isReady, setIsReady] = useState(false);

  // run only once on the client
  useEffect(() => {
    setIsReady(true);
  }, []);

  // persists whenever layout changes
  const onLayoutChange = (_current: Item[], all: Layouts) => {
    setLayouts(all);
  };

  return (
    <>
      {isReady && (
        <ResponsiveGridLayout
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
        </ResponsiveGridLayout>
      )}
    </>
  );
}
