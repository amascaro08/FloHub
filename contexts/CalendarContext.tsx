import React, { createContext, useContext, ReactNode } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { CalendarEvent } from '@/types/calendar';
import { CalendarSource } from '@/types/app';
import { generateCalendarSourcesHash } from '@/lib/calendarUtils';

interface CalendarContextType {
  events: CalendarEvent[];
  isLoading: boolean;
  error: Error | null;
  isBackgroundRefreshing: boolean;
  refetch: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

interface CalendarProviderProps {
  children: ReactNode;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
  calendarSources?: CalendarSource[];
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ 
  children, 
  startDate, 
  endDate, 
  enabled = true,
  calendarSources
}) => {
  const calendarSourcesHash = generateCalendarSourcesHash(calendarSources);
  
  const calendarData = useCalendarEvents({
    startDate,
    endDate,
    enabled,
    calendarSourcesHash,
  });

  return (
    <CalendarContext.Provider value={calendarData}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendarContext = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
};