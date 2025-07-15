'use client'

import { ReactNode, useState, useEffect, memo } from 'react'
import { signOut } from "next-auth/react";
import { useRouter } from 'next/router';
import { Menu, Home, ListTodo, Book, Calendar, Settings, LogOut, NotebookPen, UserIcon, NotebookPenIcon, NotepadText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ChatWidget from '../assistant/ChatWidget';
import ThemeToggle from './ThemeToggle'
import { useUser } from '@stackframe/stack';
import { useChat } from '../assistant/ChatContext';

const nav = [
  { name: "Hub", href: "/dashboard", icon: Home },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Notes", href: "/dashboard/notes", icon: NotepadText },
  { name: "Habits", href: "/habit-tracker", icon: Book },
  { name: "Journal", href: "/dashboard/journal", icon: NotebookPenIcon },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Meetings", href: "/dashboard/meetings", icon: UserIcon },
  { name: "Feedback", href: "/feedback", icon: NotebookPen },
  { name: "Settings", href: "/dashboard/settings-modular", icon: Settings },
];

const Layout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [topInput, setTopInput] = useState('');

  // -- AUTH --
  const user = useUser(); // Direct, no .user
  // For widget lock/unlock, implement these as needed, for now just dummy:
  const isLocked = false; // If you have a lock/unlock feature, implement as state
  const toggleLock = () => {};

  const isAdmin = user?.primaryEmail === 'amascaro08@gmail.com';
  const adminNavItem = { name: "Admin", href: "/dashboard/admin", icon: Settings };

  // -- CHAT --
  const chatContext = useChat();
  const history = chatContext?.history || [];
  const send = chatContext?.send || (async () => {});
  const status = chatContext?.status || 'idle';
  const loading = chatContext?.loading || false;
  const chatInput = chatContext?.input || '';
  const setChatInput = chatContext?.setInput || (() => {});
  const isChatOpen = chatContext?.isChatOpen || false;
  const setIsChatOpen = chatContext?.setIsChatOpen || (() => {});

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
  };

  // Send from header input
  const handleTopInputSend = async () => {
    if (topInput.trim() && send) {
      try {
        await send(topInput.trim());
        setTopInput('');
        setIsChatOpen(true);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  // Loading state for user (optional, depends if you want to delay render)
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-16 w-16 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm z-20 transition-opacity duration-300
          ${mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          md:hidden
        `}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* sidebar */}
      <aside
        className={`
          bg-[var(--surface)] shadow-glass z-30 transform transition-all duration-300 ease-in-out
          ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'}
          md:static md:translate-x-0 md:shadow-none
          ${desktopSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          border-r border-neutral-200 dark:border-neutral-700
        `}
      >
        <div className={`py-[26px] px-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center ${desktopSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!desktopSidebarCollapsed && (
            <Image
              src="/FloHub_Logo_Transparent.png"
              alt="FloHub"
              width={40}
              height={40}
              priority={true}
              quality={85}
              className="animate-pulse-subtle"
            />
          )}
          <button
            onClick={toggleDesktopSidebar}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors hidden md:flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {nav.map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className={`flex items-center px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all ${
                desktopSidebarCollapsed ? 'justify-center' : ''
              } group`}
              onClick={(e) => {
                e.preventDefault();
                setMobileSidebarOpen(false);
                window.location.href = x.href;
              }}
            >
              <x.icon className={`w-5 h-5 text-primary-500 group-hover:text-primary-600 transition-colors ${
                !desktopSidebarCollapsed && 'mr-3'
              }`} />
              {!desktopSidebarCollapsed && (
                <span className="font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                  {x.name}
                </span>
              )}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href={adminNavItem.href}
              className={`flex items-center px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all ${
                desktopSidebarCollapsed ? 'justify-center' : ''
              } group`}
              onClick={(e) => {
                e.preventDefault();
                setMobileSidebarOpen(false);
                window.location.href = adminNavItem.href;
              }}
            >
              <Settings className={`w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors ${
                !desktopSidebarCollapsed && 'mr-3'
              }`} />
              {!desktopSidebarCollapsed && (
                <span className="font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                  {adminNavItem.name}
                </span>
              )}
            </Link>
          )}
          {/* Sign Out button */}
          <button
            className={`flex items-center w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all ${
              desktopSidebarCollapsed ? 'justify-center' : ''
            } group mt-4`}
            onClick={() => {
              setMobileSidebarOpen(false);
              signOut({ callbackUrl: '/' });
            }}
          >
            <LogOut className={`w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors ${
              !desktopSidebarCollapsed && 'mr-3'
            }`} />
            {!desktopSidebarCollapsed && (
              <span className="font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                Sign Out
              </span>
            )}
          </button>
        </nav>
        <div className={`p-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-center ${desktopSidebarCollapsed ? 'hidden' : ''}`}>
          <ThemeToggle />
        </div>
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden">
        {/* header */}
        <header className="flex items-center justify-between p-4 bg-[var(--surface)] shadow-elevate-sm border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
            <Image
              src="/FloHub_Logo_Transparent.png"
              alt="FloHub"
              width={32}
              height={32}
              priority={true}
              quality={85}
              className="ml-2 md:hidden"
            />
          </div>

          {/* FloCat Chat Bubble */}
          <div className="flex-1 flex justify-center relative">
            <div className="w-full max-w-md relative">
              <input
                type="text"
                placeholder="FloCat is here to help you... 🐱"
                className="w-full p-2.5 pl-4 pr-10 rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800"
                value={topInput}
                onChange={(e) => setTopInput(e.target.value)}
                onFocus={() => setIsChatOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isChatOpen && topInput.trim()) {
                    handleTopInputSend();
                  }
                }}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
              </div>
            </div>
            {isChatOpen && (
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
                <ChatWidget
                  onClose={() => setIsChatOpen(false)}
                  key="chatwidget"
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <button
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-2 relative group"
              onClick={() => toggleLock()}
              aria-label={isLocked ? "Unlock layout" : "Lock layout"}
            >
              {isLocked ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><rect width="12" height="10" x="6" y="11" rx="2"/><path d="M12 17v-2"/><path d="M8 11V5a4 4 0 0 1 8 0v6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500"><rect width="12" height="10" x="6" y="11" rx="2"/><path d="M12 17v-2"/><path d="M16 11V5a4 4 0 0 0-8 0"/></svg>
              )}
              <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {isLocked ? "Unlock to reorder widgets" : "Lock widget order"}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 max-w-full">
          <div className="w-full max-w-[100vw]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default memo(Layout);
