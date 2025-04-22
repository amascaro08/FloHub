"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ChatWidget() {
  // drawer open?
  const [open, setOpen] = useState(false);

  // first‑time greeting
  const [greeted, setGreeted] = useState(false);

  // chat history & input
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  // prefetch tasks & events for summary
  const { data: tasks }  = useSWR("/api/tasks",  fetcher);
  const { data: events } = useSWR("/api/calendar", fetcher);

  // when both loaded and not yet greeted, fire summary alert
  useEffect(() => {
    if (!greeted && tasks && events) {
      const dueToday = tasks.filter((t: any) => {
        const d = new Date(t.due);
        return d.toDateString() === new Date().toDateString() && !t.completed;
      }).length;
      const evtToday = events.filter((e: any) => {
        const d = new Date(e.start.dateTime || e.start.date);
        return d.toDateString() === new Date().toDateString();
      }).length;

      const hour = new Date().getHours();
      const when = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

      alert(
        `${when}! I’m FloCat 🐱\n` +
        `You have ${dueToday} task${dueToday===1?"":"s"} due today\n` +
        `and ${evtToday} event${evtToday===1?"":"s"} scheduled today\n` +
        `Let me know how I can help!`
      );
      setGreeted(true);
    }
  }, [greeted, tasks, events]);

  // send a message to your assistant endpoint
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

    // refresh widgets
    mutate("/api/tasks");
    mutate("/api/calendar");
  };

  return (
    <>
      {/* Chat drawer */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white shadow-lg rounded-lg flex flex-col z-50">
          <div className="flex-1 p-4 overflow-y-auto">
            {history.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
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

      {/* FloCat bubble toggle */}
      <img
        src="/flohub_bubble.png"
        alt="FloCat"
        className="fixed bottom-6 right-6 w-16 h-16 cursor-pointer animate-bounce z-50"
        onClick={() => setOpen((o) => !o)}
      />
    </>
  );
}
