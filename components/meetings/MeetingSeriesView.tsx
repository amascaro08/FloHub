import React, { useState, useEffect } from 'react';
import { Note, Action } from '@/types/app';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  LinkIcon,
  TagIcon
} from '@heroicons/react/24/solid';

type MeetingSeriesSummary = {
  totalMeetings: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  pendingActions: Action[];
  keyTopics: string[];
  decisions: string[];
  contextSummary: string;
};

type MeetingSeriesData = {
  name: string;
  meetings: Note[];
  summary: MeetingSeriesSummary;
};

interface MeetingSeriesViewProps {
  seriesName: string;
  onAddMeeting?: (seriesName: string) => void;
  onClose?: () => void;
}

export default function MeetingSeriesView({ 
  seriesName, 
  onAddMeeting, 
  onClose 
}: MeetingSeriesViewProps) {
  const [seriesData, setSeriesData] = useState<MeetingSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSeriesContext();
  }, [seriesName]);

  const fetchSeriesContext = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/meetings/series?seriesName=${encodeURIComponent(seriesName)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch series context');
      }
      
      const result = await response.json();
      setSeriesData(result.series);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse p-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !seriesData) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">{error || 'No series data found'}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <LinkIcon className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {seriesData.name}
          </h1>
        </div>
        <div className="flex space-x-2">
          {onAddMeeting && (
            <button
              onClick={() => onAddMeeting(seriesName)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Meeting</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800 dark:text-blue-200">Total Meetings</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
            {seriesData.summary.totalMeetings}
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800 dark:text-green-200">Date Range</span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {formatDate(seriesData.summary.dateRange.earliest)} - {formatDate(seriesData.summary.dateRange.latest)}
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-800 dark:text-orange-200">Pending Actions</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
            {seriesData.summary.pendingActions.length}
          </p>
        </div>
      </div>

      {/* Context Summary */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Series Overview</h3>
        <p className="text-gray-700 dark:text-gray-300">{seriesData.summary.contextSummary}</p>
      </div>

      {/* Key Topics */}
      {seriesData.summary.keyTopics.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
            <TagIcon className="w-5 h-5" />
            <span>Key Topics</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {seriesData.summary.keyTopics.map((topic, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pending Actions */}
      {seriesData.summary.pendingActions.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Outstanding Action Items</h3>
          <div className="space-y-2">
            {seriesData.summary.pendingActions.map((action, index) => (
              <div
                key={index}
                className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <p className="text-red-800 dark:text-red-200">{action.description}</p>
                  <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 px-2 py-1 rounded">
                    {action.assignedTo}
                  </span>
                </div>
                {action.dueDate && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Due: {formatDate(action.dueDate)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decisions Made */}
      {seriesData.summary.decisions.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Decisions</h3>
          <div className="space-y-3">
            {seriesData.summary.decisions.map((decision, index) => (
              <div
                key={index}
                className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <p className="text-green-800 dark:text-green-200 text-sm">{decision}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meeting List */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          Meetings in this Series ({seriesData.meetings.length})
        </h3>
        <div className="space-y-3">
          {seriesData.meetings.map((meeting, index) => (
            <div
              key={meeting.id}
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {meeting.title || meeting.eventTitle || `Meeting ${index + 1}`}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(meeting.createdAt)}
                </span>
              </div>
              {meeting.aiSummary && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {meeting.aiSummary}
                </p>
              )}
              {meeting.actions && meeting.actions.length > 0 && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  <span>{meeting.actions.length} action item{meeting.actions.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}