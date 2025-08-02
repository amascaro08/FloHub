import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { UserSettings } from '../../types/app';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface ThemeSettingsProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({
  settings,
  onSettingsChange
}) => {
  const { theme, setTheme } = useTheme();

  // Sync theme context with settings when settings are loaded
  React.useEffect(() => {
    if (settings.theme && settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [settings.theme, theme, setTheme]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    onSettingsChange({ ...settings, theme: newTheme });
  };

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light Mode',
      description: 'Always use light theme',
      icon: SunIcon,
      color: 'text-amber-600 dark:text-amber-400'
    },
    {
      value: 'dark' as const,
      label: 'Dark Mode',
      description: 'Always use dark theme',
      icon: MoonIcon,
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      value: 'auto' as const,
      label: 'Auto (System)',
      description: 'Follow your system theme preference',
      icon: ComputerDesktopIcon,
      color: 'text-green-600 dark:text-green-400'
    }
  ];

  return (
    <div className="bg-[var(--surface)] rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
      <h3 className="text-lg font-medium text-[var(--fg)] mb-6">Theme Settings</h3>
      
      <div className="space-y-3">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={`
                w-full text-left p-4 rounded-xl transition-all duration-200 group
                ${isSelected 
                  ? 'bg-primary-50 border border-primary-200 dark:bg-primary-900/30 dark:border-primary-800' 
                  : 'bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${isSelected 
                    ? 'bg-primary-100 dark:bg-primary-900/50' 
                    : 'bg-white dark:bg-neutral-700'
                  }
                `}>
                  <Icon className={`w-5 h-5 ${option.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`
                    text-sm font-medium
                    ${isSelected 
                      ? 'text-primary-700 dark:text-primary-300' 
                      : 'text-neutral-700 dark:text-neutral-300'
                    }
                  `}>
                    {option.label}
                  </p>
                  <p className={`
                    text-xs mt-1
                    ${isSelected 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-neutral-500 dark:text-neutral-400'
                    }
                  `}>
                    {option.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Theme Information
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your theme preference will be saved and applied across all devices. 
              The "Auto" option will automatically switch between light and dark themes 
              based on your system settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;