import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { habits, tasks, userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }

  const { action, suggestionId } = req.body;

  if (!action || !action.type) {
    return res.status(400).json({ error: "Invalid action provided" });
  }

  try {
    let result = "";

    switch (action.type) {
      case "suggest_habit_frequency_change":
        result = await handleHabitFrequencyChange(action.data, user.email);
        break;
      
      case "suggest_habit_schedule_change":
        result = await handleHabitScheduleChange(action.data, user.email);
        break;
      
      case "suggest_task_review":
        result = await handleTaskReview(action.data, user.email);
        break;
      
      case "suggest_meeting_note_workflow":
        result = await handleMeetingNoteWorkflow(action.data, user.email);
        break;
      
      case "suggest_wellness_break":
        result = await handleWellnessBreak(action.data, user.email);
        break;
      
      default:
        return res.status(400).json({ error: "Unknown action type" });
    }

    return res.status(200).json({ 
      success: true, 
      message: result,
      actionType: action.type 
    });

  } catch (error) {
    console.error("Error executing suggestion:", error);
    return res.status(500).json({ error: "Failed to execute suggestion" });
  }
}

async function handleHabitFrequencyChange(data: any, userId: string): Promise<string> {
  const { habitId, suggestedFrequency } = data;
  
  if (!habitId || !suggestedFrequency) {
    throw new Error("Missing habitId or suggestedFrequency");
  }

  // Update habit frequency
  await db.update(habits)
    .set({ 
      frequency: suggestedFrequency,
      updatedAt: new Date()
    })
    .where(eq(habits.id, habitId));

  return `✅ Habit frequency updated to ${suggestedFrequency}. This should help you build consistency!`;
}

async function handleHabitScheduleChange(data: any, userId: string): Promise<string> {
  const { habitId, suggestedDays } = data;
  
  if (!habitId || !suggestedDays) {
    throw new Error("Missing habitId or suggestedDays");
  }

  // Update habit schedule
  await db.update(habits)
    .set({ 
      customDays: suggestedDays,
      frequency: 'custom',
      updatedAt: new Date()
    })
    .where(eq(habits.id, habitId));

  return `✅ Habit schedule updated to ${suggestedDays.join(', ')}. You perform better on these days!`;
}

async function handleTaskReview(data: any, userId: string): Promise<string> {
  const { overdueCount } = data;
  
  // Create a reminder task for task review
  await db.insert(tasks).values({
    user_email: userId,
    text: `Review and prioritize ${overdueCount} overdue tasks`,
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // Due in 2 hours
    tags: ['priority', 'review'],
    source: 'assistant',
    done: false
  });

  return `📋 Created a priority review task to help you tackle your ${overdueCount} overdue items. Due in 2 hours.`;
}

async function handleMeetingNoteWorkflow(data: any, userId: string): Promise<string> {
  // Create a reminder task for setting up meeting note workflow
  await db.insert(tasks).values({
    user_email: userId,
    text: 'Set up meeting note-taking reminders and templates',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
    tags: ['workflow', 'meetings', 'productivity'],
    source: 'assistant',
    done: false
  });

  return `📝 Created a task to help you set up better meeting note workflows. Consistent note-taking improves follow-up!`;
}

async function handleWellnessBreak(data: any, userId: string): Promise<string> {
  const { negativeMoodCount } = data;
  
  // Create wellness break tasks
  const wellnessTasks = [
    'Take a 15-minute walk outside',
    'Practice 5 minutes of deep breathing',
    'Schedule 30 minutes of relaxation time'
  ];

  const randomTask = wellnessTasks[Math.floor(Math.random() * wellnessTasks.length)];
  
  await db.insert(tasks).values({
    user_email: userId,
    text: randomTask,
    dueDate: new Date(Date.now() + 60 * 60 * 1000), // Due in 1 hour
    tags: ['wellness', 'self-care'],
    source: 'assistant',
    done: false
  });

  return `🌿 Created a wellness task: "${randomTask}". Taking care of yourself is important after ${negativeMoodCount} tough days.`;
}