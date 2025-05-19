import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css'; // Import global styles
import { NextPage } from 'next';

interface Feedback {
  id: string;
  feedbackType: string;
  feedbackText: string;
}

const FeedbackPage: NextPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [feedbackType, setFeedbackType] = useState('bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);

  // Check if the user is an admin (replace with your actual admin check)
  const isAdmin = session?.user?.email === 'amascaro08@gmail.com';

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await fetch('/api/feedback');
        if (response.ok) {
          const data = await response.json();
          setFeedbackData(data);
        } else {
          console.error('Failed to fetch feedback:', response.status);
        }
      } catch (error) {
        console.error('Error fetching feedback:', error);
      }
    };

    if (isAdmin) {
      fetchFeedback();
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      } else {
        const errorData = await response.json();
        console.error('Failed to submit feedback:', errorData);
        alert('Failed to submit feedback.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('An error occurred while submitting feedback.');
    }
  };

  if (isAdmin) {
    // Render admin view
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>Admin Feedback</h1>
          {feedbackData.length > 0 ? (
            <div className="flex flex-col gap-4">
              {/* Bug Reports */}
              <section className="border rounded p-4">
                <h2 className="text-lg font-medium">Bug Reports</h2>
                {feedbackData
                  .filter((feedback) => feedback.feedbackType === 'bug')
                  .map((feedback) => (
                    <div key={feedback.id} className="mb-4 p-4 border rounded">
                      <p className="font-medium">Feedback: {feedback.feedbackText}</p>
                      {/* Add notes for tracking purposes */}
                      <textarea
                        className="w-full p-2 border rounded"
                        placeholder="Add notes here..."
                      />
                    </div>
                  ))}
              </section>

              {/* Feature Requests */}
              <section className="border rounded p-4">
                <h2 className="text-lg font-medium">Feature Requests</h2>
                {feedbackData
                  .filter((feedback) => feedback.feedbackType === 'feature')
                  .map((feedback) => (
                    <div key={feedback.id} className="mb-4 p-4 border rounded">
                      <p className="font-medium">Feedback: {feedback.feedbackText}</p>
                      {/* Add notes for tracking purposes */}
                      <textarea
                        className="w-full p-2 border rounded"
                        placeholder="Add notes here..."
                      />
                    </div>
                  ))}
              </section>

              {/* General Feedback */}
              <section className="border rounded p-4">
                <h2 className="text-lg font-medium">General Feedback</h2>
                {feedbackData
                  .filter((feedback) => feedback.feedbackType === 'general')
                  .map((feedback) => (
                    <div key={feedback.id} className="mb-4 p-4 border rounded">
                      <p className="font-medium">Feedback: {feedback.feedbackText}</p>
                      {/* Add notes for tracking purposes */}
                      <textarea
                        className="w-full p-2 border rounded"
                        placeholder="Add notes here..."
                      />
                    </div>
                  ))}
              </section>
            </div>
          ) : (
            <p>No feedback yet.</p>
          )}
        </main>
      </div>
    );
  }

  // Render user feedback form
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Submit Feedback</h1>
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
          <button type="submit" className="p-2 rounded bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors shadow-sm hover:shadow">Submit</button>
        </form>
      </main>
    </div>
  );
};

export default FeedbackPage;