import React, { useState } from 'react';
import { Note } from '@/types/app';
import { 
  XMarkIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';

interface AddToSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  seriesName: string;
  availableMeetings: Note[];
  onSave: (meetingIds: string[]) => Promise<void>;
  isSaving?: boolean;
}

export default function AddToSeriesModal({
  isOpen,
  onClose,
  seriesName,
  availableMeetings,
  onSave,
  isSaving = false
}: AddToSeriesModalProps) {
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter meetings that aren't already in this series and match search
  const filteredMeetings = availableMeetings.filter(meeting => {
    const matchesSearch = !searchTerm || 
      meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isNotInSeries = meeting.meetingSeries !== seriesName;
    
    return matchesSearch && isNotInSeries;
  });

  const handleToggleMeeting = (meetingId: string) => {
    setSelectedMeetingIds(prev => 
      prev.includes(meetingId) 
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    );
  };

  const handleSave = async () => {
    if (selectedMeetingIds.length === 0) return;
    
    try {
      await onSave(selectedMeetingIds);
      setSelectedMeetingIds([]);
      setSearchTerm('');
      onClose();
    } catch (error) {
      console.error('Error adding meetings to series:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Add Meetings to Series</h2>
              <p className="text-white/80 text-sm">Add existing meetings to "{seriesName}"</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              disabled={isSaving}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search meetings..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Meeting List */}
        <div className="flex-1 overflow-y-auto max-h-96 p-6">
          {filteredMeetings.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No meetings found' : 'No available meetings'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'All meetings are already in a series or no meetings exist'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all
                    ${selectedMeetingIds.includes(meeting.id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }
                  `}
                  onClick={() => handleToggleMeeting(meeting.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {meeting.title || meeting.eventTitle || 'Untitled Meeting'}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <CalendarDaysIcon className="w-4 h-4" />
                          <span>{formatDate(meeting.createdAt)}</span>
                        </div>
                        {meeting.meetingSeries && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            In: {meeting.meetingSeries}
                          </span>
                        )}
                      </div>
                      {meeting.aiSummary && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                          {meeting.aiSummary}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        ${selectedMeetingIds.includes(meeting.id)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                        }
                      `}>
                        {selectedMeetingIds.includes(meeting.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {selectedMeetingIds.length} meeting{selectedMeetingIds.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={selectedMeetingIds.length === 0 || isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Adding...' : `Add ${selectedMeetingIds.length} Meeting${selectedMeetingIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}