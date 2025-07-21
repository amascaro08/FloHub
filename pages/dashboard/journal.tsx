"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getCurrentDate, formatDate } from "@/lib/dateUtils";
import axios from "axios";
import { useUser } from "@/lib/hooks/useUser";
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
   const { user, isLoading } = useUser();
  const status = user ? "authenticated" : "unauthenticated";

  const router = useRouter();

  // Handle loading state
  if (status === 'unauthenticated') {
    return <p className="text-center p-8">Loading journal...</p>;
  }

  // Handle unauthenticated state
  if (status !== 'authenticated' || !user) {
    return <p className="text-center p-8">Please sign in to access your journal.</p>;
  }

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
    user ? "/api/userSettings" : null,
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
    if (!user?.primaryEmail) return;
    
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
      const sleepHoursEl = document.querySelector('input[type="range"]') as HTMLInputElement;
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


  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/journal.css" />
      </Head>
      <div className="relative max-w-full">
        {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Journal</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {selectedDate === today ? "Today's" : formatDate(selectedDate, timezone, { weekday: 'long', month: 'long', day: 'numeric' })} Entry
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Save All Button */}
          <button
            onClick={saveAllJournalData}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-all ${
              isSaving
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-md'
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-gray-400 rounded-full border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Save All
              </>
            )}
          </button>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "timeline"
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "calendar"
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Calendar
            </button>
          </div>
          
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Journal Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Timeline or Calendar view */}
      <div className="mb-8 overflow-x-auto overflow-y-hidden w-full custom-scrollbar timeline-scroll">
        <div className="min-w-full">
        {viewMode === "timeline" ? (
          <JournalTimeline
            onSelectDate={(date) => {
              handleSelectDate(date);
              // Always allow editing regardless of date
              setIsEditing(true);
            }}
            timezone={timezone}
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
      <div className="block md:hidden w-full space-y-6">
        {/* FloCat Summary */}
        <div className="w-full journal-card">
          <JournalSummary refreshTrigger={refreshTrigger} />
        </div>
        
        {/* Journal Entry */}
        <div className="w-full journal-card">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full overflow-hidden">
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
        <div className="w-full journal-card">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Wellbeing Tracking</h3>
              <div className="h-1 w-16 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"></div>
            </div>
            
            {/* Mood Tracker */}
            <div className="mb-8">
              <MoodTracker onSave={handleSaveMood} timezone={timezone} />
            </div>
            
            {/* Sleep Tracker */}
            <div className="mb-8">
              <SleepTracker
                onSave={handleSaveSleep}
                timezone={timezone}
                date={selectedDate}
              />
            </div>
            
            {/* Activity Tracker */}
            <div className="mb-8">
              <ActivityTracker
                onSave={handleSaveActivities}
                date={selectedDate}
                timezone={timezone}
              />
            </div>
            
            {/* On This Day */}
            <div className="mb-8">
              <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
            </div>
            
            {/* Linked Moments */}
            <div>
              <LinkedMoments date={selectedDate} timezone={timezone} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop layout - multi-column */}
      <div className="hidden md:grid md:grid-cols-3 gap-8">
        {/* Left column (2/3 width on desktop) - Journal Entry */}
        <div className="md:col-span-2 w-full space-y-6">
          {/* FloCat Summary */}
          <div className="journal-card">
            <JournalSummary refreshTrigger={refreshTrigger} />
          </div>
          
          {/* Main Entry */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 w-full journal-card">
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
          
          {/* Additional Sections */}
          <div className="space-y-6">
            <div className="journal-card">
              <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
            </div>
            <div className="journal-card">
              <LinkedMoments date={selectedDate} timezone={timezone} />
            </div>
          </div>
        </div>
        
        {/* Right column (1/3 width on desktop) - Wellbeing Tracking */}
        <div className="space-y-6 w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 journal-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Wellbeing</h3>
              <div className="h-1 w-12 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"></div>
            </div>
            
            {/* Mood Tracker */}
            <div className="mb-8">
              <MoodTracker onSave={handleSaveMood} timezone={timezone} />
            </div>
            
            {/* Sleep Tracker */}
            <div className="mb-8">
              <SleepTracker
                onSave={handleSaveSleep}
                timezone={timezone}
                date={selectedDate}
              />
            </div>
            
            {/* Activity Tracker */}
            <div>
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
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-600 text-white flex items-center justify-center z-10 hover:bg-teal-700 fab-button"
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
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center z-10 hover:bg-gray-200 dark:hover:bg-gray-600 fab-button"
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
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center z-10 hover:bg-gray-200 dark:hover:bg-gray-600 fab-button"
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
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-center text-sm shadow-lg border border-green-200 dark:border-green-700 animate-fade-in-out">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            All journal data saved successfully!
          </div>
        </div>
      )}
      </div>
    </>
  );
}