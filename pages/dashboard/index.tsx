// pages/dashboard/index.tsx
"use client";

import TaskWidget      from "@/components/widgets/TaskWidget";
import CalendarWidget  from "@/components/widgets/CalendarWidget";
import ChatWidget      from "@/components/assistant/ChatWidget";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* TASKS */}
        <div className="glass flex flex-col p-4 rounded-xl overflow-hidden min-h-0">
          <h3 className="text-lg font-semibold mb-2">Tasks</h3>
          <div className="flex-1 min-h-0 overflow-auto">
            <TaskWidget />
          </div>
        </div>

        {/* CALENDAR */}
        <div className="glass flex flex-col p-4 rounded-xl overflow-hidden min-h-0">
          <h3 className="text-lg font-semibold mb-2">Calendar</h3>
          <div className="flex-1 min-h-0 overflow-auto">
            <CalendarWidget />
          </div>
        </div>

        {/* CHAT */}
        <div className="glass flex flex-col p-4 rounded-xl overflow-hidden min-h-0">
          <h3 className="text-lg font-semibold mb-2">Chat</h3>
          <div className="flex-1 min-h-0 overflow-auto">
            <ChatWidget />
          </div>
        </div>
      </div>
    </main>
  );
}
