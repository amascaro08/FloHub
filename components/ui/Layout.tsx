// components/ui/Layout.tsx
"use client";

import Image from "next/image";
import Link  from "next/link";
import { ReactNode } from "react";
import { useRouter }  from "next/router";
import { useSession, signIn, signOut } from "next-auth/react";

// **Import the ChatWidget exactly from where it lives**
import ChatWidget from "@/components/assistant/ChatWidget";

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname }      = useRouter();
  const { data: session, status } = useSession();

  const navItems = [
    { name: "Hub", href: "/dashboard" },
    { name: "Tasks",     href: "/dashboard/tasks" },
    { name: "Habits",    href: "/dashboard/habits" },
    { name: "Journal",   href: "/dashboard/journal" },
    { name: "Meetings",  href: "/dashboard/meetings" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 shadow-md">
        <div className="mb-6 flex justify-center">
          <Image src="/flohub_logo.png" alt="FloHub" width={140} height={40} priority />
        </div>
        <nav className="flex flex-col gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors duration-200 hover:text-indigo-600 ${
                pathname === item.href ? "font-bold text-indigo-600" : "text-gray-700"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="mt-6">
          {status === "loading" ? null : session ? (
            <button
              onClick={() => signOut()}
              className="w-full text-left text-sm text-red-500 hover:underline"
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="w-full text-left text-sm text-indigo-600 hover:underline"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 bg-gray-50">{children}</main>

      {/* FloCat Chat Widget */}
      <ChatWidget />
    </div>
  );
}
