import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';

interface CalendarEventFormProps {
  event?: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: any) => Promise<void>;
  availableCalendars?: Array<{ id: string; summary: string; source?: string }>;
}

export const CalendarEventForm: React.FC<CalendarEventFormProps> = ({
  event,
  isOpen,
  onClose,
  onSubmit,
  availableCalendars = []
}) => {
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    start: '',
    end: '',
    calendarId: '',
    source: 'personal' as 'personal' | 'work',
    tags: [] as string[],
    location: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  // Initialize form data when event changes
  useEffect(() => {
    console.log('CalendarEventForm: availableCalendars changed:', availableCalendars);
    console.log('CalendarEventForm: availableCalendars length:', availableCalendars?.length);
    
    if (event) {
      const startDate = event.start instanceof Date 
        ? format(event.start, "yyyy-MM-dd'T'HH:mm")
        : event.start.dateTime 
          ? format(parseISO(event.start.dateTime), "yyyy-MM-dd'T'HH:mm")
          : '';
      
      const endDate = event.end instanceof Date
        ? format(event.end, "yyyy-MM-dd'T'HH:mm")
        : event.end?.dateTime
          ? format(parseISO(event.end.dateTime), "yyyy-MM-dd'T'HH:mm")
          : '';

      setFormData({
        summary: event.summary || event.title || '',
        description: event.description || '',
        start: startDate,
        end: endDate,
        calendarId: event.calendarId || '',
        source: event.source || 'personal',
        tags: event.tags || [],
        location: event.location || ''
      });
    } else {
      // Default to current time for new events
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      
      setFormData({
        summary: '',
        description: '',
        start: format(now, "yyyy-MM-dd'T'HH:mm"),
        end: format(inOneHour, "yyyy-MM-dd'T'HH:mm"),
        calendarId: availableCalendars.length > 0 ? availableCalendars[0].id : '',
        source: 'personal',
        tags: [],
        location: ''
      });
    }
  }, [event, availableCalendars]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Submitting form data:', formData);
      console.log('Available calendars:', availableCalendars);

      // Validate form data
      if (!formData.summary.trim()) {
        throw new Error('Event title is required');
      }
      if (!formData.start) {
        throw new Error('Start time is required');
      }
      if (!formData.end) {
        throw new Error('End time is required');
      }
      if (new Date(formData.start) >= new Date(formData.end)) {
        throw new Error('End time must be after start time');
      }
      if (availableCalendars.length > 0 && !formData.calendarId) {
        throw new Error('Please select a calendar');
      }
      if (availableCalendars.length === 0) {
        throw new Error('No calendars available. Please check your calendar settings.');
      }

      const eventData = {
        ...formData,
        summary: formData.summary.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Add user's timezone
      };

      console.log('Submitting event data:', eventData);

      await onSubmit(eventData);

      onClose();
    } catch (err: any) {
      console.error('Form submission error:', err);
      // If the error has a message property, use it. Otherwise, stringify the error.
      setError(err?.message || (typeof err === 'string' ? err : JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {event ? 'Edit Event' : 'Create Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Event Title */}
            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  id="start"
                  value={formData.start}
                  onChange={(e) => setFormData(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
              <div>
                <label htmlFor="end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  id="end"
                  value={formData.end}
                  onChange={(e) => setFormData(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  required
                />
              </div>
            </div>

            {/* Calendar Selection */}
            <div>
              <label htmlFor="calendarId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Calendar {availableCalendars.length === 0 && <span className="text-red-500">*</span>}
              </label>
              {availableCalendars.length > 0 ? (
                <select
                  id="calendarId"
                  value={formData.calendarId}
                  onChange={(e) => setFormData(prev => ({ ...prev, calendarId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Select a calendar</option>
                  {availableCalendars.map(calendar => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-4 py-3 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                  No calendars available. Please check your calendar settings.
                </div>
              )}
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="personal"
                    checked={formData.source === 'personal'}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as 'personal' | 'work' }))}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Personal</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="work"
                    checked={formData.source === 'work'}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as 'personal' | 'work' }))}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Work</span>
                </label>
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Enter location"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors resize-none"
                placeholder="Enter event description"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};