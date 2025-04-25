// components/dashboard/DashboardGrid.tsx
"use client";

import { useState, useEffect } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";

import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useAuth } from "@/components/ui/AuthContext";

const ResponsiveGridLayout = WidthProvider(Responsive);

type Item = { i: string; x: number; y: number; w: number; h: number };
type Layouts = Record<string, Item[]>;

const defaultItems: Item[] = [
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
  // ─── Hooks (always in the same order) ─────────────────────
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  const [chatOpen, setChatOpen] = useState(false);
  const { isLocked } = useAuth();
  const [rerender, setRerender] = useState(0);

  // Hydrate once on mount
  useEffect(() => {
    setRerender(prev => prev + 1);
  }, [isLocked]);

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

  useEffect(() => {
    console.log("isLocked:", isLocked);
    console.log("isDraggable:", !isLocked);
    console.log("isResizable:", !isLocked);
  }, [isLocked]);

  // ─── Render the grid ───────────────────────────────────────
  return (
    <>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        onLayoutChange={onLayoutChange}
        isDraggable={!isLocked} // Disable dragging when locked
        isResizable={!isLocked} // Disable resizing when locked
        key={rerender}
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
    </>
  );
}
