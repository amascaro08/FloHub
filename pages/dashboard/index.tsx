'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import TaskWidget from '@/components/widgets/TaskWidget'
import CalendarWidget from '@/components/widgets/CalendarWidget'
import ChatWidget from '@/components/assistant/ChatWidget'

const ResponsiveGridLayout = dynamic(
  () =>
    import('react-grid-layout').then((mod) =>
      mod.WidthProvider(mod.Responsive)
    ),
  { ssr: false }
)

type Layout = { i: string; x: number; y: number; w: number; h: number }
type Layouts = Record<string, Layout[]>

const defaultLayout: Layout[] = [
  { i: 'tasks',    x: 0, y: 0, w: 4, h: 6 },
  { i: 'calendar', x: 4, y: 0, w: 4, h: 6 },
  { i: 'chat',     x: 8, y: 0, w: 4, h: 6 },
]
const defaultLayouts: Layouts = {
  lg: defaultLayout,
  md: defaultLayout,
  sm: defaultLayout,
  xs: defaultLayout,
}

export default function Dashboard() {
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts)

  useEffect(() => {
    const saved = localStorage.getItem('flohub-layouts')
    if (saved) {
      try { setLayouts(JSON.parse(saved)) }
      catch { console.warn('Invalid saved layouts') }
    }
  }, [])

  const onLayoutChange = (_: Layout[], allLayouts: Layouts) => {
    setLayouts(allLayouts)
    localStorage.setItem('flohub-layouts', JSON.stringify(allLayouts))
  }

  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
      rowHeight={30}
      onLayoutChange={onLayoutChange}
      draggableHandle=".widget-header"
      resizeHandles={['se']}
      isBounded
    >
      <div key="tasks" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Tasks</div>
        <TaskWidget />
      </div>

      <div key="calendar" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Calendar</div>
        <CalendarWidget />
      </div>

      <div key="chat" className="glass p-4 rounded-xl">
        <div className="widget-header cursor-move mb-2 font-semibold">Chat</div>
        <ChatWidget />
      </div>
    </ResponsiveGridLayout>
  )
}
