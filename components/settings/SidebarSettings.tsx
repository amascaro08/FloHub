import React, { useState, useEffect } from 'react';
import { UserSettings } from '../../types/app';
import { 
  Bars3Icon, 
  EyeIcon, 
  EyeSlashIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  HomeIcon,
  CheckIcon,
  BookOpenIcon,
  AcademicCapIcon,
  PencilIcon,
  CalendarIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useUser } from '@/lib/hooks/useUser';

interface SidebarSettingsProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
}

interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  description: string;
  adminOnly?: boolean;
}

const SidebarSettings: React.FC<SidebarSettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  const { user } = useUser();
  const isAdmin = user?.primaryEmail === 'amascaro08@gmail.com';

  // Define all available navigation items
  const allNavItems: NavigationItem[] = [
    { id: "Hub", name: "Hub", href: "/dashboard", icon: HomeIcon, description: "Your main dashboard" },
    { id: "Tasks", name: "Tasks", href: "/dashboard/tasks", icon: CheckIcon, description: "Task management" },
    { id: "Notes", name: "Notes", href: "/dashboard/notes", icon: BookOpenIcon, description: "Note taking and documentation" },
    { id: "Habits", name: "Habits", href: "/habit-tracker", icon: AcademicCapIcon, description: "Habit tracking" },
    { id: "Journal", name: "Journal", href: "/dashboard/journal", icon: PencilIcon, description: "Personal journaling" },
    { id: "Calendar", name: "Calendar", href: "/calendar", icon: CalendarIcon, description: "Calendar and events" },
    { id: "Meetings", name: "Meetings", href: "/dashboard/meetings", icon: VideoCameraIcon, description: "Meeting management" },
    { id: "Feedback", name: "Feedback", href: "/feedback", icon: ChatBubbleLeftRightIcon, description: "Send feedback to developers" },
    ...(isAdmin ? [{ id: "Admin", name: "User Management", href: "/dashboard/admin", icon: UsersIcon, description: "Administrative tools", adminOnly: true }] : [])
  ];

  // Initialize sidebar preferences from user data
  const [sidebarPrefs, setSidebarPrefs] = useState(() => {
    // Try to get from user data first, then fall back to defaults
    const defaultPrefs = {
      visiblePages: allNavItems.map(item => item.id),
      order: allNavItems.map(item => item.id),
      collapsed: false
    };
    
    // You'll need to fetch this from user profile/database
    return defaultPrefs;
  });

  // Load sidebar preferences from user data
  useEffect(() => {
    const fetchSidebarPrefs = async () => {
      if (user?.email) {
        try {
          const response = await fetch(`/api/user/sidebar-preferences?userId=${user.email}`);
          if (response.ok) {
            const prefs = await response.json();
            setSidebarPrefs(prefs);
          }
        } catch (error) {
          console.error('Failed to load sidebar preferences:', error);
        }
      }
    };
    
    fetchSidebarPrefs();
  }, [user?.email]);

  // Save sidebar preferences
  const saveSidebarPrefs = async (newPrefs: typeof sidebarPrefs) => {
    setSidebarPrefs(newPrefs);
    
    if (user?.email) {
      try {
        await fetch(`/api/user/sidebar-preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.email,
            preferences: newPrefs
          })
        });
      } catch (error) {
        console.error('Failed to save sidebar preferences:', error);
      }
    }
  };

  // Toggle visibility of a navigation item
  const toggleVisibility = (itemId: string) => {
    const newPrefs = {
      ...sidebarPrefs,
      visiblePages: sidebarPrefs.visiblePages.includes(itemId)
        ? sidebarPrefs.visiblePages.filter(id => id !== itemId)
        : [...sidebarPrefs.visiblePages, itemId]
    };
    saveSidebarPrefs(newPrefs);
  };

  // Move item up in order
  const moveUp = (itemId: string) => {
    const currentIndex = sidebarPrefs.order.indexOf(itemId);
    if (currentIndex > 0) {
      const newOrder = [...sidebarPrefs.order];
      [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
      const newPrefs = { ...sidebarPrefs, order: newOrder };
      saveSidebarPrefs(newPrefs);
    }
  };

  // Move item down in order
  const moveDown = (itemId: string) => {
    const currentIndex = sidebarPrefs.order.indexOf(itemId);
    if (currentIndex < sidebarPrefs.order.length - 1) {
      const newOrder = [...sidebarPrefs.order];
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
      const newPrefs = { ...sidebarPrefs, order: newOrder };
      saveSidebarPrefs(newPrefs);
    }
  };

  // Get ordered items based on user preferences
  const orderedItems = sidebarPrefs.order
    .map(id => allNavItems.find(item => item.id === id))
    .filter(Boolean) as NavigationItem[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Bars3Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--fg)]">Sidebar Customization</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Customize your navigation menu visibility and order
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-800/50">
        <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-3">Preview</h3>
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm border border-neutral-200 dark:border-neutral-700">
          <div className="space-y-1">
            {orderedItems
              .filter(item => sidebarPrefs.visiblePages.includes(item.id))
              .map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-700">
                    <Icon className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-medium text-[var(--fg)]">{item.name}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Navigation Items Management */}
      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <h3 className="text-lg font-medium text-[var(--fg)] mb-6">Navigation Items</h3>
        
        <div className="space-y-3">
          {orderedItems.map((item, index) => {
            const Icon = item.icon;
            const isVisible = sidebarPrefs.visiblePages.includes(item.id);
            const canMoveUp = index > 0;
            const canMoveDown = index < orderedItems.length - 1;

            return (
              <div
                key={item.id}
                className={`
                  flex items-center justify-between p-4 rounded-xl border transition-all duration-200
                  ${isVisible 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                    : 'bg-neutral-50 border-neutral-200 dark:bg-neutral-800/50 dark:border-neutral-700'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${isVisible ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`} />
                  <div>
                    <p className={`font-medium ${isVisible ? 'text-green-900 dark:text-green-100' : 'text-neutral-600 dark:text-neutral-400'}`}>
                      {item.name}
                      {item.adminOnly && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full dark:bg-red-900/30 dark:text-red-300">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className={`text-sm ${isVisible ? 'text-green-700 dark:text-green-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Reorder buttons */}
                  <button
                    onClick={() => moveUp(item.id)}
                    disabled={!canMoveUp}
                    className={`p-2 rounded-lg transition-colors ${
                      canMoveUp 
                        ? 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700' 
                        : 'text-neutral-300 cursor-not-allowed dark:text-neutral-600'
                    }`}
                    title="Move up"
                  >
                    <ArrowUpIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => moveDown(item.id)}
                    disabled={!canMoveDown}
                    className={`p-2 rounded-lg transition-colors ${
                      canMoveDown 
                        ? 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700' 
                        : 'text-neutral-300 cursor-not-allowed dark:text-neutral-600'
                    }`}
                    title="Move down"
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                  </button>

                  {/* Visibility toggle */}
                  <button
                    onClick={() => toggleVisibility(item.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isVisible
                        ? 'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30'
                        : 'text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                    title={isVisible ? 'Hide from sidebar' : 'Show in sidebar'}
                  >
                    {isVisible ? (
                      <EyeIcon className="w-4 h-4" />
                    ) : (
                      <EyeSlashIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar State Persistence */}
      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <h3 className="text-lg font-medium text-[var(--fg)] mb-6">Sidebar Behavior</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <div>
              <p className="font-medium text-[var(--fg)]">Remember Sidebar State</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Keep sidebar open/closed state when navigating between pages
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-state"
                checked={true}
                className="w-4 h-4 text-primary-600 bg-white border-neutral-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
                readOnly
              />
              <label htmlFor="remember-state" className="sr-only">
                Remember sidebar state
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <div>
              <p className="font-medium text-[var(--fg)]">Auto-collapse on Mobile</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Automatically collapse sidebar on smaller screens
              </p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-collapse"
                checked={true}
                className="w-4 h-4 text-primary-600 bg-white border-neutral-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
                readOnly
              />
              <label htmlFor="auto-collapse" className="sr-only">
                Auto-collapse on mobile
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarSettings;