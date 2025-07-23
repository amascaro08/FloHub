import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
// import { SmartAIAssistant } from "@/lib/aiAssistant";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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

  try {
    // TODO: Re-enable smart features after testing basic functionality
    return res.status(200).json({ 
      suggestions: [],
      insights: {
        taskPatterns: {
          completionRate: 75,
          overdueTasks: 2,
          commonTags: ["work", "personal"],
          preferredDays: ["Monday", "Tuesday"]
        },
        habitPatterns: {
          strugglingHabits: [],
          successfulHabits: [],
          consistencyScores: {}
        },
        timePatterns: {
          mostActiveHours: [9, 14],
          mostProductiveDay: "Tuesday"
        },
        productivity: {
          tasksPerDay: 3.5,
          goalAchievementRate: 80
        }
      }
    });
    
    /*
    const smartAssistant = new SmartAIAssistant(user.email);
    
    // Load user context and analyze patterns
    await smartAssistant.loadUserContext();
    const patterns = await smartAssistant.analyzeUserPatterns();
    const suggestions = await smartAssistant.generateProactiveSuggestions();

    // Format the response for the frontend
    const smartSummary = {
      suggestions: suggestions.slice(0, 5), // Top 5 suggestions
      insights: {
        taskPatterns: {
          completionRate: patterns.taskPatterns.completionRate,
          overdueTasks: patterns.taskPatterns.overdueTasks,
          commonTags: patterns.taskPatterns.commonTags,
          preferredDays: patterns.taskPatterns.preferredDays
        },
        habitPatterns: {
          strugglingHabits: patterns.habitPatterns.strugglingHabits,
          successfulHabits: patterns.habitPatterns.successfulHabits,
          consistencyScores: patterns.habitPatterns.consistencyScores
        },
        timePatterns: {
          mostActiveHours: patterns.timePatterns.mostActiveHours,
          mostProductiveDay: patterns.timePatterns.mostProductiveDay
        },
        productivity: {
          tasksPerDay: patterns.productivityPatterns.tasksPerDay,
          goalAchievementRate: patterns.productivityPatterns.goalAchievementRate
        }
      }
    };

    return res.status(200).json(smartSummary);
    */
  } catch (error) {
    console.error("Error generating smart summary:", error);
    return res.status(500).json({ error: "Failed to generate smart summary" });
  }
}