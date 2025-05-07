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
          fixed inset-0 bg-black/50 z-20 transition-opacity
          ${mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          md:hidden
        `}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* sidebar */}
        <aside
          className={`
            bg-[var(--surface)] shadow-lg z-30 transform transition-transform duration-200 ease-in-out
            ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'}
            md:static md:translate-x-0 md:shadow-none
            ${desktopSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          `}
        >
        <div className={`p-4 border-b flex items-center ${desktopSidebarCollapsed ? 'justify-center' : 'justify-between'}`}> {/* Center content when collapsed */}
          {!desktopSidebarCollapsed && <img src="/FloHub_Logo_Transparent.png" alt="FloHub" className="h-12"/>} {/* Hide logo when collapsed */}
          {/* Toggle button for desktop sidebar */}
          <button
            onClick={toggleDesktopSidebar}
            className="p-2 rounded hover:bg-[var(--neutral-200)] transition hidden md:block" // Only show on desktop
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-[var(--fg)]" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {nav.map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className={`flex items-center px-3 py-2 rounded hover:bg-[var(--neutral-200)] transition ${desktopSidebarCollapsed ? 'justify-center' : ''}`}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <x.icon className={`w-6 h-6 ${!desktopSidebarCollapsed && 'mr-3'}`} />
              {!desktopSidebarCollapsed && x.name}
            </Link>
          ))}
          {/* Sign Out button */}
          <button
            className={`flex items-center w-full text-left px-3 py-2 rounded hover:bg-[var(--neutral-200)] transition ${desktopSidebarCollapsed ? 'justify-center' : ''}`}
            onClick={() => {
              setMobileSidebarOpen(false);
              signOut();
            }}
          >
            <LogOut className={`w-6 h-6 ${!desktopSidebarCollapsed && 'mr-3'}`} /> {/* Sign Out icon */}
            {!desktopSidebarCollapsed && "Sign Out"} {/* Hide text when collapsed */}
          </button>
        </nav>
        <div className={`p-4 border-t flex items-center justify-center ${desktopSidebarCollapsed ? 'hidden' : ''}`}>
          <ThemeToggle />
        </div>
      </aside>

      {/* main */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ease-in-out ${desktopSidebarCollapsed ? '' : ''}`}> {/* Adjust margin based on state */}
        {/* header */}
        <header className="flex items-center justify-between p-4 bg-[var(--surface)] shadow-elevate-sm">
          <div className="flex items-center">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 rounded hover:bg-[var(--neutral-200)] transition md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6 text-[var(--fg)]" />
            </button>
            <img src="/FloHub_Logo_Transparent.png" alt="FloHub" className="h-10 ml-2 md:hidden" /> {/* Hide logo on desktop header */}
          </div>
          {/* FloCat Chat Bubble */}
          <div className="flex-1 flex justify-center relative"> {/* Use flex-1 and justify-center to center the input, add relative positioning */}
            <input
              type="text"
              placeholder=" FloCat is here to help you... 🐱"
              className="w-full max-w-md p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={topInput}
              onChange={(e) => setTopInput(e.target.value)}
              onFocus={() => setIsChatOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isChatOpen && topInput.trim()) {
                  handleTopInputSend();
                }
              }}
            />
            {isChatOpen && (
              <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50"> {/* Position below input */}
                <ChatWidget
                  onClose={() => setIsChatOpen(false)}
                  key="chatwidget"
                />
              </div>
            )}
          </div>
        </header>

        <div className="absolute top-4 right-4 z-50 hidden md:block">
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

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default memo(Layout);
