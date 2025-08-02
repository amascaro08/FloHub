'use client'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return '🌞'
      case 'dark':
        return '🌙'
      case 'auto':
        return '🔄'
      default:
        return '🌞'
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light Mode'
      case 'dark':
        return 'Dark Mode'
      case 'auto':
        return 'Auto (System)'
      default:
        return 'Light Mode'
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-full bg-[var(--surface)] hover:opacity-80 transition"
      aria-label={`Switch to ${getLabel()}`}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  )
}
