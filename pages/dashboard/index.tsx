// pages/dashboard/index.tsx
"use client";

import TaskWidget      from "@/components/widgets/TaskWidget";
import CalendarWidget  from "@/components/widgets/CalendarWidget";
import ChatWidget      from "@/components/assistant/ChatWidget";

export default function DashboardPage() {
  return (
    <main className="h-full overflow-auto p-6 bg-[var(--bg)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="glass p-4 rounded-xl">
          <div className="text-lg font-semibold mb-2">Tasks</div>
          <TaskWidget />
        </div>

        {/* Calendar */}
        <div className="glass p-4 rounded-xl">
          <div className="text-lg font-semibold mb-2">Calendar</div>
          <CalendarWidget />
        </div>

        {/* Chat */}
        <div className="glass p-4 rounded-xl flex flex-col">
          <div className="text-lg font-semibold mb-2">Chat</div>
          <ChatWidget />
        </div>
      </div>
    </main>
  );
}
