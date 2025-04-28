// pages/dashboard/index.tsx
"use client";

import DashboardGrid from "@/components/dashboard/DashboardGrid"; // Import DashboardGrid
import MobileDashboard from "@/components/dashboard/MobileDashboard"; // Import MobileDashboard

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] p-6">
      {/* Show MobileDashboard on small screens, hide on medium and larger */}
      <div className="md:hidden">
        <MobileDashboard />
      </div>
      {/* Show DashboardGrid on medium and larger screens, hide on small */}
      <div className="hidden md:block">
        {/* Use the DashboardGrid component */}
        <DashboardGrid />
      </div>
    </main>
  );
}
