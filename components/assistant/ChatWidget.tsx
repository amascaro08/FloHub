"use client";

import { useState, useEffect } from "react";
import { useSession }          from "next-auth/react";
import useSWR, { mutate }      from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ChatWidget() {
  const { data: session, status } = useSession();
  const shouldFetch               = status === "authenticated";

  const [open, setOpen]       = useState(false);
  const [unread, setUnread]   = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

  // pull in tasks/events only once signed in
  const { data: tasks  } = useSWR(shouldFetch ? "/api/tasks"    : null, fetcher);
  const { data: events } = useSWR(shouldFetch ? "/api/calendar" : null, fetcher);

  // push an initial “FloCat” greeting message into the chat instead of alert()
  useEffect(() => {
    if (
      shouldFetch &&
      Array.isArray(tasks) &&
      Array.isArray(events) &&
      history.length === 0
    ) {
      const today = new Date().toDateString();
      const dueToday = tasks.filter((t: any) => {
        const d = new Date(t.due);
        return !t.completed && d.toDateString() === today;
      }).length;
      const evtToday = events.filter((e: any) => {
        const d = new Date(e.start.dateTime || e.start.date || "");
        return d.toDateString() === today;
      }).length;

      const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 18) return "Good afternoon";
        return "Good evening";
      })();

      setHistory([{
        role: "assistant",
        content:
          `${greeting}! I’m FloCat 🐱 — your friendly FlowHub buddy!\n` +
          `You have ${dueToday} task${dueToday===1?"":"s"} due today, ` +
          `${evtToday} event${evtToday===1?"":"s"} on the calendar.\n` +
          `What can I do for you?`
      }]);
      setUnread(true);
    }
  }, [shouldFetch, tasks, events, history.length]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setHistory(h => [...h, userMsg]);
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
      content: json.reply ?? json.error ?? "Oops, something went wrong!"
    };
    setHistory(h => [...h, botMsg]);
    setLoading(false);

    // mark unread if drawer closed
    if (!open) setUnread(true);

    // refresh widgets
    mutate("/api/tasks");
    mutate("/api/calendar");
  };

  const toggle = () => {
    setOpen(o => !o);
    if (!open) setUnread(false);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-white shadow-lg rounded-lg flex flex-col z-50">
          <div className="flex-1 p-4 overflow-y-auto">
            {history.map((m,i) => (
              <div key={i} className={m.role==="user"?"text-right":"text-left"}>
                <span className={m.role==="assistant"?"font-semibold":""}>
                  {m.content}
                </span>
              </div>
            ))}
            {loading && <p className="italic text-gray-500">FloCat is typing…</p>}
          </div>
          <div className="p-2 border-t flex">
            <input
              className="flex-1 border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
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
        onClick={toggle}
        className={
          `fixed bottom-6 right-6 w-16 h-16 cursor-pointer z-50 ` +
          (unread ? "animate-bounce" : "")
        }
      />
    </>
  );
}
