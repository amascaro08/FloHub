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
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return workCalendarEvents.filter(event => {
      const eventDate = getEventDate(event.start);
      return eventDate >= todayStart && eventDate < todayEnd;
    });
  }, [workCalendarEvents]);

  const [searchContent, setSearchContent] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recent" | "series" | "actions" | "upcoming">("recent");
  const [isMobile, setIsMobile] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);

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

  // Helper function to safely extract date from calendar event
  const getEventDate = (start: CalendarEventDateTime | Date): Date => {
    if (start instanceof Date) {
      return start;
    }
    // For CalendarEventDateTime, try dateTime first, then date
    const dateString = start.dateTime || start.date;
    return dateString ? new Date(dateString) : new Date();
  };

  // Calculate stats for tabs
  const meetingNotes = meetingNotesResponse?.meetingNotes || [];
  const totalActions = meetingNotes.reduce((acc, note) => acc + (note.actions?.length || 0), 0);
  const pendingActions = meetingNotes.reduce((acc, note) => 
    acc + (note.actions?.filter(action => action.status === 'todo')?.length || 0), 0);
  const upcomingMeetings = workCalendarEvents.filter(event => 
    getEventDate(event.start) > new Date()).length;

  // Group meetings by series for series tab
  const meetingSeries = useMemo(() => {
    const series: Record<string, Note[]> = {};
    meetingNotes.forEach(note => {
      if (note.eventTitle) {
        // Simple series detection based on event title patterns
        const seriesKey = note.eventTitle.replace(/\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|#\d+/g, '').trim();
        if (!series[seriesKey]) {
          series[seriesKey] = [];
        }
        series[seriesKey].push(note);
      }
    });
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
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="input-modern pl-10 text-sm"
              placeholder="Search meeting notes by title, content, or event..."
              value={searchContent}
              onChange={(e) => setSearchContent(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="input-modern pl-10 min-w-[150px] text-sm"
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
                  <h2 className="font-heading font-semibold text-dark-base dark:text-soft-white">Meeting Series</h2>
                  <p className="text-sm text-grey-tint mt-1">Related meetings grouped for context</p>
                </div>
                <div className="p-4 space-y-4">
                  {meetingSeries.length === 0 ? (
                    <div className="text-center py-8">
                      <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Series Found</h3>
                      <p className="text-gray-500 dark:text-gray-400">Related meetings will appear here when detected</p>
                    </div>
                  ) : (
                    meetingSeries.map(([seriesTitle, notes]) => (
                      <div key={seriesTitle} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <h3 className="font-medium text-dark-base dark:text-soft-white mb-2">{seriesTitle}</h3>
                        <p className="text-sm text-grey-tint mb-3">{notes.length} meetings</p>
                        <div className="flex flex-wrap gap-2">
                          {notes.slice(0, 3).map(note => (
                            <button
                              key={note.id}
                              onClick={() => setSelectedNoteId(note.id)}
                              className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                            >
                              {new Date(note.createdAt).toLocaleDateString()}
                            </button>
                          ))}
                          {notes.length > 3 && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                              +{notes.length - 3} more
                            </span>
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
                              <div key={action.id} className={`flex items-center space-x-3 p-2 rounded-lg ${
                                action.status === 'done' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
                              }`}>
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                                  action.status === 'done' ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                                <div className="flex-1">
                                  <p className="text-sm text-dark-base dark:text-soft-white">{action.description}</p>
                                  <p className="text-xs text-grey-tint">Assigned to: {action.assignedTo}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  action.status === 'done' 
                                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                }`}>
                                  {action.status === 'done' ? 'Done' : 'Pending'}
                                </span>
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
      </div>
    </>
  );
}