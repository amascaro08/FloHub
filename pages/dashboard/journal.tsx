"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getCurrentDate } from "@/lib/dateUtils";
import axios from "axios";

// Import journal components
import TodayEntry from "@/components/journal/TodayEntry";
import MoodTracker from "@/components/journal/MoodTracker";
import JournalTimeline from "@/components/journal/JournalTimeline";
import OnThisDay from "@/components/journal/OnThisDay";
import JournalSummary from "@/components/journal/JournalSummary";
import LinkedMoments from "@/components/journal/LinkedMoments";
import JournalEntryViewer from "@/components/journal/JournalEntryViewer";
import JournalCalendar from "@/components/journal/JournalCalendar";
import ActivityTracker from "@/components/journal/ActivityTracker";
import MoodStatistics from "@/components/journal/MoodStatistics";
import JournalSettings from "@/components/journal/JournalSettings";
import SleepTracker from "@/components/journal/SleepTracker";

export default function JournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [showNewEntryButton, setShowNewEntryButton] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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
    
    // Trigger a refresh of the timeline to show the new entry immediately
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle saving mood
  const handleSaveMood = (mood: { emoji: string; label: string; tags: string[] }) => {
    console.log("Saving mood:", mood);
    // In a real app, this would save to Firebase or another backend
    // For now, we're using localStorage in the component itself
    
    // Trigger a refresh of the timeline to show the new mood immediately
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle saving activities
  const handleSaveActivities = (activities: string[]) => {
    console.log("Saving activities:", activities);
    // In a real app, this would save to Firebase or another backend
    // For now, we're using localStorage in the component itself
    
    setSelectedActivities(activities);
    
    // Trigger a refresh of the timeline to show the new activities immediately
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle saving sleep data
  const handleSaveSleep = (sleep: { quality: string; hours: number }) => {
    console.log("Saving sleep data:", sleep);
    // In a real app, this would save to Firebase or another backend
    // For now, we're using localStorage in the component itself
    
    // Trigger a refresh of the timeline to show the new sleep data immediately
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle selecting a date from the timeline
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    // Always allow editing regardless of date
    setIsEditing(true);
    console.log("Selected date:", date);
  };

  // Function to save all journal data for the selected date
  const saveAllJournalData = async () => {
    if (!session?.user?.email) return;
    
    setIsSaving(true);
    
    try {
      // Get the current journal entry content
      const entryElement = document.querySelector('.ProseMirror');
      let entryContent = '';
      if (entryElement) {
        entryContent = entryElement.innerHTML;
      }
      
      // Save journal entry
      if (entryContent) {
        const timestamp = new Date().toISOString();
        await axios.post('/api/journal/entry', {
          date: selectedDate,
          content: entryContent,
          timestamp
        });
      }
      
      // Save mood data if available
      const moodEmoji = document.querySelector('.scale-110 .text-3xl')?.textContent;
      const moodLabel = document.querySelector('.scale-110 .text-xs')?.textContent;
      const moodTags = Array.from(document.querySelectorAll('.bg-teal-500.text-white:not(.rounded-lg)'))
        .map(el => el.textContent);
      
      if (moodEmoji && moodLabel) {
        await axios.post('/api/journal/mood', {
          date: selectedDate,
          emoji: moodEmoji,
          label: moodLabel,
          tags: moodTags
        });
      }
      
      // Save sleep data if available
      const sleepQuality = document.querySelector('.ring-blue-500')?.querySelector('.text-xs')?.textContent;
      const sleepHoursEl = document.querySelector('input[type="range"]');
      const sleepHours = sleepHoursEl ? parseFloat(sleepHoursEl.value) : 7;
      
      if (sleepQuality) {
        await axios.post('/api/journal/sleep', {
          date: selectedDate,
          quality: sleepQuality,
          hours: sleepHours
        });
      }
      
      // Save activities if available
      const activities = Array.from(document.querySelectorAll('.bg-teal-100 span:not(.mr-1)'))
        .map(el => el.textContent);
      
      if (activities.length > 0) {
        await axios.post('/api/journal/activities', {
          date: selectedDate,
          activities
        });
      }
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error saving journal data:', error);
    } finally {
      setIsSaving(false);
    }
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
    <div className="relative max-w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Journal</h1>
        
        <div className="flex items-center space-x-2">
          {/* Save All Button */}
          <button
            onClick={saveAllJournalData}
            disabled={isSaving}
            className={`px-3 py-1 rounded-md text-sm flex items-center ${
              isSaving
                ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : 'bg-teal-500 text-white hover:bg-teal-600 transition-colors'
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Save All
              </>
            )}
          </button>
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1 text-sm ${
                viewMode === "timeline"
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 text-sm ${
                viewMode === "calendar"
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Calendar
            </button>
          </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            aria-label="Journal Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Timeline or Calendar view */}
      <div className="mb-6 overflow-x-auto overflow-y-hidden w-full">
        <div className="min-w-full">
        {viewMode === "timeline" ? (
          <JournalTimeline
            onSelectDate={(date) => {
              handleSelectDate(date);
              // Always allow editing regardless of date
              setIsEditing(true);
            }}
            timezone={timezone}
            refreshTrigger={refreshTrigger}
            autoScrollToLatest={true}
          />
        ) : (
          <JournalCalendar
            onSelectDate={(date) => {
              handleSelectDate(date);
              // Always allow editing regardless of date
              setIsEditing(true);
            }}
            timezone={timezone}
            refreshTrigger={refreshTrigger}
          />
        )}
        </div>
      </div>
      
      {/* Mobile layout - single column */}
      <div className="block md:hidden w-full">
        {/* FloCat Summary - Moved above text entry */}
        <div className="mb-6 w-full">
          <JournalSummary refreshTrigger={refreshTrigger} />
        </div>
        
        {/* Journal Entry */}
        <div className="mb-6 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md w-full overflow-hidden">
            {isSelectedToday || isEditing ? (
              <TodayEntry
                onSave={handleSaveEntry}
                date={selectedDate}
                timezone={timezone}
                showPrompts={true}
                activities={selectedActivities}
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
        
        {/* Wellbeing Tracking Section */}
        <div className="mb-6 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Wellbeing Tracking</h3>
            
            {/* Mood Tracker */}
            <div className="mb-6 w-full">
              <MoodTracker onSave={handleSaveMood} timezone={timezone} />
            </div>
            
            {/* Sleep Tracker */}
            <div className="mb-6 w-full">
              <SleepTracker
                onSave={handleSaveSleep}
                timezone={timezone}
                date={selectedDate}
              />
            </div>
            
            {/* Activity Tracker */}
            <div className="mb-6 w-full">
              <ActivityTracker
                onSave={handleSaveActivities}
                date={selectedDate}
                timezone={timezone}
              />
            </div>
            
            {/* On This Day */}
            <div className="mb-6 w-full">
              <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
            </div>
            
            {/* Linked Moments */}
            <div className="mb-6 w-full">
              <LinkedMoments date={selectedDate} timezone={timezone} />
            </div>
          </div>
          
        </div>
        
      </div>
      
      {/* Desktop layout - multi-column */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {/* Left column (2/3 width on desktop) - Journal Entry */}
        <div className="md:col-span-2 w-full space-y-6">
          {/* FloCat Summary - Moved above text entry */}
          <JournalSummary refreshTrigger={refreshTrigger} />
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md w-full">
            {isSelectedToday || isEditing ? (
              <TodayEntry
                onSave={handleSaveEntry}
                date={selectedDate}
                timezone={timezone}
                showPrompts={true}
                activities={selectedActivities}
              />
            ) : (
              <JournalEntryViewer
                date={selectedDate}
                onEdit={() => setIsEditing(true)}
                timezone={timezone}
              />
            )}
          </div>
          
          {/* On This Day */}
          <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
          
          {/* Linked Moments */}
          <LinkedMoments date={selectedDate} timezone={timezone} />
        </div>
        
        {/* Right column (1/3 width on desktop) - Wellbeing Tracking */}
        <div className="space-y-4 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Wellbeing Tracking</h3>
            
            {/* Mood Tracker */}
            <div className="mb-6">
              <MoodTracker onSave={handleSaveMood} timezone={timezone} />
            </div>
            
            {/* Sleep Tracker */}
            <div className="mb-6">
              <SleepTracker
                onSave={handleSaveSleep}
                timezone={timezone}
                date={selectedDate}
              />
            </div>
            
            {/* Activity Tracker */}
            <div className="mb-6">
              <ActivityTracker
                onSave={handleSaveActivities}
                date={selectedDate}
                timezone={timezone}
              />
            </div>
          </div>
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
      
      {/* Journal Settings Modal */}
      {showSettings && (
        <JournalSettings onClose={() => setShowSettings(false)} />
      )}
      
      {/* Save success message */}
      {saveSuccess && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center text-sm shadow-lg animate-fade-in-out">
          All journal data saved successfully! ✅
        </div>
      )}
    </div>
  );
}