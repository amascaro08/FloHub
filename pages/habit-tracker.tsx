import React from 'react';
import Head from 'next/head';
import HabitCalendar from "@/components/habit-tracker/HabitCalendar";
import { useUser } from '@/lib/hooks/useUser';

const HabitTrackerPage = () => {
  const { user, isLoading } = useUser();

  return (
    <>
      <Head>
        <title>Habit Tracker | FlowHub</title>
        <meta name="description" content="Track and manage your daily habits with FlowHub's habit tracker" />
      </Head>
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--fg)] mb-2">Habit Tracker</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Build better habits by tracking your daily, weekly, or custom routines. 
            Visualize your progress and maintain streaks to stay motivated.
          </p>
        </div>
        
        {!user ? (
          <div className="glass rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold text-[var(--fg)] mb-4">Sign in to use the Habit Tracker</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              You need to be signed in to create and track your habits.
            </p>
            <button 
              onClick={() => {}} // 
              className="btn-primary"
            >
              Sign In
            </button>
          </div>
        ) : (
          <HabitCalendar />
        )}
      </div>
    </>
  );
};

export default HabitTrackerPage;