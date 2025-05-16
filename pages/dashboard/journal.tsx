"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getCurrentDate } from "@/lib/dateUtils";

// Import journal components
import TodayEntry from "@/components/journal/TodayEntry";
import MoodTracker from "@/components/journal/MoodTracker";
import JournalTimeline from "@/components/journal/JournalTimeline";
import OnThisDay from "@/components/journal/OnThisDay";
import JournalSummary from "@/components/journal/JournalSummary";
import LinkedMoments from "@/components/journal/LinkedMoments";
import JournalEntryViewer from "@/components/journal/JournalEntryViewer";

export default function JournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [showNewEntryButton, setShowNewEntryButton] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Fetch user settings to get timezone
  const { data: userSettings } = useSWR(
    session ? "/api/userSettings" : null,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    { revalidateOnFocus: false }
  );
  
  const timezone = userSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = getCurrentDate(timezone);
  const isSelectedToday = selectedDate === today;
  
  // Initialize selectedDate once we have the timezone
  useEffect(() => {
    if (timezone && !selectedDate) {
      setSelectedDate(getCurrentDate(timezone));
    }
  }, [timezone, selectedDate]);

  // Check if user is authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setShowNewEntryButton(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Handle saving journal entry
  const handleSaveEntry = (entry: { content: string; timestamp: string }) => {
    console.log("Saving entry:", entry);
    // In a real app, this would save to Firebase or another backend
    // For now, we're using localStorage in the component itself
  };

  // Handle saving mood
  const handleSaveMood = (mood: { emoji: string; label: string; tags: string[] }) => {
    console.log("Saving mood:", mood);
    // In a real app, this would save to Firebase or another backend
    // For now, we're using localStorage in the component itself
    
    // Trigger a refresh of the timeline to show the new mood immediately
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle selecting a date from the timeline
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    console.log("Selected date:", date);
  };

  // Show loading state
  if (status === "loading") {
    return <p className="text-center p-8">Loading journal...</p>;
  }

  // Show message if not authenticated
  if (!session) {
    return <p className="text-center p-8">Please sign in to access your journal.</p>;
  }

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Journal</h1>
      
      {/* Timeline at the top */}
      <div className="mb-6">
        <JournalTimeline
          onSelectDate={(date) => {
            handleSelectDate(date);
            setIsEditing(date === today);
          }}
          timezone={timezone}
          refreshTrigger={refreshTrigger}
          autoScrollToLatest={true}
        />
      </div>
      
      {/* FloCat Summary and Mood Trend section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <JournalSummary />
        <MoodTracker onSave={handleSaveMood} timezone={timezone} />
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Journal Entry (Today's Entry or Selected Date Entry) */}
          <div className="h-[500px]">
            {isSelectedToday || isEditing ? (
              <TodayEntry
                onSave={handleSaveEntry}
                date={selectedDate}
                timezone={timezone}
                showPrompts={true}
              />
            ) : (
              <JournalEntryViewer
                date={selectedDate}
                onEdit={() => setIsEditing(true)}
                timezone={timezone}
              />
            )}
          </div>
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* On This Day */}
          <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
          
          {/* Linked Moments */}
          <LinkedMoments date={selectedDate} timezone={timezone} />
        </div>
      </div>
      
      {/* Floating New Entry button (mobile only) */}
      {showNewEntryButton && (
        <button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-500 text-white shadow-lg flex items-center justify-center z-10 hover:bg-teal-600 transition-colors"
          aria-label="New Journal Entry"
          onClick={() => {
            // Set to today's date and editing mode
            setSelectedDate(today);
            setIsEditing(true);
            // Scroll to the top where the entry component is
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
      
      {/* Edit/View toggle button (when not viewing today) */}
      {!isSelectedToday && (
        <button
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-lg flex items-center justify-center z-10 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          aria-label={isEditing ? "View Entry" : "Edit Entry"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </button>
      )}
      
      {/* Voice-to-text button (stub/placeholder) */}
      <button
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-lg flex items-center justify-center z-10 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        aria-label="Voice to Text"
        onClick={() => {
          alert("Voice-to-text feature coming soon!");
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    </div>
  );
}