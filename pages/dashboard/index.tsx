// pages/dashboard/index.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/hooks/useUser";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import MobileDashboard from "@/components/dashboard/MobileDashboard";

export default function DashboardPage() {
  const { user, isLoading, isError } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle authentication errors
  useEffect(() => {
    if (mounted && !isLoading && isError) {
      console.warn('Dashboard: Authentication error, redirecting to login');
      router.replace('/login?redirect=/dashboard');
    }
  }, [mounted, isLoading, isError, router]);

  // Show loading state while checking authentication
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (isError || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to load dashboard</p>
          <button 
            onClick={() => router.replace('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Show MobileDashboard on small screens, hide on medium and larger */}
      <div className="md:hidden">
        <MobileDashboard />
      </div>
      {/* Show DashboardGrid on medium and larger screens, hide on small */}
      <div className="hidden md:block">
        <DashboardGrid />
      </div>
    </>
  );
}
