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

import { Resizable } from "re-resizable";
import { useState } from "react";
import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";
import { ReactElement } from "react";
import { useAuth } from "../ui/AuthContext"; // Import useAuth

type WidgetType = "tasks" | "calendar" | "chat";

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  chat: <ChatWidget />,
};

function SortableItem({ id }: { id: WidgetType }) {
  const { isLocked } = useAuth(); // Use the isLocked state
  console.log(`Widget ${id} isLocked:`, isLocked); // Add logging
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id, disabled: isLocked }); // Disable sorting when locked

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Resizable
      defaultSize={{
        width: "100%",
        height: 300,
      }}
      minWidth="300px"
      minHeight={200}
      className="mb-4"
      enable={isLocked ? false : { top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }} // Disable resizing when locked, enable all when unlocked
    >
      <div
        ref={setNodeRef} // Apply ref to the main div
        style={style}
        className={`glass p-4 rounded-xl h-full shadow-md flex flex-col ${isLocked ? 'cursor-default' : ''}`} // Restore original classes
      >
        {/* Apply attributes, listeners, and setActivatorNodeRef to the header for drag handle */}
        <div
          ref={setActivatorNodeRef} // Apply activator ref here
          className={`font-semibold capitalize mb-2 ${isLocked ? '' : 'cursor-move'}`} // Add cursor-move to header when unlocked
          {...attributes}
          {...listeners}
        >
          {/* Removed redundant heading display */}
        </div>
        <div className="flex-1 overflow-auto">{widgetComponents[id]}</div>
      </div>
    </Resizable>
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
