import React, { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import FeedbackList from '@/components/FeedbackList';
import FeedbackDetails from '@/components/FeedbackDetails';
import { 
  PlusIcon, 
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle feedback selection from list
  const handleFeedbackSelect = (feedback: any) => {
    setSelectedFeedback(feedback);
    // Don't change the tab, keep user on 'history' tab
  };

  // Handle back to list
  const handleBackToList = () => {
    setSelectedFeedback(null);
    setActiveTab('history'); // Ensure we're on the history tab
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback Center</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Submit new feedback or track your existing submissions and their progress.
            </p>
          </div>
        </div>
        
        {!user && !isUserLoading && (
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Sign in required
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You need to be signed in to submit feedback. You'll be prompted to log in when you submit.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        {selectedFeedback ? (
          <div className="flex items-center mb-6">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm transition-colors"
            >
              ← Back to Your Feedback
            </button>
          </div>
        ) : (
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8 shadow-md">
            <button
              onClick={() => {
                setActiveTab('submit');
                setSelectedFeedback(null);
              }}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'submit'
                  ? 'bg-soft-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-lg'
                  : 'text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Submit Feedback</span>
              <span className="sm:hidden">Submit</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setSelectedFeedback(null);
              }}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === 'history'
                  ? 'bg-soft-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-lg'
                  : 'text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Your Feedback</span>
              <span className="sm:hidden">History</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {showSuccess && submitMessage && (
        <div className="mb-8 p-6 rounded-2xl border bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Feedback Submitted Successfully!</h3>
              <p className="text-sm">{submitMessage}</p>
              {issueUrl && (
                <div className="mt-3">
                  <a 
                    href={issueUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
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
        <div className="mb-8 p-6 rounded-2xl border bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Submission Failed</h3>
              <p className="text-sm">{submitMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {selectedFeedback ? (
            <FeedbackDetails 
              feedback={selectedFeedback} 
              onBack={handleBackToList}
            />
          ) : activeTab === 'submit' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Submit New Feedback
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Help us improve FlowHub by sharing your thoughts, reporting bugs, or suggesting features.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Feedback Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    What type of feedback do you have?
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feedbackTypes.map((type) => (
                      <div
                        key={type.value}
                        className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          feedbackType === type.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
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
                        <div className="font-medium text-sm mb-2">{type.label}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{type.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback Text */}
                <div>
                  <label htmlFor="feedbackText" className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  />
                </div>

                {/* Tags Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Tags (optional)
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
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
                          className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${
                            selectedTags.includes(tag)
                              ? 'bg-primary-100 border-primary-300 text-primary-800 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200'
                              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Tag Input */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      placeholder="Add custom tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      disabled={!customTag.trim()}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add
                    </button>
                  </div>

                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Selected tags:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded-lg dark:bg-primary-900/30 dark:text-primary-200"
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
                    className="w-full md:w-auto px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
              <FeedbackList onSelectFeedback={handleFeedbackSelect} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How it works */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              How it works
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-3">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                Your feedback will be automatically converted into a GitHub issue
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                You'll receive a link to track the progress of your feedback
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                All feedback is reviewed and prioritized by the development team
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                You'll be notified when your issue is resolved
              </li>
              {!user && (
                <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <strong>Sign in required:</strong> You'll be prompted to sign in when submitting feedback
                </li>
              )}
            </ul>
            
            {user && (
              <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
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
                  className="text-xs px-3 py-2 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors font-medium"
                >
                  Test GitHub Config
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;