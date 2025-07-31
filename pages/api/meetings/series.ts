import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes } from "@/db/schema";
import { and, eq, or, inArray, isNotNull, desc } from "drizzle-orm";
import { retrieveContentFromStorage, prepareContentForStorage } from "@/lib/contentSecurity";
import type { Note, Action } from "@/types/app";
import OpenAI from "openai";

export type CreateMeetingSeriesRequest = {
  seriesName: string;
  meetingIds: string[];
};

export type LinkMeetingsRequest = {
  meetingIds: string[];
};

export type AddToSeriesRequest = {
  seriesName: string;
  meetingIds: string[];
};

export type DeleteSeriesRequest = {
  seriesName: string;
};

export type GetSeriesContextRequest = {
  seriesName?: string;
  meetingIds?: string[];
};

export type MeetingSeriesResponse = {
  success?: boolean;
  error?: string;
  series?: {
    name: string;
    meetings: Note[];
    summary: {
      totalMeetings: number;
      dateRange: {
        earliest: string;
        latest: string;
      };
      pendingActions: Action[];
      keyTopics: string[];
      decisions: string[];
      contextSummary: string;
    };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MeetingSeriesResponse>
) {
  // Authenticate via JWT
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const userId = user.email;

  try {
    switch (req.method) {
      case "POST":
        return await createMeetingSeries(req, res, userId);
      case "PUT":
        return await linkMeetings(req, res, userId);
      case "PATCH":
        return await addToExistingSeries(req, res, userId);
      case "DELETE":
        return await deleteSeries(req, res, userId);
      case "GET":
        return await getSeriesContext(req, res, userId);
      default:
        res.setHeader("Allow", "POST, PUT, PATCH, DELETE, GET");
        return res.status(405).json({ error: "Method Not Allowed" });
    }
  } catch (err: any) {
    console.error("Meeting series API error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

async function createMeetingSeries(
  req: NextApiRequest,
  res: NextApiResponse<MeetingSeriesResponse>,
  userId: string
) {
  const { seriesName, meetingIds } = req.body as CreateMeetingSeriesRequest;

  if (!seriesName || !meetingIds || meetingIds.length < 2) {
    return res.status(400).json({ 
      error: "Series name and at least 2 meeting IDs are required" 
    });
  }

  // Verify all meetings belong to the user
  const meetings = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_email, userId),
        inArray(notes.id, meetingIds.map(id => Number(id)))
      )
    );

  if (meetings.length !== meetingIds.length) {
    return res.status(404).json({ error: "Some meetings not found" });
  }

  // Update all meetings with the series name (encrypted)
  await db
    .update(notes)
    .set({ meetingSeries: prepareContentForStorage(seriesName) })
    .where(
      and(
        eq(notes.user_email, userId),
        inArray(notes.id, meetingIds.map(id => Number(id)))
      )
    );

  // Get the updated meetings and generate context
  const series = await generateSeriesContext(userId, seriesName);

  return res.status(200).json({ success: true, series });
}

async function linkMeetings(
  req: NextApiRequest,
  res: NextApiResponse<MeetingSeriesResponse>,
  userId: string
) {
  const { meetingIds } = req.body as LinkMeetingsRequest;

  if (!meetingIds || meetingIds.length < 2) {
    return res.status(400).json({ 
      error: "At least 2 meeting IDs are required for linking" 
    });
  }

  // Verify all meetings belong to the user
  const meetings = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_email, userId),
        inArray(notes.id, meetingIds.map(id => Number(id)))
      )
    );

  if (meetings.length !== meetingIds.length) {
    return res.status(404).json({ error: "Some meetings not found" });
  }

  // Update each meeting to link to all other meetings in the group
  for (const meetingId of meetingIds) {
    const otherMeetingIds = meetingIds.filter(id => id !== meetingId);
    await db
      .update(notes)
      .set({ linkedMeetingIds: otherMeetingIds })
      .where(
        and(
          eq(notes.user_email, userId),
          eq(notes.id, Number(meetingId))
        )
      );
  }

  // Generate context for the linked meetings
  const series = await generateLinkedMeetingsContext(userId, meetingIds);

  return res.status(200).json({ success: true, series });
}

async function addToExistingSeries(
  req: NextApiRequest,
  res: NextApiResponse<MeetingSeriesResponse>,
  userId: string
) {
  const { seriesName, meetingIds } = req.body as AddToSeriesRequest;

  if (!seriesName || !meetingIds || meetingIds.length === 0) {
    return res.status(400).json({ 
      error: "Series name and at least 1 meeting ID are required" 
    });
  }

  // Verify all meetings belong to the user
  const meetings = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_email, userId),
        inArray(notes.id, meetingIds.map(id => Number(id)))
      )
    );

  if (meetings.length !== meetingIds.length) {
    return res.status(404).json({ error: "Some meetings not found" });
  }

  // Update all meetings with the series name (encrypted)
  await db
    .update(notes)
    .set({ meetingSeries: prepareContentForStorage(seriesName) })
    .where(
      and(
        eq(notes.user_email, userId),
        inArray(notes.id, meetingIds.map(id => Number(id)))
      )
    );

  // Get the updated series context
  const series = await generateSeriesContext(userId, seriesName);

  return res.status(200).json({ success: true, series });
}

async function deleteSeries(
  req: NextApiRequest,
  res: NextApiResponse<MeetingSeriesResponse>,
  userId: string
) {
  const { seriesName } = req.body as DeleteSeriesRequest;

  if (!seriesName) {
    return res.status(400).json({ 
      error: "Series name is required" 
    });
  }

  // Find all meetings in this series first
  const allMeetingsWithSeries = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_email, userId),
        isNotNull(notes.meetingSeries)
      )
    );
    
  const meetingsToUpdate = allMeetingsWithSeries.filter(meeting => {
    if (!meeting.meetingSeries) return false;
    try {
      const decryptedSeries = retrieveContentFromStorage(meeting.meetingSeries);
      return decryptedSeries === seriesName;
    } catch (e) {
      return false;
    }
  });
  
  console.log('Found meetings to remove from series:', meetingsToUpdate.length);
  
  // Update all meetings in this series to remove the series name
  if (meetingsToUpdate.length > 0) {
    const meetingIds = meetingsToUpdate.map(m => m.id);
    await db
      .update(notes)
      .set({ meetingSeries: null })
      .where(
        and(
          eq(notes.user_email, userId),
          inArray(notes.id, meetingIds)
        )
      );
  }

  return res.status(200).json({ success: true });
}

async function getSeriesContext(
  req: NextApiRequest,
  res: NextApiResponse<MeetingSeriesResponse>,
  userId: string
) {
  const { seriesName, meetingIds } = req.query as GetSeriesContextRequest;
  console.log('getSeriesContext - query params:', { seriesName, meetingIds });

  let series;
  if (seriesName) {
    console.log('Getting series context for name:', seriesName);
    series = await generateSeriesContext(userId, seriesName);
  } else if (meetingIds) {
    const ids = Array.isArray(meetingIds) ? meetingIds : [meetingIds];
    console.log('Getting series context for meeting IDs:', ids);
    series = await generateLinkedMeetingsContext(userId, ids);
  } else {
    return res.status(400).json({ 
      error: "Either seriesName or meetingIds must be provided" 
    });
  }

  console.log('Returning series data:', series);
  return res.status(200).json({ success: true, series });
}

async function generateSeriesContext(userId: string, seriesName: string) {
  console.log('generateSeriesContext - userId:', userId, 'seriesName:', seriesName);
  const encryptedSeriesName = prepareContentForStorage(seriesName);
  console.log('Encrypted series name:', encryptedSeriesName);
  
  // Let's also check what meeting_series values exist in the database
  const allUserMeetings = await db
    .select()
    .from(notes)
    .where(eq(notes.user_email, userId));
  
  console.log('All user meetings count:', allUserMeetings.length);
  const meetingsWithSeries = allUserMeetings.filter(m => m.meetingSeries);
  console.log('Meetings with series count:', meetingsWithSeries.length);
  meetingsWithSeries.forEach((m, i) => {
    console.log(`Meeting ${i + 1} series (encrypted):`, m.meetingSeries);
    try {
      const decrypted = retrieveContentFromStorage(m.meetingSeries || "");
      console.log(`Meeting ${i + 1} series (decrypted):`, decrypted);
    } catch (e) {
      console.log(`Meeting ${i + 1} series (decryption failed):`, e);
    }
  });
  
  // Instead of matching encrypted values, let's get all meetings with series and filter by decrypted name
  const allMeetingsWithSeries = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_email, userId),
        isNotNull(notes.meetingSeries)
      )
    )
    .orderBy(desc(notes.createdAt));
    
  console.log('All meetings with series:', allMeetingsWithSeries.length);
  
  // Filter by decrypted series name
  const meetings = allMeetingsWithSeries.filter(meeting => {
    if (!meeting.meetingSeries) return false;
    try {
      const decryptedSeries = retrieveContentFromStorage(meeting.meetingSeries);
      console.log('Comparing:', decryptedSeries, 'with:', seriesName);
      return decryptedSeries === seriesName;
    } catch (e) {
      console.log('Error decrypting series name:', e);
      return false;
    }
  });
    
  console.log('Found meetings for series "' + seriesName + '":', meetings.length);

  return await buildSeriesContext(meetings, seriesName);
}

async function generateLinkedMeetingsContext(userId: string, meetingIds: string[]) {
  const meetings = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_email, userId),
        inArray(notes.id, meetingIds.map(id => Number(id)))
      )
    )
    .orderBy(desc(notes.createdAt));

  return await buildSeriesContext(meetings, `Linked Series (${meetingIds[0].slice(0, 8)})`);
}

async function buildSeriesContext(meetingRows: any[], seriesName: string) {
  console.log('buildSeriesContext - input rows:', meetingRows.length);
  console.log('buildSeriesContext - seriesName:', seriesName);
  
  const meetings: Note[] = meetingRows.map((row) => ({
    id: String(row.id),
    title: retrieveContentFromStorage(row.title || ""),
    content: retrieveContentFromStorage(row.content),
    tags: (row.tags as string[]) || [],
    createdAt: new Date(row.createdAt!).toISOString(),
    eventId: row.eventId || undefined,
    eventTitle: row.eventTitle || undefined,
    isAdhoc: row.isAdhoc || undefined,
    actions: (row.actions as Action[]) || [],
    agenda: retrieveContentFromStorage(row.agenda || ""),
    aiSummary: retrieveContentFromStorage(row.aiSummary || ""),
    meetingSeries: row.meetingSeries ? retrieveContentFromStorage(row.meetingSeries) : undefined,
    linkedMeetingIds: (row.linkedMeetingIds as string[]) || undefined,
  }));

  // Sort by date for proper chronological order
  meetings.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Extract all pending actions across meetings
  const pendingActions: Action[] = [];
  meetings.forEach(meeting => {
    if (meeting.actions) {
      meeting.actions
        .filter(action => action.status !== "done")
        .forEach(action => pendingActions.push(action));
    }
  });

  // Extract key topics from titles and AI summaries
  const keyTopics: string[] = [];
  const decisions: string[] = [];
  
  meetings.forEach(meeting => {
    // Extract topics from tags
    if (meeting.tags) {
      keyTopics.push(...meeting.tags);
    }
    
    // Extract decisions from AI summaries (simple keyword detection)
    if (meeting.aiSummary) {
      const summary = meeting.aiSummary.toLowerCase();
      if (summary.includes('decided') || summary.includes('decision') || summary.includes('agreed')) {
        decisions.push(meeting.aiSummary);
      }
    }
  });

  // Remove duplicates and limit
  const uniqueTopics = Array.from(new Set(keyTopics)).slice(0, 10);

  // Generate context summary
  const contextSummary = generateContextSummary(meetings, pendingActions);

  const result = {
    name: seriesName,
    meetings,
    summary: {
      totalMeetings: meetings.length,
      dateRange: {
        earliest: meetings[0]?.createdAt || "",
        latest: meetings[meetings.length - 1]?.createdAt || "",
      },
      pendingActions,
      keyTopics: uniqueTopics,
      decisions,
      contextSummary,
    },
  };
  
  console.log('buildSeriesContext - result:', JSON.stringify(result, null, 2));
  
  return result;
}

function generateContextSummary(meetings: Note[], pendingActions: Action[]): string {
  const totalMeetings = meetings.length;
  const totalActions = pendingActions.length;
  const dateRange = totalMeetings > 0 ? 
    `from ${new Date(meetings[0].createdAt).toLocaleDateString()} to ${new Date(meetings[meetings.length - 1].createdAt).toLocaleDateString()}` 
    : '';

  // Analyze meeting patterns and extract insights
  const insights = analyzeMeetingPatterns(meetings, pendingActions);
  
  let summary = `This ${totalMeetings}-meeting series ${dateRange} shows ${insights.trend}. `;
  
  if (totalActions > 0) {
    const urgentActions = pendingActions.filter(action => 
      action.dueDate && new Date(action.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
    
    if (urgentActions.length > 0) {
      summary += `⚠️ ${urgentActions.length} action${urgentActions.length !== 1 ? 's' : ''} require immediate attention. `;
    }
    
    summary += `${totalActions} total outstanding action${totalActions !== 1 ? 's' : ''} pending completion. `;
  }

  // Add specific insights
  if (insights.keyFindings.length > 0) {
    summary += `Key focus areas: ${insights.keyFindings.join(', ')}. `;
  }

  // Add actionable next steps
  if (insights.recommendations.length > 0) {
    summary += `Next steps: ${insights.recommendations.join(', ')}.`;
  }

  return summary;
}

function analyzeMeetingPatterns(meetings: Note[], pendingActions: Action[]) {
  const insights = {
    trend: 'consistent progress',
    keyFindings: [] as string[],
    recommendations: [] as string[]
  };

  // Analyze meeting frequency
  if (meetings.length >= 3) {
    const sortedMeetings = meetings.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const timeSpans = [];
    for (let i = 1; i < sortedMeetings.length; i++) {
      const days = Math.abs(new Date(sortedMeetings[i].createdAt).getTime() - new Date(sortedMeetings[i-1].createdAt).getTime()) / (1000 * 60 * 60 * 24);
      timeSpans.push(days);
    }
    const avgDays = timeSpans.reduce((a, b) => a + b, 0) / timeSpans.length;
    
    if (avgDays <= 7) {
      insights.trend = 'active development with frequent check-ins';
    } else if (avgDays <= 14) {
      insights.trend = 'regular bi-weekly progress';
    } else {
      insights.trend = 'periodic strategic reviews';
    }
  }

  // Analyze action completion patterns
  const allActions = meetings.flatMap(m => m.actions || []);
  const completedActions = allActions.filter(a => a.status === 'done').length;
  const totalHistoricalActions = allActions.length;
  
  if (totalHistoricalActions > 0) {
    const completionRate = completedActions / totalHistoricalActions;
    if (completionRate < 0.5) {
      insights.keyFindings.push('low action completion rate');
      insights.recommendations.push('review action ownership and feasibility');
    } else if (completionRate > 0.8) {
      insights.keyFindings.push('high execution effectiveness');
    }
  }

  // Analyze content themes
  const allContent = meetings.map(m => `${m.title || ''} ${m.content} ${m.aiSummary || ''}`).join(' ').toLowerCase();
  
  const themes = {
    'project planning': /plan|roadmap|timeline|milestone|deliverable/g,
    'issue resolution': /issue|problem|bug|fix|resolve|troubleshoot/g,
    'team coordination': /team|collaboration|coordination|sync|alignment/g,
    'progress review': /progress|status|update|review|completed/g,
    'decision making': /decide|decision|approve|consensus|agreement/g,
    'strategy': /strategy|vision|direction|goal|objective/g
  };

  const detectedThemes = [];
  for (const [theme, pattern] of Object.entries(themes)) {
    const matches = allContent.match(pattern);
    if (matches && matches.length >= 3) {
      detectedThemes.push(theme);
    }
  }

  if (detectedThemes.length > 0) {
    insights.keyFindings.push(...detectedThemes.slice(0, 2));
  }

  // Generate recommendations based on patterns
  if (pendingActions.length > totalHistoricalActions * 0.3) {
    insights.recommendations.push('consolidate action items to prevent overwhelm');
  }

  if (meetings.length >= 5 && detectedThemes.includes('issue resolution')) {
    insights.recommendations.push('consider root cause analysis to prevent recurring issues');
  }

  if (pendingActions.some(a => !a.assignedTo || a.assignedTo === '')) {
    insights.recommendations.push('ensure all actions have clear ownership');
  }

  return insights;
}