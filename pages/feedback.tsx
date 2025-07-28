import React, { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import FeedbackList from '@/components/FeedbackList';
import FeedbackDetails from '@/components/FeedbackDetails';

const FeedbackPage: NextPage = () => {
  const router = useRouter();
  const { user, isLoading: isUserLoading, isError } = useUser();
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [issueUrl, setIssueUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Available feedback types
  const feedbackTypes = [
    { value: 'bug', label: '🐛 Bug Report', description: 'Something is broken or not working as expected' },
    { value: 'feature', label: '✨ Feature Request', description: 'Suggest a new feature or improvement' },
    { value: 'ui', label: '🎨 UI/UX Issue', description: 'Design, layout, or user experience feedback' },
    { value: 'calendar', label: '📅 Calendar Issue', description: 'Issues with calendar functionality' },
    { value: 'performance', label: '⚡ Performance', description: 'App is slow or unresponsive' },
    { value: 'general', label: '💬 General Feedback', description: 'General comments or suggestions' },
  ];

  // Predefined tags for easy selection
  const availableTags = [
    'urgent',
    'minor',
    'enhancement',
    'documentation',
    'mobile',
    'desktop',
    'accessibility',
    'security',
    'integration',
    'workflow',
    'notifications',
    'search',
    'export',
    'sync',
    'settings'
  ];

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');
    setIssueUrl('');

    try {
      const response = await fetch('/api/github-issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          feedbackType, 
          feedbackText,
          tags: selectedTags
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccess(true);
        setSubmitMessage("Thanks! Your feedback has been submitted and is now being tracked. We'll keep you updated here.");
        setIssueUrl(data.issueUrl);
        setFeedbackText('');
        setSelectedTags([]);
        setFeedbackType('general');
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setSubmitMessage('');
        }, 5000);
      } else {
        // Handle specific authentication errors
        if (response.status === 401) {
          setSubmitMessage('Please sign in to submit feedback. Redirecting to login...');
          setTimeout(() => {
            const currentPath = router.asPath;
            const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
            router.push(loginUrl);
          }, 2000);
        } else {
          setSubmitMessage(data.error || 'Failed to submit feedback.');
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitMessage('An error occurred while submitting feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state only briefly
  if (isUserLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-[var(--fg)]">Submit Feedback</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Handle feedback selection from list
  const handleFeedbackSelect = (feedback: any) => {
    setSelectedFeedback(feedback);
    setActiveTab('submit'); // Show details in main area
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedFeedback(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--fg)]">Feedback Center</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Submit new feedback or track your existing submissions and their progress.
        </p>
        {!user && !isUserLoading && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-700 dark:text-yellow-300">
            <p className="text-sm">
              <strong>Note:</strong> You need to be signed in to submit feedback. If you're not signed in, you'll be prompted to log in when you submit.
            </p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('submit');
              setSelectedFeedback(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'submit' && !selectedFeedback
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Submit Feedback
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              setSelectedFeedback(null);
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history' && !selectedFeedback
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Your Feedback
          </button>
          {selectedFeedback && (
            <button
              onClick={handleBackToList}
              className="py-2 px-1 border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 font-medium text-sm"
            >
              ← Back to List
            </button>
          )}
        </nav>
      </div>

      {/* Success Message */}
      {showSuccess && submitMessage && (
        <div className="mb-6 p-4 rounded-lg border bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="font-medium">{submitMessage}</p>
              {issueUrl && (
                <div className="mt-2">
                  <a 
                    href={issueUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
                  >
                    View on GitHub →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitMessage && !showSuccess && (
        <div className="mb-6 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          <p className="font-medium">{submitMessage}</p>
        </div>
      )}

      {/* Tab Content */}
      {selectedFeedback ? (
        <FeedbackDetails 
          feedback={selectedFeedback} 
          onBack={handleBackToList}
        />
      ) : activeTab === 'submit' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Feedback Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {feedbackTypes.map((type) => (
              <div
                key={type.value}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  feedbackType === type.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setFeedbackType(type.value)}
              >
                <input
                  type="radio"
                  name="feedbackType"
                  value={type.value}
                  checked={feedbackType === type.value}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="sr-only"
                />
                <div className="font-medium text-sm mb-1">{type.label}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{type.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Text */}
        <div>
          <label htmlFor="feedbackText" className="block text-sm font-medium mb-2">
            Describe your feedback
          </label>
          <textarea
            id="feedbackText"
            name="feedbackText"
            rows={6}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Please provide detailed information about your feedback..."
            required
            className="input-modern"
          />
        </div>

        {/* Tags Section */}
        <div>
          <label className="block text-sm font-medium mb-3">Tags (optional)</label>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
            Add tags to help categorize your feedback
          </p>
          
          {/* Predefined Tags */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-primary-100 border-primary-300 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Tag Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Add custom tag..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
              className="input-modern flex-1"
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              disabled={!customTag.trim()}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Add
            </button>
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Selected tags:</div>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded-full dark:bg-primary-900/30 dark:text-primary-200"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !feedbackText.trim()}
            className="btn-primary w-full md:w-auto"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
        </form>
      ) : (
        <FeedbackList onSelectFeedback={handleFeedbackSelect} />
      )}

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Your feedback will be automatically converted into a GitHub issue</li>
          <li>• You'll receive a link to track the progress of your feedback</li>
          <li>• All feedback is reviewed and prioritized by the development team</li>
          <li>• You'll be notified when your issue is resolved</li>
          {!user && (
            <li className="text-yellow-600 dark:text-yellow-400">• <strong>Sign in required:</strong> You'll be prompted to sign in when submitting feedback</li>
          )}
        </ul>
        {user && (
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              Troubleshooting: If feedback submission fails, you can check the GitHub configuration:
            </p>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/test-github-config', { credentials: 'include' });
                  const data = await response.json();
                  alert(JSON.stringify(data, null, 2));
                } catch (error) {
                  alert('Failed to check configuration: ' + error);
                }
              }}
              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
            >
              Test GitHub Config
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;