// pages/dashboard/meetings.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import type { Note, UserSettings, Action } from "@/types/app";
import type { CalendarEvent, CalendarSettings, CalendarEventDateTime } from "@/types/calendar";
import { parseISO } from 'date-fns';
import AddMeetingNoteModal from "@/components/meetings/AddMeetingNoteModal";
import MeetingNoteList from "@/components/meetings/MeetingNoteList";
import MeetingNoteDetail from "@/components/meetings/MeetingNoteDetail";
import { useUser } from "@/lib/hooks/useUser";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  TagIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClockIcon,
  SparklesIcon,
  LinkIcon
} from '@heroicons/react/24/solid';

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
  
  // Calendar API returns { events: CalendarEvent[] }, extract the events array
  if (data && typeof data === 'object' && Array.isArray(data.events)) {
    return data.events;
  }
  
  // Fallback for unexpected response format
  if (Array.isArray(data)) {
    return data;
  }
  
  console.warn("Unexpected calendar API response format:", data);
  return [];
};

// Meeting Linking Modal Component
function MeetingLinkingModal({ 
  isOpen, 
  onClose, 
  meetingNotes, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  meetingNotes: Note[]; 
  onSave: (seriesName: string, selectedNoteIds: string[]) => Promise<void>; 
}) {
  const [seriesName, setSeriesName] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!seriesName.trim() || selectedNotes.length < 2) return;
    
    setIsSaving(true);
    try {
      await onSave(seriesName.trim(), selectedNotes);
      onClose();
    } catch (error) {
      console.error('Error creating meeting series:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Create Meeting Series</h2>
              <p className="text-white/80 text-sm">Link related meetings to build context</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="space-y-6">
            {/* Series Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Series Name
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="e.g., Weekly Team Sync, Project Alpha Meetings"
                className="input-modern w-full"
              />
            </div>

            {/* Meeting Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Meetings to Link ({selectedNotes.length} selected)
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Choose at least 2 meetings to create a series
              </p>
              
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2">
                {meetingNotes.map(note => (
                  <div
                    key={note.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedNotes.includes(note.id)
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    onClick={() => toggleNoteSelection(note.id)}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedNotes.includes(note.id)
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {selectedNotes.includes(note.id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {note.title || note.eventTitle || 'Untitled Meeting'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.createdAt).toLocaleDateString()} • {note.actions?.length || 0} actions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedNotes.length < 2 ? 'Select at least 2 meetings' : `${selectedNotes.length} meetings selected`}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!seriesName.trim() || selectedNotes.length < 2 || isSaving}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Creating...' : 'Create Series'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeetingsPage() {
  const { user, isLoading } = useUser();
  const status = user ? "authenticated" : "unauthenticated";
  const router = useRouter();

  // Handle loading state
  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full mx-auto mb-4"></div>
          <p className="text-grey-tint">Loading your meetings...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-grey-tint">Please sign in to access your meetings.</p>
        </div>
      </div>
    );
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

  // Helper function to safely extract date from calendar event
  const getEventDate = (start: CalendarEventDateTime | Date): Date => {
    try {
      if (start instanceof Date) {
        return isNaN(start.getTime()) ? new Date() : start;
      }
      
      if (!start || (typeof start !== 'object')) {
        console.warn("Invalid start parameter:", start);
        return new Date();
      }
      
      // For CalendarEventDateTime, try dateTime first, then date
      const dateString = start.dateTime || start.date;
      if (!dateString) {
        console.warn("No date found in start object:", start);
        return new Date();
      }
      
      const parsedDate = new Date(dateString);
      return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    } catch (error) {
      console.error("Error parsing event date:", error, start);
      return new Date();
    }
  };

  // Filter fetched events to include only "work" events
  const workCalendarEvents = useMemo(() => {
    if (!calendarEvents || !Array.isArray(calendarEvents)) {
      console.warn("Calendar events is not an array:", calendarEvents);
      return [];
    }
    return calendarEvents.filter(event => event.source === 'work');
  }, [calendarEvents]);

  // Filter work events to only show today's events for the modal
  const todaysWorkCalendarEvents = useMemo(() => {
    if (!workCalendarEvents || workCalendarEvents.length === 0) {
      return [];
    }

    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      return workCalendarEvents.filter(event => {
        if (!event || !event.start) {
          console.warn("Invalid event found:", event);
          return false;
        }
        
        try {
          const eventDate = getEventDate(event.start);
          return eventDate >= todayStart && eventDate < todayEnd;
        } catch (error) {
          console.error("Error processing event date:", error, event);
          return false;
        }
      });
    } catch (error) {
      console.error("Error filtering today's events:", error);
      return [];
    }
  }, [workCalendarEvents]);

  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recent" | "series" | "actions" | "upcoming">("recent");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [showLinkingModal, setShowLinkingModal] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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

  // Calculate stats for tabs
  const meetingNotes = meetingNotesResponse?.meetingNotes || [];
  const totalActions = meetingNotes.reduce((acc, note) => acc + (note.actions?.length || 0), 0);
  const pendingActions = meetingNotes.reduce((acc, note) => 
    acc + (note.actions?.filter(action => action.status === 'todo')?.length || 0), 0);
  const upcomingMeetings = workCalendarEvents.filter(event => 
    getEventDate(event.start) > new Date()).length;

  // Group meetings by series for series tab (both manual and auto-detected)
  const meetingSeries = useMemo(() => {
    const series: Record<string, Note[]> = {};
    
    meetingNotes.forEach(note => {
      // Priority 1: Manual series grouping
      if (note.meetingSeries) {
        if (!series[note.meetingSeries]) {
          series[note.meetingSeries] = [];
        }
        series[note.meetingSeries].push(note);
      }
      // Priority 2: Linked meetings
      else if (note.linkedMeetingIds && note.linkedMeetingIds.length > 0) {
        const linkedKey = `Linked Series (${note.id.slice(0, 8)})`;
        if (!series[linkedKey]) {
          series[linkedKey] = [];
        }
        series[linkedKey].push(note);
        
        // Add linked notes to the same series
        note.linkedMeetingIds.forEach(linkedId => {
          const linkedNote = meetingNotes.find(n => n.id === linkedId);
          if (linkedNote && !series[linkedKey].includes(linkedNote)) {
            series[linkedKey].push(linkedNote);
          }
        });
      }
      // Fallback: Auto-detection based on event title patterns (improved)
      else if (note.eventTitle) {
        const seriesKey = note.eventTitle
          .replace(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|#\d+/g, '')
          .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '')
          .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
          .replace(/\b(week|weekly|daily|monthly)\b/gi, '')
          .trim();
        
        if (seriesKey.length > 3) { // Only group if there's meaningful text left
          if (!series[seriesKey]) {
            series[seriesKey] = [];
          }
          series[seriesKey].push(note);
        }
      }
    });
    
    // Filter to only show series with multiple meetings
    return Object.entries(series).filter(([, notes]) => notes.length > 1);
  }, [meetingNotes]);

  const tabs = [
    { id: 'recent', label: 'Recent', icon: ClockIcon, count: meetingNotes.length },
    { id: 'series', label: 'Series', icon: LinkIcon, count: meetingSeries.length },
    { id: 'actions', label: 'Actions', icon: DocumentTextIcon, count: pendingActions },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarDaysIcon, count: upcomingMeetings }
  ];

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
    setIsSaving(true);
    try {
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
      
      const response = await fetch(`/api/meetings/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        await mutate(undefined, { revalidate: true });
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
      const response = await fetch(`/api/meetings/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: noteIds }),
      });

      if (response.ok) {
        mutate();
        setSelectedNoteId(null);
        setSelectedNotes([]);
      } else {
        const errorData = await response.json();
        console.error("Failed to delete meeting notes:", errorData.error);
      }
    } catch (error) {
      console.error("Error deleting meeting notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAction = async (noteId: string, actionId: string, newStatus: 'todo' | 'done') => {
    const note = meetingNotes.find(n => n.id === noteId);
    if (!note || !note.actions) return;

    const actionIndex = note.actions.findIndex(a => a.id === actionId);
    if (actionIndex === -1) return;

    const updatedActions = [...note.actions];
    const action = updatedActions[actionIndex];
    
    // Update action status and completion time
    updatedActions[actionIndex] = {
      ...action,
      status: newStatus,
      completedAt: newStatus === 'done' ? new Date().toISOString() : undefined
    };

    try {
      // Update the meeting note with new action status
      await handleUpdateMeetingNote(
        noteId,
        note.title || '',
        note.content,
        note.tags,
        note.eventId,
        note.eventTitle,
        note.isAdhoc,
        updatedActions,
        note.agenda
      );

      // If action is assigned to "Me" and has a linked task, update the task status too
      if (action.assignedTo === 'Me' && action.taskId) {
        try {
          await fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: action.taskId,
              done: newStatus === 'done'
            })
          });
        } catch (error) {
          console.error('Error syncing task status:', error);
        }
      }
    } catch (error) {
      console.error('Error updating action status:', error);
         }
   };

   const handleViewSeries = (seriesTitle: string, notes: Note[]) => {
     // For now, just select the most recent note in the series
     // This could be enhanced to show a dedicated series view
     if (notes.length > 0) {
       const mostRecent = notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
       setSelectedNoteId(mostRecent.id);
     }
   };

   const handleCreateMeetingSeries = async (seriesName: string, selectedNoteIds: string[]) => {
     try {
       // For now, just close the modal and show a success message
       // TODO: Implement actual linking once database fields are added
       alert(`Successfully created series "${seriesName}" with ${selectedNoteIds.length} meetings. This feature will be fully functional after database migration.`);
       setShowLinkingModal(false);
     } catch (error) {
       console.error('Error creating meeting series:', error);
       throw error;
     }
   };

  // Show loading state if data is still loading
  if ((!meetingNotesResponse && !meetingNotesError) || (!userSettings && !settingsError && shouldFetch)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full mx-auto mb-4"></div>
          <p className="text-grey-tint">Loading your meetings...</p>
        </div>
      </div>
    );
  }

  // Show error state if meeting notes failed to load
  if (meetingNotesError || settingsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-grey-tint">Error loading your meetings. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Meetings | FlowHub</title>
        <meta name="description" content="Capture meetings, track actions, and build context with FlowHub's intelligent meeting manager" />
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <UserGroupIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                Meetings
              </h1>
              <p className="text-sm text-grey-tint">
                {meetingNotes.length > 0 ? 
                  `${meetingNotes.length} meeting notes, ${pendingActions} pending actions` : 
                  'Start capturing your meeting insights'
                }
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            disabled={calendarLoading}
            className="btn-primary flex items-center space-x-2 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">New Meeting Note</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8 shadow-md">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-soft-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-lg'
                  : 'text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === 'recent' ? 'Rec' : tab.id === 'series' ? 'Ser' : tab.id === 'actions' ? 'Act' : 'Up'}
              </span>
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 flex-shrink-0 z-10" />
            <input
              type="text"
              className="border border-neutral-300 rounded-2xl pl-11 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ease-in-out bg-white dark:bg-neutral-800 dark:border-neutral-600 dark:text-white placeholder-neutral-400 text-sm"
              placeholder="Search meeting notes by title, content, or event..."
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 flex-shrink-0 z-10" />
              <select
                className="border border-neutral-300 rounded-2xl pl-11 pr-3 py-2 min-w-[150px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ease-in-out bg-white dark:bg-neutral-800 dark:border-neutral-600 dark:text-white text-sm appearance-none"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allAvailableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Meeting Note List or Tab Content */}
          <div className={`lg:col-span-1 ${selectedNote && !isMobile ? '' : 'lg:col-span-3'} space-y-6`}>
            {activeTab === 'recent' && (
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-heading font-semibold text-dark-base dark:text-soft-white">Recent Meetings</h2>
                  <p className="text-sm text-grey-tint mt-1">Your latest meeting notes and insights</p>
                </div>
                <div className="p-4">
                  <MeetingNoteList
                    notes={filteredMeetingNotes}
                    selectedNoteId={selectedNoteId}
                    onSelectNote={setSelectedNoteId}
                    onDeleteNotes={handleDeleteSelectedMeetingNotes}
                    isSaving={isSaving}
                    viewMode="list"
                  />
                </div>
              </div>
            )}

                         {activeTab === 'series' && (
               <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                 <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                   <div className="flex items-center justify-between">
                     <div>
                       <h2 className="font-heading font-semibold text-dark-base dark:text-soft-white">Meeting Series</h2>
                       <p className="text-sm text-grey-tint mt-1">Related meetings grouped for context building</p>
                     </div>
                     <button
                       onClick={() => setShowLinkingModal(true)}
                       className="text-sm px-3 py-1.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                     >
                       Link Meetings
                     </button>
                   </div>
                 </div>
                 <div className="p-4 space-y-4">
                   {meetingSeries.length === 0 ? (
                     <div className="text-center py-8">
                       <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                       <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Series Found</h3>
                       <p className="text-gray-500 dark:text-gray-400 mb-4">Create meeting series to build context across related meetings</p>
                       <button
                         onClick={() => setShowLinkingModal(true)}
                         className="btn-primary text-sm"
                       >
                         Create First Series
                       </button>
                     </div>
                   ) : (
                     meetingSeries.map(([seriesTitle, notes]) => (
                       <div key={seriesTitle} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                         <div className="flex items-start justify-between mb-3">
                           <div>
                             <h3 className="font-medium text-dark-base dark:text-soft-white mb-1">{seriesTitle}</h3>
                             <p className="text-sm text-grey-tint">{notes.length} meetings • Last updated {new Date(Math.max(...notes.map(n => new Date(n.createdAt).getTime()))).toLocaleDateString()}</p>
                           </div>
                           <button
                             onClick={() => handleViewSeries(seriesTitle, notes)}
                             className="text-xs px-2 py-1 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                           >
                             View All
                           </button>
                         </div>
                         
                         {/* Meeting Timeline */}
                         <div className="space-y-2">
                           {notes.slice(0, 3).map((note, index) => (
                             <div key={note.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors">
                               <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                               <div className="flex-1 min-w-0">
                                 <p className="text-sm font-medium text-dark-base dark:text-soft-white truncate">
                                   {note.title || note.eventTitle || 'Untitled Meeting'}
                                 </p>
                                 <p className="text-xs text-grey-tint">
                                   {new Date(note.createdAt).toLocaleDateString()} • {note.actions?.length || 0} actions
                                 </p>
                               </div>
                               <button
                                 onClick={() => setSelectedNoteId(note.id)}
                                 className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                               >
                                 View
                               </button>
                             </div>
                           ))}
                           {notes.length > 3 && (
                             <div className="text-center pt-2">
                               <button
                                 onClick={() => handleViewSeries(seriesTitle, notes)}
                                 className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                               >
                                 +{notes.length - 3} more meetings
                               </button>
                             </div>
                           )}
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>
             )}

                         {activeTab === 'actions' && (
               <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                 <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                   <h2 className="font-heading font-semibold text-dark-base dark:text-soft-white">Action Items</h2>
                   <p className="text-sm text-grey-tint mt-1">Tasks and decisions from your meetings</p>
                 </div>
                 <div className="p-4 space-y-4">
                   {meetingNotes.filter(note => note.actions && note.actions.length > 0).length === 0 ? (
                     <div className="text-center py-8">
                       <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                       <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Actions Yet</h3>
                       <p className="text-gray-500 dark:text-gray-400">Action items from meetings will appear here</p>
                     </div>
                   ) : (
                     meetingNotes
                       .filter(note => note.actions && note.actions.length > 0)
                       .map(note => (
                         <div key={note.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                           <div className="flex items-center justify-between mb-3">
                             <h3 className="font-medium text-dark-base dark:text-soft-white">{note.eventTitle || note.title || 'Untitled Meeting'}</h3>
                             <button
                               onClick={() => setSelectedNoteId(note.id)}
                               className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm"
                             >
                               View Note
                             </button>
                           </div>
                           <div className="space-y-2">
                             {note.actions?.map(action => (
                               <div key={action.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                                 action.status === 'done' 
                                   ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                   : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                               }`}>
                                 <button
                                   onClick={() => handleToggleAction(note.id, action.id, action.status === 'todo' ? 'done' : 'todo')}
                                   className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                     action.status === 'done' 
                                       ? 'bg-green-500 hover:bg-green-600' 
                                       : 'bg-yellow-500 hover:bg-yellow-600'
                                   }`}
                                 >
                                   {action.status === 'done' && (
                                     <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                     </svg>
                                   )}
                                 </button>
                                 <div className="flex-1">
                                   <p className={`text-sm ${action.status === 'done' ? 'line-through text-gray-500' : 'text-dark-base dark:text-soft-white'}`}>
                                     {action.description}
                                   </p>
                                   <div className="flex items-center space-x-2 text-xs text-grey-tint mt-1">
                                     <span>Assigned to: {action.assignedTo}</span>
                                     {action.dueDate && (
                                       <>
                                         <span>•</span>
                                         <span>Due: {new Date(action.dueDate).toLocaleDateString()}</span>
                                       </>
                                     )}
                                     {action.taskId && action.assignedTo === 'Me' && (
                                       <>
                                         <span>•</span>
                                         <span className="text-blue-600 dark:text-blue-400">Synced to Tasks</span>
                                       </>
                                     )}
                                   </div>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                     action.status === 'done' 
                                       ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                       : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                   }`}>
                                     {action.status === 'done' ? 'Completed' : 'Pending'}
                                   </span>
                                   {action.status === 'done' && action.completedAt && (
                                     <span className="text-xs text-grey-tint">
                                       {new Date(action.completedAt).toLocaleDateString()}
                                     </span>
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       ))
                   )}
                 </div>
               </div>
             )}

            {activeTab === 'upcoming' && (
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-heading font-semibold text-dark-base dark:text-soft-white">Upcoming Meetings</h2>
                  <p className="text-sm text-grey-tint mt-1">Your scheduled meetings from calendar</p>
                </div>
                <div className="p-4 space-y-4">
                  {calendarLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-grey-tint">Loading upcoming meetings...</p>
                    </div>
                                     ) : workCalendarEvents.filter(event => getEventDate(event.start) > new Date()).length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Upcoming Meetings</h3>
                      <p className="text-gray-500 dark:text-gray-400">Your scheduled meetings will appear here</p>
                    </div>
                  ) : (
                                         workCalendarEvents
                       .filter(event => getEventDate(event.start) > new Date())
                       .slice(0, 10)
                      .map(event => (
                        <div key={event.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-dark-base dark:text-soft-white">{event.summary}</h3>
                            <button
                              onClick={() => setShowModal(true)}
                              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm"
                            >
                              Take Notes
                            </button>
                          </div>
                                                     <p className="text-sm text-grey-tint">
                             {getEventDate(event.start).toLocaleDateString()} at{' '}
                             {getEventDate(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Meeting Note Detail */}
          {selectedNote && (
            <div className={`lg:col-span-2 ${isMobile ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
              {isMobile && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setSelectedNoteId(null)}
                    className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Meetings
                  </button>
                </div>
              )}
              
              <div className={`${isMobile ? 'p-4' : ''}`}>
                <MeetingNoteDetail
                  note={selectedNote}
                  onSave={handleUpdateMeetingNote}
                  onDelete={handleDeleteMeetingNote}
                  isSaving={isSaving}
                  existingTags={allAvailableTags}
                  calendarEvents={calendarEvents || []}
                />
              </div>
            </div>
          )}
        </div>

        {/* Empty State when no note is selected */}
        {!selectedNote && activeTab === 'recent' && filteredMeetingNotes.length === 0 && (
          <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-dark-base dark:text-soft-white mb-2">No meetings yet</h3>
                <p className="text-grey-tint mb-6">Start capturing insights from your meetings to build valuable context</p>
                <button
                  className="btn-primary"
                  onClick={() => setShowModal(true)}
                >
                  Create your first meeting note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Meeting Note Modal */}
        <AddMeetingNoteModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveMeetingNote}
          isSaving={isSaving}
          existingTags={allAvailableTags}
          workCalendarEvents={todaysWorkCalendarEvents}
          calendarLoading={calendarLoading}
        />

        {/* Meeting Linking Modal */}
        {showLinkingModal && (
          <MeetingLinkingModal
            isOpen={showLinkingModal}
            onClose={() => setShowLinkingModal(false)}
            meetingNotes={meetingNotes}
            onSave={handleCreateMeetingSeries}
          />
        )}
      </div>
    </>
  );
}