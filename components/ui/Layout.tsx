'use client'

import { ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'       // npm install lucide-react
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

const nav = [
  { name: 'Hub',      href: '/dashboard' },
  { name: 'Tasks',    href: '/dashboard/tasks' },
  { name: 'Habits',   href: '/dashboard/habits' },
  { name: 'Journal',  href: '/dashboard/journal' },
  { name: 'Meetings', href: '/dashboard/meetings' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

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
          <ThemeToggle/>
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
        </nav>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col">
        {/* mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[var(--surface)] shadow-elevate-sm">
          <div className="flex items-center">
            <button
              onClick={() => setOpen(!open)}
              className="p-2 rounded hover:bg-[var(--neutral-200)] transition"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6 text-[var(--fg)]"/>
            </button>
            <img src="/flohub_logo.png" alt="FloHub" className="h-6 ml-2"/>
          </div>
          <ThemeToggle/>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
