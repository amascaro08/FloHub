// Utility to sync localStorage quick notes to the database
export const syncQuickNotesToDatabase = async (userEmail: string) => {
  try {
    const localStorageKey = `quickNotes_${userEmail}`;
    const savedNotes = localStorage.getItem(localStorageKey);
    
    if (!savedNotes) {
      return { success: true, synced: 0 };
    }

    const notes = JSON.parse(savedNotes);
    if (!Array.isArray(notes) || notes.length === 0) {
      return { success: true, synced: 0 };
    }

    let syncedCount = 0;
    
    // Sync each note to the database
    for (const note of notes) {
      try {
        const response = await fetch('/api/notes/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: note.content.substring(0, 50) || 'Quick Note', // Use first 50 chars as title
            content: `<p>${note.content}</p>`, // Convert plain text to HTML
            tags: note.tags || [],
            source: 'quicknote',
          }),
        });

        if (response.ok) {
          syncedCount++;
        } else {
          console.error('Failed to sync note:', note.id, response.statusText);
        }
      } catch (error) {
        console.error('Error syncing individual note:', note.id, error);
      }
    }

    // Clear localStorage after successful sync
    if (syncedCount > 0) {
      localStorage.removeItem(localStorageKey);
    }

    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error('Error syncing quick notes:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Save a quick note to the database
export const saveQuickNoteToDatabase = async (content: string, tags: string[] = []) => {
  try {
    const response = await fetch('/api/notes/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: content.substring(0, 50) || 'Quick Note', // Use first 50 chars as title
        content: `<p>${content}</p>`, // Convert plain text to HTML
        tags: tags,
        source: 'quicknote',
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, noteId: result.noteId };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to save note' };
    }
  } catch (error) {
    console.error('Error saving quick note:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Update a quick note in the database
export const updateQuickNoteInDatabase = async (noteId: string, content: string, tags: string[] = []) => {
  try {
    const response = await fetch('/api/notes/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: noteId,
        title: content.substring(0, 50) || 'Quick Note',
        content: `<p>${content}</p>`,
        tags: tags,
        source: 'quicknote',
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to update note' };
    }
  } catch (error) {
    console.error('Error updating quick note:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Delete a quick note from the database
export const deleteQuickNoteFromDatabase = async (noteId: string) => {
  try {
    const response = await fetch('/api/notes/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [noteId] }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Failed to delete note' };
    }
  } catch (error) {
    console.error('Error deleting quick note:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};