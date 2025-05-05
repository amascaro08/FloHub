// pages/dashboard/meetings.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
// Import types
import type { Note, UserSettings } from "@/types/app"; // Import Note and UserSettings types
// Import meeting notes components
import AddMeetingNoteModal from "@/components/meetings/AddMeetingNoteModal";
import MeetingNoteList from "@/components/meetings/MeetingNoteList";
import MeetingNoteDetail from "@/components/meetings/MeetingNoteDetail";

// Define a type for calendar items based on the API response
type CalendarItem = {
  id: string;
  summary: string;
};

// Define the response type for fetching meeting notes (will create this API later)
type GetMeetingNotesResponse = {
  meetingNotes: Note[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MeetingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const shouldFetch = status === "authenticated";

  // Fetch meeting notes (will use a new API endpoint later)
  const { data: meetingNotesResponse, error: meetingNotesError, mutate } = useSWR<GetMeetingNotesResponse>(
    shouldFetch ? "/api/meetings" : null, // Placeholder for new API endpoint
    fetcher
  );

  // Fetch user settings to get global tags and Work Calendar URL
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher
  );

  // Fetch calendar events
  const { data: calendarEvents, error: calendarError } = useSWR<CalendarItem[]>(
    shouldFetch ? "/api/calendar/list" : null,
    fetcher
  );

  // Log the fetched data and errors for debugging


  // Log the fetched data and errors for debugging
  useEffect(() => {
    console.log("Fetched calendar list:", calendarEvents);
    console.log("Calendar list error:", calendarError);
    console.log("Fetched user settings:", userSettings);
    console.log("User settings error:", settingsError);
    console.log("Fetched meeting notes:", meetingNotesResponse);
    console.log("Meeting notes error:", meetingNotesError);
  }, [calendarEvents, calendarError, userSettings, settingsError, meetingNotesResponse, meetingNotesError]);

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

  const handleSaveMeetingNote = async (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean }) => {
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
  const handleUpdateMeetingNote = async (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean) => {
    setIsSaving(true);
    try {
      // Call the new update meeting note API
      const response = await fetch(`/api/meetings/update`, {
        method: "PUT", // Or PATCH, depending on API design
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noteId,
          title: updatedTitle,
          content: updatedContent,
          tags: updatedTags,
          eventId: updatedEventId,
          eventTitle: updatedEventTitle,
          isAdhoc: updatedIsAdhoc,
        }),
      });

      if (response.ok) {
        mutate(); // Re-fetch meeting notes to update the list
      } else {
        const errorData = await response.json();
        console.error("Failed to update meeting note:", errorData.error);
      }
    } catch (error) {
      console.error("Error updating meeting note:", error);
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


 // Find the Work Calendar ID based on the powerAutomateUrl from settings
 const workCalendarId = useMemo(() => {
   if (!userSettings?.powerAutomateUrl || !calendarEvents) return undefined; // Use userSettings
   // Assuming the calendar ID is part of the powerAutomateUrl or can be derived from it.
   // This is a placeholder logic. A more robust solution might involve storing the calendar ID
   // directly in settings or having a way to map the URL to an ID via an API.
   // For now, let's assume the powerAutomateUrl contains the calendar ID in some identifiable way.
   // A more realistic approach would be to have the settings API return the calendar ID directly.
   // Since we don't have that API, I'll make a placeholder assumption: the calendar ID is the last segment of the URL path.
   try {
     const url = new URL(userSettings.powerAutomateUrl); // Use userSettings
     const pathSegments = url.pathname.split('/');
     const potentialCalendarId = pathSegments[pathSegments.length - 1];
     // Check if this potential ID exists in the fetched calendar events
     const workCalendar = calendarEvents.find(cal => cal.id === potentialCalendarId);
     return workCalendar ? workCalendar.id : undefined;
   } catch (e) {
     console.error("Invalid powerAutomateUrl in settings:", e);
     return undefined;
   }
 }, [userSettings, calendarEvents]); // Add userSettings to dependency array

 // Filter calendar events to only include the Work Calendar
 const workCalendarList = useMemo(() => {
   if (!workCalendarId || !calendarEvents) return [];
   const workCalendar = calendarEvents.find(cal => cal.id === workCalendarId);
   return workCalendar ? [workCalendar] : [];
 }, [workCalendarId, calendarEvents]);


 // Show loading state if notes, calendar events, or settings are loading
 if (status === "loading" || (!meetingNotesResponse && !meetingNotesError) || (!calendarEvents && !calendarError && shouldFetch) || (!userSettings && !settingsError && shouldFetch)) { // Use userSettings and settingsError
   return <p>Loading meeting notes, calendar events, and settings…</p>;
 }

 if (!session) {
   return <p>Please sign in to see your meeting notes.</p>;
 }

 // Show error state if notes, calendar events, or settings failed to load
 if (meetingNotesError || calendarError || settingsError) { // Use settingsError
   return <p>Error loading data.</p>;
 }


 return (
   <div className="p-4 flex h-full"> {/* Use flex for two-column layout */}
     {/* Left Column: Meeting Note List */}
     <div className="w-80 border-r border-[var(--neutral-300)] pr-4 overflow-y-auto flex-shrink-0"> {/* Set a fixed width and prevent shrinking */}
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
         calendarList={calendarEvents || []} // Pass all fetched calendar lists
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
     <div className="flex-1 p-6 overflow-y-auto"> {/* Increase padding */}
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