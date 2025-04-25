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
  const [chatOpen, setChatOpen] = useState(false);

  // Hydrate once on mount
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

  // Persist on every change
  const onLayoutChange = (_: Item[], all: Layouts) => {
    setLayouts(all);
    localStorage.setItem("flohub-layouts", JSON.stringify(all));
  };

  // ─── Render the grid ───────────────────────────────────────
  return (
    <div className="relative h-full grid grid-cols-12 gap-4 p-4">
      {/* Tasks Widget */}
      <div className="col-span-4 glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Tasks
        </div>
        <TaskWidget />
      </div>

      {/* Calendar Widget */}
      <div className="col-span-4 glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Calendar
        </div>
        <CalendarWidget />
      </div>

      {/* Chat Widget Overlay */}
      <div
        className={`fixed bottom-4 right-4 z-50 rounded-xl shadow-lg transition-transform ${
          chatOpen ? "translate-y-0" : "translate-y-[calc(100%+2rem)]"
        }`}
      >
        <ChatWidget />
      </div>

      {/* Chat Toggle Button */}
      <button
        className="fixed bottom-4 right-4 z-50 bg-[var(--surface)] text-[var(--fg)] rounded-full p-2 shadow-md hover:bg-[var(--neutral-200)] transition"
        onClick={() => setChatOpen(!chatOpen)}
        aria-label="Toggle Chat"
      >
        {chatOpen ? "Close Chat" : "Open Chat"}
      </button>
    </div>
  );
}
