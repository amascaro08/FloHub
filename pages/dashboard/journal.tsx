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
import FloCatInsights from "@/components/journal/FloCatInsights";

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
  const [isEditing, setIsEditing] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<"today" | "timeline" | "insights" | "settings">("today");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);
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
    setActiveTab("today"); // Switch to today tab when selecting a date
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

  const tabs = [
    { id: 'today', label: 'Today', icon: '✍️' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'insights', label: 'Insights', icon: '🐱' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/styles/journal.css" />
      </Head>
      
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center">
                  <span className="text-4xl mr-3">📔</span>
                  Journal
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedDate === today 
                    ? "Today's entry" 
                    : `${formatDate(selectedDate, timezone, { weekday: 'long', month: 'long', day: 'numeric' })} entry`
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowImport(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                >
                  Import Data
                </button>
                
                <button
                  onClick={saveAllJournalData}
                  disabled={isSaving}
                  className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                    isSaving
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-[#00C9A7] text-white hover:bg-teal-600 shadow-lg shadow-teal-500/25'
                  }`}
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 border-2 border-slate-400 rounded-full border-t-transparent mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save All
                    </div>
                  )}
                </button>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-[#00C9A7] text-[#00C9A7] bg-[#00C9A7]/5'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{tab.icon}</span>
                    {tab.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Today Tab */}
          {activeTab === 'today' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Main Entry */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
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

              {/* Wellbeing Tracking */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mood */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">😊</span>
                    Mood
                  </h3>
                  <MoodTracker onSave={handleSaveMood} timezone={timezone} />
                </div>

                {/* Activities */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">🎯</span>
                    Activities
                  </h3>
                  <ActivityTracker
                    onSave={handleSaveActivities}
                    date={selectedDate}
                    timezone={timezone}
                  />
                </div>

                {/* Sleep */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">😴</span>
                    Sleep
                  </h3>
                  <SleepTracker
                    onSave={handleSaveSleep}
                    timezone={timezone}
                    date={selectedDate}
                  />
                </div>
              </div>

              {/* On This Day */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Your Journal Timeline</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('today')}
                      className="px-4 py-2 rounded-xl bg-[#00C9A7] text-white text-sm font-medium hover:bg-teal-600 transition-colors"
                    >
                      Back to Today
                    </button>
                  </div>
                </div>
                <JournalTimeline
                  onSelectDate={handleSelectDate}
                  timezone={timezone}
                  autoScrollToLatest={true}
                />
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <JournalCalendar
                  onSelectDate={handleSelectDate}
                  timezone={timezone}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <FloCatInsights 
                refreshTrigger={refreshTrigger}
                timezone={timezone}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <JournalSummary refreshTrigger={refreshTrigger} />
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <MoodStatistics refreshTrigger={refreshTrigger} />
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <JournalSettings onClose={() => setActiveTab('today')} />
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button (Mobile) */}
        {isMobile && activeTab === 'today' && (
          <button
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#00C9A7] text-white flex items-center justify-center shadow-xl shadow-teal-500/25 hover:shadow-2xl hover:shadow-teal-500/30 transition-all duration-300 hover:scale-110 z-20"
            onClick={() => {
              setSelectedDate(today);
              setIsEditing(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {/* Import Modal */}
        {showImport && (
          <JournalImport 
            onClose={() => setShowImport(false)}
            onSuccess={handleImportSuccess}
          />
        )}

        {/* Success Message */}
        {saveSuccess && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-gradient-to-r from-[#00C9A7] to-teal-600 text-white rounded-2xl shadow-xl border border-teal-300 animate-fade-in-out z-50">
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