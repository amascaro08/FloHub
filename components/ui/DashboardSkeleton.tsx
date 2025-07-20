import React from 'react';
import { SkeletonCard, SkeletonHeader } from './Skeleton';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <SkeletonHeader className="mb-6" />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
            </div>
            <div className="w-20 h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1" />
            <div className="w-24 h-3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          <SkeletonCard />
          <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <div className="w-32 h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="w-3/4 h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1" />
                    <div className="w-1/2 h-3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;