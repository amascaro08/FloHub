// components/ui/Layout.tsx
"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";               // npm install lucide-react
import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface NavItem {
  name: string;
  href: string;
}

const navItems: NavItem[] = [
  { name: "Hub",      href: "/dashboard" },
  { name: "Tasks",    href: "/dashboard/tasks" },
  { name: "Habits",   href: "/dashboard/habits" },
  { name: "Journal",  href: "/dashboard/journal" },
  { name: "Meetings", href: "/dashboard/meetings" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* Mobile backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-20 transition-opacity
          ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          md:hidden
        `}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-[var(--surface)] shadow-lg z-30 transform transition-transform
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:shadow-none
        `}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <img src="/flohub_logo.png" alt="FloHub" className="h-8" />
          <ThemeToggle />
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a
                className="
                  block px-3 py-2 rounded 
                  hover:bg-[var(--neutral-200)] 
                  transition-colors duration-200 
                  text-[var(--fg)]
                "
                onClick={() => setDrawerOpen(false)}
              >
                {item.name}
              </a>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[var(--surface)] shadow-elevate-sm">
          <div className="flex items-center">
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className="p-2 rounded hover:bg-[var(--neutral-200)] transition"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6 text-[var(--fg)]" />
            </button>
            <img src="/flohub_logo.png" alt="FloHub" className="h-6 ml-2" />
          </div>
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
