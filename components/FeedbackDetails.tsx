import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Comment {
  id: number;
  author: string;
  authorAvatar?: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface Issue {
  number: number;
  title: string;
  body: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  authorAvatar?: string;
  labels: string[];
  url: string;
}

interface GitHubData {
  issue: Issue;
  comments: Comment[];
}

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

interface FeedbackDetailsProps {
  feedback: FeedbackItem;
  onBack: () => void;
}

const FeedbackDetails: React.FC<FeedbackDetailsProps> = ({ feedback, onBack }) => {
  const [githubData, setGithubData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (feedback.githubIssueNumber) {
      fetchGitHubData();
    } else {
      setLoading(false);
    }
  }, [feedback.githubIssueNumber]);

  const fetchGitHubData = async () => {
    try {
      const response = await fetch(`/api/github-comments?issueNumber=${feedback.githubIssueNumber}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setGithubData(data);
      } else {
        setError('Failed to load GitHub data');
      }
    } catch (err) {
      setError('Error loading GitHub data');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !feedback.githubIssueNumber) return;

    setSubmittingComment(true);
    try {
      const response = await fetch('/api/github-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          issueNumber: feedback.githubIssueNumber,
          comment: newComment,
        }),
      });

      if (response.ok) {
        setNewComment('');
        // Refresh the GitHub data to show the new comment
        await fetchGitHubData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to post comment');
      }
    } catch (err) {
      alert('Error posting comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{getTypeIcon(feedback.feedbackType)}</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {feedback.feedbackType.charAt(0).toUpperCase() + feedback.feedbackType.slice(1)} Feedback
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {getStatusBadge(feedback.status)}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Submitted {new Date(feedback.createdAt).toLocaleDateString()}
              </span>
              {feedback.githubIssueNumber && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Issue #{feedback.githubIssueNumber}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {feedback.githubIssueUrl && (
          <a
            href={feedback.githubIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
        )}
      </div>

      {/* Original Feedback */}
      <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Your Original Feedback</h3>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{feedback.feedbackText}</p>
      </div>

      {/* GitHub Issue Thread */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading discussion...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : githubData ? (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Discussion Thread</h3>
          
          {/* GitHub Issue */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                {githubData.issue.authorAvatar && (
                  <img
                    src={githubData.issue.authorAvatar}
                    alt={githubData.issue.author}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {githubData.issue.author}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    {formatDate(githubData.issue.createdAt)}
                  </span>
                </div>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                {githubData.issue.title}
              </h4>
            </div>
            <div className="p-4">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{githubData.issue.body}</ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Comments */}
          {githubData.comments.map((comment) => (
            <div key={comment.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {comment.authorAvatar && (
                    <img
                      src={comment.authorAvatar}
                      alt={comment.author}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {comment.author}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{comment.body}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {/* Add Comment Form */}
          {feedback.status === 'open' && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Add Follow-up Comment</h4>
              <form onSubmit={handleCommentSubmit}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add additional details, clarifications, or questions..."
                  rows={4}
                  className="input-modern w-full mb-3"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="btn-primary"
                  >
                    {submittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            This feedback doesn't have a linked GitHub issue yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default FeedbackDetails;