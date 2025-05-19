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
        alert('Feedback submitted successfully!');
        setFeedbackText(''); // Clear the form
      } else {
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
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {feedbackData.map((feedback) => (
                  <tr key={feedback.id}>
                    <td>{feedback.feedbackType}</td>
                    <td>{feedback.feedbackText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="feedbackType">Feedback Type:</label>
            <select
              id="feedbackType"
              name="feedbackType"
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
            >
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="general">General Feedback</option>
            </select>
          </div>
          <div>
            <label htmlFor="feedbackText">Feedback:</label>
            <textarea
              id="feedbackText"
              name="feedbackText"
              rows={4}
              cols={50}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
          </div>
          <button type="submit">Submit</button>
        </form>
      </main>
    </div>
  );
};

export default FeedbackPage;