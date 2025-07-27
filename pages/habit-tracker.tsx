import React from 'react';
import Head from 'next/head';
import HabitTrackerMain from "@/components/habit-tracker/HabitTrackerMain";

const HabitTrackerPage = () => {
  return (
    <>
      <Head>
        <title>Habit Tracker | FlowHub</title>
        <meta name="description" content="Track and build lasting habits with FlowHub's intelligent habit tracker and FloCat insights" />
      </Head>
      
      <HabitTrackerMain />
    </>
  );
};

export default HabitTrackerPage;