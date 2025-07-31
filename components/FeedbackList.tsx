import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, TrashIcon } from '@heroicons/react/24/solid';

interface FeedbackItem {
  id: string;
  title?: string;
  description?: string;
  status: string;
  createdAt: number;
  completedAt?: number | null;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  // Legacy fields for backward compatibility
  feedbackType?: string;
  feedbackText?: string;
}

interface FeedbackListProps {
  onSelectFeedback: (feedback: FeedbackItem) => void;
}

const FeedbackList: React.FC<FeedbackListProps> = ({ onSelectFeedback }) => {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Separate open and completed feedback
  const openFeedback = feedbackItems.filter(item => item.status === 'open');
  const completedFeedback = feedbackItems.filter(item => item.status === 'completed' || item.status === 'closed');

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

  const getTypeIcon = (item: FeedbackItem) => {
    // Extract type from title or use feedbackType for legacy items
    const title = item.title || '';
    const feedbackType = item.feedbackType;
    
    if (title.includes('🐛') || feedbackType === 'bug') return '🐛';
    if (title.includes('✨') || feedbackType === 'feature') return '✨';
    if (title.includes('🎨') || feedbackType === 'ui') return '🎨';
    if (title.includes('📅') || feedbackType === 'calendar') return '📅';
    if (title.includes('⚡') || feedbackType === 'performance') return '⚡';
    return '💬';
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

  const getFeedbackText = (item: FeedbackItem) => {
    return item.description || item.feedbackText || '';
  };

  const getFeedbackTitle = (item: FeedbackItem) => {
    if (item.title) return item.title;
    if (item.feedbackType && item.feedbackText) {
      const titlePrefixes: Record<string, string> = {
        'bug': '🐛 Bug Report',
        'feature': '✨ Feature Request', 
        'ui': '🎨 UI Issue',
        'calendar': '📅 Calendar Issue',
        'performance': '⚡ Performance Issue',
        'general': '💬 General Feedback'
      };
      const prefix = titlePrefixes[item.feedbackType] || '💬 Feedback';
      return `${prefix}: ${item.feedbackText.slice(0, 50)}${item.feedbackText.length > 50 ? '...' : ''}`;
    }
    return 'Feedback';
  };

  const handleDeleteFeedback = async (item: FeedbackItem, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      return;
    }

    setDeletingId(item.id);
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id: item.id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove from local state
        setFeedbackItems(prev => prev.filter(f => f.id !== item.id));
      } else {
        alert(data.error || 'Failed to delete feedback');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('An error occurred while deleting feedback');
    } finally {
      setDeletingId(null);
    }
  };

  const renderFeedbackCard = (item: FeedbackItem) => (
    <div
      key={item.id}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all duration-200"
      onClick={() => onSelectFeedback(item)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">{getTypeIcon(item)}</span>
            <div className="flex items-center gap-2">
              {getStatusBadge(item.status)}
              {item.githubIssueNumber && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md">
                  Issue #{item.githubIssueNumber}
                </span>
              )}
            </div>
          </div>
          
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
            {getFeedbackTitle(item)}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {truncateText(getFeedbackText(item))}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Submitted {formatDate(item.createdAt)}</span>
            {item.completedAt && (
              <span>Completed {formatDate(item.completedAt)}</span>
            )}
          </div>
        </div>
        
        <div className="ml-4 flex-shrink-0 flex items-center gap-2">
          {/* Show delete button only for entries without GitHub URL */}
          {!item.githubIssueUrl && (
            <button
              onClick={(e) => handleDeleteFeedback(item, e)}
              disabled={deletingId === item.id}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              title="Delete feedback (no GitHub issue linked)"
            >
              {deletingId === item.id ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-500"></div>
              ) : (
                <TrashIcon className="w-4 h-4" />
              )}
            </button>
          )}
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-3 text-gray-600 dark:text-gray-400">Loading your feedback...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button 
          onClick={fetchFeedback}
          className="btn-secondary"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (feedbackItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No feedback yet</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          You haven't submitted any feedback yet. Use the form above to submit your first feedback and help us improve FlowHub.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Your Feedback
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {openFeedback.length} open, {completedFeedback.length} completed
          </p>
        </div>
        <button 
          onClick={fetchFeedback}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Open Feedback */}
      {openFeedback.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Open Feedback ({openFeedback.length})
            </h3>
          </div>
          <div className="grid gap-4">
            {openFeedback.map(renderFeedbackCard)}
          </div>
        </div>
      )}

      {/* Completed/Closed Feedback */}
      {completedFeedback.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 w-full text-left group"
          >
            {showCompleted ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
            )}
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              Completed & Closed ({completedFeedback.length})
            </h3>
          </button>
          
          {showCompleted && (
            <div className="grid gap-4 pl-6">
              {completedFeedback.map(renderFeedbackCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackList;