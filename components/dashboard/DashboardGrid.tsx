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
import { useState, useEffect, useRef } from "react"; // Import useEffect and useRef
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
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform } =
    useDraggable({ id, disabled: isLocked }); // Disable dragging when locked

  const containerStyle = {
    position: 'absolute' as const, // Explicitly type as 'absolute'
    left: `${position.x}%`,
    top: `${position.y}%`,
    width: `${size.width}%`, // Control width with state
    height: `${size.height}%`, // Control height with state
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
  // Define a default layout using percentages
  const defaultLayout = [
    { id: "tasks", x: 0, y: 0, width: 25, height: 25 },
    { id: "calendar", x: 25, y: 0, width: 25, height: 25 },
    { id: "ataglance", x: 50, y: 0, width: 25, height: 25 },
    { id: "quicknote", x: 0, y: 25, width: 25, height: 25 },
  ];

  const checkCollision = (widget1: any, widget2: any) => {
    return !(
      widget1.x + widget1.width <= widget2.x ||
      widget1.x >= widget2.x + widget2.width ||
      widget1.y + widget1.height <= widget2.y ||
      widget1.y >= widget2.y + widget2.height
    );
  };

  const { data: session } = useSession(); // Get session to access user email

  // Define a default layout
  // State to hold the current widget layout
  const [widgets, setWidgets] = useState(defaultLayout);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load layout from Firestore on component mount
  useEffect(() => {
    const fetchLayout = async () => {
      if (session?.user?.email) {
        const layoutRef = doc(db, "users", session.user.email, "settings", "layout");
        try {
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
              console.error("[DashboardGrid] Invalid layout data in Firestore, using default layout.");
              setWidgets(defaultLayout); // Fallback to default if data is invalid
            }
          } else {
            // If no layout exists, save the default layout
            await setDoc(layoutRef, { widgets: defaultLayout });
          }
        } catch (e) {
          console.error("[DashboardGrid] Error fetching layout:", e); // More specific error logging
        }
      } else {
      }
    };

    fetchLayout();
  }, [session]); // Fetch layout when session changes

  // Save layout to Firestore whenever the widgets state changes
  useEffect(() => {
    const saveLayout = async () => {
      if (session?.user?.email) { // Save if session exists
        const layoutRef = doc(db, "users", session.user.email, "settings", "layout");
        try {
          await setDoc(layoutRef, { widgets });
        } catch (e) {
          console.error("[DashboardGrid] Error saving layout:", e); // More specific error logging
        }
      } else {
      }
    };

    // Add a small delay before saving to avoid excessive writes during rapid changes (e.g., resizing)
    const handler = setTimeout(() => {
      saveLayout();
    }, 500); // Adjust delay as needed

    return () => {
      // Clean up the timeout on unmount or when dependencies change
      clearTimeout(handler);
    };

  }, [widgets, session]); // Save when widgets or session changes

  useEffect(() => {
  }, [widgets, session]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current instanceof HTMLElement) {
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {})
  );

  const handleDragEnd = (event: any) => {
    const { active, delta } = event;

    setWidgets((prevWidgets) => {
      return prevWidgets.map((widget) => {
        if (widget.id === active.id) {
          let newX = widget.x + (delta.x / containerDimensions.width) * 100;
          let newY = widget.y + (delta.y / containerDimensions.height) * 100;

          newX = Math.max(0, Math.min(100 - widget.width, newX));
          newY = Math.max(0, Math.min(100 - widget.height, newY));

          // Check for collisions with other widgets
          for (const otherWidget of prevWidgets) {
            if (otherWidget.id !== widget.id) {
              let potentialWidget = { ...widget, x: newX, y: newY };
              if (checkCollision(potentialWidget, otherWidget)) {
                let adjustedX = newX;
                let adjustedY = newY;

                // Adjust the position to the edge of the colliding widget
                if (newX < otherWidget.x) {
                  adjustedX = otherWidget.x - widget.width;
                } else if (newX > otherWidget.x) {
                  adjustedX = otherWidget.x + otherWidget.width;
                }
                if (newY < otherWidget.y) {
                  adjustedY = otherWidget.y - widget.height;
                } else if (newY > otherWidget.y) {
                  adjustedY = otherWidget.y + otherWidget.height;
                }

                adjustedX = Math.max(0, Math.min(100 - widget.width, adjustedX));
                adjustedY = Math.max(0, Math.min(100 - widget.height, adjustedY));

                potentialWidget = { ...widget, x: adjustedX, y: adjustedY };
                if (!checkCollision(potentialWidget, otherWidget)) {
                  return {
                    ...widget,
                    x: adjustedX,
                    y: adjustedY,
                  };
                }
              }
            }
          }

          return {
            ...widget,
            x: newX,
            y: newY,
          };
        }
        return widget;
      });
    });
  };

  const handleResizeStop = (id: string, newSize: { width: number; height: number }) => {
    setWidgets((prevWidgets) => {
      return prevWidgets.map((widget) => {
        if (widget.id === id) {
          let newWidthPercentage = Math.min(100, (newSize.width / containerDimensions.width) * 100);
          let newHeightPercentage = Math.min(100, (newSize.height / containerDimensions.height) * 100);

          // Check for collisions with other widgets
          for (const otherWidget of prevWidgets) {
            if (otherWidget.id !== widget.id) {
              let potentialWidget = { ...widget, width: newWidthPercentage, height: newHeightPercentage };
              if (checkCollision(potentialWidget, otherWidget)) {
                let adjustedWidth = newWidthPercentage;
                let adjustedHeight = newHeightPercentage;
                // Adjust the size to the edge of the colliding widget
                if (widget.x < otherWidget.x) {
                  adjustedWidth = otherWidget.x - widget.x;
                } else if (widget.x > otherWidget.x) {
                  adjustedWidth = 100 - widget.x;
                }
                if (widget.y < otherWidget.y) {
                  adjustedHeight = otherWidget.y - widget.y;
                } else if (widget.y > otherWidget.y) {
                  adjustedHeight = 100 - widget.y;
                }

                adjustedWidth = Math.min(100, adjustedWidth);
                adjustedHeight = Math.min(100, adjustedHeight);

                potentialWidget = { ...widget, width: adjustedWidth, height: adjustedHeight };
                if (!checkCollision(potentialWidget, otherWidget)) {
                  return {
                    ...widget,
                    width: adjustedWidth,
                    height: adjustedHeight,
                  };
                }
              }
            }
          }

          return {
            ...widget,
            width: newWidthPercentage,
            height: newHeightPercentage,
          };
        }
        return widget;
      });
    });
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{ position: 'relative', width: '100%', height: '100%' }}
        ref={containerRef}
      >
        {widgets.map((widget) => (
          <DraggableItem
            key={widget.id}
            id={widget.id}
            position={{ x: widget.x, y: widget.y }}
            size={{ width: widget.width, height: widget.height }}
            onResizeStop={handleResizeStop}
          />
        ))}
      </div>
    </DndContext>
  );
}
