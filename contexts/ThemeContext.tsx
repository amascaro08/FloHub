'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('auto')
  const [isDark, setIsDark] = useState(false)

  // Initialize theme from localStorage, user settings, or system preference
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // First try to get theme from user settings
        const response = await fetch('/api/userSettings');
        if (response.ok) {
          const userSettings = await response.json();
          if (userSettings.theme && ['light', 'dark', 'auto'].includes(userSettings.theme)) {
            setThemeState(userSettings.theme);
            localStorage.setItem('theme', userSettings.theme);
            return;
          }
        }
      } catch (error) {
        console.log('Could not fetch user settings for theme:', error);
      }

      // Fallback to localStorage
      const savedTheme = localStorage.getItem('theme') as ThemeMode
      if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
        setThemeState(savedTheme)
      } else {
        // Default to auto if no saved preference
        setThemeState('auto')
      }
    };

    initializeTheme();
  }, [])



  // Apply theme changes
  useEffect(() => {
    let shouldBeDark = false

    if (theme === 'auto') {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      shouldBeDark = theme === 'dark'
    }

    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setIsDark(mediaQuery.matches)
      document.documentElement.classList.toggle('dark', mediaQuery.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    
    // Also save to user settings if we're authenticated
    const saveToUserSettings = async () => {
      try {
        const response = await fetch('/api/userSettings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        });
        if (!response.ok) {
          console.log('Could not save theme to user settings');
        }
      } catch (error) {
        console.log('Error saving theme to user settings:', error);
      }
    };

    saveToUserSettings();
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}