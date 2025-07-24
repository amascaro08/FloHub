'use client'

import { ReactNode, useState, useEffect, memo } from 'react'
import { useRouter } from 'next/router';
import { Menu, Home, ListTodo, Book, Calendar, Settings, LogOut, NotebookPen, UserIcon, NotebookPenIcon, NotepadText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ChatSideModal from './ChatSideModal';
import ChatToggleButton from './ChatToggleButton';
import WeatherWidget from './WeatherWidget';
import ThemeToggle from './ThemeToggle'
import { useUser } from '@/lib/hooks/useUser';
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
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const Layout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  // -- AUTH --
  const { user } = useUser();
  
  // -- LOCK STATE --
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Load lock state from localStorage on component mount
    const saved = localStorage.getItem("dashboardLocked");
    setIsLocked(saved === "true");
  }, []);

  const toggleLock = () => {
    setIsLocked(current => {
      const newState = !current;
      localStorage.setItem("dashboardLocked", String(newState));
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('lockStateChanged'));
      return newState;
    });
  };

  const isAdmin = user?.primaryEmail === 'amascaro08@gmail.com';
  const adminNavItem = { name: "Admin", href: "/dashboard/admin", icon: Settings };

  // -- CHAT --
  const chatContext = useChat();
  const isChatOpen = chatContext?.isChatOpen || false;
  const setIsChatOpen = chatContext?.setIsChatOpen || (() => {});

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
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
              onClick={() => {
                setMobileSidebarOpen(false);
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
              onClick={() => {
                setMobileSidebarOpen(false);
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
              // Implement sign out
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
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        isChatOpen ? 'md:transform md:-translate-x-4' : ''
      }`}>
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

          <div className="flex items-center gap-2">
            <WeatherWidget />
            <ChatToggleButton onClick={toggleChat} />
            <button
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative group"
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

      {/* Chat Side Modal */}
      <ChatSideModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default memo(Layout);
