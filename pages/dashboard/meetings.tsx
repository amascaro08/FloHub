// pages/dashboard/meetings.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import type { Note, UserSettings, Action } from "@/types/app";
import type { CalendarEvent, CalendarSettings } from "@/types/calendar";
import { parseISO } from 'date-fns';
import AddMeetingNoteModal from "@/components/meetings/AddMeetingNoteModal";
import MeetingNoteList from "@/components/meetings/MeetingNoteList";
import MeetingNoteDetail from "@/components/meetings/MeetingNoteDetail";
import { useUser } from "@/lib/hooks/useUser";

// Define the response type for fetching meeting notes
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
    return <div>Loading...</div>;
  }

  const shouldFetch = status === "authenticated";

  // Calculate time range for fetching events (optimized for meetings - next 2 weeks)
  const timeRange = useMemo(() => {
    const now = new Date();
    const timeMin = now.toISOString();
    const twoWeeksFromNow = new Date(now);
    twoWeeksFromNow.setDate(now.getDate() + 14); // Reduced from 1 month to 2 weeks for faster loading
    const timeMax = twoWeeksFromNow.toISOString();
    return { timeMin, timeMax };
  }, []);

  // Fetch user settings to get global tags and Work Calendar URL
  const { data: userSettings, error: settingsError } = useSWR<UserSettings>(
    shouldFetch ? "/api/userSettings" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000
    }
  );

  // Build API URL for calendar events, using calendar sources
  const apiUrl = useMemo(() => {
    if (!shouldFetch || !timeRange) return null;
    return `/api/calendar?timeMin=${encodeURIComponent(timeRange.timeMin)}&timeMax=${encodeURIComponent(
      timeRange.timeMax
    )}&useCalendarSources=true`;
  }, [shouldFetch, timeRange]);

  // Fetch meeting notes and calendar events in parallel
  const { data: meetingNotesResponse, error: meetingNotesError, mutate } = useSWR<GetMeetingNotesResponse>(
    shouldFetch ? "/api/meetings" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );

  // Fetch calendar events using the combined API endpoint
  const { data: calendarEvents, error: calendarError, isLoading: calendarLoading } = useSWR<CalendarEvent[]>(
    apiUrl,
    calendarEventsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes - longer caching for calendar events
      refreshInterval: 300000, // Refresh every 5 minutes
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    }
  );

  // Filter fetched events to include only "work" events
  const workCalendarEvents = useMemo(() => {
    return calendarEvents?.filter(event => event.source === 'work') || [];
  }, [calendarEvents]);

  // Log the fetched data and errors for debugging
  useEffect(() => {
    console.log("=== MEETINGS PAGE DEBUG ===");
    console.log("Fetched user settings:", userSettings);
    console.log("User settings error:", settingsError);
    console.log("PowerAutomate URL configured:", userSettings?.powerAutomateUrl);
    console.log("Calendar sources:", userSettings?.calendarSources);
    console.log("Calendar loading state:", calendarLoading);
    console.log("Fetched calendar events (raw):", calendarEvents);
    console.log("Calendar events error:", calendarError);
    console.log("Filtered work calendar events:", workCalendarEvents);
    
    // Debug: Show all events with their source property
    if (calendarEvents && calendarEvents.length > 0) {
      console.log("All calendar events with sources:");
      calendarEvents.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, {
          id: event.id,
          summary: event.summary,
          source: event.source,
          calendarName: event.calendarName,
          tags: event.tags
        });
      });
      
      const workEvents = calendarEvents.filter(event => event.source === 'work');
      const personalEvents = calendarEvents.filter(event => event.source === 'personal');
      const noSourceEvents = calendarEvents.filter(event => !event.source);
      
      console.log(`Work events count: ${workEvents.length}`);
      console.log(`Personal events count: ${personalEvents.length}`);
      console.log(`Events without source: ${noSourceEvents.length}`);
      
      if (workEvents.length === 0 && calendarEvents.length > 0) {
        console.warn("⚠️ No work events found! All events have source:", calendarEvents.map(e => e.source));
      }
    } else if (calendarLoading) {
      console.log("📅 Calendar events are still loading...");
    } else {
      console.log("No calendar events fetched");
    }
    
    console.log("Fetched meeting notes:", meetingNotesResponse);
    console.log("Meeting notes error:", meetingNotesError);
    console.log("=== END DEBUG ===");
  }, [userSettings, settingsError, calendarEvents, calendarError, workCalendarEvents, meetingNotesResponse, meetingNotesError, calendarLoading]);

  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Combine unique tags from meeting notes and global tags from settings
  const allAvailableTags = useMemo(() => {
    const meetingNoteTags = meetingNotesResponse?.meetingNotes?.flatMap(note => note.tags) || [];
    const globalTags = userSettings?.globalTags || [];
    const combinedTags = [...meetingNoteTags, ...globalTags];
    return Array.from(new Set(combinedTags)).sort();
  }, [meetingNotesResponse, userSettings]);

  const filteredMeetingNotes = useMemo(() => {
    const notesArray = meetingNotesResponse?.meetingNotes || [];
    let filtered = notesArray;

    // Filter by content
    if (searchContent.trim() !== "") {
      filtered = filtered.filter((note: Note) =>
        note.content.toLowerCase().includes(searchContent.toLowerCase()) ||
        (note.title && note.title.toLowerCase().includes(searchContent.toLowerCase())) ||
        (note.eventTitle && note.eventTitle.toLowerCase().includes(searchContent.toLowerCase()))
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

  const handleSaveMeetingNote = async (note: { title: string; content: string; tags: string[]; eventId?: string; eventTitle?: string; isAdhoc?: boolean; actions?: Action[]; agenda?: string }) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/meetings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });

      if (response.ok) {
        mutate();
        setShowModal(false);
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

  const handleUpdateMeetingNote = async (noteId: string, updatedTitle: string, updatedContent: string, updatedTags: string[], updatedEventId?: string, updatedEventTitle?: string, updatedIsAdhoc?: boolean, updatedActions?: Action[], updatedAgenda?: string): Promise<void> => {
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
      console.log("meetings.tsx - Sending update request to API");
      const requestBody = {
        id: noteId,
        title: updatedTitle,
        content: updatedContent,
        tags: updatedTags,
        eventId: updatedEventId,
        eventTitle: updatedEventTitle,
        isAdhoc: updatedIsAdhoc,
        actions: updatedActions,
        agenda: updatedAgenda,
      };
      console.log("meetings.tsx - Request body:", requestBody);
      
      const response = await fetch(`/api/meetings/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("meetings.tsx - Update response status:", response.status);
      
      if (response.ok) {
        console.log("meetings.tsx - Update successful, mutating data");
        await mutate(undefined, { revalidate: true });
        console.log("meetings.tsx - Data revalidation completed");
      } else {
        const errorData = await response.json();
        console.error("Failed to update meeting note:", errorData.error);
        throw new Error(errorData.error || "Failed to update meeting note");
      }
    } catch (error) {
      console.error("Error updating meeting note:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMeetingNote = async (noteId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/meetings/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: noteId }),
      });

      if (response.ok) {
        mutate();
        setSelectedNoteId(null);
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

  const handleDeleteSelectedMeetingNotes = async (noteIds: string[]) => {
    setIsSaving(true);
    try {
      await Promise.all(noteIds.map(id =>
        fetch(`/api/meetings/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id }),
        })
      ));
      mutate();
      setSelectedNoteId(null);
    } catch (error) {
      console.error("Error deleting selected meeting notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state if needed
  if (!user && status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-color)]"></div>
        <p className="ml-3 text-[var(--neutral-600)]">Loading meeting notes...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--neutral-100)] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--neutral-400)]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--neutral-900)] mb-2">Sign in required</h3>
        <p className="text-[var(--neutral-600)]">Please sign in to access your meeting notes.</p>
      </div>
    );
  }

  // Show error state if notes, calendar events, or settings failed to load
  if (meetingNotesError || calendarError || settingsError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--neutral-900)] mb-2">Error loading data</h3>
        <p className="text-[var(--neutral-600)]">There was an error loading your meeting notes. Please try refreshing the page.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 bg-[var(--primary-color)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Show message if powerAutomateUrl is not configured
  if (!userSettings?.powerAutomateUrl) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--neutral-900)] mb-2">Configuration needed</h3>
        <p className="text-[var(--neutral-600)] mb-4">Please configure your Power Automate URL in settings to access work calendar events.</p>
        <button 
          onClick={() => router.push('/dashboard/settings')} 
          className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header Section */}
      <div className="bg-white border-b border-[var(--neutral-200)] px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--neutral-900)] flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-3 text-[var(--primary-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Meeting Notes
            </h1>
            <p className="text-[var(--neutral-600)] mt-1">Capture meetings, track actions, and stay organized</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="btn-primary flex items-center justify-center"
              onClick={() => setShowModal(true)}
              title={calendarLoading ? "Loading calendar events..." : "Create new meeting note"}
            >
              {calendarLoading ? (
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              )}
              New Meeting Note
              {calendarLoading && (
                <span className="ml-2 text-xs opacity-80">(Loading...)</span>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mt-6 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--neutral-400)]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              className="input-modern pl-10"
              placeholder="Search meeting notes by title, content, or event..."
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select
              className="input-modern min-w-[150px]"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {allAvailableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-[var(--neutral-300)]">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-[var(--primary-color)] text-white' 
                    : 'bg-white text-[var(--neutral-600)] hover:bg-[var(--neutral-50)]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-[var(--primary-color)] text-white' 
                    : 'bg-white text-[var(--neutral-600)] hover:bg-[var(--neutral-50)]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)]">
        {/* Left Column: Meeting Note List */}
        <div className="w-full lg:w-96 border-r border-[var(--neutral-200)] bg-white overflow-y-auto">
          <div className="p-6">
            <MeetingNoteList
              notes={filteredMeetingNotes}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onDeleteNotes={handleDeleteSelectedMeetingNotes}
              isSaving={isSaving}
              viewMode={viewMode}
            />
          </div>
        </div>

        {/* Right Column: Meeting Note Detail */}
        <div className="flex-1 bg-[var(--surface)] overflow-y-auto">
          {selectedNote ? (
            <div className="p-6">
              <MeetingNoteDetail
                note={selectedNote}
                onSave={handleUpdateMeetingNote}
                onDelete={handleDeleteMeetingNote}
                isSaving={isSaving}
                existingTags={allAvailableTags}
                calendarEvents={calendarEvents || []}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--neutral-100)] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--neutral-400)]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-[var(--neutral-900)] mb-2">Select a meeting note</h3>
                <p className="text-[var(--neutral-600)] mb-6">Choose a meeting note from the list to view and edit its details</p>
                <button
                  className="btn-primary"
                  onClick={() => setShowModal(true)}
                >
                  Create your first meeting note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Meeting Note Modal */}
      <AddMeetingNoteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveMeetingNote}
        isSaving={isSaving}
        existingTags={allAvailableTags}
        workCalendarEvents={workCalendarEvents}
        calendarLoading={calendarLoading}
      />
    </div>
  );
}