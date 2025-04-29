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
import { useState, useEffect } from "react"; // Import useEffect
import TaskWidget from "@/components/widgets/TaskWidget";
import CalendarWidget from "@/components/widgets/CalendarWidget";
import ChatWidget from "@/components/assistant/ChatWidget";
import AtAGlanceWidget from "@/components/widgets/AtAGlanceWidget";
import QuickNoteWidget from "@/components/widgets/QuickNoteWidget"; // Import QuickNoteWidget
import { ReactElement } from "react";
import { useAuth } from "../ui/AuthContext"; // Import useAuth
import { db } from "@/lib/firebase"; // Import Firebase client-side db
import { doc, getDoc, setDoc } from "firebase/firestore"; // Import Firestore functions
import { useSession } from "next-auth/react"; // Import useSession

type WidgetType = "tasks" | "calendar" | "ataglance" | "quicknote"; // Add 'quicknote'

const widgetComponents: Record<WidgetType, ReactElement> = {
  tasks: <TaskWidget />,
  calendar: <CalendarWidget />,
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
            <div>
              {id === "ataglance" ? "Your Day at a Glance" : id.charAt(0).toUpperCase() + id.slice(1)}
            </div> {/* Add widget title, customize for ataglance */}
          </div>
          <div className="flex-1 overflow-auto">{widgetComponents[id as WidgetType]}</div> {/* Cast id to WidgetType */}
        </div>
      </Resizable>
    </div>
  );
}

export default function DashboardGrid() {
  // Define a default layout
  const defaultLayout = [
    { id: "tasks", x: 0, y: 0, width: 400, height: 300 },
    { id: "calendar", x: 450, y: 0, width: 400, height: 300 },
    { id: "ataglance", x: 450, y: 350, width: 400, height: 300 },
    { id: "quicknote", x: 0, y: 700, width: 400, height: 300 },
  ];

  const { data: session } = useSession(); // Get session to access user email

  // Define a default layout
  // State to hold the current widget layout
  const [widgets, setWidgets] = useState(defaultLayout);

  // Load layout from Firestore on component mount
  useEffect(() => {
    const fetchLayout = async () => {
      if (session?.user?.email) {
        const layoutRef = doc(db, "users", session.user.email, "settings", "layout");
        const docSnap = await getDoc(layoutRef);
        if (docSnap.exists()) {
          const savedLayout = docSnap.data()?.widgets;
          if (Array.isArray(savedLayout) && savedLayout.every((item: any) => item.id && typeof item.x === 'number' && typeof item.y === 'number' && typeof item.width === 'number' && typeof item.height === 'number')) {
            // Merge saved layout with default layout to include new widgets
            const mergedLayout = defaultLayout.map(defaultWidget => {
              const savedWidget = savedLayout.find((sw: any) => sw.id === defaultWidget.id);
              return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
            });
            // Add any new widgets from savedLayout that are not in defaultLayout (shouldn't happen with current logic, but good for robustness)
            const finalLayout = [...mergedLayout, ...savedLayout.filter((savedWidget: any) => !defaultLayout.some(defaultWidget => defaultWidget.id === savedWidget.id))];

            setWidgets(finalLayout);
          } else {
            console.error("Invalid layout data in Firestore, using default layout.");
            setWidgets(defaultLayout); // Fallback to default if data is invalid
          }
        } else {
          // If no layout exists, save the default layout
          await setDoc(layoutRef, { widgets: defaultLayout });
        }
      }
    };

    fetchLayout();
  }, [session]); // Fetch layout when session changes

  // Save layout to Firestore whenever the widgets state changes
  useEffect(() => {
    const saveLayout = async () => {
      if (session?.user?.email && widgets !== defaultLayout) { // Only save if session exists and layout is not the initial default
        const layoutRef = doc(db, "users", session.user.email, "settings", "layout");
        try {
          await setDoc(layoutRef, { widgets });
        } catch (e) {
          console.error("Error saving layout:", e);
        }
      }
    };

    saveLayout();
  }, [widgets, session]); // Save when widgets or session changes

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
