import React, { useState } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { NextPage } from 'next';

const FeedbackPage: NextPage = () => {
  const { user, isLoading: isUserLoading } = useUser();
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [issueUrl, setIssueUrl] = useState('');

  // Handle loading state
  if (isUserLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4 text-[var(--fg)]">Submit Feedback</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            You must be signed in to submit feedback.
          </p>
        </div>
      </div>
    );
  }

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
        body: JSON.stringify({ 
          feedbackType, 
          feedbackText,
          tags: selectedTags
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage(data.message);
        setIssueUrl(data.issueUrl);
        setFeedbackText('');
        setSelectedTags([]);
        setFeedbackType('general');
      } else {
        setSubmitMessage(data.error || 'Failed to submit feedback.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitMessage('An error occurred while submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-[var(--fg)]">Submit Feedback</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Help us improve the app by sharing your feedback. Your submission will create a GitHub issue for tracking.
        </p>
      </div>

      {submitMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${
          submitMessage.includes('successfully') 
            ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
            : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
        }`}>
          <p className="font-medium">{submitMessage}</p>
          {issueUrl && (
            <a 
              href={issueUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              View on GitHub →
            </a>
          )}
        </div>
      )}

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

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Your feedback will be automatically converted into a GitHub issue</li>
          <li>• You'll receive a link to track the progress of your feedback</li>
          <li>• All feedback is reviewed and prioritized by the development team</li>
          <li>• You'll be notified when your issue is resolved</li>
        </ul>
      </div>
    </div>
  );
};

export default FeedbackPage;