import React from 'react';
import Head from 'next/head';
import HabitTrackerMain from "@/components/habit-tracker/HabitTrackerMain";
import { useUser } from '@/lib/hooks/useUser';

const HabitTrackerPage = () => {
  const { user, isLoading } = useUser();

  return (
    <>
      <Head>
        <title>Habit Tracker | FlowHub</title>
        <meta name="description" content="Track and build lasting habits with FlowHub's intelligent habit tracker and FloCat insights" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-soft-white via-gray-50 to-primary-50 dark:from-dark-base dark:via-gray-900 dark:to-gray-800">
        {!user ? (
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="glass rounded-2xl p-8 text-center max-w-md w-full">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h2 className="text-xl font-semibold text-[var(--fg)] mb-4">
                Sign in to start building habits
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Track your progress, build streaks, and get personalized insights from FloCat
              </p>
              <button 
                onClick={() => {}} 
                className="btn-primary w-full"
              >
                Sign In to Continue
              </button>
            </div>
          </div>
        ) : (
          <HabitTrackerMain />
        )}
      </div>
    </>
  );
};

export default HabitTrackerPage;