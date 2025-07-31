import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes } from "@/db/schema";
import { and, eq, or, inArray, isNotNull, desc } from "drizzle-orm";
import { retrieveContentFromStorage, prepareContentForStorage } from "@/lib/contentSecurity";
import type { Note, Action } from "@/types/app";

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

  // Update all meetings in this series to remove the series name
  await db
    .update(notes)
    .set({ meetingSeries: null })
    .where(
      and(
        eq(notes.user_email, userId),
        eq(notes.meetingSeries, prepareContentForStorage(seriesName))
      )
    );

  return res.status(200).json({ success: true });
}

async function getSeriesContext(
  req: NextApiRequest,
  res: NextApiResponse<MeetingSeriesResponse>,
  userId: string
) {
  const { seriesName, meetingIds } = req.query as GetSeriesContextRequest;

  let series;
  if (seriesName) {
    series = await generateSeriesContext(userId, seriesName);
  } else if (meetingIds) {
    const ids = Array.isArray(meetingIds) ? meetingIds : [meetingIds];
    series = await generateLinkedMeetingsContext(userId, ids);
  } else {
    return res.status(400).json({ 
      error: "Either seriesName or meetingIds must be provided" 
    });
  }

  return res.status(200).json({ success: true, series });
}

async function generateSeriesContext(userId: string, seriesName: string) {
  console.log('generateSeriesContext - userId:', userId, 'seriesName:', seriesName);
  const encryptedSeriesName = prepareContentForStorage(seriesName);
  console.log('Encrypted series name:', encryptedSeriesName);
  
  const meetings = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.user_email, userId),
        eq(notes.meetingSeries, encryptedSeriesName)
      )
    )
    .orderBy(desc(notes.createdAt));
    
  console.log('Found meetings:', meetings.length);

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

  return {
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
}

function generateContextSummary(meetings: Note[], pendingActions: Action[]): string {
  const totalMeetings = meetings.length;
  const totalActions = pendingActions.length;
  const dateRange = totalMeetings > 0 ? 
    `from ${new Date(meetings[0].createdAt).toLocaleDateString()} to ${new Date(meetings[meetings.length - 1].createdAt).toLocaleDateString()}` 
    : '';

  let summary = `This series contains ${totalMeetings} meeting${totalMeetings !== 1 ? 's' : ''} ${dateRange}.`;
  
  if (totalActions > 0) {
    summary += ` There are ${totalActions} outstanding action item${totalActions !== 1 ? 's' : ''} requiring attention.`;
  }

  // Add key themes if available
  const allSummaries = meetings
    .filter(m => m.aiSummary)
    .map(m => m.aiSummary!)
    .join(' ');
  
  if (allSummaries) {
    summary += ` The meetings have covered various topics and discussions as documented in the individual meeting summaries.`;
  }

  return summary;
}