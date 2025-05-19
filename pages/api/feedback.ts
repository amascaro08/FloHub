import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const feedbackFilePath = path.join(process.cwd(), 'data', 'feedback.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Read existing feedback
  let existingFeedback = [];
  try {
    if (fs.existsSync(feedbackFilePath)) {
      const fileContent = fs.readFileSync(feedbackFilePath, 'utf-8');
      existingFeedback = JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error reading feedback file:', error);
    // If there's an error reading the file, start with an empty array
    existingFeedback = [];
  }

  if (req.method === 'POST') {
    // Process the feedback data
    const { feedbackType, feedbackText } = req.body;

    const newFeedback = {
      id: new Date().toISOString(),
      feedbackType,
      feedbackText,
    };

    // Add the new feedback
    existingFeedback = [...existingFeedback, newFeedback];

    // Write the updated feedback to the file
    fs.writeFileSync(feedbackFilePath, JSON.stringify(existingFeedback, null, 2));

    console.log('Feedback received:', { feedbackType, feedbackText });

    res.status(200).json({ message: 'Feedback submitted successfully!' });
  } else if (req.method === 'GET') {

    res.status(200).json(existingFeedback);
  }
   else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}