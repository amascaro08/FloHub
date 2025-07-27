"use client";

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { getCurrentDate, formatDate } from "@/lib/dateUtils";
import axios from "axios";
import { useUser } from "@/lib/hooks/useUser";
import MainLayout from "@/components/ui/MainLayout";
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
import { 
  PlusIcon, 
  BookOpenIcon,
  CalendarDaysIcon,
  SparklesIcon,
  CogIcon
} from '@heroicons/react/24/solid';

export default function JournalPage() {
  const { user, isLoading } = useUser();
  const status = user ? "authenticated" : "unauthenticated";
  const router = useRouter();

  // Handle loading state and authentication logic inside the single MainLayout wrapper

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
    { id: 'today', label: 'Today', icon: BookOpenIcon },
    { id: 'timeline', label: 'Timeline', icon: CalendarDaysIcon },
    { id: 'insights', label: 'FloCat Insights', icon: SparklesIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  return (
    <MainLayout requiresAuth={true}>
      <Head>
        <title>Journal | FlowHub</title>
        <meta name="description" content="Capture your thoughts, track moods, and reflect on your journey with FlowHub's intelligent journal" />
      </Head>
      
      {/* Loading state */}
      {status === 'unauthenticated' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full mx-auto mb-4"></div>
            <p className="text-grey-tint">Loading your journal...</p>
          </div>
        </div>
      )}

      {/* Unauthenticated state */}
      {(status !== 'authenticated' || !user) && status !== 'unauthenticated' && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <p className="text-grey-tint">Please sign in to access your journal.</p>
          </div>
        </div>
      )}

      {/* Main journal content */}
      {status === 'authenticated' && user && (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg">📔</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
              Journal
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-grey-tint hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              <span className="hidden sm:inline">Import Data</span>
              <span className="sm:hidden">Import</span>
            </button>
            
            <button
              onClick={saveAllJournalData}
              disabled={isSaving}
              className={`inline-flex items-center px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                isSaving
                  ? 'bg-gray-100 dark:bg-gray-700 text-grey-tint cursor-not-allowed'
                  : 'bg-primary-500 hover:bg-primary-600 text-white'
              }`}
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-grey-tint rounded-full border-t-transparent mr-2"></div>
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">Save All</span>
                  <span className="sm:hidden">Save</span>
                </div>
              )}
            </button>
          </div>
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
                  {tab.id === 'today' ? 'Today' : tab.id === 'timeline' ? 'Time' : tab.id === 'insights' ? '😺' : 'Set'}
                </span>
              </button>
            ))}
          </div>

          {/* Date indicator */}
          <div className="mb-6">
            <p className="text-sm text-grey-tint">
              {selectedDate === today 
                ? "Today's entry" 
                : `${formatDate(selectedDate, timezone, { weekday: 'long', month: 'long', day: 'numeric' })} entry`
              }
            </p>
          </div>

          {/* Content based on current view */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              {/* Main Entry */}
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 overflow-hidden">
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
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">😊</span>
                    Mood
                  </h3>
                  <MoodTracker onSave={handleSaveMood} timezone={timezone} />
                </div>

                {/* Activities */}
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
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
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
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
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-heading font-semibold text-dark-base dark:text-soft-white">Your Journal Timeline</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setActiveTab('today')}
                      className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <span className="hidden sm:inline">Back to Today</span>
                      <span className="sm:hidden">Today</span>
                    </button>
                  </div>
                </div>
                <JournalTimeline
                  onSelectDate={handleSelectDate}
                  timezone={timezone}
                  autoScrollToLatest={true}
                />
              </div>
              
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
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
            <div className="space-y-6">
              <FloCatInsights 
                refreshTrigger={refreshTrigger}
                timezone={timezone}
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <JournalSummary refreshTrigger={refreshTrigger} />
                </div>
                
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <MoodStatistics refreshTrigger={refreshTrigger} />
                </div>

                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">😴</span>
                    Sleep Insights
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Avg Sleep Hours</span>
                      <span className="font-medium text-dark-base dark:text-soft-white">7.5h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Sleep Quality</span>
                      <span className="font-medium text-dark-base dark:text-soft-white">Good</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Consistency</span>
                      <span className="font-medium text-dark-base dark:text-soft-white">85%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">🎯</span>
                    Activity Patterns
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Most Frequent</span>
                      <span className="font-medium text-dark-base dark:text-soft-white">Exercise (12x)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Activity Variety</span>
                      <span className="font-medium text-dark-base dark:text-soft-white">8 different</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Active Days</span>
                      <span className="font-medium text-dark-base dark:text-soft-white">22/30</span>
                    </div>
                  </div>
                </div>

                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">📈</span>
                    Trends
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Mood Trend</span>
                      <span className="font-medium text-green-600 dark:text-green-400">↗ Improving</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Sleep Trend</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">→ Stable</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-grey-tint">Activity Trend</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">↗ Increasing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 overflow-hidden">
              <JournalSettings onClose={() => setActiveTab('today')} />
            </div>
          )}

        {/* Floating Action Button (Mobile) */}
        {isMobile && activeTab === 'today' && (
          <button
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 z-20"
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
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-2xl shadow-xl border border-primary-300 animate-fade-in-out z-50">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">All journal data saved successfully! ✨</span>
            </div>
          </div>
        )}
      </div>
      )}
    </MainLayout>
  );
}