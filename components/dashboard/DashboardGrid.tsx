"use client";

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { Resizable } from "re-resizable";
import { useState } from "react";
import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";
import AtAGlanceWidget from "@/components/widgets/AtAGlanceWidget";
import QuickNoteWidget from "@/components/widgets/QuickNoteWidget"; // Import QuickNoteWidget
import { ReactElement } from "react";
import { useAuth } from "../ui/AuthContext"; // Import useAuth

type WidgetType = "tasks" | "calendar" | "chat" | "ataglance" | "quicknote"; // Add 'quicknote'

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
  chat: <ChatWidget />,
  ataglance: <AtAGlanceWidget />,
  quicknote: <QuickNoteWidget />, // Add QuickNoteWidget
};

interface DraggableItemProps {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onResizeStop: (id: string, newSize: { width: number; height: number }) => void;
}

function DraggableItem({ id, position, size, onResizeStop }: DraggableItemProps) {
  const { isLocked } = useAuth(); // Use the isLocked state
  console.log(`Widget ${id} isLocked:`, isLocked); // Add logging
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform } =
    useDraggable({ id, disabled: isLocked }); // Disable dragging when locked

  const containerStyle = {
    position: 'absolute' as 'absolute', // Explicitly type as 'absolute'
    left: position.x,
    top: position.y,
    width: size.width, // Control width with state
    height: size.height, // Control height with state
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div
      ref={setNodeRef} // Apply ref to the outer div
      style={containerStyle} // Apply positioning and transform here
    >
      <Resizable
        size={{ width: size.width, height: size.height }} // Control size with state
        minWidth="300px"
        minHeight={200}
        enable={isLocked ? false : { top: false, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }} // Disable resizing when locked, enable all except top when unlocked
        onResizeStop={(e, direction, ref, d) => {
          onResizeStop(id, { width: size.width + d.width, height: size.height + d.height });
        }}
      >
        <div
          className={`glass p-4 rounded-xl h-full shadow-md flex flex-col ${isLocked ? 'cursor-default' : ''}`} // Restore original classes
        >
          {/* Apply attributes, listeners, and setActivatorNodeRef to the header for drag handle */}
          <div
            ref={setActivatorNodeRef} // Apply activator ref here
            className={`font-semibold capitalize mb-2 ${isLocked ? '' : 'cursor-move'}`} // Add cursor-move to header when unlocked
            {...attributes} // Apply attributes to header
            {...listeners} // Apply listeners to header
          >
            <div>{id}</div> {/* Add widget title */}
          </div>
          <div className="flex-1 overflow-auto">{widgetComponents[id as WidgetType]}</div> {/* Cast id to WidgetType */}
        </div>
      </Resizable>
    </div>
  );
}

export default function DashboardGrid() {
  const [widgets, setWidgets] = useState([
    { id: "tasks", x: 0, y: 0, width: 400, height: 300 },
    { id: "calendar", x: 450, y: 0, width: 400, height: 300 },
    { id: "chat", x: 0, y: 350, width: 400, height: 300 },
    { id: "ataglance", x: 450, y: 350, width: 400, height: 300 },
    { id: "quicknote", x: 0, y: 700, width: 400, height: 300 }, // Add QuickNoteWidget with initial position and size
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
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

  const handleResizeStop = (id: string, newSize: { width: number; height: number }) => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) => {
        if (widget.id === id) {
          return {
            ...widget,
            width: newSize.width,
            height: newSize.height,
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
          <DraggableItem
            key={widget.id}
            id={widget.id}
            position={{ x: widget.x, y: widget.y }} // Pass position from state
            size={{ width: widget.width, height: widget.height }} // Pass size from state
            onResizeStop={handleResizeStop} // Pass resize handler
          />
        ))}
      </div>
    </DndContext>
  );
}
