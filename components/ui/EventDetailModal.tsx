import React from 'react';
import { XMarkIcon, CalendarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { CalendarEvent, CalendarEventDateTime } from '@/types/calendar';
import { format } from 'date-fns';
import { extractTeamsLinks } from '@/lib/calendarUtils';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  // Parse event start time
  const getStartTime = () => {
    if (event.start instanceof Date) {
      return event.start;
    } else if (event.start?.dateTime) {
      return new Date(event.start.dateTime);
    } else if (event.start?.date) {
      return new Date(event.start.date);
    }
    return null;
  };

  // Parse event end time
  const getEndTime = () => {
    if (event.end instanceof Date) {
      return event.end;
    } else if (event.end?.dateTime) {
      return new Date(event.end.dateTime);
    } else if (event.end?.date) {
      return new Date(event.end.date);
    }
    return null;
  };

  // Check if event is all-day
  const isAllDay = () => {
    if (event.start instanceof Date) {
      return false; // Date objects are always time-specific
    } else {
      return event.start?.date && !event.start?.dateTime;
    }
  };



  // Parse HTML content safely
  const parseHTMLContent = (content: string): string => {
    // Remove script tags for security
    const sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return sanitized;
  };

  const startTime = getStartTime();
  const endTime = getEndTime();
  const teamsLinks = event.description ? extractTeamsLinks(event.description) : [];
  const parsedDescription = event.description ? parseHTMLContent(event.description) : '';
  const allDay = isAllDay();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                event.source === 'work' 
                  ? 'bg-red-100 dark:bg-red-900' 
                  : 'bg-green-100 dark:bg-green-900'
              }`}>
                <CalendarIcon className={`w-5 h-5 ${
                  event.source === 'work' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {event.summary}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {event.calendarName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Time Information */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {startTime ? format(startTime, 'EEEE, MMMM d, yyyy') : 'No start time'}
                  </p>
                  {startTime && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {allDay ? 'All day' : format(startTime, 'h:mm a')}
                      {endTime && !allDay && (
                        <span> - {format(endTime, 'h:mm a')}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Location if available */}
              {event.location && (
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {event.location}
                  </p>
                </div>
              )}
            </div>

            {/* Teams Links */}
            {teamsLinks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Meeting Links
                </h4>
                <div className="space-y-2">
                  {teamsLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Join Teams Meeting
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {parsedDescription && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Description
                </h4>
                <div 
                  className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: parsedDescription }}
                />
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;