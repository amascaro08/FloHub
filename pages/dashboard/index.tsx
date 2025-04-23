// pages/dashboard/index.tsx tweak
"use client";

import TaskWidget      from "@/components/widgets/TaskWidget";
import CalendarWidget  from "@/components/widgets/CalendarWidget";
import ChatWidget      from "@/components/assistant/ChatWidget";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-4 glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Tasks
        </div>
        <TaskWidget />
      </div>

      <div className="col-span-4 glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Calendar
        </div>
        <CalendarWidget />
      </div>

      <div className="col-span-4 glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">
          Chat
        </div>
        <ChatWidget />
      </div>
    </div>
  );
}
