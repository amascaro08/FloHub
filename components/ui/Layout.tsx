'use client'

import { ReactNode, useState, useEffect, memo } from 'react'
import { useRouter } from 'next/router';
import { Menu, Home, CheckSquare, BookOpen, Target, PenTool, Calendar, Settings, LogOut, Video, User, Users, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ChatSideModal from './ChatSideModal';
import ChatToggleButton from './ChatToggleButton';

import ThemeToggle from './ThemeToggle'
import { useUser } from '@/lib/hooks/useUser';
import { useChat } from '../assistant/ChatContext';
import LogoutButton from './LogoutButton';

const defaultNav = [
  { name: "Hub", href: "/dashboard", icon: Home },
  { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { name: "Notes", href: "/dashboard/notes", icon: BookOpen },
  { name: "Habits", href: "/habit-tracker", icon: Target },
  { name: "Journal", href: "/dashboard/journal", icon: PenTool },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Meetings", href: "/dashboard/meetings", icon: Video },
  { name: "Feedback", href: "/feedback", icon: MessageCircle },
];

interface SidebarPreferences {
  visiblePages: string[];
  order: string[];
  collapsed: boolean;
}

const Layout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(() => {
    // Initialize from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

  // Sidebar preferences state
  const [sidebarPrefs, setSidebarPrefs] = useState<SidebarPreferences>({
    visiblePages: defaultNav.map(item => item.name),
    order: defaultNav.map(item => item.name),
    collapsed: false
  });

  // Add refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // -- AUTH --
  const { user } = useUser();
  
  // -- LOCK STATE --
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Load lock state from localStorage on component mount
    const saved = localStorage.getItem("dashboardLocked");
    setIsLocked(saved === "true");
  }, []);

  // Load sidebar preferences from API
  useEffect(() => {
    const loadSidebarPrefs = async () => {
      if (user?.email) {
        try {
          console.log('Loading sidebar preferences for user:', user.email);
          const response = await fetch(`/api/user/sidebar-preferences?userId=${user.email}&t=${Date.now()}`);
          if (response.ok) {
            const prefs = await response.json();
            console.log('Loaded sidebar preferences:', prefs);
            setSidebarPrefs(prefs);
            // Also set collapsed state from preferences
            if (prefs.collapsed !== undefined) {
              setDesktopSidebarCollapsed(prefs.collapsed);
              localStorage.setItem('sidebarCollapsed', String(prefs.collapsed));
            }
          }
        } catch (error) {
          console.error('Failed to load sidebar preferences:', error);
        }
      }
    };

    loadSidebarPrefs();
  }, [user?.email, refreshTrigger]);

  // Listen for sidebar preference changes from other components
  useEffect(() => {
    const handleSidebarPreferencesChanged = () => {
      console.log('Sidebar preferences changed event received, refreshing...');
      setRefreshTrigger(prev => prev + 1);
    };

    // Listen for custom events
    window.addEventListener('sidebarPreferencesChanged', handleSidebarPreferencesChanged);
    
    // Also listen for storage changes (in case of multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarPreferencesUpdated') {
        console.log('Storage change detected for sidebar preferences');
        setRefreshTrigger(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('sidebarPreferencesChanged', handleSidebarPreferencesChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save sidebar collapsed state to preferences
  const saveSidebarState = async (collapsed: boolean) => {
    if (user?.email) {
      try {
        const newPrefs = { ...sidebarPrefs, collapsed };
        await fetch('/api/user/sidebar-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.email,
            preferences: newPrefs
          })
        });
        setSidebarPrefs(newPrefs);
      } catch (error) {
        console.error('Failed to save sidebar state:', error);
      }
    }
  };

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
  const adminNavItem = { name: "User Management", href: "/dashboard/admin", icon: Users };

  // -- CHAT --
  const chatContext = useChat();
  const isChatOpen = chatContext?.isChatOpen || false;
  const setIsChatOpen = chatContext?.setIsChatOpen || (() => {});

  const toggleDesktopSidebar = () => {
    const newCollapsed = !desktopSidebarCollapsed;
    setDesktopSidebarCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', String(newCollapsed));
    saveSidebarState(newCollapsed);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Build navigation items based on user preferences
  const buildNavigation = () => {
    // Create a map of all available navigation items
    const navMap = new Map();
    defaultNav.forEach(item => navMap.set(item.name, item));
    if (isAdmin) {
      navMap.set("User Management", adminNavItem);
    }

    console.log('Building navigation with preferences:', sidebarPrefs);
    console.log('Available nav items:', Array.from(navMap.keys()));
    console.log('Visible pages:', sidebarPrefs.visiblePages);
    console.log('Order:', sidebarPrefs.order);

    // Order items according to user preferences
    const orderedNav = sidebarPrefs.order
      .map(name => navMap.get(name))
      .filter(item => item && sidebarPrefs.visiblePages.includes(item.name));

    // Add any items that aren't in the order but are visible (fallback)
    sidebarPrefs.visiblePages.forEach(name => {
      if (!sidebarPrefs.order.includes(name) && navMap.has(name)) {
        orderedNav.push(navMap.get(name));
      }
    });

    console.log('Final navigation items:', orderedNav.map(item => item.name));
    return orderedNav;
  };

  const navigationItems = buildNavigation();

  // Close mobile sidebar when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setMobileSidebarOpen(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

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
          ${mobileSidebarOpen ? 'fixed inset-y-0 left-0 translate-x-0 w-full max-w-sm' : 'fixed inset-y-0 left-0 -translate-x-full w-full max-w-sm'}
          md:static md:translate-x-0 md:shadow-none md:w-64
          ${desktopSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          border-r border-neutral-200 dark:border-neutral-700 flex flex-col
          h-screen
        `}
      >
        {/* Header */}
        <div className={`py-[26px] px-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center ${desktopSidebarCollapsed ? 'justify-center' : 'justify-between'} flex-shrink-0`}>
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
        
        {/* Main navigation - mobile no scroll, desktop with scroll */}
        <nav className="flex-1 md:overflow-y-auto md:min-h-0 flex flex-col justify-start sidebar-nav">
          <div className="space-y-1 flex-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all sidebar-item-responsive ${
                  desktopSidebarCollapsed ? 'justify-center' : 'justify-start'
                } group ${
                  router.pathname === item.href 
                    ? 'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800' 
                    : ''
                }`}
                onClick={() => {
                  setMobileSidebarOpen(false);
                }}
              >
                <item.icon className={`transition-colors sidebar-icon-responsive ${
                  router.pathname === item.href 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-primary-500 group-hover:text-primary-600'
                } ${
                  (!desktopSidebarCollapsed || mobileSidebarOpen) && 'mr-3'
                }`} />
                {(!desktopSidebarCollapsed || mobileSidebarOpen) && (
                  <span className={`font-medium transition-colors sidebar-text-responsive ${
                    router.pathname === item.href 
                      ? 'text-primary-700 dark:text-primary-300' 
                      : 'text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white'
                  }`}>
                    {item.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* User account section - bottom third */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 flex-shrink-0 mt-auto">
          {/* User account indicator */}
          {(!desktopSidebarCollapsed || mobileSidebarOpen) && user && (
            <div className="border-b border-neutral-200 dark:border-neutral-700 sidebar-bottom-section">
              <div className="flex items-center space-x-3 sidebar-item-responsive">
                <div className="bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 sidebar-avatar">
                  <User className="text-white sidebar-icon-responsive" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 dark:text-white truncate sidebar-text-responsive">
                    {user.primaryEmail || user.email || 'User'}
                  </p>
                  <p className="text-neutral-500 dark:text-neutral-400 truncate sidebar-subtext-responsive">
                    FloHub Account
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Collapsed user indicator */}
          {desktopSidebarCollapsed && !mobileSidebarOpen && user && (
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-center">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {/* Settings and Sign Out */}
          <div className="space-y-1 sidebar-bottom-section">
            <Link
              href="/dashboard/settings"
              className={`flex items-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all sidebar-item-responsive ${
                desktopSidebarCollapsed ? 'justify-center' : 'justify-start'
              } group ${
                router.pathname === '/dashboard/settings' 
                  ? 'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800' 
                  : ''
              }`}
              onClick={() => {
                setMobileSidebarOpen(false);
              }}
            >
              <Settings className={`transition-colors sidebar-icon-responsive ${
                router.pathname === '/dashboard/settings' 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-neutral-500 group-hover:text-neutral-600'
              } ${
                (!desktopSidebarCollapsed || mobileSidebarOpen) && 'mr-3'
              }`} />
              {(!desktopSidebarCollapsed || mobileSidebarOpen) && (
                <span className={`font-medium transition-colors sidebar-text-responsive ${
                  router.pathname === '/dashboard/settings' 
                    ? 'text-primary-700 dark:text-primary-300' 
                    : 'text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white'
                }`}>
                  Settings
                </span>
              )}
            </Link>

            <LogoutButton
              className={`flex items-center w-full text-left rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all sidebar-item-responsive ${
                desktopSidebarCollapsed ? 'justify-center' : 'justify-start'
              } group`}
            >
              <LogOut className={`text-red-500 group-hover:text-red-600 transition-colors sidebar-icon-responsive ${
                (!desktopSidebarCollapsed || mobileSidebarOpen) && 'mr-3'
              }`} />
              {(!desktopSidebarCollapsed || mobileSidebarOpen) && (
                <span className="font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors sidebar-text-responsive">
                  Sign Out
                </span>
              )}
            </LogoutButton>
          </div>

          {/* Theme toggle - Hide on mobile for space */}
          <div className={`hidden md:flex p-4 border-t border-neutral-200 dark:border-neutral-700 items-center justify-center ${desktopSidebarCollapsed ? 'md:hidden' : ''}`}>
            <ThemeToggle />
          </div>
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
            
            <ChatToggleButton onClick={toggleChat} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-2 w-full">
          <div className="w-full h-full">
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
