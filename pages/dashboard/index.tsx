// pages/dashboard/index.tsx
"use client";

import DashboardGrid from "@/components/dashboard/DashboardGrid"; // Import DashboardGrid

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] p-6">
      {/* Use the DashboardGrid component */}
      <DashboardGrid />
    </main>
  );
}
