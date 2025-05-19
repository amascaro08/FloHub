import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { NextPage } from 'next';
import { formatDistanceToNow } from 'date-fns';

interface Feedback {
  id: string;
  feedbackType: string;
  feedbackText: string;
  status: 'open' | 'resolved' | 'completed' | 'backlog';
  notes?: string;
  createdAt: { seconds: number; nanoseconds: number };
}

interface BacklogItem {
  id: string;
  text: string;
  originalId?: string;
  createdAt: { seconds: number; nanoseconds: number };
}

const FeedbackPage: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [feedbackType, setFeedbackType] = useState('bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [newBacklogItem, setNewBacklogItem] = useState('');
  const [notes, setNotes] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if the user is an admin (replace with your actual admin check)
  const isAdmin = session?.user?.email === 'amascaro08@gmail.com';

  // Fetch feedback and backlog data
  const fetchData = async () => {
    if (!isAdmin) return;
    
    setIsLoading(true);
    try {
      // Fetch feedback
      const feedbackResponse = await fetch('/api/feedback');
      if (feedbackResponse.ok) {
        const data = await feedbackResponse.json();
        // Initialize status field if it doesn't exist
        const processedData = data.map((item: any) => ({
          ...item,
          status: item.status || 'open'
        }));
        setFeedbackData(processedData);
        
        // Initialize notes state
        const notesObj: {[key: string]: string} = {};
        processedData.forEach((item: Feedback) => {
          notesObj[item.id] = item.notes || '';
        });
        setNotes(notesObj);
      } else {
        console.error('Failed to fetch feedback:', feedbackResponse.status);
      }
      
      // Fetch backlog items
      const backlogResponse = await fetch('/api/feedback?type=backlog');
      if (backlogResponse.ok) {
        const data = await backlogResponse.json();
        setBacklogItems(data);
      } else {
        console.error('Failed to fetch backlog items:', backlogResponse.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedbackType, feedbackText }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Feedback submitted successfully with ID: ${data.feedbackId}`);
        setFeedbackText(''); // Clear the form
        
        // Refresh data if admin
        if (isAdmin) {
          fetchData();
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to submit feedback:', errorData);
        alert('Failed to submit feedback.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('An error occurred while submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/feedback', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: feedbackId, 
          status: newStatus,
          notes: notes[feedbackId]
        }),
      });

      if (response.ok) {
        // Update local state
        setFeedbackData((prevData: Feedback[]) => 
          prevData.map((item: Feedback) => 
            item.id === feedbackId 
              ? { ...item, status: newStatus as 'open' | 'resolved' | 'completed' | 'backlog' } 
              : item
          )
        );
        
        // Refresh data to get updated backlog items
        if (newStatus === 'backlog') {
          fetchData();
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to update status:', errorData);
        alert('Failed to update status.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('An error occurred while updating status.');
    }
  };

  const handleNotesChange = (feedbackId: string, value: string) => {
    setNotes(prev => ({
      ...prev,
      [feedbackId]: value
    }));
  };

  const saveNotes = async (feedbackId: string) => {
    try {
      const feedback = feedbackData.find(f => f.id === feedbackId);
      if (!feedback) return;
      
      const response = await fetch('/api/feedback', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: feedbackId, 
          status: feedback.status,
          notes: notes[feedbackId]
        }),
      });

      if (response.ok) {
        // Update local state
        setFeedbackData((prevData: Feedback[]) => 
          prevData.map((item: Feedback) => 
            item.id === feedbackId 
              ? { ...item, notes: notes[feedbackId] } 
              : item
          )
        );
        alert('Notes saved successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to save notes:', errorData);
        alert('Failed to save notes.');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('An error occurred while saving notes.');
    }
  };

  const addToBacklog = async () => {
    if (!newBacklogItem.trim()) return;
    
    try {
      const response = await fetch('/api/feedback?type=backlog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newBacklogItem }),
      });

      if (response.ok) {
        // Clear input
        setNewBacklogItem('');
        
        // Refresh backlog data
        fetchData();
      } else {
        const errorData = await response.json();
        console.error('Failed to add to backlog:', errorData);
        alert('Failed to add to backlog.');
      }
    } catch (error) {
      console.error('Error adding to backlog:', error);
      alert('An error occurred while adding to backlog.');
    }
  };

  const getItemAge = (createdAt: { seconds: number; nanoseconds: number }) => {
    if (!createdAt) return 'Unknown';
    
    const date = new Date(createdAt.seconds * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (isAdmin) {
    // Render admin view
    return (
      <>
        <h1 className="text-2xl font-semibold mb-4">Admin Feedback</h1>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        ) : feedbackData.length > 0 ? (
          <div>
            <div className="flex justify-between p-4 border rounded mb-4">
              <div>
                <p>Open Bugs: {feedbackData.filter((f: Feedback) => f.feedbackType === 'bug' && f.status === 'open').length}</p>
                <p>Open Feature Requests: {feedbackData.filter((f: Feedback) => f.feedbackType === 'feature' && f.status === 'open').length}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <section className="border rounded p-4">
                <h2 className="text-lg font-medium mb-2">Bug Reports</h2>
                {feedbackData
                  .filter((feedback: Feedback) => feedback.feedbackType === 'bug')
                  .map((feedback: Feedback) => (
                    <div key={feedback.id} className="mb-4 p-4 border rounded">
                      <div className="flex justify-between">
                        <p className="font-medium">Feedback: {feedback.feedbackText}</p>
                        <p className="text-sm text-gray-500">Created {getItemAge(feedback.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <label htmlFor={`status-${feedback.id}`}>Status:</label>
                        <select
                          id={`status-${feedback.id}`}
                          value={feedback.status}
                          onChange={(e) => handleStatusChange(feedback.id, e.target.value)}
                          className="p-2 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          <option value="open">Open</option>
                          <option value="resolved">Resolved</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="mt-2">
                        <textarea
                          className="w-full p-2 border rounded border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          placeholder="Add notes here..."
                          value={notes[feedback.id] || ''}
                          onChange={(e) => handleNotesChange(feedback.id, e.target.value)}
                        />
                        <button 
                          className="p-2 rounded bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors shadow-sm hover:shadow mt-2"
                          onClick={() => saveNotes(feedback.id)}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  ))}
              </section>

              <section className="border rounded p-4">
                <h2 className="text-lg font-medium mb-2">Feature Requests</h2>
                {feedbackData
                  .filter((feedback: Feedback) => feedback.feedbackType === 'feature')
                  .map((feedback: Feedback) => (
                    <div key={feedback.id} className="mb-4 p-4 border rounded">
                      <div className="flex justify-between">
                        <p className="font-medium">Feedback: {feedback.feedbackText}</p>
                        <p className="text-sm text-gray-500">Created {getItemAge(feedback.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <label htmlFor={`status-${feedback.id}`}>Status:</label>
                        <select
                          id={`status-${feedback.id}`}
                          value={feedback.status}
                          onChange={(e) => handleStatusChange(feedback.id, e.target.value)}
                          className="p-2 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          <option value="open">Open</option>
                          <option value="resolved">Resolved</option>
                          <option value="completed">Completed</option>
                          <option value="backlog">Add to Backlog</option>
                        </select>
                      </div>
                      <div className="mt-2">
                        <textarea
                          className="w-full p-2 border rounded border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          placeholder="Add notes here..."
                          value={notes[feedback.id] || ''}
                          onChange={(e) => handleNotesChange(feedback.id, e.target.value)}
                        />
                        <button 
                          className="p-2 rounded bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors shadow-sm hover:shadow mt-2"
                          onClick={() => saveNotes(feedback.id)}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  ))}
              </section>

              <section className="border rounded p-4">
                <h2 className="text-lg font-medium mb-2">General Feedback</h2>
                {feedbackData
                  .filter((feedback: Feedback) => feedback.feedbackType === 'general')
                  .map((feedback: Feedback) => (
                    <div key={feedback.id} className="mb-4 p-4 border rounded">
                      <div className="flex justify-between">
                        <p className="font-medium">Feedback: {feedback.feedbackText}</p>
                        <p className="text-sm text-gray-500">Created {getItemAge(feedback.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <label htmlFor={`status-${feedback.id}`}>Status:</label>
                        <select
                          id={`status-${feedback.id}`}
                          value={feedback.status}
                          onChange={(e) => handleStatusChange(feedback.id, e.target.value)}
                          className="p-2 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          <option value="open">Open</option>
                          <option value="resolved">Resolved</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="mt-2">
                        <textarea
                          className="w-full p-2 border rounded border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          placeholder="Add notes here..."
                          value={notes[feedback.id] || ''}
                          onChange={(e) => handleNotesChange(feedback.id, e.target.value)}
                        />
                        <button 
                          className="p-2 rounded bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors shadow-sm hover:shadow mt-2"
                          onClick={() => saveNotes(feedback.id)}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  ))}
              </section>

              <section className="border rounded p-4">
                <h2 className="text-lg font-medium mb-2">Feature Request Backlog</h2>
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 p-2 border rounded border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    placeholder="Add a new feature request to the backlog..."
                    value={newBacklogItem}
                    onChange={(e) => setNewBacklogItem(e.target.value)}
                  />
                  <button 
                    className="p-2 rounded bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors shadow-sm hover:shadow"
                    onClick={addToBacklog}
                  >
                    Add to Backlog
                  </button>
                </div>
                
                {backlogItems.length > 0 ? (
                  <div className="mt-4">
                    {backlogItems.map((item: BacklogItem) => (
                      <div key={item.id} className="p-2 border-b">
                        <div className="flex justify-between">
                          <p>{item.text}</p>
                          <p className="text-sm text-gray-500">Added {getItemAge(item.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2">No backlog items yet.</p>
                )}
              </section>
            </div>
          </div>
        ) : (
          <p>No feedback yet.</p>
        )}
      </>
    );
  }

  // Render user feedback form
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Submit Feedback</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col">
          <label htmlFor="feedbackType" className="mb-1">Feedback Type:</label>
          <select
            id="feedbackType"
            name="feedbackType"
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value)}
            className="p-2 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
          >
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="general">General Feedback</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="feedbackText" className="mb-1">Feedback:</label>
          <textarea
            id="feedbackText"
            name="feedbackText"
            rows={4}
            cols={50}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="p-2 rounded border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm hover:shadow bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
          />
        </div>
        <button 
          type="submit" 
          className="p-2 rounded bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors shadow-sm hover:shadow"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </>
  );
};

export default FeedbackPage;