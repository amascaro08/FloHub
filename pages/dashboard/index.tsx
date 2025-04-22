'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import TaskWidget      from '@/components/widgets/TaskWidget'
import CalendarWidget  from '@/components/widgets/CalendarWidget'
import ChatWidget      from '@/components/assistant/ChatWidget'

// load Responsive + WidthProvider on client only
const ResponsiveGridLayout = dynamic(
  () =>
    import('react-grid-layout')
      .then((mod) => mod.WidthProvider(mod.Responsive)),
  { ssr: false }
)

type Item = { i: string; x: number; y: number; w: number; h: number }
type Layouts = Record<string, Item[]>

const base: Item[] = [
  { i: 'tasks',    x: 0, y: 0, w: 4, h: 6 },
  { i: 'calendar', x: 4, y: 0, w: 4, h: 6 },
  { i: 'chat',     x: 8, y: 0, w: 4, h: 6 },
]
const defaults: Layouts = { lg: base, md: base, sm: base, xs: base }

export default function Dashboard() {
  const [layouts, setLayouts] = useState<Layouts>(defaults)

  useEffect(() => {
    const saved = localStorage.getItem('flohub-layouts')
    if (saved) try { setLayouts(JSON.parse(saved)) } catch {}
  }, [])

  const onLayoutChange = (_: Item[], all: Layouts) => {
    setLayouts(all)
    localStorage.setItem('flohub-layouts', JSON.stringify(all))
  }

  return (
    <div>
      <div className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Tasks</div>
        <TaskWidget/>
      </div>

      <div className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Calendar</div>
        <CalendarWidget/>
      </div>

      <div className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Chat</div>
        <ChatWidget/>
      </div>
    </div>
  )
}
