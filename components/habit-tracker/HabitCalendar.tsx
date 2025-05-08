import React from 'react';

const HabitCalendar = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => (
        <div key={day} className="p-2 rounded-lg bg-gray-700 text-white text-center">
          {day}
        </div>
      ))}
    </div>
  );
};

export default HabitCalendar;