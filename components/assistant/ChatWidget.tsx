// components/assistant/ChatWidget.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);

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
    const data = await res.json();
    const botMsg = { role: "assistant", content: data.reply || data.error || "" };
    setHistory((h) => [...h, botMsg]);
    setLoading(false);

    // revalidate your widgets so they pick up new tasks/events
    mutate("/api/tasks");
    mutate("/api/calendar");
  };

  return (
    <>
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
            {loading && <p>FloCat is typing…</p>}
          </div>
          <div className="p-2 border-t flex">
            <input
              className="flex-1 border rounded px-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
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
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg z-50"
      >
        🐱
      </button>
    </>
  );
}
