import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes as notesTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
// You might need a PDF generation library here, e.g., 'pdfmake' or 'html-pdf'
// import PdfPrinter from 'pdfmake'; // Example using pdfmake

// Ensure Firebase Admin is initialized (assuming it's initialized elsewhere, e.g., in lib/firebaseAdmin.ts)
// If not, uncomment the initialization block below:
/*
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}
*/


interface Note {
  id: string;
  title?: string;
  content?: string;
  // Add other potential note properties here if needed
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ message: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ message: "User not found" });
  }
  const user_email = user.email;

  const { ids } = req.body; // Expecting an array of note IDs

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'An array of Note IDs is required' });
  }

  try {
    // Fetch the selected notes from Firestore
    const notesData = await db.select().from(notesTable).where(and(inArray(notesTable.id, ids), eq(notesTable.user_email, user_email)));
    const notes: Note[] = notesData.map(row => ({ id: String(row.id), title: row.title || undefined, content: row.content || undefined }));

    if (notes.length === 0) {
      return res.status(404).json({ message: 'No notes found for the provided IDs' });
    }

    // Implement PDF generation logic here using pdfmake
    const PdfPrinter = require('pdfmake');
    const vfsFonts = require('pdfmake/build/vfs_fonts');

    const printer = new PdfPrinter(vfsFonts.pdfMake.vfs);

    const fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      }
    };

    const printerWithFonts = new PdfPrinter(fonts);

    const documentDefinition = {
      content: notes.map(note => ({
        text: `${note.title || 'Untitled Note'}\n\n${note.content}\n\n---\n\n`,
        style: 'noteStyle'
      })),
      styles: {
        noteStyle: {
          fontSize: 12,
          margin: [0, 0, 0, 12] // bottom margin
        }
      }
    };

    const pdfDoc = printerWithFonts.createPdfKitDocument(documentDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="exported_notes.pdf"');
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    console.error('Error exporting notes:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : 'An unknown error occurred' });
  }
}