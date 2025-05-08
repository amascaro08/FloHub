import React from 'react';
import HabitCalendar from "@/components/habit-tracker/HabitCalendar";

const HabitTrackerPage = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-semibold text-white mb-4">Habit Tracker</h1>
      <HabitCalendar />
    </div>
  );
};

export default HabitTrackerPage;