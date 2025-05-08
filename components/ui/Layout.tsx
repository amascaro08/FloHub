'use client'

import { ReactNode, useState, useEffect, memo } from 'react'
import { signOut } from "next-auth/react";
import { Menu, Home, ListTodo, Book, Calendar, Settings, LogOut, NotebookPen, UserIcon } from 'lucide-react' // Import icons
import Link from 'next/link'
import ChatWidget from '../assistant/ChatWidget';
import ThemeToggle from './ThemeToggle'
import { useAuth } from "./AuthContext";
import { useChat } from '../assistant/ChatContext'; // Import useChat from context

const nav = [
  { name: "Hub", href: "/dashboard", icon: Home },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Notes", href: "/dashboard/notes", icon: NotebookPen }, // Add Notes link with icon
  { name: "Habits", href: "/dashboard/habits", icon: Book },
  { name: "Journal", href: "/dashboard/journal", icon: Calendar }, // Using Calendar icon for Journal for now
  { name: "Meetings", href: "/dashboard/meetings", icon: UserIcon },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const Layout = ({ children }: { children: ReactNode }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false); // State for desktop sidebar collapse
  const { isLocked, toggleLock } = useAuth();
  const [topInput, setTopInput] = useState('');
  
  // Get chat state from context
  // Get chat state from context with error handling
  const chatContext = useChat();
  const {
    history,
    send,
    status,
    loading,
    input: chatInput,
    setInput: setChatInput,
    isChatOpen,
    setIsChatOpen
  } = chatContext || {
    history: [],
    send: async () => {},
    status: 'idle',
    loading: false,
    input: '',
    setInput: () => {},
    isChatOpen: false,
    setIsChatOpen: () => {}
  };

  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
  };

  // Handle sending message from the top input
  const handleTopInputSend = async () => {
    if (topInput.trim() && send) {
      try {
        await send(topInput.trim());
        setTopInput(''); // Clear input after sending
        setIsChatOpen(true); // Open chat widget after sending from top input
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };


  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
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
        <div className={`p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center ${desktopSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!desktopSidebarCollapsed && (
            <img src="/FloHub_Logo_Transparent.png" alt="FloHub" className="h-10 animate-pulse-subtle"/>
          )}
          {/* Toggle button for desktop sidebar */}
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
              onClick={() => setMobileSidebarOpen(false)}
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
          {/* Sign Out button */}
          <button
            className={`flex items-center w-full text-left px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all ${
              desktopSidebarCollapsed ? 'justify-center' : ''
            } group mt-4`}
            onClick={() => {
              setMobileSidebarOpen(false);
              signOut();
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
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
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
            <img src="/FloHub_Logo_Transparent.png" alt="FloHub" className="h-8 ml-2 md:hidden" />
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
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ml-2"
              onClick={() => toggleLock()}
              aria-label="Toggle Lock"
            >
              {isLocked ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><rect width="12" height="10" x="6" y="11" rx="2"/><path d="M12 17v-2"/><path d="M8 11V5a4 4 0 0 1 8 0v6"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500"><rect width="12" height="10" x="6" y="11" rx="2"/><path d="M12 17v-2"/><path d="M16 11V5a4 4 0 0 0-8 0"/></svg>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default memo(Layout);
