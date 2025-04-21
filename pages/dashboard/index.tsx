// pages/dashboard/index.tsx
import { useSession, signIn } from "next-auth/react";
import Layout from "@/components/ui/Layout";
import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();

  // Compute greeting based on current hour
  const greeting = useMemo(() => {
    if (typeof window === "undefined") return "";
    const hour = new Date().getHours();
    if (hour < 12) return "☀️Good Morning";
    if (hour < 17) return "🌤️Good Afternoon";
    return "🌕Good Evening";
  }, []);

  // While loading session
  if (status === "loading") {
    return (
      <Layout>
        <p className="text-center py-8">Loading…</p>
      </Layout>
    );
  }

  // If not signed in, prompt
  if (!session?.user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="mb-4">Please sign in to access your dashboard.</p>
          <button
            onClick={() => signIn("google")}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Sign in with Google
          </button>
        </div>
      </Layout>
    );
  }

  const name = session.user.name?.split(" ")[0] || session.user.email;

  return (
    <Layout>
      <h2 className="text-2xl font-semibold mb-2">
        {greeting}, {name}!
      </h2>
      <p className="text-gray-700 mb-6">
        Here’s your FlowHub overview. FloCat is ready to assist you 👀
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TaskWidget />
        <CalendarWidget />
        {/* future widgets like HabitWidget, JournalWidget… */}
      </div>
    </Layout>
  );
}
