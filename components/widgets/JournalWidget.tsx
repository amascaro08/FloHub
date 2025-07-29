'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import type { WidgetProps } from '@/types/app';
import { 
  Save, 
  BookOpen, 
  Clock,
  X,
  Plus,
  ChevronRight,
  PenTool,
  CalendarDays
} from 'lucide-react';
import { getCurrentDate } from '@/lib/dateUtils';
import axios from 'axios';

interface JournalEntry {
  content: string;
  timestamp: string;
}

const JournalWidget: React.FC<WidgetProps> = ({ size = 'medium', colSpan = 4, rowSpan = 3, isCompact = false, isHero = false } = {}) => {
  const { user } = useUser();
  const [quickEntry, setQuickEntry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get timezone and current date
  const [userSettings, setUserSettings] = useState<any>(null);
  const timezone = userSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = getCurrentDate(timezone);

  // Load user settings for timezone
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (user?.primaryEmail) {
        try {
          const response = await fetch('/api/userSettings');
          if (response.ok) {
            const settings = await response.json();
            setUserSettings(settings);
          }
        } catch (error) {
          console.error('Error fetching user settings:', error);
        }
      }
    };

    fetchUserSettings();
  }, [user?.primaryEmail]);

  // Load recent journal entries
  useEffect(() => {
    const fetchRecentEntries = async () => {
      if (user?.primaryEmail && timezone) {
        setIsLoading(true);
        try {
          // Get entries for the last 7 days
          const dates = [];
          for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
          }

          const response = await axios.post('/api/journal/entries/batch', { dates });
          const entries = response.data || [];
          
          // Transform entries and sort by date
          const transformedEntries = entries
            .filter((entry: any) => entry.content && entry.content.trim())
            .map((entry: any) => ({
              content: entry.content,
              timestamp: entry.createdAt || entry.timestamp || new Date().toISOString(),
              date: entry.date
            }))
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 3); // Show only 3 most recent

          setRecentEntries(transformedEntries);
        } catch (error) {
          console.error('Error fetching recent entries:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (user?.primaryEmail && timezone) {
      fetchRecentEntries();
    }
  }, [user?.primaryEmail, timezone]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [quickEntry]);

  const handleSaveEntry = async () => {
    if (!quickEntry.trim() || !user?.primaryEmail) return;

    setIsSaving(true);
    try {
      // Get current day's entry first
      const currentEntryResponse = await axios.get(`/api/journal/entry?date=${today}`);
      const currentContent = currentEntryResponse.data?.content || '';
      
      // Append new entry with timestamp
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newEntryText = `\n\n**${timestamp}** - ${quickEntry.trim()}`;
      const updatedContent = currentContent + newEntryText;

      // Save to journal
      await axios.post('/api/journal/entry', {
        date: today,
        content: updatedContent,
        timestamp: new Date().toISOString()
      });

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Clear form and refresh entries
      setQuickEntry('');
      setShowEntryForm(false);
      
      // Refresh recent entries
      const response = await axios.post('/api/journal/entries/batch', { 
        dates: [today] 
      });
      if (response.data && response.data.length > 0) {
        setRecentEntries(prev => [
          {
            content: updatedContent,
            timestamp: new Date().toISOString(),
            date: today
          },
          ...prev.filter((entry: any) => entry.date !== today)
        ].slice(0, 3));
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSaveEntry();
    }
  };

  const quickAddEntry = () => {
    const entry = prompt("Quick journal entry:");
    if (entry && entry.trim()) {
      setQuickEntry(entry.trim());
      handleSaveEntry();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  // Truncate content for preview
  const truncateContent = (content: string, limit: number = 100) => {
    // Remove HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '').replace(/\*\*/g, '');
    if (textContent.length <= limit) return textContent;
    return textContent.slice(0, limit) + '...';
  };

  const navigateToJournal = () => {
    window.location.href = '/dashboard/journal';
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-primary-500" />
        </div>
        <p className="text-grey-tint font-body">Please sign in to use journal.</p>
      </div>
    );
  }

  return (
    <div className={`${isCompact ? 'space-y-2' : 'space-y-4'} h-full flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-primary-500" />
          <h3 className={`${isCompact ? 'text-sm' : 'text-lg'} font-heading font-semibold text-dark-base dark:text-soft-white`}>
            Journal
          </h3>
        </div>
        <button
          onClick={navigateToJournal}
          className="p-1 text-grey-tint hover:text-primary-500 transition-colors"
          title="Open full journal"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Entry Form */}
      {(!isCompact || showEntryForm) && (
        <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} flex-shrink-0`}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={quickEntry}
              onChange={(e) => setQuickEntry(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Quick journal entry..."
              className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
                isCompact ? 'min-h-[60px]' : 'min-h-[80px]'
              }`}
              rows={isCompact ? 2 : 3}
            />
            
            {/* Close button for compact mode */}
            {isCompact && (
              <button
                onClick={() => setShowEntryForm(false)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSaveEntry}
              disabled={!quickEntry.trim() || isSaving}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-1 text-sm"
            >
              {isSaving ? (
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className={`${isCompact ? 'hidden' : 'inline'}`}>
                {isSaving ? 'Saving...' : 'Save'}
              </span>
            </button>

            {!isCompact && (
              <div className="text-xs text-grey-tint">
                ⌘+Enter to save
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact mode: Add entry button */}
      {isCompact && !showEntryForm && (
        <div className="flex-shrink-0 flex space-x-2">
          <button
            onClick={() => setShowEntryForm(true)}
            className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 flex items-center justify-center space-x-1 text-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Add Entry</span>
          </button>
          <button
            onClick={quickAddEntry}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-sm"
          >
            Quick
          </button>
        </div>
      )}

      {/* Recent Entries */}
      <div className={`${isCompact ? 'space-y-2' : 'space-y-3'} flex-1 overflow-y-auto min-h-0`}>
        {recentEntries.length > 0 && (
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-dark-base dark:text-soft-white flex items-center space-x-2">
              <CalendarDays className="w-4 h-4 text-primary-500" />
              <span>{isCompact ? `Recent (${recentEntries.length})` : `Recent Entries (${recentEntries.length})`}</span>
            </h4>
          </div>
        )}

        <div className={`${isCompact ? 'space-y-1' : 'space-y-2'}`}>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            recentEntries.map((entry, index) => (
              <div
                key={index}
                className={`${
                  isCompact ? 'p-2' : 'p-3'
                } bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 group hover:shadow-sm transition-all duration-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Entry content with expand/collapse */}
                    <div className="mb-2">
                      {isCompact || (entry.content.length <= 100) || expandedEntry === `${index}` ? (
                        <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-dark-base dark:text-soft-white whitespace-pre-wrap leading-relaxed`}>
                          {isCompact ? truncateContent(entry.content, 60) : (expandedEntry === `${index}` ? entry.content.replace(/<[^>]*>/g, '').replace(/\*\*/g, '') : truncateContent(entry.content, 100))}
                        </p>
                      ) : (
                        <div>
                          <p className="text-sm text-dark-base dark:text-soft-white whitespace-pre-wrap leading-relaxed">
                            {truncateContent(entry.content, 100)}
                          </p>
                          <button
                            onClick={() => setExpandedEntry(`${index}`)}
                            className="text-xs text-primary-500 hover:text-primary-600 transition-colors mt-1"
                          >
                            Show more
                          </button>
                        </div>
                      )}
                      {expandedEntry === `${index}` && entry.content.length > 100 && (
                        <button
                          onClick={() => setExpandedEntry(null)}
                          className="text-xs text-primary-500 hover:text-primary-600 transition-colors mt-1"
                        >
                          Show less
                        </button>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    <div className="flex items-center">
                      <span className={`${isCompact ? 'text-xs' : 'text-xs'} text-grey-tint flex items-center space-x-1`}>
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(entry.timestamp)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Empty State */}
        {!isLoading && recentEntries.length === 0 && (
          <div className="text-center py-6">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <PenTool className="w-5 h-5 text-primary-500" />
            </div>
            <p className="text-grey-tint font-body text-sm">
              No journal entries yet. Write your first entry above!
            </p>
            <button
              onClick={navigateToJournal}
              className="mt-2 text-xs text-primary-500 hover:text-primary-600 transition-colors"
            >
              Open full journal
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg text-sm z-50">
          Entry added to today's journal! ✨
        </div>
      )}
    </div>
  );
};

export default JournalWidget;