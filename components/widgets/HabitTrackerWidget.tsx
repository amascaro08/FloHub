import React from 'react';

const HabitTrackerWidget = () => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-4">
      <h2 className="text-lg font-semibold text-white mb-2">Habit Tracker</h2>
      {/* Add habit list and progress bars here */}
      <a href="/habit-tracker" className="text-teal-500 hover:text-teal-400">
        Open Full Tracker
      </a>
    </div>
  );
};

export default HabitTrackerWidget;