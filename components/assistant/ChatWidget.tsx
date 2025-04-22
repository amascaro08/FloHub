"use client";

import { useState, useEffect } from "react";
import { useSession }          from "next-auth/react";
import useSWR, { mutate }      from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChatWidget() {
  const { data: session, status } = useSession();
  const shouldFetch               = status === "authenticated";

  const [open, setOpen]   = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  // only fetch once authenticated
  const { data: tasks }  = useSWR(shouldFetch ? "/api/tasks"    : null, fetcher);
  const { data: events } = useSWR(shouldFetch ? "/api/calendar" : null, fetcher);

  // initial pop‑up summary
  useEffect(() => {
    if (
      shouldFetch &&
      !greeted &&
      Array.isArray(tasks) &&
      Array.isArray(events)
    ) {
      const todayStr = new Date().toDateString();

      const dueToday = tasks.filter((t: any) => {
        const d = new Date(t.due);
        return !t.completed && d.toDateString() === todayStr;
      }).length;

      const evtToday = events.filter((e: any) => {
        const d = new Date(e.start.dateTime || e.start.date || "");
        return d.toDateString() === todayStr;
      }).length;

      const h = new Date().getHours();
      const when =
        h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

      alert(
        `${when}! I’m FloCat 🐱\n` +
          `You have ${dueToday} task${dueToday === 1 ? "" : "s"} due today\n` +
          `and ${evtToday} event${evtToday === 1 ? "" : "s"} scheduled today\n` +
          `Let me know how I can help!`
      );
      setGreeted(true);
    }
  }, [shouldFetch, greeted, tasks, events]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/assistant", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ history, prompt: input }),
    });
    const json = await res.json();
    const botMsg = {
      role:    "assistant",
      content: json.reply ?? json.error ?? "Sorry, something went wrong.",
    };
    setHistory((h) => [...h, botMsg]);
    setLoading(false);

    // refresh other widgets
    mutate("/api/tasks");
    mutate("/api/calendar");
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white shadow-lg rounded-lg flex flex-col z-50">
          <div className="flex-1 p-4 overflow-y-auto">
            {history.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-right" : "text-left"}
              >
                <span className={m.role === "assistant" ? "font-semibold" : ""}>
                  {m.content}
                </span>
              </div>
            ))}
            {loading && <p className="italic text-gray-500">FloCat is typing…</p>}
          </div>
          <div className="p-2 border-t flex">
            <input
              className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
            />
            <button
              onClick={send}
              disabled={loading}
              className="ml-2 px-3 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <img
        src="/flohub_bubble.png"
        alt="FloCat"
        className="fixed bottom-6 right-6 w-16 h-16 cursor-pointer animate-bounce z-50"
        onClick={() => setOpen((o) => !o)}
      />
    </>
  );
}
