import React, { useState, useEffect } from 'react';

interface FeedbackItem {
  id: string;
  feedbackType: string;
  feedbackText: string;
  status: string;
  createdAt: number;
  completedAt?: number | null;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
}

interface FeedbackListProps {
  onSelectFeedback: (feedback: FeedbackItem) => void;
}

const FeedbackList: React.FC<FeedbackListProps> = ({ onSelectFeedback }) => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/feedback', {
        credentials: 'include',
      });

      if (response.ok) {
        const items = await response.json();
        setFeedbackItems(items);
      } else {
        setError('Failed to load feedback');
      }
    } catch (err) {
      setError('Error loading feedback');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200', label: 'Open' },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', label: 'Completed' },
      closed: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200', label: 'Closed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      bug: '🐛',
      feature: '✨',
      ui: '🎨',
      calendar: '📅',
      performance: '⚡',
      general: '💬',
    };
    return icons[type as keyof typeof icons] || '💬';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading your feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button 
          onClick={fetchFeedback}
          className="mt-2 btn-secondary"
        >
          Retry
        </button>
      </div>
    );
  }

  if (feedbackItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No feedback yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You haven't submitted any feedback yet. Submit your first feedback to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Your Feedback ({feedbackItems.length})
        </h2>
        <button 
          onClick={fetchFeedback}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4">
        {feedbackItems.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
            onClick={() => onSelectFeedback(item)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getTypeIcon(item.feedbackType)}</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                    {item.feedbackType} Feedback
                  </span>
                  {getStatusBadge(item.status)}
                </div>
                
                <p className="text-gray-900 dark:text-gray-100 mb-2">
                  {truncateText(item.feedbackText)}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Submitted {formatDate(item.createdAt)}</span>
                  {item.completedAt && (
                    <span>Completed {formatDate(item.completedAt)}</span>
                  )}
                  {item.githubIssueNumber && (
                    <span>Issue #{item.githubIssueNumber}</span>
                  )}
                </div>
              </div>
              
              <div className="ml-4 flex-shrink-0">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedbackList;