import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { Habit } from '@/types/habit-tracker';
import { TrashIcon } from '@heroicons/react/24/solid';

interface HabitFormProps {
  habit?: Habit | null;
  onSave: (habit: Habit) => void;
  onDelete?: (habitId: string) => void;
  onCancel: () => void;
}

const HabitForm: React.FC<HabitFormProps> = ({ 
  habit, 
  onSave, 
  onDelete, 
  onCancel 
}) => {
  const { user, isLoading } = useUser();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [color, setColor] = useState('#4fd1c5'); // Default teal color
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize form with habit data if editing
  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description || '');
      setFrequency(habit.frequency);
      setCustomDays(habit.customDays || []);
      setColor('#4fd1c5');
    }
  }, [habit]);

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const handleCustomDayToggle = (day: number) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter(d => d !== day));
    } else {
      setCustomDays([...customDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.primaryEmail) {
      setError('You must be logged in to create habits');
      return;
    }
    
    if (!name.trim()) {
      setError('Habit name is required');
      return;
    }
    
    if (frequency === 'custom' && customDays.length === 0) {
      setError('Please select at least one day for custom frequency');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      let savedHabit: Habit;
      
      if (habit) {
        // Update existing habit
        const updateResponse = await fetch(`/api/habits/${habit.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description: description || '',
            frequency,
            customDays: frequency === 'custom' ? customDays : []
          })
        });
        
        if (!updateResponse.ok) {
          throw new Error('Failed to update habit');
        }
        
        savedHabit = {
          ...habit,
          name,
          description: description || '',
          frequency,
          customDays: frequency === 'custom' ? customDays : [],
          updatedAt: Date.now()
        };
      } else {
        // Create new habit
        const createResponse = await fetch('/api/habits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            description: description || '',
            frequency,
            customDays: frequency === 'custom' ? customDays : []
          })
        });
        
        if (!createResponse.ok) {
          throw new Error('Failed to create habit');
        }
        
        savedHabit = await createResponse.json();
      }
      
      onSave(savedHabit);
    } catch (error) {
      console.error('Error saving habit:', error);
      setError('Failed to save habit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!habit || !onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
      setIsSubmitting(true);
      
      try {
        const deleteResponse = await fetch(`/api/habits/${habit.id}`, {
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete habit');
        }
        
        onDelete(habit.id);
      } catch (error) {
        console.error('Error deleting habit:', error);
        setError('Failed to delete habit. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 dark:bg-red-900 bg-opacity-100 dark:bg-opacity-50 text-red-700 dark:text-white p-3 rounded-lg text-sm transition-colors">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
          Habit Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          placeholder="e.g., Drink water, Exercise, Read"
          required
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          placeholder="Add details about your habit"
          rows={2}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
          Frequency *
        </label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="radio"
              id="daily"
              name="frequency"
              value="daily"
              checked={frequency === 'daily'}
              onChange={() => setFrequency('daily')}
              className="mr-2 text-teal-500 focus:ring-teal-500 transition-colors"
            />
            <label htmlFor="daily" className="text-gray-800 dark:text-white transition-colors">Daily</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="radio"
              id="weekly"
              name="frequency"
              value="weekly"
              checked={frequency === 'weekly'}
              onChange={() => setFrequency('weekly')}
              className="mr-2 text-teal-500 focus:ring-teal-500 transition-colors"
            />
            <label htmlFor="weekly" className="text-gray-800 dark:text-white transition-colors">Weekly (Sundays)</label>
          </div>
          
          <div className="flex items-center">
            <input
              type="radio"
              id="custom"
              name="frequency"
              value="custom"
              checked={frequency === 'custom'}
              onChange={() => setFrequency('custom')}
              className="mr-2 text-teal-500 focus:ring-teal-500 transition-colors"
            />
            <label htmlFor="custom" className="text-gray-800 dark:text-white transition-colors">Custom Days</label>
          </div>
        </div>
      </div>
      
      {frequency === 'custom' && (
        <div className="pl-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
            Select Days
          </label>
          <div className="grid grid-cols-2 gap-2">
            {daysOfWeek.map(day => (
              <div key={day.value} className="flex items-center">
                <input
                  type="checkbox"
                  id={`day-${day.value}`}
                  checked={customDays.includes(day.value)}
                  onChange={() => handleCustomDayToggle(day.value)}
                  className="mr-2 text-teal-500 focus:ring-teal-500 transition-colors"
                />
                <label htmlFor={`day-${day.value}`} className="text-gray-800 dark:text-white text-sm transition-colors">
                  {day.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">
          Color
        </label>
        <div className="flex items-center">
          <input
            type="color"
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-10 rounded-lg border-0 p-0 mr-2 transition-colors"
          />
          <span className="text-gray-800 dark:text-white text-sm transition-colors">{color}</span>
        </div>
      </div>
      
      <div className="flex justify-between pt-4">
        {habit && onDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center px-3 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <TrashIcon className="w-4 h-4 mr-1" />
            Delete
          </button>
        ) : (
          <div></div>
        )}
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 dark:bg-teal-600 hover:bg-teal-500 dark:hover:bg-teal-500 text-white rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : habit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default HabitForm;