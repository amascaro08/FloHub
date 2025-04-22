"use client";

import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";       // ← requires `npm install lucide-react`
import Link from "next/link";

export default function Layout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { name: "Hub",      href: "/dashboard" },
    { name: "Tasks",    href: "/dashboard/tasks" },
    { name: "Habits",   href: "/dashboard/habits" },
    { name: "Journal",  href: "/dashboard/journal" },
    { name: "Meetings", href: "/dashboard/meetings" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity
          ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
          md:hidden`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-30 transform transition-transform
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 md:static md:shadow-none`}
      >
        <div className="p-4 border-b">
          <img src="/flohub_logo.png" alt="FloHub" className="h-8" />
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} legacyBehavior href={item.href}>
              <a
                className="block px-3 py-2 rounded hover:bg-gray-100"
                onClick={() => setDrawerOpen(false)}
              >
                {item.name}
              </a>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white shadow">
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <img src="/flohub_logo.png" alt="FloHub" className="h-6" />
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
