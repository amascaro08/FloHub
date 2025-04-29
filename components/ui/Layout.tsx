'use client'

import { ReactNode, useState } from 'react'
import { signOut } from "next-auth/react";
import { Menu } from 'lucide-react'
import Link from 'next/link'
import ChatWidget from '../assistant/ChatWidget'; // Import ChatWidget
import ThemeToggle from './ThemeToggle'
import { useAuth } from "./AuthContext";

const nav = [
  { name: "Hub", href: "/dashboard" },
  { name: "Tasks", href: "/dashboard/tasks" },
  { name: "Notes", href: "/dashboard/notes" }, // Add Notes link
  { name: "Habits", href: "/dashboard/habits" },
  { name: "Journal", href: "/dashboard/journal" },
  { name: "Meetings", href: "/dashboard/meetings" },
  { name: "Settings", href: "/dashboard/settings" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { isLocked, toggleLock } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-20 transition-opacity
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          md:hidden
        `}
        onClick={() => setOpen(false)}
      />

      {/* sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-[var(--surface)] shadow-lg z-30 transform transition-transform
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:shadow-none
        `}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <img src="/flohub_logo.png" alt="FloHub" className="h-8"/>
          {/* Hide on medium and larger screens */}
          <div className="md:hidden">
            <ThemeToggle/>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {nav.map((x) => (
            <Link key={x.href} href={x.href} legacyBehavior>
              <a
                className="block px-3 py-2 rounded hover:bg-[var(--neutral-200)] transition"
                onClick={() => setOpen(false)}
              >
                {x.name}
              </a>
            </Link>
          ))}
          {/* Changed Link to button and added onClick={signOut} */}
          <button
            className="block w-full text-left px-3 py-2 rounded hover:bg-[var(--neutral-200)] transition"
            onClick={() => {
              setOpen(false); // Close sidebar first
              signOut();      // Call client-side signOut
            }}
          >
            Sign Out
          </button>
        </nav>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col">
        {/* header */}
        <header className="flex items-center justify-between p-4 bg-[var(--surface)] shadow-elevate-sm">
          <div className="flex items-center">
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded hover:bg-[var(--neutral-200)] transition md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6 text-[var(--fg)]" />
            </button>
            <img src="/flohub_logo.png" alt="FloHub" className="h-6 ml-2" />
          </div>
          <input
            type="text"
            placeholder=" FloCat is here to help you... 🐱"
            className="ml-2 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onFocus={() => setIsChatOpen(true)}
          />
          {/* Hide on small screens */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        </header>

        <div className="absolute top-4 right-4 z-50">
          <button
            className="p-2 rounded hover:bg-[var(--neutral-200)] transition"
            onClick={() => toggleLock()}
            aria-label="Toggle Lock"
          >
            {isLocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="12" height="10" x="6" y="11" rx="2"/><path d="M12 17v-2"/><path d="M8 11V5a4 4 0 0 1 8 0v6"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-unlock"><rect width="12" height="10" x="6" y="11" rx="2"/><path d="M12 17v-2"/><path d="M16 11V5a4 4 0 0 0-8 0"/></svg>
            )}
          </button>
        </div>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
        {isChatOpen && (
          <div className="fixed bottom-0 right-0 z-50">
            <ChatWidget onClose={() => setIsChatOpen(false)} key="chatwidget"/>
          </div>
        )}
      </div>
    </div>
  )
}
