import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';
import { notes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import PdfPrinter from 'pdfmake';
const vfsFonts = require('pdfmake/build/vfs_fonts');
import { Action } from '@/types/app';

interface MeetingNote {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  eventId?: string;
  eventTitle?: string;
  isAdhoc?: boolean;
  actions?: {
    id: string;
    description: string;
    assignedTo: string;
    status: "todo" | "done";
    createdAt: string;
  }[];
  createdAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id } = req.body; // Expecting a single meeting note ID

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'A Meeting Note ID is required' });
  }

  // Authenticate user
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ message: "Not signed in" });
  }

  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ message: "User not found" });
  }

  try {
    // Fetch the selected meeting note from the notes table
    const [meetingNote] = await db.select().from(notes).where(eq(notes.id, Number(id)));

    if (!meetingNote) {
      return res.status(404).json({ message: 'Meeting note not found' });
    }

    // Implement PDF generation logic here using pdfmake with built-in fonts
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    
    const printer = new PdfPrinter(fonts);

    const content: any[] = [];

    // Add Title
    content.push({ text: meetingNote.title || 'Untitled Meeting Note', style: 'title' });

    // Add Event Details if available
    if (meetingNote.eventTitle) {
      content.push({ text: `Associated Event: ${meetingNote.eventTitle}`, style: 'subtitle' });
    } else if (meetingNote.isAdhoc) {
      content.push({ text: 'Ad-hoc Meeting', style: 'subtitle' });
    }

    // Add Creation Date
    content.push({ text: `Created: ${new Date(meetingNote.createdAt!).toLocaleString()}`, style: 'date' });

    // Add Tags
    if (meetingNote.tags && (meetingNote.tags as string[]).length > 0) {
        content.push({ text: `Tags: ${(meetingNote.tags as string[]).join(', ')}`, style: 'tags' });
    }

    // Add Agenda
    if (meetingNote.agenda) {
      content.push({ text: '\nAgenda:', style: 'heading' });
      content.push({ text: meetingNote.agenda, style: 'body' });
    }

    // Add Content/Minutes
    if (meetingNote.content) {
      content.push({ text: '\nMeeting Minutes:', style: 'heading' });
      content.push({ text: meetingNote.content.replace(/<[^>]*>/g, ''), style: 'body' });
    }

    // Add AI Summary
    if (meetingNote.aiSummary) {
      content.push({ text: '\nAI Summary:', style: 'heading' });
      content.push({ text: meetingNote.aiSummary, style: 'body' });
    }

    // Add Actions
    if (meetingNote.actions && (meetingNote.actions as Action[]).length > 0) {
      content.push({ text: '\nAction Items:', style: 'heading' });
      (meetingNote.actions as Action[]).forEach(action => {
        content.push({
          text: `- [${action.status === 'done' ? 'x' : ' '}] ${action.description} (Assigned to: ${action.assignedTo})`,
          style: 'actionItem'
        });
      });
    }


    const documentDefinition = {
      content: content,
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 8] as [number, number, number, number]
        },
        subtitle: {
          fontSize: 14,
          margin: [0, 0, 0, 4] as [number, number, number, number]
        },
        date: {
            fontSize: 10,
            color: '#666',
            margin: [0, 0, 0, 12] as [number, number, number, number]
        },
        tags: {
            fontSize: 10,
            color: '#666',
            margin: [0, 0, 0, 12] as [number, number, number, number]
        },
        heading: {
          fontSize: 14,
          bold: true,
          margin: [0, 12, 0, 4] as [number, number, number, number]
        },
        body: {
          fontSize: 12,
          margin: [0, 0, 0, 12] as [number, number, number, number]
        },
        actionItem: {
          fontSize: 11,
          margin: [0, 0, 0, 4] as [number, number, number, number]
        }
      },
      defaultStyle: {
        font: 'Helvetica'
      }
    };

    const pdfDoc = printer.createPdfKitDocument(documentDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${meetingNote.title || 'Meeting Note'}_${meetingNote.id}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error('Error exporting meeting note:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
}