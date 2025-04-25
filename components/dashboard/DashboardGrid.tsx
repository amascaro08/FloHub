// components/dashboard/DashboardGrid.tsx
"use client";

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useState } from "react";
import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";

type WidgetType = "tasks" | "calendar" | "chat";

const widgetComponents: Record<WidgetType, JSX.Element> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  chat: <ChatWidget />,
};

function SortableItem({ id }: { id: WidgetType }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="glass p-4 rounded-xl mb-4 shadow-md cursor-move"
    >
      <div className="font-semibold capitalize mb-2">{id}</div>
      {widgetComponents[id]}
    </div>
  );
}

export default function DashboardGrid() {
  const [widgets, setWidgets] = useState<WidgetType[]>([
    "tasks",
    "calendar",
    "chat",
  ]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = widgets.indexOf(active.id);
      const newIndex = widgets.indexOf(over.id);
      setWidgets((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets} strategy={verticalListSortingStrategy}>
        {widgets.map((id) => (
          <SortableItem key={id} id={id} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
