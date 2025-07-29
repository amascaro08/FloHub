
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
// Removed react-grid-layout in favor of custom CSS positioning
import { Settings, Plus, CheckSquare, Calendar, Clock, FileText, Sparkles, Grid3X3, BookOpen } from 'lucide-react';
import ErrorBoundary from '../ui/ErrorBoundary';
import LayoutTemplateSelector, { LayoutTemplate } from '../ui/LayoutTemplateSelector';

// React.lazy imports
import OptimizedSkeleton from '@/components/ui/OptimizedSkeleton';
import { CalendarProvider } from '@/contexts/CalendarContext';

const WidgetSkeleton = ({ type }: { type: string }) => (
  <OptimizedSkeleton variant={type as any} />
);

// Lazy-loaded components
const TaskWidget = lazy(() => import("@/components/widgets/TaskWidget"));
const CalendarWidget = lazy(() => import("@/components/widgets/CalendarWidget"));
const ChatWidget = lazy(() => import("@/components/assistant/ChatWidget"));
const SmartAtAGlanceWidget = lazy(() => import("@/components/widgets/SmartAtAGlanceWidget"));
const QuickNoteWidget = lazy(() => import("@/components/widgets/QuickNoteWidget"));
const HabitTrackerWidget = lazy(() => import("@/components/widgets/HabitTrackerWidget"));
const JournalWidget = lazy(() => import("@/components/widgets/JournalWidget"));

// User hooks
import { useUser } from "@/lib/hooks/useUser";
import { UserSettings } from "@/types/app";

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "habit-tracker" | "journal";

interface WidgetSlotAssignment {
  [slotId: string]: string | null; // widget type or null
}

interface LayoutSlot {
  id: string;
  size: 'small' | 'medium' | 'large' | 'hero';
  position: { row: number; col: number; rowSpan: number; colSpan: number };
  suggestedWidgets?: string[];
  label: string;
}

interface LayoutTemplateConfig {
  id: LayoutTemplate;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'Simple' | 'Productivity' | 'Analytics' | 'Advanced';
  slots: LayoutSlot[];
  gridConfig: {
    rows: number;
    cols: number;
    responsive: {
      lg: { cols: number; rowHeight: number };
      md: { cols: number; rowHeight: number };
      sm: { cols: number; rowHeight: number };
    };
  };
}

// Layout template configurations
const layoutTemplates: LayoutTemplateConfig[] = [
  {
    id: 'single-focus',
    name: 'Single Focus',
    description: 'One large widget for deep focus',
    icon: <CheckSquare className="w-5 h-5" />,
    category: 'Simple',
    slots: [
      {
        id: 'main',
        size: 'hero',
        position: { row: 0, col: 0, rowSpan: 4, colSpan: 12 },
        label: 'Main Focus',
        suggestedWidgets: ['calendar', 'tasks', 'ataglance']
      }
    ],
    gridConfig: {
      rows: 4,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 0 }, // Dynamic height calculation
        md: { cols: 8, rowHeight: 0 },
        sm: { cols: 6, rowHeight: 0 }
      }
    }
  },
  {
    id: 'equal-grid-2',
    name: 'Equal Split',
    description: 'Two equal-sized widgets',
    icon: <Grid3X3 className="w-5 h-5" />,
    category: 'Simple',
    slots: [
      {
        id: 'left',
        size: 'large',
        position: { row: 0, col: 0, rowSpan: 4, colSpan: 6 },
        label: 'Left Panel'
      },
      {
        id: 'right',
        size: 'large',
        position: { row: 0, col: 6, rowSpan: 4, colSpan: 6 },
        label: 'Right Panel'
      }
    ],
    gridConfig: {
      rows: 4,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 0 }, // Dynamic height calculation
        md: { cols: 8, rowHeight: 0 },
        sm: { cols: 6, rowHeight: 0 }
      }
    }
  },
  {
    id: 'primary-secondary',
    name: 'Primary + Secondary',
    description: 'One main widget with supporting info',
    icon: <Plus className="w-5 h-5" />,
    category: 'Productivity',
    slots: [
      {
        id: 'primary',
        size: 'hero',
        position: { row: 0, col: 0, rowSpan: 3, colSpan: 8 },
        label: 'Primary Focus',
        suggestedWidgets: ['calendar', 'tasks']
      },
      {
        id: 'secondary',
        size: 'medium',
        position: { row: 0, col: 8, rowSpan: 3, colSpan: 4 },
        label: 'Quick Info',
        suggestedWidgets: ['ataglance', 'quicknote']
      }
    ],
    gridConfig: {
      rows: 3,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 0 }, // Dynamic height calculation
        md: { cols: 8, rowHeight: 0 },
        sm: { cols: 6, rowHeight: 0 }
      }
    }
  },
  {
    id: 'hero-sidebar',
    name: 'Hero + Sidebar',
    description: 'Large main area with vertical info stack',
    icon: <Calendar className="w-5 h-5" />,
    category: 'Productivity',
    slots: [
      {
        id: 'hero',
        size: 'hero',
        position: { row: 0, col: 0, rowSpan: 4, colSpan: 8 },
        label: 'Hero Section',
        suggestedWidgets: ['calendar', 'tasks']
      },
      {
        id: 'sidebar-top',
        size: 'small',
        position: { row: 0, col: 8, rowSpan: 2, colSpan: 4 },
        label: 'Quick Glance',
        suggestedWidgets: ['ataglance']
      },
      {
        id: 'sidebar-bottom',
        size: 'small',
        position: { row: 2, col: 8, rowSpan: 2, colSpan: 4 },
        label: 'Notes/Habits',
        suggestedWidgets: ['quicknote', 'habit-tracker']
      }
    ],
    gridConfig: {
      rows: 4,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 0 }, // Dynamic height calculation
        md: { cols: 8, rowHeight: 0 },
        sm: { cols: 6, rowHeight: 0 }
      }
    }
  },
  {
    id: 'dashboard-classic',
    name: 'Dashboard Classic',
    description: 'Traditional dashboard with KPIs + details',
    icon: <Grid3X3 className="w-5 h-5" />,
    category: 'Analytics',
    slots: [
      {
        id: 'overview',
        size: 'hero',
        position: { row: 0, col: 0, rowSpan: 2, colSpan: 12 },
        label: 'Overview',
        suggestedWidgets: ['ataglance', 'calendar']
      },
      {
        id: 'metric-1',
        size: 'medium',
        position: { row: 2, col: 0, rowSpan: 2, colSpan: 4 },
        label: 'Tasks',
        suggestedWidgets: ['tasks']
      },
      {
        id: 'metric-2',
        size: 'medium',
        position: { row: 2, col: 4, rowSpan: 2, colSpan: 4 },
        label: 'Habits',
        suggestedWidgets: ['habit-tracker']
      },
      {
        id: 'metric-3',
        size: 'medium',
        position: { row: 2, col: 8, rowSpan: 2, colSpan: 4 },
        label: 'Notes',
        suggestedWidgets: ['quicknote']
      }
    ],
    gridConfig: {
      rows: 4,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 0 }, // Dynamic height calculation
        md: { cols: 8, rowHeight: 0 },
        sm: { cols: 6, rowHeight: 0 }
      }
    }
  }
];

const DashboardGrid: React.FC = () => {
  const { user, isLoading } = useUser();
  const [currentTemplate, setCurrentTemplate] = useState<LayoutTemplate>('primary-secondary');
  const [slotAssignments, setSlotAssignments] = useState<WidgetSlotAssignment>({});
  const [loadedSettings, setLoadedSettings] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const isMountedRef = useRef(true);

  // Client-side only
  useEffect(() => {
    setIsClient(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Widget component creator with size-aware rendering
  const createWidgetComponent = (type: WidgetType, slot?: any) => {
    const widgetProps = {
      size: slot?.size || 'medium',
      colSpan: slot?.position?.colSpan || 4,
      rowSpan: slot?.position?.rowSpan || 3,
      isCompact: slot?.size === 'small',
      isHero: slot?.size === 'hero' || slot?.size === 'large'
    };
    
    switch (type) {
      case "tasks":
        return <Suspense fallback={<WidgetSkeleton type="tasks" />}><TaskWidget {...widgetProps} /></Suspense>;
      case "calendar":
        return <Suspense fallback={<WidgetSkeleton type="calendar" />}><CalendarWidget {...widgetProps} /></Suspense>;
      case "ataglance":
        return <Suspense fallback={<WidgetSkeleton type="ataglance" />}><SmartAtAGlanceWidget {...widgetProps} /></Suspense>;
      case "quicknote":
        return <Suspense fallback={<WidgetSkeleton type="generic" />}><QuickNoteWidget {...widgetProps} /></Suspense>;
      case "habit-tracker":
        return <Suspense fallback={<WidgetSkeleton type="generic" />}><HabitTrackerWidget {...widgetProps} /></Suspense>;
      case "journal":
        return <Suspense fallback={<WidgetSkeleton type="generic" />}><JournalWidget {...widgetProps} /></Suspense>;
      default:
        return <div>Unknown widget</div>;
    }
  };

  // Widget icon getter
  const getWidgetIcon = (type: string) => {
    switch (type) {
      case "tasks":
        return <CheckSquare className="w-5 h-5" />;
      case "calendar":
        return <Calendar className="w-5 h-5" />;
      case "ataglance":
        return <Clock className="w-5 h-5" />;
      case "quicknote":
        return <FileText className="w-5 h-5" />;
      case "habit-tracker":
        return <Sparkles className="w-5 h-5" />;
      case "journal":
        return <BookOpen className="w-5 h-5" />;
      default:
        return <Grid3X3 className="w-5 h-5" />;
    }
  };

  // Fetch user settings
  const fetchUserSettings = useCallback(async () => {
    if (!isMountedRef.current || !isClient || !user?.email) return;
    
    try {
      const response = await fetch(`/api/userSettings?userId=${user.email}`);
      if (response.ok && isMountedRef.current) {
        const userSettings = await response.json() as UserSettings;
        
        // Load layout template and slot assignments
        const template = userSettings.layoutTemplate as LayoutTemplate || 'primary-secondary';
        const assignments = userSettings.slotAssignments || {};
        
                 setCurrentTemplate(template);
         setSlotAssignments(assignments);
         setLoadedSettings(true);
      } else if (isMountedRef.current) {
        // Default settings for new users
        const defaultTemplate = 'primary-secondary';
        const defaultAssignments = {
          primary: 'calendar',
          secondary: 'ataglance'
        };
                 setCurrentTemplate(defaultTemplate);
         setSlotAssignments(defaultAssignments);
         setLoadedSettings(true);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      if (isMountedRef.current) {
        setLoadedSettings(true);
      }
    }
  }, [user?.email, isClient]);

  // Load settings when user is available
  useEffect(() => {
    if (user?.email && isClient) {
      fetchUserSettings();
    }
  }, [fetchUserSettings, user?.email, isClient]);

  // Save settings to backend
  const saveSettings = async (template: LayoutTemplate, assignments: WidgetSlotAssignment) => {
    if (!user?.email || !isClient) return;
    
    try {
      await fetch('/api/userSettings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.email,
          layoutTemplate: template,
          slotAssignments: assignments
        }),
             });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

     // Handle template change
   const handleTemplateChange = (template: LayoutTemplate, defaultAssignments: WidgetSlotAssignment) => {
     setCurrentTemplate(template);
     setSlotAssignments(defaultAssignments);
     saveSettings(template, defaultAssignments);
   };

   // Handle slot assignment change
   const handleSlotAssignmentChange = (slotId: string, widgetType: string | null) => {
     const newAssignments = { ...slotAssignments, [slotId]: widgetType };
     setSlotAssignments(newAssignments);
     saveSettings(currentTemplate, newAssignments);
   };

  // Get current template config
  const currentConfig = layoutTemplates.find(t => t.id === currentTemplate);

  // Direct CSS positioning - no need for react-grid-layout calculations

  // Get filled slots (slots that have widgets assigned)
  const filledSlots = useMemo(() => {
    if (!currentConfig) return [];
    return currentConfig.slots.filter(slot => slotAssignments[slot.id]);
  }, [currentConfig, slotAssignments]);

  // Calculate calendar date range for shared context
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekFromNow = new Date(startOfToday);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-grey-tint font-body">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loadedSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass p-6 rounded-2xl animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 mb-4"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // filledSlots and layouts are now calculated via useMemo above

  return (
    <CalendarProvider
      startDate={startOfToday}
      endDate={oneWeekFromNow}
      enabled={!!user?.email}
    >
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        {/* Dashboard Header */}
        <div className="w-full px-2 py-1 max-w-none">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white mb-1">
                Dashboard
              </h1>
              <p className="text-grey-tint font-body text-sm">
                Welcome back! Here's your personalized overview.
              </p>
            </div>
            
            {/* Dashboard Controls */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowLayoutSelector(!showLayoutSelector)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  showLayoutSelector 
                    ? 'bg-primary-500 text-white hover:bg-primary-600' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard Layout</span>
              </button>
            </div>
          </div>

          {/* Layout Template Selector */}
          {showLayoutSelector && (
            <LayoutTemplateSelector
              currentTemplate={currentTemplate}
              slotAssignments={slotAssignments}
              onTemplateChange={handleTemplateChange}
              onSlotAssignmentChange={handleSlotAssignmentChange}
            />
          )}

          {/* Dashboard Grid */}
          {filledSlots.length > 0 ? (
            <div className="w-full">
              {/* Desktop Grid Layout (lg and above) */}
              <div className="hidden lg:block relative w-full" style={{ height: 'calc(100vh - 180px)' }}>
                {filledSlots.map((slot) => {
                  const widgetType = slotAssignments[slot.id] as WidgetType;
                  
                  // Calculate positions based on 12-column grid
                  const containerWidth = 100; // Use percentage
                  const colWidth = containerWidth / 12; // Each column is ~8.33%
                  
                  const left = `${slot.position.col * colWidth}%`;
                  const width = `${slot.position.colSpan * colWidth}%`;
                  
                  // Dynamic height calculation based on available space and row span
                  const availableHeight = `calc((100vh - 180px) / ${currentConfig?.gridConfig.rows || 4})`;
                  const height = `calc(${availableHeight} * ${slot.position.rowSpan})`;
                  const top = `calc(${availableHeight} * ${slot.position.row})`;
                  
                  return (
                    <div 
                      key={slot.id} 
                      className="absolute glass p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col overflow-hidden"
                      style={{
                        left: left,
                        top: top,
                        width: `calc(${width} - 12px)`,
                        height: `calc(${height} - 12px)`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex-shrink-0">
                            {getWidgetIcon(widgetType)}
                          </div>
                          <h2 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white truncate">
                            {widgetType === "ataglance" ? "Your Day at a Glance" : 
                             widgetType === "habit-tracker" ? "Habit Tracker" :
                             widgetType.charAt(0).toUpperCase() + widgetType.slice(1)}
                          </h2>
                        </div>
                        
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                          <span className="text-xs text-grey-tint hidden sm:inline">{slot.label}</span>
                        </div>
                      </div>
                      
                      <div className="widget-content flex-1 overflow-hidden">
                        <ErrorBoundary>
                          <div className="h-full overflow-y-auto overflow-x-hidden">
                            {createWidgetComponent(widgetType, slot)}
                          </div>
                        </ErrorBoundary>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile/Tablet Stacked Layout (below lg) */}
              <div className="lg:hidden space-y-4">
                {filledSlots
                  .sort((a, b) => {
                    // Sort by row first, then by column for proper stacking
                    if (a.position.row !== b.position.row) {
                      return a.position.row - b.position.row;
                    }
                    return a.position.col - b.position.col;
                  })
                  .map((slot) => {
                    const widgetType = slotAssignments[slot.id] as WidgetType;
                    
                                         return (
                       <div 
                         key={slot.id} 
                         className="w-full glass p-4 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col"
                         style={{ minHeight: 'calc(50vh - 100px)' }}
                       >
                         <div className="flex items-center justify-between mb-3 flex-shrink-0">
                           <div className="flex items-center space-x-2 min-w-0 flex-1">
                             <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex-shrink-0">
                               {getWidgetIcon(widgetType)}
                             </div>
                             <h2 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white truncate">
                               {widgetType === "ataglance" ? "Your Day at a Glance" : 
                                widgetType === "habit-tracker" ? "Habit Tracker" :
                                widgetType.charAt(0).toUpperCase() + widgetType.slice(1)}
                             </h2>
                           </div>
                           
                           <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                             <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                             <span className="text-xs text-grey-tint">{slot.label}</span>
                           </div>
                         </div>
                         
                         <div className="widget-content flex-1 overflow-hidden">
                           <ErrorBoundary>
                             <div className="h-full overflow-y-auto overflow-x-hidden">
                               {createWidgetComponent(widgetType, slot)}
                             </div>
                           </ErrorBoundary>
                         </div>
                       </div>
                     );
                   })}
               </div>
             </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Grid3X3 className="w-12 h-12 text-primary-500" />
              </div>
              <h3 className="text-2xl font-heading font-semibold text-dark-base dark:text-soft-white mb-2">
                Configure Your Dashboard
              </h3>
              <p className="text-grey-tint font-body mb-6">
                Choose a layout template above and assign widgets to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </CalendarProvider>
  );
};

export default DashboardGrid;
