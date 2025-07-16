// pages/dashboard/meetings.tsx
"use client";

import { useState, useMemo, useEffect } from "react";

import useSWR from "swr";
import { useRouter } from "next/navigation";
// Import types
import type { Note, UserSettings, Action } from "@/types/app"; // Import Note, UserSettings, and Action types
import type { CalendarEvent, CalendarSettings } from "@/types/calendar"; // Import CalendarEvent and CalendarSettings types
import { parseISO } from 'date-fns'; // Import parseISO
// Import meeting notes components
import AddMeetingNoteModal from "@/components/meetings/AddMeetingNoteModal";
import MeetingNoteList from "@/components/meetings/MeetingNoteList";
import MeetingNoteDetail from "@/components/meetings/MeetingNoteDetail";
import { useUser } from "@/lib/hooks/useUser";

// Define the response type for fetching meeting notes (will create this API later)
type GetMeetingNotesResponse = {
  meetingNotes: Note[];
};

// Generic fetcher for SWR
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Fetcher specifically for calendar events API
const calendarEventsFetcher = async (url: string): Promise<CalendarEvent[]> => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error loading events');
  return data;
};

export default function MeetingsPage() {
   const { user, isLoading } = useUser();
  const status = user ? "authenticated" : "unauthenticated";

  const router = useRouter();

  if (!user) {
    return <div>Loading...</div>; // Or any other fallback UI
  }







  const shouldFetch = status === "authenticated";

  // Calculate time range for fetching events (e.g., next month)
  const timeRange = useMemo(() => {
    const now = new Date();
    const timeMin = now.toISOString();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);
    const timeMax = nextMonth.toISOString();
    return { timeMin, timeMax };
  }, []);

  // Fetch user settings to get global tags and Work Calendar URL
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't revalidate on window focus
      dedupingInterval: 60000 // Dedupe requests within 1 minute 
    }
  );

  // Build API URL for calendar events, including o365Url from settings
  const apiUrl = useMemo(() => {
    if (!shouldFetch || !timeRange || !userSettings?.powerAutomateUrl) return null;
    return `/api/calendar?timeMin=${encodeURIComponent(timeRange.timeMin)}&timeMax=${encodeURIComponent(
      timeRange.timeMax
    )}&o365Url=${encodeURIComponent(userSettings.powerAutomateUrl)}`;
  }, [shouldFetch, timeRange, userSettings?.powerAutomateUrl]);

  // Fetch meeting notes and calendar events in parallel
  const { data: meetingNotesResponse, error: meetingNotesError, mutate } = useSWR<GetMeetingNotesResponse>(
    shouldFetch ? "/api/meetings" : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't revalidate on window focus
      dedupingInterval: 30000 // Dedupe requests within 30 seconds
    }
  );

  // Fetch calendar events using the combined API endpoint
  const { data: calendarEvents, error: calendarError } = useSWR<CalendarEvent[]>(
    apiUrl,
    calendarEventsFetcher,
    {
      revalidateOnFocus: false, // Don't revalidate on window focus
      dedupingInterval: 60000 // Dedupe requests within 1 minute
    }
  );

  // Filter fetched events to include only "work" events
  const workCalendarEvents = useMemo(() => {
    return calendarEvents?.filter(event => event.source === 'work') || [];
  }, [calendarEvents]);

  // Log the fetched data and errors for debugging
  useEffect(() => {
    console.log("Fetched user settings:", userSettings);
    console.log("User settings error:", settingsError);
    console.log("Fetched calendar events:", calendarEvents);
    console.log("Calendar events error:", calendarError);
    console.log("Filtered work calendar events:", workCalendarEvents);
    console.log("Fetched meeting notes:", meetingNotesResponse);
    console.log("Meeting notes error:", meetingNotesError);
  }, [userSettings, settingsError, calendarEvents, calendarError, workCalendarEvents, meetingNotesResponse, meetingNotesError]);

  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [isSaving, setIsSaving] = useState(false); // State to indicate saving in progress
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null); // State for selected note ID

  // Combine unique tags from meeting notes and global tags from settings
  const allAvailableTags = useMemo(() => {
    const meetingNoteTags = meetingNotesResponse?.meetingNotes?.flatMap(note => note.tags) || [];
    const globalTags = userSettings?.globalTags || [];
    const combinedTags = [...meetingNoteTags, ...globalTags];
    return Array.from(new Set(combinedTags)).sort(); // Get unique tags and sort them
  }, [meetingNotesResponse, userSettings]); // Add userSettings to dependency array

  const filteredMeetingNotes = useMemo(() => {
    const notesArray = meetingNotesResponse?.meetingNotes || [];
    let filtered = notesArray;

    // Filter by content
    if (searchContent.trim() !== "") {
      filtered = filtered.filter((note: Note) =>
        note.content.toLowerCase().includes(searchContent.toLowerCase()) ||
        (note.title && note.title.toLowerCase().includes(searchContent.toLowerCase())) || // Include title in search
        (note.eventTitle && note.eventTitle.toLowerCase().includes(searchContent.toLowerCase())) // Include event title in search
      );
    }

    // Filter by tag
    if (filterTag.trim() !== "") {
      filtered = filtered.filter((note: Note) =>
        note.tags.some((tag: string) => tag.toLowerCase() === filterTag.toLowerCase())
      );
    }



    return filtered;
  }, [meetingNotesResponse, searchContent, filterTag]);
  // Find the selected note object
  const selectedNote = useMemo(() => {
    if (!selectedNoteId || !filteredMeetingNotes) return null;
    return filteredMeetingNotes.find(note => note.id === selectedNoteId) || null;
  }, [selectedNoteId, filteredMeetingNotes]);

  const handleSaveMeetingNote = async (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean; actions?: Action[]; agenda?: string }) => { // Add actions and agenda to type
    setIsSaving(true);
    try {
      // Call the new create meeting note API
      const response = await fetch("/api/meetings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });

      if (response.ok) {
        mutate(); // Re-fetch meeting notes to update the list
      } else {
        const errorData = await response.json();
        console.error("Failed to save meeting note:", errorData.error);
      }
    } catch (error) {
      console.error("Error saving meeting note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Implement handleUpdateMeetingNote
  const handleUpdateMeetingNote = async (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean, updatedActions?: Action[], updatedAgenda?: string): Promise<void> => { // Add updatedActions and updatedAgenda to type
    console.log("meetings.tsx - handleUpdateMeetingNote called with:", {
      noteId,
      updatedTitle,
      updatedContent,
      updatedTags,
      updatedEventId,
      updatedEventTitle,
      updatedIsAdhoc,
      updatedActions,
      updatedAgenda
    });
    
    setIsSaving(true);
    try {
      // Call the new update meeting note API
      console.log("meetings.tsx - Sending update request to API");
      const requestBody = {
        id: noteId,
        title: updatedTitle,
        content: updatedContent,
        tags: updatedTags,
        eventId: updatedEventId,
        eventTitle: updatedEventTitle,
        isAdhoc: updatedIsAdhoc,
        actions: updatedActions, // Include actions
        agenda: updatedAgenda, // Include agenda
      };
      console.log("meetings.tsx - Request body:", requestBody);
      
      const response = await fetch(`/api/meetings/update`, {
        method: "PUT", // Or PATCH, depending on API design
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("meetings.tsx - Update response status:", response.status);
      
      if (response.ok) {
        console.log("meetings.tsx - Update successful, mutating data");
        // Force a refresh of the data to ensure we get the latest version with AI summary
        await mutate(undefined, { revalidate: true }); // Force revalidation to get fresh data
        console.log("meetings.tsx - Data revalidation completed");
        // Don't return anything to match the Promise<void> return type
      } else {
        const errorData = await response.json();
        console.error("Failed to update meeting note:", errorData.error);
        throw new Error(errorData.error || "Failed to update meeting note");
      }
    } catch (error) {
      console.error("Error updating meeting note:", error);
      throw error; // Re-throw the error so the component can handle it
    } finally {
      setIsSaving(false);
    }
  };

  // Implement handleDeleteMeetingNote
  const handleDeleteMeetingNote = async (noteId: string) => {
    setIsSaving(true);
    try {
      // Call the new delete meeting note API
      const response = await fetch(`/api/meetings/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteId }),
      });

      if (response.ok) {
        mutate(); // Re-fetch meeting notes to update the list
        setSelectedNoteId(null); // Deselect the note after deletion
      } else {
        const errorData = await response.json();
        console.error("Failed to delete meeting note:", errorData.error);
      }
    } catch (error) {
      console.error("Error deleting meeting note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Implement handleDeleteSelectedMeetingNotes for the list component
  const handleDeleteSelectedMeetingNotes = async (noteIds: string[]) => {
    setIsSaving(true);
    try {
      // Call the delete API for each selected note
      await Promise.all(noteIds.map(id =>
        fetch(`/api/meetings/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id }),
        })
      ));
      mutate(); // Re-fetch meeting notes to update the list
      setSelectedNoteId(null); // Deselect any potentially selected note
    } catch (error) {
      console.error("Error deleting selected meeting notes:", error);
    } finally {
      setIsSaving(false);
    }
  };


  // Show loading state if needed
  if (!user && status === 'unauthenticated') {
    return <p>Loading meeting notes, calendar events, and settings…</p>;
  }

  if (!user) {
    return <p>Please sign in to see your meeting notes.</p>;
  }

  // Show error state if notes, calendar events, or settings failed to load
  if (meetingNotesError || calendarError || settingsError) { // Use settingsError
    return <p>Error loading data.</p>;
  }

  // Show message if powerAutomateUrl is not configured
  if (!userSettings?.powerAutomateUrl) {
    return <p>Please configure your Power Automate URL in settings to see work calendar events.</p>;
  }


  return (
    <div className="p-4 flex flex-col md:flex-row h-full"> {/* Use flex-col for mobile, flex-row for larger screens */}
      {/* Left Column: Meeting Note List */}
      <div className="w-full md:w-80 md:border-r border-[var(--neutral-300)] md:pr-4 overflow-y-auto flex-shrink-0 mb-6 md:mb-0"> {/* Full width on mobile, fixed width on larger screens */}
        <h1 className="text-2xl font-semibold mb-4">Meeting Notes</h1>

        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4 w-full" // Make button full width
          onClick={() => setShowModal(true)} // Open modal on button click
        >
          Add Meeting Note
        </button>

        {/* Add the modal component */}
        <AddMeetingNoteModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveMeetingNote}
          isSaving={isSaving}
          existingTags={allAvailableTags} // Pass allAvailableTags
          workCalendarEvents={workCalendarEvents} // Pass filtered work calendar events
        />


        <div className="flex gap-4 mb-4">
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-[var(--fg)] leading-tight focus:outline-none focus:shadow-outline bg-transparent" // Use theme color and transparent background
            placeholder="Search meeting notes…"
            value={searchContent}
            onChange={(e) => setSearchContent(e.target.value)}
          />
           <select
            className="shadow appearance-none border rounded w-full py-2 px-3 text-[var(--fg)] leading-tight focus:outline-none focus:shadow-outline bg-transparent" // Use theme color and transparent background
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
           >
             <option value="">All Tags</option> {/* Option to show all notes */}
             {allAvailableTags.map(tag => ( // Use allAvailableTags for filter
               <option key={tag} value={tag}>{tag}</option>
             ))}
           </select>
        </div>

        {/* Render the MeetingNoteList component */}
        <MeetingNoteList
          notes={filteredMeetingNotes}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onDeleteNotes={handleDeleteSelectedMeetingNotes} // Pass the delete handler for selected notes
          isSaving={isSaving} // Pass isSaving state
        />
      </div>

      {/* Right Column: Meeting Note Detail */}
      <div className="flex-1 p-3 md:p-6 overflow-y-auto"> {/* Smaller padding on mobile */}
        {selectedNote ? (
          // Render the MeetingNoteDetail component if a note is selected
          <MeetingNoteDetail
            note={selectedNote}
            onSave={handleUpdateMeetingNote}
            onDelete={handleDeleteMeetingNote}
            isSaving={isSaving}
            existingTags={allAvailableTags} // Pass allAvailableTags
            calendarEvents={calendarEvents || []} // Keep all calendar events for detail view if needed, or filter here too
          />
        ) : (
          <p className="text-[var(--neutral-500)]">Select a meeting note to view details.</p>
        )}
      </div>
    </div>
  );
}