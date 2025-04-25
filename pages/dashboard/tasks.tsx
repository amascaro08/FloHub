// pages/dashboard/tasks.tsx
"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/components/widgets/TaskWidget";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const shouldFetch = status === "authenticated";
  const { data: tasks } = useSWR<Task[]>(
    shouldFetch ? "/api/tasks" : null,
    fetcher
  );

  if (status === "loading") {
    return <p>Loading tasks…</p>;
  }

  if (!session) {
    return <p>Please sign in to see your tasks.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Tasks</h1>
      {tasks && tasks.length > 0 ? (
        <table className="table-auto w-full">
          <thead>
            <tr>
              <th className="px-4 py-2">Task</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Created At</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="border px-4 py-2">{task.text}</td>
                <td className="border px-4 py-2">{task.dueDate || "No due date"}</td>
                <td className="border px-4 py-2">{task.createdAt || "Unknown"}</td>
                <td className="border px-4 py-2">{task.done ? "Completed" : "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No tasks yet.</p>
      )}
    </div>
  );
}