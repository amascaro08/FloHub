import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  lines = 1,
  height = 'h-4'
}) => {
  if (lines === 1) {
    return (
      <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded ${height} ${className}`} />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded ${height}`}
        />
      ))}
    </div>
  );
};

// Specialized skeleton components
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg ${className}`}>
    <Skeleton className="w-3/4 h-5 mb-3" />
    <Skeleton lines={3} className="mb-2" />
    <div className="flex space-x-2">
      <Skeleton className="w-16 h-6" />
      <Skeleton className="w-20 h-6" />
    </div>
  </div>
);

export const SkeletonHeader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center space-x-4 ${className}`}>
    <Skeleton className="w-12 h-12 rounded-full" />
    <div className="flex-1">
      <Skeleton className="w-1/2 h-5 mb-2" />
      <Skeleton className="w-1/3 h-4" />
    </div>
  </div>
);

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 3, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="w-2/3 h-4 mb-1" />
          <Skeleton className="w-1/2 h-3" />
        </div>
        <Skeleton className="w-16 h-6" />
      </div>
    ))}
  </div>
);

export default Skeleton;