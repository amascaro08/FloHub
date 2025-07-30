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
import SleepInsights from "@/components/journal/SleepInsights";
import ActivityPatterns from "@/components/journal/ActivityPatterns";
import Trends from "@/components/journal/Trends";
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

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-primary-200 dark:bg-primary-800 rounded-full mx-auto mb-4"></div>
          <p className="text-grey-tint">Loading your journal...</p>
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
          <p className="text-grey-tint">Please sign in to access your journal.</p>
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
  const [clearSuccess, setClearSuccess] = useState(false);
  const [showClearEntryModal, setShowClearEntryModal] = useState(false);
  const [clearingEntry, setClearingEntry] = useState(false);
  const [clearEntryStep, setClearEntryStep] = useState(1);
  const [componentsLoaded, setComponentsLoaded] = useState({
    main: false,
    wellbeing: false,
    onThisDay: false
  });
  
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
    if (timezone) {
      const todayInUserTimezone = getCurrentDate(timezone);
      if (!selectedDate || selectedDate !== todayInUserTimezone) {
        setSelectedDate(todayInUserTimezone);
      }
    }
  }, [timezone]);

  // Progressive loading - load main component first
  useEffect(() => {
    if (timezone && selectedDate) {
      // Mark main component as ready to load
      setComponentsLoaded(prev => ({ ...prev, main: true }));
      
      // Load wellbeing section after a short delay
      setTimeout(() => {
        setComponentsLoaded(prev => ({ ...prev, wellbeing: true }));
      }, 100);
      
      // Load "On This Day" section last
      setTimeout(() => {
        setComponentsLoaded(prev => ({ ...prev, onThisDay: true }));
      }, 300);
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

  // Handle journal cleared from settings
  const handleJournalCleared = () => {
    // Clear all local cache
    invalidateCache();
    
    // Reset to today's date
    setSelectedDate(today);
    setIsEditing(true);
    
    // Show clear success message
    setClearSuccess(true);
    setTimeout(() => setClearSuccess(false), 3000);
    
    // Force multiple refreshes to ensure everything updates
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setRefreshTrigger(prev => prev + 1), 100);
    setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
    
    // Switch back to today tab
    setActiveTab('today');
  };

  // Function to invalidate cache for better performance
  const invalidateCache = () => {
    if (typeof window !== 'undefined') {
      // Clear journal calendar cache for current month
      const currentMonth = new Date();
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const cacheKey = `journal_calendar_${year}_${month}_${user.primaryEmail}`;
      localStorage.removeItem(cacheKey);
      
      // Clear insights cache if it exists
      localStorage.removeItem(`journal_insights_${user.primaryEmail}`);
      
      // Clear other month caches that might be affected
      for (let i = -1; i <= 1; i++) {
        const targetMonth = new Date(year, month + i);
        const targetYear = targetMonth.getFullYear();
        const targetMonthNum = targetMonth.getMonth();
        const targetCacheKey = `journal_calendar_${targetYear}_${targetMonthNum}_${user.primaryEmail}`;
        localStorage.removeItem(targetCacheKey);
      }
    }
  };

  // Function to clear all journal data for a specific date
  const clearEntryData = async () => {
    if (!user?.primaryEmail) return;
    
    setClearingEntry(true);
    
    try {
      // Call the clear-entry API endpoint
      const response = await axios.delete(`/api/journal/clear-entry?date=${selectedDate}`);
      
      if (response.data.success) {
        // Clear cache to ensure fresh data is loaded
        invalidateCache();
        
        // Clear any localStorage data for this date
        if (typeof window !== 'undefined') {
          const dateKey = selectedDate;
          // Clear all journal data for this specific date from localStorage
          Object.keys(localStorage).forEach(key => {
            if (key.includes(user.primaryEmail) && key.includes(dateKey)) {
              localStorage.removeItem(key);
            }
          });
        }
        
        // Close modal and reset step first
        setShowClearEntryModal(false);
        setClearEntryStep(1);
        
        // Show clear success message
        setClearSuccess(true);
        setTimeout(() => setClearSuccess(false), 3000);
        
        // Force immediate refresh of all components
        setRefreshTrigger(prev => prev + 1);
        
        // Force additional refreshes to ensure all components update
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 100);
        
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 500);
      }
    } catch (error) {
      console.error('Error clearing journal entry:', error);
    } finally {
      setClearingEntry(false);
    }
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
      
      // Clear cache to ensure fresh data is loaded
      invalidateCache();
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Trigger refresh for all components including calendar and insights
      setRefreshTrigger(prev => prev + 1);
      
      // Force additional refresh after a short delay to ensure all data is saved and refreshed
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error saving journal data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'today', label: 'Today', icon: BookOpenIcon },
    { id: 'timeline', label: 'Calendar', icon: CalendarDaysIcon },
    { id: 'insights', label: 'FloCat Insights', icon: SparklesIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  return (
    <>
      <Head>
        <title>Journal | FlowHub</title>
        <meta name="description" content="Capture your thoughts, track moods, and reflect on your journey with FlowHub's intelligent journal" />
      </Head>
      
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
                  {tab.id === 'today' ? 'Today' : tab.id === 'timeline' ? 'Cal' : tab.id === 'insights' ? '😺' : 'Set'}
                </span>
              </button>
            ))}
          </div>

          {/* Content based on current view */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              {/* Date selector */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-grey-tint">
                    {selectedDate === today 
                      ? "Today's entry" 
                      : `${formatDate(selectedDate, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} entry`
                    }
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const date = new Date(selectedDate);
                        date.setDate(date.getDate() - 1);
                        const prevDate = formatDate(date.toISOString(), timezone, {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
                        handleSelectDate(prevDate);
                      }}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="Previous day"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleSelectDate(e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-dark-base dark:text-soft-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    
                    <button
                      onClick={() => {
                        const date = new Date(selectedDate);
                        date.setDate(date.getDate() + 1);
                        const nextDate = formatDate(date.toISOString(), timezone, {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
                        if (nextDate <= today) {
                          handleSelectDate(nextDate);
                        }
                      }}
                      disabled={selectedDate >= today}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Next day"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {selectedDate !== today && (
                      <button
                        onClick={() => handleSelectDate(today)}
                        className="px-3 py-1 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        Today
                      </button>
                    )}
                    
                    <button
                      onClick={() => setShowClearEntryModal(true)}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
                      title="Clear all data for this date"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              {/* Main Entry */}
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 overflow-hidden">
                {componentsLoaded.main ? (
                  isSelectedToday || isEditing ? (
                    <TodayEntry
                      key={`today-entry-${selectedDate}-${refreshTrigger}`}
                      onSave={handleSaveEntry}
                      date={selectedDate}
                      timezone={timezone}
                      showPrompts={true}
                      activities={selectedActivities}
                    />
                  ) : (
                    <JournalEntryViewer
                      key={`entry-viewer-${selectedDate}-${refreshTrigger}`}
                      date={selectedDate}
                      onEdit={() => setIsEditing(true)}
                      timezone={timezone}
                    />
                  )
                ) : (
                  <div className="p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wellbeing Tracking */}
              {componentsLoaded.wellbeing ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Mood */}
                  <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                    <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
                      <span className="text-2xl mr-3">😊</span>
                      Mood
                    </h3>
                    <MoodTracker key={`mood-${selectedDate}-${refreshTrigger}`} onSave={handleSaveMood} timezone={timezone} date={selectedDate} />
                  </div>

                  {/* Activities */}
                  <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                    <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-4 flex items-center">
                      <span className="text-2xl mr-3">🎯</span>
                      Activities
                    </h3>
                    <ActivityTracker
                      key={`activities-${selectedDate}-${refreshTrigger}`}
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
                      key={`sleep-${selectedDate}-${refreshTrigger}`}
                      onSave={handleSaveSleep}
                      timezone={timezone}
                      date={selectedDate}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* On This Day */}
              {componentsLoaded.onThisDay ? (
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <OnThisDay onViewEntry={handleSelectDate} timezone={timezone} />
                </div>
              ) : (
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-heading font-semibold text-dark-base dark:text-soft-white">Your Journal Calendar</h3>
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
                <JournalCalendar
                  key={`calendar-${refreshTrigger}`}
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
                  <SleepInsights refreshTrigger={refreshTrigger} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <ActivityPatterns refreshTrigger={refreshTrigger} />
                </div>

                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 p-6">
                  <Trends refreshTrigger={refreshTrigger} />
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 overflow-hidden">
              <JournalSettings onClose={() => setActiveTab('today')} onJournalCleared={handleJournalCleared} />
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

        {/* Clear Entry Confirmation Modal */}
        {showClearEntryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                {clearEntryStep === 1 && (
                  <>
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clear Journal Entry?</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Are you sure you want to clear all journal data for{' '}
                      <span className="font-semibold">
                        {formatDate(selectedDate, timezone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>?
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      This will permanently delete:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 mb-6 space-y-1 ml-4">
                      <li>• Journal entry content</li>
                      <li>• Mood tracking data</li>
                      <li>• Activity records</li>
                      <li>• Sleep tracking data</li>
                    </ul>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowClearEntryModal(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setClearEntryStep(2)}
                        className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}

                {clearEntryStep === 2 && (
                  <>
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Final Confirmation</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      <strong>This action cannot be undone!</strong>
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      All data for this date will be permanently deleted from your journal.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setClearEntryStep(1)}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Go Back
                      </button>
                      <button
                        onClick={clearEntryData}
                        disabled={clearingEntry}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        {clearingEntry ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                            Clearing...
                          </>
                        ) : (
                          'Clear All Data'
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
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

        {/* Clear Success Message */}
        {clearSuccess && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl shadow-xl border border-red-300 animate-fade-in-out z-50">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Journal data cleared successfully! 🗑️</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}