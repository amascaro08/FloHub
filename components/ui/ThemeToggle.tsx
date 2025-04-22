// components/ui/ThemeToggle.tsx
'use client'
import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  // On mount: read saved preference or OS fallback
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      setDark(saved === 'dark')
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  // When `dark` changes: toggle class and persist
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <button
      onClick={() => setDark(!dark)}
      className="p-2 rounded-full bg-[var(--surface)] hover:opacity-80 transition"
      aria-label="Toggle theme"
    >
      {dark ? '🌞' : '🌙'}
    </button>
  )
}
