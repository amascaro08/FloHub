import React from 'react';
import { UserSettings } from '../../types/app';
import WidgetManager from '@/components/ui/WidgetManager';

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
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Dashboard Widgets</h2>
        <WidgetManager
          settings={settings}
          onSettingsChange={onSettingsChange}
        />
      </section>
    </div>
  );
};

export default WidgetsSettings;