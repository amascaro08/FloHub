'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useWidgetTracking } from '@/lib/analyticsTracker';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CalendarEvent } from '@/types/calendar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import EventDetailModal from '@/components/ui/EventDetailModal';

interface CalendarWidgetProps {
  className?: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ className = '' }) => {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  const trackingHook = isClient ? useWidgetTracking('CalendarWidget') : { trackInteraction: () => {} };

  // Use shared calendar context instead of individual hook
  const {
    events,
    isLoading: eventsLoading,
    error: eventsError,
    isBackgroundRefreshing,
  } = useCalendarContext();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days for proper grid layout
    const firstDayOfWeek = start.getDay();
    const lastDayOfWeek = end.getDay();
    
    const paddingStart = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() - (firstDayOfWeek - i));
      return date;
    });
    
    const paddingEnd = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => {
      const date = new Date(end);
      date.setDate(date.getDate() + i + 1);
      return date;
    });
    
    return [...paddingStart, ...days, ...paddingEnd];
  }, [currentDate]);

  // Group events by date for efficient lookup
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    
    events.forEach(event => {
      let eventDate: Date;
      
      if (event.start instanceof Date) {
        eventDate = event.start;
      } else if (event.start?.dateTime) {
        eventDate = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        eventDate = new Date(event.start.date);
      } else {
        // Skip events without valid start date
        return;
      }
      
      // Skip invalid dates
      if (isNaN(eventDate.getTime())) {
        return;
      }
      
      const dateKey = format(eventDate, 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });
    
    return grouped;
  }, [events]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1));
    trackingHook.trackInteraction('navigate_previous_month');
  }, [trackingHook]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1));
    trackingHook.trackInteraction('navigate_next_month');
  }, [trackingHook]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
    trackingHook.trackInteraction('go_to_today');
  }, [trackingHook]);

  // Handle date selection
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    trackingHook.trackInteraction('select_date');
  }, [trackingHook]);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    trackingHook.trackInteraction('view_event_details');
  }, [trackingHook]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  // Loading state management
  useEffect(() => {
    if (user?.email) {
      setIsLoading(false);
    }
  }, [user]);

  // Error handling
  useEffect(() => {
    if (eventsError) {
      setError(eventsError.message);
    } else {
      setError(null);
    }
  }, [eventsError]);

  if (!user?.email) {
    return (
      <div className={`p-4 border rounded-lg shadow-sm ${className}`}>
        <div className="text-center text-gray-500">
          <CalendarIcon className="w-8 h-8 mx-auto mb-2" />
          <p>Please sign in to view your calendar</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border rounded-lg shadow-sm ${className}`}>
        <div className="text-amber-600 dark:text-amber-400">
          <h3 className="font-medium mb-2">Calendar Loading Error</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`p-4 border rounded-lg shadow-sm ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Calendar
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Next month"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month/Year Display */}
        <div className="text-center mb-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h4>
          {isBackgroundRefreshing && (
            <p className="text-xs text-gray-500 mt-1">Refreshing...</p>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                className={`
                  relative p-2 text-sm rounded transition-colors
                  ${isCurrentMonth 
                    ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700' 
                    : 'text-gray-400 dark:text-gray-500'
                  }
                  ${isCurrentDay ? 'bg-blue-100 dark:bg-blue-900' : ''}
                  ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                  ${dayEvents.length > 0 ? 'font-semibold' : ''}
                `}
              >
                <span>{format(day, 'd')}</span>
                
                {/* Event indicators */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="flex space-x-1">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`w-1 h-1 rounded-full ${
                            event.source === 'work' 
                              ? 'bg-red-500' 
                              : 'bg-green-500'
                          }`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="w-1 h-1 rounded-full bg-gray-400" />
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading indicator */}
        {eventsLoading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <p className="text-xs text-gray-500 mt-1">Loading events...</p>
          </div>
        )}

        {/* Selected date events */}
        {selectedDate && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <h5 className="font-medium text-gray-900 dark:text-white mb-2">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h5>
            {(() => {
              const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
              const selectedEvents = eventsByDate.get(selectedDateKey) || [];
              
              if (selectedEvents.length === 0) {
                return (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No events scheduled
                  </p>
                );
              }

              return (
                <div className="space-y-2">
                  {selectedEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors hover:bg-white dark:hover:bg-gray-700 ${
                        event.source === 'work'
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      }`}
                    >
                      <div className="font-medium">{event.summary}</div>
                      {(() => {
                        let startTime: string | null = null;
                        
                        if (event.start instanceof Date) {
                          startTime = event.start.toISOString();
                        } else if (event.start?.dateTime) {
                          startTime = event.start.dateTime;
                        }
                        
                        return startTime ? (
                          <div className="text-xs opacity-75">
                            {format(new Date(startTime), 'h:mm a')}
                          </div>
                        ) : null;
                      })()}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </>
  );
};

export default React.memo(CalendarWidget);
