'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useWidgetTracking } from '@/lib/analyticsTracker';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CalendarEvent } from '@/types/calendar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import EventDetailModal from '@/components/ui/EventDetailModal';
import type { WidgetProps } from '@/types/app';

interface CalendarWidgetProps extends WidgetProps {
  className?: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ 
  className = '', 
  size = 'medium', 
  colSpan = 4, 
  rowSpan = 3, 
  isCompact = false, 
  isHero = false 
}) => {
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
    
    // Safety check to prevent errors when events is undefined
    if (!events || !Array.isArray(events)) {
      return grouped;
    }
    
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
    trackingHook.trackInteraction('navigate_today');
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
    trackingHook.trackInteraction('view_event');
  }, [trackingHook]);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  // Loading state
  if (eventsLoading && events.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || eventsError) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-6 h-6 text-accent-500" />
        </div>
        <p className="text-grey-tint font-body text-sm">
          Unable to load calendar events
        </p>
      </div>
    );
  }

  // Get today's events for preview
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    return eventsByDate.get(todayKey) || [];
  }, [eventsByDate]);

  // Get events to display (selected date or today)
  const { displayEvents, displayTitle } = useMemo(() => {
    const isSelectedDateToday = selectedDate && isSameDay(selectedDate, new Date());
    const events = selectedDate && !isSelectedDateToday
      ? eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
      : todayEvents;
    const title = selectedDate && !isSelectedDateToday
      ? `Events for ${format(selectedDate, 'MMM d')}`
      : "Today's Events";
    
    return { displayEvents: events, displayTitle: title };
  }, [selectedDate, eventsByDate, todayEvents]);

  // Render different layouts based on size
  if (isCompact) {
    // Compact view: Focus on today's events
    return (
      <div className="space-y-2 h-full flex flex-col">
        {/* Compact Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-heading font-semibold text-dark-base dark:text-soft-white">
            {format(new Date(), 'MMM d, yyyy')}
          </h3>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
          >
            Today
          </button>
        </div>
        
        {/* Today's Events List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {todayEvents.length > 0 ? (
            <div className="space-y-1">
              {todayEvents.slice(0, 6).map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 transition-colors"
                >
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-dark-base dark:text-soft-white break-words">
                        {event.summary && event.summary.length > 25 ? event.summary.slice(0, 25) + '...' : event.summary || 'No title'}
                      </p>
                      {event.start && 'dateTime' in event.start && event.start.dateTime && (
                        <p className="text-xs text-grey-tint mt-0.5">
                          {format(new Date(event.start.dateTime), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {todayEvents.length > 6 && (
                <p className="text-xs text-grey-tint text-center py-1">
                  +{todayEvents.length - 6} more events
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Calendar className="w-6 h-6 text-grey-tint mx-auto mb-2" />
              <p className="text-xs text-grey-tint">No events today</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} h-full flex flex-col`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-1 min-w-0">
          <button
            onClick={goToPreviousMonth}
            className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </button>
          <h3 className={`${isCompact ? 'text-sm' : 'text-base'} font-heading font-semibold text-dark-base dark:text-soft-white truncate`}>
            {format(currentDate, isCompact ? 'MMM' : 'MMM yyyy')}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors flex-shrink-0"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className={`${isCompact ? 'space-y-0.5' : 'space-y-1'} flex-shrink-0`}>
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="text-center">
              <span className={`${isCompact ? 'text-xs' : 'text-xs'} font-medium text-grey-tint`}>{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dayKey) || [];

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                className={`relative p-1 text-xs rounded transition-all duration-200 ${isCompact ? 'min-h-[20px]' : 'min-h-[28px]'} ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : isTodayDate
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : isCurrentMonth
                    ? 'text-dark-base dark:text-soft-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                <span className="font-medium">{format(day, 'd')}</span>
                
                {/* Event Indicators */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-primary-500'
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className={`text-xs ${
                        isSelected ? 'text-white' : 'text-primary-500'
                      }`}>
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events or Today's Events Preview */}
      {displayEvents.length > 0 && (
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          <h4 className="text-sm font-medium text-dark-base dark:text-soft-white flex items-center space-x-2 flex-shrink-0">
            <Clock className="w-3 h-3 text-primary-500" />
            <span>{displayTitle} ({displayEvents.length})</span>
          </h4>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
             {displayEvents.slice(0, 5).map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 transition-colors"
              >
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark-base dark:text-soft-white break-words leading-relaxed">
                      {event.summary}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {event.start && (
                        <span className="text-xs text-grey-tint flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {event.start instanceof Date 
                              ? format(event.start, 'h:mm a')
                              : event.start.dateTime 
                                ? format(new Date(event.start.dateTime), 'h:mm a')
                                : 'All day'
                            }
                          </span>
                        </span>
                      )}
                      {event.location && (
                        <span className="text-xs text-grey-tint flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {displayEvents.length > 5 && (
              <p className="text-xs text-grey-tint text-center">
                +{displayEvents.length - 5} more events
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-primary-500" />
          </div>
          <p className="text-grey-tint font-body text-sm">
            No events scheduled
          </p>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default CalendarWidget;
