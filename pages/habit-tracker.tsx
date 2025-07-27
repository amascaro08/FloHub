import React from 'react';
import Head from 'next/head';
import HabitTrackerMain from "@/components/habit-tracker/HabitTrackerMain";
import MainLayout from "@/components/ui/MainLayout";

const HabitTrackerPage = () => {
  return (
    <MainLayout requiresAuth={true}>
      <Head>
        <title>Habit Tracker | FlowHub</title>
        <meta name="description" content="Track and build lasting habits with FlowHub's intelligent habit tracker and FloCat insights" />
      </Head>
      
      <HabitTrackerMain />
    </MainLayout>
  );
};

export default HabitTrackerPage;