import React from 'react';

const AtAGlanceWidget: React.FC = () => {
  // TODO: Fetch user name, upcoming events, and suggested task
  const userName = "User"; // Placeholder
  const upcomingEvents = []; // Placeholder
  const suggestedTask = "Finish the 'At A Glance' widget"; // Placeholder

  const renderUpcomingEvents = () => {
    if (upcomingEvents.length === 0) {
      return "You have no scheduled events today.";
    }
    // TODO: Format event details nicely
    return `You've got ${upcomingEvents.length} event(s) today.`;
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-2">At A Glance</h2>
      <p>
        Good Morning {userName}! {renderUpcomingEvents()} Also, I think you should really get cracking on "{suggestedTask}".
      </p>
      <p className="text-sm mt-2">- FloCat</p>
    </div>
  );
};

export default AtAGlanceWidget;