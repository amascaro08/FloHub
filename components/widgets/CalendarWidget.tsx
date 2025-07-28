'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useWidgetTracking } from '@/lib/analyticsTracker';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { CalendarEvent } from '@/types/calendar';
import { format, isToday, isTomorrow, isThisWeek, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays } from 'date-fns';
import { Calendar, Clock, MapPin, ChevronRight, Users } from 'lucide-react';
import EventDetailModal from '@/components/ui/EventDetailModal';
import type { WidgetProps } from '@/types/app';

interface CalendarWidgetProps extends WidgetProps {
  className?: string;
}

type TimeSelection = 'today' | 'tomorrow' | 'thisWeek';

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ 
  className = '', 
  size = 'medium', 
  colSpan = 4, 
  rowSpan = 3, 
  isCompact = false, 
  isHero = false 
}) => {
  const { user } = useUser();
  const [selectedTime, setSelectedTime] = useState<TimeSelection>('today');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  const trackingHook = isClient ? useWidgetTracking('CalendarWidget') : { trackInteraction: () => {} };

  // Use shared calendar context with proper error handling
  const {
    events = [],
    isLoading,
    error,
    isBackgroundRefreshing,
  } = useCalendarContext() || { events: [], isLoading: true, error: null, isBackgroundRefreshing: false };

  // Determine if we're in a very small layout
  const isVerySmall = colSpan <= 2 || rowSpan <= 2 || isCompact;
  const isSmall = colSpan <= 3 || rowSpan <= 3;

  // Filter events based on selected time period
  const filteredEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    return events.filter(event => {
      let eventDate: Date;
      
      try {
        if (event.start instanceof Date) {
          eventDate = event.start;
        } else if (event.start?.dateTime) {
          eventDate = new Date(event.start.dateTime);
        } else if (event.start?.date) {
          eventDate = new Date(event.start.date);
        } else {
          return false;
        }
        
        // Skip invalid dates
        if (isNaN(eventDate.getTime())) {
          return false;
        }
        
        switch (selectedTime) {
          case 'today':
            return isToday(eventDate);
          case 'tomorrow':
            return isTomorrow(eventDate);
          case 'thisWeek':
            return isThisWeek(eventDate, { weekStartsOn: 0 }); // Week starts on Sunday
          default:
            return false;
        }
      } catch (error) {
        console.warn('Error filtering event:', error);
        return false;
      }
    }).sort((a, b) => {
      // Sort by start time
      try {
        const aTime = a.start instanceof Date ? a.start : 
                     a.start?.dateTime ? new Date(a.start.dateTime) : 
                     a.start?.date ? new Date(a.start.date) : new Date(0);
        const bTime = b.start instanceof Date ? b.start : 
                     b.start?.dateTime ? new Date(b.start.dateTime) : 
                     b.start?.date ? new Date(b.start.date) : new Date(0);
        return aTime.getTime() - bTime.getTime();
      } catch (error) {
        return 0;
      }
    });
  }, [events, selectedTime]);

  // Get count for each time period
  const eventCounts = useMemo(() => {
    if (!events || !Array.isArray(events)) {
      return { today: 0, tomorrow: 0, thisWeek: 0 };
    }
    
    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    const counts = { today: 0, tomorrow: 0, thisWeek: 0 };
    
    events.forEach(event => {
      try {
        let eventDate: Date;
        
        if (event.start instanceof Date) {
          eventDate = event.start;
        } else if (event.start?.dateTime) {
          eventDate = new Date(event.start.dateTime);
        } else if (event.start?.date) {
          eventDate = new Date(event.start.date);
        } else {
          return;
        }
        
        if (isNaN(eventDate.getTime())) {
          return;
        }
        
        if (isToday(eventDate)) {
          counts.today++;
        }
        if (isTomorrow(eventDate)) {
          counts.tomorrow++;
        }
        if (isThisWeek(eventDate, { weekStartsOn: 0 })) {
          counts.thisWeek++;
        }
      } catch (error) {
        console.warn('Error counting event:', error);
      }
    });
    
    return counts;
  }, [events]);

  // Handle time selection
  const handleTimeSelection = useCallback((time: TimeSelection) => {
    setSelectedTime(time);
    trackingHook.trackInteraction(`select_${time}`);
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

  // Format event time
  const formatEventTime = useCallback((event: CalendarEvent) => {
    try {
      if (event.start instanceof Date) {
        return format(event.start, 'h:mm a');
      } else if (event.start?.dateTime) {
        return format(new Date(event.start.dateTime), 'h:mm a');
      } else if (event.start?.date) {
        return 'All day';
      }
      return '';
    } catch (error) {
      return '';
    }
  }, []);

  // Get the current time period label
  const getTimePeriodLabel = useCallback(() => {
    switch (selectedTime) {
      case 'today':
        return isVerySmall ? format(new Date(), 'MMM d') : format(new Date(), 'EEEE, MMM d');
      case 'tomorrow':
        return isVerySmall ? format(addDays(new Date(), 1), 'MMM d') : format(addDays(new Date(), 1), 'EEEE, MMM d');
      case 'thisWeek':
        const start = startOfWeek(new Date(), { weekStartsOn: 0 });
        const end = endOfWeek(new Date(), { weekStartsOn: 0 });
        return isVerySmall ? `${format(start, 'MMM d')}-${format(end, 'd')}` : `Week of ${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
      default:
        return '';
    }
  }, [selectedTime, isVerySmall]);

  // Responsive spacing and sizing classes
  const spacingClass = isVerySmall ? 'space-y-2' : isSmall ? 'space-y-3' : 'space-y-4';
  const paddingClass = isVerySmall ? 'p-2' : 'p-3';
  const textSizeClass = isVerySmall ? 'text-xs' : isSmall ? 'text-sm' : 'text-sm';
  const headerTextSize = isVerySmall ? 'text-sm' : isSmall ? 'text-base' : 'text-lg';

  // Loading state with graceful fallback
  if (isLoading && (!events || events.length === 0)) {
    return (
      <div className={`${spacingClass} h-full flex flex-col`}>
        {/* Loading Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
        </div>
        
        {/* Loading Time Selection */}
        <div className={`flex ${isVerySmall ? 'space-x-1' : 'space-x-2'} flex-shrink-0`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${isVerySmall ? 'h-6' : 'h-8'} bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse`}></div>
          ))}
        </div>
        
        {/* Loading Events */}
        <div className="space-y-2 flex-1">
          {Array.from({ length: isVerySmall ? 2 : 3 }).map((_, i) => (
            <div key={i} className={`${isVerySmall ? 'h-12' : 'h-16'} bg-gray-200 dark:bg-gray-700 rounded animate-pulse`}></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`text-center ${isVerySmall ? 'py-4' : 'py-8'} h-full flex flex-col justify-center`}>
        <div className={`${isVerySmall ? 'w-8 h-8' : 'w-12 h-12'} bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-3`}>
          <Calendar className={`${isVerySmall ? 'w-4 h-4' : 'w-6 h-6'} text-accent-500`} />
        </div>
        <p className={`text-grey-tint font-body ${textSizeClass} mb-2`}>
          {isVerySmall ? 'Can\'t load events' : 'Unable to load calendar events'}
        </p>
        {!isVerySmall && (
          <p className="text-xs text-grey-tint">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${spacingClass} h-full flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {!isVerySmall && <Calendar className="w-4 h-4 text-primary-500 flex-shrink-0" />}
          <h3 className={`${headerTextSize} font-heading font-semibold text-dark-base dark:text-soft-white truncate`}>
            {isVerySmall ? 'Events' : 'Calendar'}
          </h3>
          {isBackgroundRefreshing && !isVerySmall && (
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse flex-shrink-0"></div>
          )}
        </div>
        <span className={`${isVerySmall ? 'text-xs' : textSizeClass} text-grey-tint flex-shrink-0`}>
          {isVerySmall ? filteredEvents.length : `${filteredEvents.length} events`}
        </span>
      </div>

      {/* Time Period Selection */}
      <div className={`flex ${isVerySmall ? 'space-x-0.5' : 'space-x-1'} bg-gray-100 dark:bg-gray-800 rounded-lg ${isVerySmall ? 'p-0.5' : 'p-1'} flex-shrink-0`}>
        {[
          { key: 'today' as TimeSelection, label: isVerySmall ? 'Today' : 'Today', count: eventCounts.today },
          { key: 'tomorrow' as TimeSelection, label: isVerySmall ? 'Tom' : 'Tomorrow', count: eventCounts.tomorrow },
          { key: 'thisWeek' as TimeSelection, label: isVerySmall ? 'Week' : 'This Week', count: eventCounts.thisWeek }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => handleTimeSelection(key)}
            className={`flex-1 ${isVerySmall ? 'px-1 py-1' : 'px-3 py-2'} ${isVerySmall ? 'text-xs' : 'text-xs'} font-medium rounded-md transition-all duration-200 ${
              selectedTime === key
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            <div className={`flex ${isVerySmall ? 'flex-row items-center justify-center space-x-1' : 'flex-col items-center space-y-1'}`}>
              <span className="truncate">{label}</span>
              <span className={`text-xs ${
                selectedTime === key ? 'text-white' : 'text-gray-500 dark:text-gray-500'
              }`}>
                {count}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Current Selection Label - Hide in very small mode */}
      {!isVerySmall && (
        <div className="flex-shrink-0">
          <p className={`${textSizeClass} font-medium text-dark-base dark:text-soft-white truncate`}>
            {getTimePeriodLabel()}
          </p>
        </div>
      )}

      {/* Events List */}
      <div className={`flex-1 overflow-y-auto ${isVerySmall ? 'space-y-1' : 'space-y-2'}`}>
        {filteredEvents.length > 0 ? (
          filteredEvents.slice(0, isVerySmall ? 8 : 10).map((event) => (
            <button
              key={event.id}
              onClick={() => handleEventClick(event)}
              className={`w-full text-left ${paddingClass} bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-sm transition-all duration-200`}
            >
              <div className={`flex items-start ${isVerySmall ? 'space-x-2' : 'space-x-3'}`}>
                <div className={`${isVerySmall ? 'w-1.5 h-1.5' : 'w-2 h-2'} bg-primary-500 rounded-full ${isVerySmall ? 'mt-1.5' : 'mt-2'} flex-shrink-0`}></div>
                <div className="flex-1 min-w-0">
                  <p className={`${textSizeClass} font-medium text-dark-base dark:text-soft-white break-words leading-relaxed`}>
                    {isVerySmall && event.summary && event.summary.length > 20 
                      ? event.summary.slice(0, 20) + '...' 
                      : event.summary || 'No title'}
                  </p>
                  <div className={`flex items-center ${isVerySmall ? 'space-x-2' : 'space-x-3'} mt-1`}>
                    <span className={`text-xs text-grey-tint flex items-center ${isVerySmall ? 'space-x-0.5' : 'space-x-1'}`}>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{formatEventTime(event)}</span>
                    </span>
                    {event.location && !isVerySmall && (
                      <span className="text-xs text-grey-tint flex items-center space-x-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-20">{event.location}</span>
                      </span>
                    )}
                    {event.description && event.description.includes('teams.microsoft.com') && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        {!isVerySmall && <span>Teams</span>}
                      </span>
                    )}
                  </div>
                </div>
                {!isVerySmall && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </div>
            </button>
          ))
        ) : (
          <div className={`text-center ${isVerySmall ? 'py-4' : 'py-8'}`}>
            <Calendar className={`${isVerySmall ? 'w-6 h-6' : 'w-8 h-8'} text-grey-tint mx-auto mb-3`} />
            <p className={`${textSizeClass} text-grey-tint mb-1`}>
              {isVerySmall 
                ? 'No events' 
                : `No events ${selectedTime === 'today' ? 'today' : selectedTime === 'tomorrow' ? 'tomorrow' : 'this week'}`}
            </p>
            {!isVerySmall && (
              <p className="text-xs text-grey-tint">
                {selectedTime === 'today' ? 'Enjoy your free day!' : 'Your schedule is clear'}
              </p>
            )}
          </div>
        )}
        
        {/* Show truncation indicator for very small widgets */}
        {isVerySmall && filteredEvents.length > 8 && (
          <p className="text-xs text-grey-tint text-center py-1">
            +{filteredEvents.length - 8} more
          </p>
        )}
      </div>

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
