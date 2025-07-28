
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Settings, Plus, CheckSquare, Calendar, Clock, FileText, Sparkles, Grid3X3 } from 'lucide-react';
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

// User hooks
import { useUser } from "@/lib/hooks/useUser";
import { UserSettings } from "@/types/app";

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote" | "habit-tracker";

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
        lg: { cols: 12, rowHeight: 60 },
        md: { cols: 8, rowHeight: 50 },
        sm: { cols: 6, rowHeight: 45 }
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
        lg: { cols: 12, rowHeight: 60 },
        md: { cols: 8, rowHeight: 50 },
        sm: { cols: 6, rowHeight: 45 }
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
        lg: { cols: 12, rowHeight: 70 },
        md: { cols: 8, rowHeight: 60 },
        sm: { cols: 6, rowHeight: 50 }
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
        lg: { cols: 12, rowHeight: 60 },
        md: { cols: 8, rowHeight: 50 },
        sm: { cols: 6, rowHeight: 45 }
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
        lg: { cols: 12, rowHeight: 50 },
        md: { cols: 8, rowHeight: 45 },
        sm: { cols: 6, rowHeight: 40 }
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

  // Widget component creator
  const createWidgetComponent = (type: WidgetType) => {
    switch (type) {
      case "tasks":
        return <Suspense fallback={<WidgetSkeleton type="tasks" />}><TaskWidget /></Suspense>;
      case "calendar":
        return <Suspense fallback={<WidgetSkeleton type="calendar" />}><CalendarWidget /></Suspense>;
      case "ataglance":
        return <Suspense fallback={<WidgetSkeleton type="ataglance" />}><SmartAtAGlanceWidget /></Suspense>;
      case "quicknote":
        return <Suspense fallback={<WidgetSkeleton type="generic" />}><QuickNoteWidget /></Suspense>;
      case "habit-tracker":
        return <Suspense fallback={<WidgetSkeleton type="generic" />}><HabitTrackerWidget /></Suspense>;
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

  // Generate layouts for react-grid-layout
  const generateLayouts = () => {
    if (!currentConfig) return {};
    
    const layouts: any = {};
    
         // Use only filled slots to avoid empty layout items
     const filledSlots = currentConfig.slots.filter(slot => slotAssignments[slot.id]);
     
     // Simple layout generation - use original positions but only for lg breakpoint first
     layouts.lg = filledSlots.map((slot, index) => ({
       i: slot.id,
       x: index * 6, // Simple side-by-side for testing
       y: 0,
       w: 6,
       h: 8,
       static: true
     }));
    
    // For smaller breakpoints, stack vertically
    layouts.md = filledSlots.map((slot, index) => ({
      i: slot.id,
      x: 0,
      y: index * 8,
      w: 8,
      h: 8,
      static: true
    }));
    
    layouts.sm = filledSlots.map((slot, index) => ({
      i: slot.id,
      x: 0,
      y: index * 8,
      w: 6,
      h: 8,
      static: true
    }));
    
    layouts.xs = filledSlots.map((slot, index) => ({
      i: slot.id,
      x: 0,
      y: index * 8,
      w: 4,
      h: 8,
      static: true
    }));
    
    layouts.xxs = filledSlots.map((slot, index) => ({
      i: slot.id,
      x: 0,
      y: index * 8,
      w: 2,
      h: 8,
      static: true
    }));
    
    console.log('Generated layouts:', layouts);
    console.log('Filled slots:', filledSlots);
    console.log('Current template:', currentTemplate);
    console.log('Slot assignments:', slotAssignments);
    
    return layouts;
  };

  // Get filled slots (slots that have widgets assigned)
  const getFilledSlots = () => {
    if (!currentConfig) return [];
    return currentConfig.slots.filter(slot => slotAssignments[slot.id]);
  };

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

  const filledSlots = getFilledSlots();
  const layouts = generateLayouts();

  return (
    <CalendarProvider
      startDate={startOfToday}
      endDate={oneWeekFromNow}
      enabled={!!user?.email}
    >
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 dark:from-dark-base dark:to-dark-base">
        {/* Dashboard Header */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-heading font-bold text-dark-base dark:text-soft-white mb-2">
                Dashboard
              </h1>
              <p className="text-grey-tint font-body">
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
                         <ResponsiveGridLayout
               className="layout"
               layouts={layouts}
               breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
               cols={{ 
                 lg: currentConfig?.gridConfig.responsive.lg.cols || 12, 
                 md: currentConfig?.gridConfig.responsive.md.cols || 8, 
                 sm: currentConfig?.gridConfig.responsive.sm.cols || 6, 
                 xs: 4, 
                 xxs: 2 
               }}
               rowHeight={currentConfig?.gridConfig.responsive.lg.rowHeight || 60}
              isDraggable={false}
              isResizable={false}
              margin={[20, 20]}
              containerPadding={[20, 20]}
              compactType={null}
              preventCollision={true}
              useCSSTransforms={true}
            >
              {filledSlots.map((slot) => {
                const widgetType = slotAssignments[slot.id] as WidgetType;
                return (
                  <div key={slot.id} className="glass p-4 rounded-2xl border border-white/20 backdrop-blur-sm flex flex-col h-full overflow-hidden">
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
                          {createWidgetComponent(widgetType)}
                        </div>
                      </ErrorBoundary>
                    </div>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
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
