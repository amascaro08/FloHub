'use client'
import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setDark(saved === 'dark')
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

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
