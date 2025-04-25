// /components/ui/DashboardLayout.tsx

"use client";

import { useState } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import CalendarWidget from "../widgets/CalendarWidget";
import TaskWidget from "../widgets/TaskWidget";
import ChatWidget from "../assistant/ChatWidget";

export default function DashboardLayout() {
  const [isLocked, setIsLocked] = useState(false);

  const layout = [
    { i: "calendar", x: 0, y: 0, w: 6, h: 8 },
    { i: "tasks", x: 6, y: 0, w: 6, h: 4 },
    { i: "chat", x: 6, y: 4, w: 6, h: 4 },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsLocked(!isLocked)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isLocked ? "Unlock Widgets" : "Lock Widgets"}
        </button>
      </div>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        isDraggable={!isLocked}
        isResizable={!isLocked}
      >
        <div key="calendar" className="bg-white rounded shadow p-2 overflow-auto">
          <CalendarWidget />
        </div>
        <div key="tasks" className="bg-white rounded shadow p-2 overflow-auto">
          <TaskWidget />
        </div>
        <div key="chat" className="bg-white rounded shadow p-2 overflow-auto">
          <ChatWidget />
        </div>
      </GridLayout>
    </div>
  );
}
