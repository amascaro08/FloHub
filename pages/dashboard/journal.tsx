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
import JournalImport from "@/components/journal/JournalImport";

export default function JournalPage() {
  const { user, isLoading } = useUser();
  const status = user ? "authenticated" : "unauthenticated";
  const router = useRouter();

  // Handle loading state
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-teal-200 dark:bg-teal-800 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading your journal...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated state
  if (status !== 'authenticated' || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-slate-600 dark:text-slate-300">Please sign in to access your journal.</p>
        </div>
      </div>
    );
  }

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [showNewEntryButton, setShowNewEntryButton] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setShowNewEntryButton(mobile);
      setSidebarOpen(!mobile); // Sidebar open by default on desktop
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
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle saving mood
  const handleSaveMood = (mood: { emoji: string; label: string; tags: string[] }) => {
    console.log("Saving mood:", mood);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle saving activities
  const handleSaveActivities = (activities: string[]) => {
    console.log("Saving activities:", activities);
    setSelectedActivities(activities);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle saving sleep data
  const handleSaveSleep = (sleep: { quality: string; hours: number }) => {
    console.log("Saving sleep data:", sleep);
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle selecting a date from the timeline
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setIsEditing(true);
    console.log("Selected date:", date);
  };

  // Handle import success
  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowImport(false);
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
      
      {/* Main Container with FloHub gradient background */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        
        {/* Mobile Header */}
        <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Journal</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(selectedDate, timezone, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={saveAllJournalData}
                disabled={isSaving}
                className={`p-2 rounded-xl transition-all ${
                  isSaving
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                    : 'bg-[#00C9A7] text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30'
                }`}
              >
                {isSaving ? (
                  <div className="animate-spin h-5 w-5 border-2 border-slate-400 rounded-full border-t-transparent"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-screen lg:h-auto">
          {/* Sidebar */}
          <div className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:relative z-30 w-80 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out overflow-y-auto`}>
            
            {/* Desktop Header */}
            <div className="hidden lg:block p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                    <span className="text-3xl mr-3">📔</span>
                    Journal
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {selectedDate === today ? "Today's" : formatDate(selectedDate, timezone, { weekday: 'long', month: 'long', day: 'numeric' })} Entry
                  </p>
                </div>
                <div className="w-3 h-12 bg-gradient-to-b from-[#00C9A7] to-[#FF6B6B] rounded-full"></div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={saveAllJournalData}
                  disabled={isSaving}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isSaving
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-[#00C9A7] text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105'
                  }`}
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-slate-400 rounded-full border-t-transparent mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save All
                    </div>
                  )}
                </button>
                
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title="Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setShowImport(true)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  title="Import Data"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 p-1">
                <button
                  onClick={() => setViewMode("timeline")}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    viewMode === "timeline"
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Timeline
                  </div>
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    viewMode === "calendar"
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    Calendar
                  </div>
                </button>
              </div>
            </div>
            
            {/* Timeline/Calendar Container */}
            <div className="p-4">
              {viewMode === "timeline" ? (
                <JournalTimeline
                  onSelectDate={handleSelectDate}
                  timezone={timezone}
                  autoScrollToLatest={true}
                />
              ) : (
                <JournalCalendar
                  onSelectDate={handleSelectDate}
                  timezone={timezone}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </div>

            {/* Quick Stats */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <JournalSummary refreshTrigger={refreshTrigger} />
            </div>

            {/* FloCat Insights */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="bg-gradient-to-br from-[#00C9A7]/10 to-[#FF6B6B]/10 dark:from-[#00C9A7]/20 dark:to-[#FF6B6B]/20 rounded-2xl p-4">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">🐱</span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">FloCat Says</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  "Looking good! You've been consistent with your journaling. Keep the momentum going! 🌟"
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4 lg:p-8">
              
              {/* Mobile Quick Actions */}
              <div className={`lg:hidden transition-all duration-300 overflow-hidden ${
                sidebarOpen ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
              }`}>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <svg className="w-5 h-5 mr-2 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Settings</span>
                  </button>
                  
                  <button
                    onClick={() => setShowImport(true)}
                    className="flex items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <svg className="w-5 h-5 mr-2 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Import</span>
                  </button>
                </div>
              </div>

              {/* Main Entry Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 mb-6 overflow-hidden">
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

              {/* Wellbeing Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Mood & Sleep */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                        <span className="text-2xl mr-3">💭</span>
                        How are you feeling?
                      </h3>
                      <div className="w-1 h-8 bg-gradient-to-b from-[#00C9A7] to-[#FF6B6B] rounded-full"></div>
                    </div>
                    
                    <div className="space-y-6">
                      <MoodTracker onSave={handleSaveMood} timezone={timezone} />
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                        <SleepTracker
                          onSave={handleSaveSleep}
                          timezone={timezone}
                          date={selectedDate}
                        />
                      </div>
                    </div>
                  </div>

                  {/* On This Day */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
                    <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Activities */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                        <span className="text-2xl mr-3">🎯</span>
                        Activities
                      </h3>
                      <div className="w-1 h-8 bg-gradient-to-b from-[#00C9A7] to-[#FF6B6B] rounded-full"></div>
                    </div>
                    
                    <ActivityTracker
                      onSave={handleSaveActivities}
                      date={selectedDate}
                      timezone={timezone}
                    />
                  </div>

                  {/* Linked Moments */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6">
                    <LinkedMoments date={selectedDate} timezone={timezone} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Buttons */}
        {isMobile && (
          <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-20">
            {/* New Entry Button */}
            <button
              className="w-14 h-14 rounded-full bg-[#00C9A7] text-white flex items-center justify-center shadow-xl shadow-teal-500/25 hover:shadow-2xl hover:shadow-teal-500/30 transition-all duration-300 hover:scale-110"
              onClick={() => {
                setSelectedDate(today);
                setIsEditing(true);
                setSidebarOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            {/* Edit/View Toggle */}
            {!isSelectedToday && (
              <button
                className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )}
              </button>
            )}
            
            {/* Voice Note Button */}
            <button
              className="w-12 h-12 rounded-full bg-[#FF6B6B] text-white flex items-center justify-center shadow-lg shadow-red-500/25 transition-all duration-300 hover:scale-110"
              onClick={() => alert("Voice notes coming soon! 🎤")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        )}

        {/* Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Modals */}
        {showSettings && (
          <JournalSettings onClose={() => setShowSettings(false)} />
        )}
        
        {showImport && (
          <JournalImport 
            onClose={() => setShowImport(false)}
            onSuccess={handleImportSuccess}
          />
        )}

        {/* Success Message */}
        {saveSuccess && (
          <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-gradient-to-r from-[#00C9A7] to-teal-600 text-white rounded-2xl shadow-xl border border-teal-300 animate-fade-in-out z-50">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">All journal data saved successfully! ✨</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}