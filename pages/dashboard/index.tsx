// pages/dashboard/index.tsx
"use client";

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import MobileDashboard from "@/components/dashboard/MobileDashboard";
import Layout from "@/components/ui/Layout";

export default function DashboardPage() {
  return (
    <Layout>
      {/* Show MobileDashboard on small screens, hide on medium and larger */}
      <div className="md:hidden">
        <MobileDashboard />
      </div>
      {/* Show DashboardGrid on medium and larger screens, hide on small */}
      <div className="hidden md:block">
        <DashboardGrid />
      </div>
    </Layout>
  );
}
