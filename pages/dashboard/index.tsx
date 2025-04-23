// pages/dashboard/index.tsx
import dynamic from "next/dynamic";

const DashboardGrid = dynamic(
  () => import("@/components/dashboard/DashboardGrid"),
  { ssr: false, loading: () => <p>Loading dashboard…</p> }
);

export default function DashboardPage() {
  return <DashboardGrid />;
}
