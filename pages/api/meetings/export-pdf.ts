import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/neon';
import PdfPrinter from 'pdfmake'; // Example using pdfmake
import vfsFonts from 'pdfmake/build/vfs_fonts';

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

  try {
    // Fetch the selected meeting note from Firestore
    const { rows } = await query(
      `SELECT id, title, content, tags, "eventId", "eventTitle", "isAdhoc", actions, "createdAt" FROM meetings WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Meeting note not found' });
    }

    const meetingNote = {
      id: rows[0].id,
      title: rows[0].title,
      content: rows[0].content,
      tags: rows[0].tags,
      eventId: rows[0].eventId,
      eventTitle: rows[0].eventTitle,
      isAdhoc: rows[0].isAdhoc,
      actions: rows[0].actions,
      createdAt: new Date(Number(rows[0].createdAt)).toISOString()
    } as MeetingNote;

    // Implement PDF generation logic here using pdfmake
    const fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italics.ttf',
        bolditalics: 'Roboto-MediumItalics.ttf'
      }
    };

    const printer = new PdfPrinter(fonts); // Use the printer initialized with fonts

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
    content.push({ text: `Created: ${new Date(meetingNote.createdAt).toLocaleString()}`, style: 'date' });

    // Add Tags
    if (meetingNote.tags && meetingNote.tags.length > 0) {
        content.push({ text: `Tags: ${meetingNote.tags.join(', ')}`, style: 'tags' });
    }


    // Add Content/Minutes
    if (meetingNote.content) {
      content.push({ text: '\nMeeting Minutes:', style: 'heading' });
      content.push({ text: meetingNote.content, style: 'body' });
    }

    // Add Actions
    if (meetingNote.actions && meetingNote.actions.length > 0) {
      content.push({ text: '\nAction Items:', style: 'heading' });
      meetingNote.actions.forEach(action => {
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
        font: 'Roboto'
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