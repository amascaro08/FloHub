import React from 'react';
import { UserSettings } from '../../types/app';
import NotificationManager from '@/components/ui/NotificationManager';

interface NotificationsSettingsProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

const NotificationsSettings: React.FC<NotificationsSettingsProps> = ({
  settings,
  setSettings
}) => {
  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h2 className="text-lg font-medium mb-4">Notifications</h2>
        <NotificationManager />
      </section>
    </div>
  );
};

export default NotificationsSettings;