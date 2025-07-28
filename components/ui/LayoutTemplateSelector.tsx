import React, { useState } from 'react';
import { LayoutGrid, Grid3X3, Columns, Square, Layout, Monitor, Sidebar, PanelTop, Eye, Target, Layers } from 'lucide-react';

export type LayoutTemplate = 
  | 'single-focus'        // 1 large tile
  | 'equal-grid-2'        // 2 equal tiles
  | 'equal-grid-4'        // 4 equal tiles
  | 'primary-secondary'   // 1 large + 1 smaller
  | 'hero-sidebar'        // 1 hero + vertical stack of small
  | 'dashboard-classic'   // Mixed sizes - large top, 3 bottom
  | 'analytics-view'      // KPI cards + large chart
  | 'activity-stream'     // Timeline + details panels
  | 'command-center';     // Central focus + surrounding info panels

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

interface WidgetSlotAssignment {
  [slotId: string]: string | null; // widget type or null
}

interface LayoutTemplateSelectorProps {
  currentTemplate: LayoutTemplate;
  slotAssignments: WidgetSlotAssignment;
  onTemplateChange: (template: LayoutTemplate, defaultAssignments: WidgetSlotAssignment) => void;
  onSlotAssignmentChange: (slotId: string, widgetType: string | null) => void;
}

const availableWidgets = [
  { id: 'tasks', name: 'Tasks', icon: '✓' },
  { id: 'calendar', name: 'Calendar', icon: '📅' },
  { id: 'ataglance', name: 'At a Glance', icon: '👁️' },
  { id: 'quicknote', name: 'Quick Notes', icon: '📝' },
  { id: 'habit-tracker', name: 'Habits', icon: '🎯' },
  { id: 'weather', name: 'Weather', icon: '🌤️' },
  { id: 'analytics', name: 'Analytics', icon: '📊' },
];

const layoutTemplates: LayoutTemplateConfig[] = [
  {
    id: 'single-focus',
    name: 'Single Focus',
    description: 'One large widget for deep focus',
    icon: <Square className="w-5 h-5" />,
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
        lg: { cols: 12, rowHeight: 120 },
        md: { cols: 8, rowHeight: 100 },
        sm: { cols: 6, rowHeight: 80 }
      }
    }
  },
  {
    id: 'equal-grid-2',
    name: 'Equal Split',
    description: 'Two equal-sized widgets',
    icon: <Columns className="w-5 h-5" />,
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
        lg: { cols: 12, rowHeight: 120 },
        md: { cols: 8, rowHeight: 100 },
        sm: { cols: 6, rowHeight: 80 }
      }
    }
  },
  {
    id: 'primary-secondary',
    name: 'Primary + Secondary',
    description: 'One main widget with supporting info',
    icon: <PanelTop className="w-5 h-5" />,
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
        suggestedWidgets: ['ataglance', 'weather', 'quicknote']
      }
    ],
    gridConfig: {
      rows: 3,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 120 },
        md: { cols: 8, rowHeight: 100 },
        sm: { cols: 6, rowHeight: 80 }
      }
    }
  },
  {
    id: 'hero-sidebar',
    name: 'Hero + Sidebar',
    description: 'Large main area with vertical info stack',
    icon: <Sidebar className="w-5 h-5" />,
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
        suggestedWidgets: ['ataglance', 'weather']
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
        lg: { cols: 12, rowHeight: 120 },
        md: { cols: 8, rowHeight: 100 },
        sm: { cols: 6, rowHeight: 80 }
      }
    }
  },
  {
    id: 'dashboard-classic',
    name: 'Dashboard Classic',
    description: 'Traditional dashboard with KPIs + details',
    icon: <Monitor className="w-5 h-5" />,
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
        lg: { cols: 12, rowHeight: 100 },
        md: { cols: 8, rowHeight: 80 },
        sm: { cols: 6, rowHeight: 60 }
      }
    }
  },
  {
    id: 'equal-grid-4',
    name: 'Equal Grid (4)',
    description: 'Four equal-sized widgets',
    icon: <Grid3X3 className="w-5 h-5" />,
    category: 'Simple',
    slots: [
      {
        id: 'top-left',
        size: 'medium',
        position: { row: 0, col: 0, rowSpan: 2, colSpan: 6 },
        label: 'Top Left',
        suggestedWidgets: ['tasks']
      },
      {
        id: 'top-right',
        size: 'medium',
        position: { row: 0, col: 6, rowSpan: 2, colSpan: 6 },
        label: 'Top Right',
        suggestedWidgets: ['calendar']
      },
      {
        id: 'bottom-left',
        size: 'medium',
        position: { row: 2, col: 0, rowSpan: 2, colSpan: 6 },
        label: 'Bottom Left',
        suggestedWidgets: ['ataglance']
      },
      {
        id: 'bottom-right',
        size: 'medium',
        position: { row: 2, col: 6, rowSpan: 2, colSpan: 6 },
        label: 'Bottom Right',
        suggestedWidgets: ['habit-tracker']
      }
    ],
    gridConfig: {
      rows: 4,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 100 },
        md: { cols: 8, rowHeight: 80 },
        sm: { cols: 6, rowHeight: 60 }
      }
    }
  },
  {
    id: 'command-center',
    name: 'Command Center',
    description: 'Central focus with surrounding info panels',
    icon: <Target className="w-5 h-5" />,
    category: 'Advanced',
    slots: [
      {
        id: 'center',
        size: 'hero',
        position: { row: 1, col: 3, rowSpan: 2, colSpan: 6 },
        label: 'Command Center',
        suggestedWidgets: ['calendar', 'tasks']
      },
      {
        id: 'top',
        size: 'small',
        position: { row: 0, col: 3, rowSpan: 1, colSpan: 6 },
        label: 'Status Bar',
        suggestedWidgets: ['ataglance']
      },
      {
        id: 'left',
        size: 'small',
        position: { row: 1, col: 0, rowSpan: 2, colSpan: 3 },
        label: 'Quick Actions',
        suggestedWidgets: ['quicknote']
      },
      {
        id: 'right',
        size: 'small',
        position: { row: 1, col: 9, rowSpan: 2, colSpan: 3 },
        label: 'Tracking',
        suggestedWidgets: ['habit-tracker']
      },
      {
        id: 'bottom',
        size: 'small',
        position: { row: 3, col: 3, rowSpan: 1, colSpan: 6 },
        label: 'Updates',
        suggestedWidgets: ['weather']
      }
    ],
    gridConfig: {
      rows: 4,
      cols: 12,
      responsive: {
        lg: { cols: 12, rowHeight: 80 },
        md: { cols: 8, rowHeight: 60 },
        sm: { cols: 6, rowHeight: 50 }
      }
    }
  }
];

const LayoutTemplateSelector: React.FC<LayoutTemplateSelectorProps> = ({
  currentTemplate,
  slotAssignments,
  onTemplateChange,
  onSlotAssignmentChange
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Simple');
  const currentConfig = layoutTemplates.find(t => t.id === currentTemplate);
  
  const categories = Array.from(new Set(layoutTemplates.map(t => t.category)));
  const filteredTemplates = layoutTemplates.filter(t => t.category === selectedCategory);

  const handleTemplateSelect = (template: LayoutTemplateConfig) => {
    const defaultAssignments: WidgetSlotAssignment = {};
    template.slots.forEach((slot, index) => {
      if (slot.suggestedWidgets && slot.suggestedWidgets.length > 0) {
        defaultAssignments[slot.id] = slot.suggestedWidgets[0];
      } else {
        defaultAssignments[slot.id] = availableWidgets[index % availableWidgets.length]?.id || null;
      }
    });
    onTemplateChange(template.id, defaultAssignments);
  };

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              selectedCategory === category
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              currentTemplate === template.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            <div className="flex items-center space-x-2 mb-3">
              <div className={`${
                currentTemplate === template.id 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-400'
              }`}>
                {template.icon}
              </div>
              <h3 className={`font-medium ${
                currentTemplate === template.id 
                  ? 'text-primary-900 dark:text-primary-100' 
                  : 'text-gray-900 dark:text-white'
              }`}>
                {template.name}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {template.description}
            </p>
            
            {/* Visual Layout Preview */}
            <div className="aspect-video bg-gray-50 dark:bg-gray-800 rounded border relative overflow-hidden">
              {template.slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`absolute border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-xs font-medium ${
                    slot.size === 'hero' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                    slot.size === 'large' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                    slot.size === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                  style={{
                    left: `${(slot.position.col / template.gridConfig.cols) * 100}%`,
                    top: `${(slot.position.row / template.gridConfig.rows) * 100}%`,
                    width: `${(slot.position.colSpan / template.gridConfig.cols) * 100}%`,
                    height: `${(slot.position.rowSpan / template.gridConfig.rows) * 100}%`,
                  }}
                >
                  {slot.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Widget Assignment Panel */}
      {currentConfig && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Assign Widgets to {currentConfig.name}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentConfig.slots.map((slot) => (
              <div key={slot.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {slot.label} ({slot.size})
                </label>
                <select
                  value={slotAssignments[slot.id] || ''}
                  onChange={(e) => onSlotAssignmentChange(slot.id, e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Empty Slot</option>
                  {availableWidgets.map((widget) => (
                    <option key={widget.id} value={widget.id}>
                      {widget.icon} {widget.name}
                    </option>
                  ))}
                </select>
                {slot.suggestedWidgets && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Suggested: {slot.suggestedWidgets.map(w => availableWidgets.find(aw => aw.id === w)?.name).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutTemplateSelector;