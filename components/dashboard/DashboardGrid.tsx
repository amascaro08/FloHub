"use client";

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable, // Add useDraggable import
} from "@dnd-kit/core";
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

interface DraggableItemProps {
  id: string; // Change id type to string
  initialPosition: { x: number; y: number };
  initialSize: { width: number; height: number };
}

function DraggableItem({ id, initialPosition, initialSize }: DraggableItemProps) {
  const { isLocked } = useAuth(); // Use the isLocked state
  console.log(`Widget ${id} isLocked:`, isLocked); // Add logging
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({ id, disabled: isLocked }); // Disable dragging when locked

  const style = {
    position: 'absolute' as 'absolute', // Explicitly type as 'absolute'
    left: initialPosition.x,
    top: initialPosition.y,
    width: initialSize.width,
    height: initialSize.height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <Resizable
      defaultSize={{
        width: initialSize.width,
        height: initialSize.height,
      }}
      minWidth="300px"
      minHeight={200}
      className="mb-4" // This margin might need adjustment with absolute positioning
      enable={isLocked ? false : { top: false, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }} // Disable resizing when locked, enable all except top when unlocked
    >
      <div
        ref={setNodeRef} // Apply ref to the main div
        style={style}
        className={`glass p-4 rounded-xl shadow-md flex flex-col ${isLocked ? 'cursor-default' : ''}`} // Restore original classes
      >
        {/* Apply attributes, listeners, and setActivatorNodeRef to the header for drag handle */}
        <div
          className={`font-semibold capitalize mb-2 ${isLocked ? '' : 'cursor-move'}`} // Add cursor-move to header when unlocked
          {...attributes}
          {...listeners}
        >
          {/* Removed redundant heading display */}
        </div>
        <div className="flex-1 overflow-auto">{widgetComponents[id as WidgetType]}</div> {/* Cast id to WidgetType */}
      </div>
    </Resizable>
  );
}

export default function DashboardGrid() {
  const [widgets, setWidgets] = useState([
    { id: "tasks", x: 0, y: 0, width: 400, height: 300 },
    { id: "calendar", x: 450, y: 0, width: 400, height: 300 },
    { id: "chat", x: 0, y: 350, width: 400, height: 300 },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require 5px movement before activating drag
      },
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, delta } = event;
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) => {
        if (widget.id === active.id) {
          return {
            ...widget,
            x: widget.x + delta.x,
            y: widget.y + delta.y,
          };
        }
        return widget;
      })
    );
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}> {/* Add relative container */}
        {widgets.map((widget) => (
          <DraggableItem key={widget.id} id={widget.id} initialPosition={{ x: widget.x, y: widget.y }} initialSize={{ width: widget.width, height: widget.height }} />
        ))}
      </div>
    </DndContext>
  );
}
