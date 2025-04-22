"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Layout from "@/components/ui/Layout";
import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState("");

  // Compute time‑of‑day greeting on the client only
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("☀️ Good Morning");
    else if (h < 17) setGreeting("🌤️ Good Afternoon");
    else setGreeting("🌕 Good Evening");
  }, []);

  if (status === "loading") {
    return (
      <Layout>
        <p className="text-center py-8">Loading…</p>
      </Layout>
    );
  }

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
      {/* FloCat chat bubble */}
      <ChatWidget />

      {/* Greeting */}
      <h2 className="text-2xl font-semibold mb-2">
        {greeting}, {name}!
      </h2>
      <p className="text-gray-700 mb-6">
        Here’s your FlowHub overview. FloCat is ready to assist you 👀
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TaskWidget />
        <CalendarWidget />
        {/* future widgets… */}
      </div>
    </Layout>
  );
}
