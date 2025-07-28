import React, { useState } from 'react';
import { LayoutGrid, Grid3X3, Columns, Square, Layout } from 'lucide-react';

export type LayoutTemplate = 'auto' | 'grid' | 'focus' | 'stack' | 'balanced';

interface LayoutTemplateSelectorProps {
  currentTemplate: LayoutTemplate;
  widgetCount: number;
  onTemplateChange: (template: LayoutTemplate) => void;
  isVisible: boolean;
}

const LayoutTemplateSelector: React.FC<LayoutTemplateSelectorProps> = ({
  currentTemplate,
  widgetCount,
  onTemplateChange,
  isVisible
}) => {
  if (!isVisible || widgetCount === 0) return null;

  const templates = [
    {
      id: 'auto' as LayoutTemplate,
      name: 'Smart Auto',
      description: 'Automatically optimized layout',
      icon: <Layout className="w-5 h-5" />,
      recommended: true
    },
    {
      id: 'grid' as LayoutTemplate,
      name: 'Grid',
      description: 'Equal sized grid layout',
      icon: <Grid3X3 className="w-5 h-5" />,
      availableFor: [2, 4]
    },
    {
      id: 'focus' as LayoutTemplate,
      name: 'Focus',
      description: 'One large widget, others smaller',
      icon: <Square className="w-5 h-5" />,
      availableFor: [2, 3, 4, 5]
    },
    {
      id: 'stack' as LayoutTemplate,
      name: 'Stack',
      description: 'Vertical stacked layout',
      icon: <Columns className="w-5 h-5" />,
      availableFor: [2, 3, 4, 5]
    },
    {
      id: 'balanced' as LayoutTemplate,
      name: 'Balanced',
      description: 'Mixed layout with balance',
      icon: <LayoutGrid className="w-5 h-5" />,
      availableFor: [3, 4, 5]
    }
  ];

  const availableTemplates = templates.filter(template => 
    template.id === 'auto' || !template.availableFor || template.availableFor.includes(widgetCount)
  );

  return (
    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Layout Template
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {availableTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              currentTemplate === template.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex items-center space-x-2 mb-2">
              <div className={`${
                currentTemplate === template.id 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-400'
              }`}>
                {template.icon}
              </div>
              {template.recommended && (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded">
                  Recommended
                </span>
              )}
            </div>
            <div className={`text-sm font-medium mb-1 ${
              currentTemplate === template.id 
                ? 'text-primary-900 dark:text-primary-100' 
                : 'text-gray-900 dark:text-white'
            }`}>
              {template.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {template.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LayoutTemplateSelector;