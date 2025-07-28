import React from 'react';
import { UserSettings } from '../../types/app';
import WidgetManager from '@/components/ui/WidgetManager';
import { Squares2X2Icon } from '@heroicons/react/24/outline';

interface WidgetsSettingsProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
}

const WidgetsSettings: React.FC<WidgetsSettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
          <Squares2X2Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--fg)]">Dashboard Widgets</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Customize your dashboard layout and widget preferences
          </p>
        </div>
      </div>

      {/* Widget Management */}
      <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <h3 className="text-lg font-medium text-[var(--fg)] mb-6">Widget Configuration</h3>
        <WidgetManager
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
      </div>
    </div>
  );
};

export default WidgetsSettings;