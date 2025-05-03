// components/assistant/ChatWidget.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession }          from "next-auth/react";
import useSWR, { mutate }      from "swr";
import type { Task as TaskType } from "@/types/app";

// Simple fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ChatWidgetProps {
  onClose: () => void;
  messageToSend: string | null;
  onMessageProcessed: () => void;
}

export default function ChatWidget({ onClose, messageToSend, onMessageProcessed }: ChatWidgetProps) {
  const { data: session, status } = useSession();
  const isAuthed                   = status === "authenticated";

  const [unread, setUnread]       = useState(false);
  const [history, setHistory]     = useState<
    { role: "user" | "assistant"; content: string }[]
  >(() => {
    // Load chat history from localStorage if available
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("floCatChatHistory");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);

  // Fetch tasks & events for initial greeting
  const { data: tasks }  = useSWR(isAuthed ? "/api/tasks"    : null, fetcher);
  const { data: events } = useSWR(isAuthed ? "/api/calendar" : null, fetcher);

  // On first load after sign-in, push a greeting
  useEffect(() => {
    if (
      isAuthed &&
      Array.isArray(tasks) &&
      Array.isArray(events) &&
      history.length === 0
    ) {
      const todayStr = new Date().toDateString();
      const dueToday = (tasks as TaskType[]).filter((t) => {
        const d = new Date(t.dueDate ?? "");
        return !t.done && d.toDateString() === todayStr;
      }).length;
      const evtToday = events.filter((e: any) => {
        const d = new Date(e.start.dateTime || e.start.date || "");
        return d.toDateString() === todayStr;
      }).length;

      const hour = new Date().getHours();
      const greet = hour < 12
        ? "Good morning"
        : hour < 18
        ? "Good afternoon"
        : "Good evening";

      setHistory([
        {
          role: "assistant",
          content:
            `${greet}! I’m FloCat 🐱 — your FloHub buddy!\n` +
            `You have ${dueToday} task${dueToday===1?"":"s"} due today and ` +
            `${evtToday} event${evtToday===1?"":"s"} scheduled.\n` +
            `What can I do for you today?`
        }
      ]);
      setUnread(true);
    }
  }, [isAuthed, tasks, events, history.length]);

  // Save chat history to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("floCatChatHistory", JSON.stringify(history));
    }
  }, [history]);

  // Send message to /api/assistant
  const send = async (message?: string) => {
    const messageContent = message ?? input.trim();
    if (!messageContent) return;

    const userMsg: { role: "user" | "assistant"; content: string } = { role: "user", content: messageContent };
    setHistory(h => [...h, userMsg]);
    if (!message) { // Only clear input if sending from the local input field
      setInput("");
    }
    setLoading(true);

    try {
      const res  = await fetch("/api/assistant", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ history, prompt: userMsg.content }),
      });
      const json = await res.json();
      const botContent = json.reply ?? json.error ?? "🤔 Hmm, something went wrong.";
      setHistory(h => [...h, { role: "assistant", content: botContent }]);
    } catch {
      setHistory(h => [...h, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
      // Refresh widgets
      mutate("/api/tasks");
      mutate("/api/calendar");
    }
  };

  // Effect to handle messages sent from the top input
  useEffect(() => {
    if (messageToSend) {
      send(messageToSend);
      onMessageProcessed();
    }
  }, [messageToSend]); // Dependency on messageToSend

  // Removed the 'toggle' function as it's no longer needed

  if (status === "loading") return null;

  return (
    <div role="dialog" aria-label="FloCat chat" className="
      w-80 h-96
      glass p-4 rounded-xl shadow-elevate-lg
      flex flex-col
    ">
        <div
          className="flex-1 overflow-y-auto space-y-2 mb-2 text-[var(--fg)]"
          ref={el => {
            if (el) {
              el.scrollTop = el.scrollHeight;
            }
          }}
        >
          {history.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <span className={`
                inline-block px-3 py-1 rounded-lg
                ${m.role === "assistant"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--neutral-200)] text-[var(--fg)]"
                }
              `}>
                {m.content}
              </span>
            </div>
          ))}
          {loading && (
            <p className="italic text-[var(--neutral-500)]">FloCat is typing…</p>
          )}
        </div>
        <div className="flex border-t border-[var(--neutral-300)] pt-2">
          <input
            className="
              flex-1 border border-[var(--neutral-300)]
              rounded-l px-2 py-1 focus:outline-none
              focus:ring-2 focus:ring-[var(--primary)]
            "
            placeholder="Type a message…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()} // Keep existing handler for local input
          />
          <button
            onClick={() => send()}
            disabled={loading}
            className="
              ml-2 px-3 rounded-r text-white
              bg-[var(--accent)] hover:opacity-90
              disabled:opacity-50
            "
            >
            Send
          </button>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="mt-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
  );
}
