import React from 'react';

interface OptimizedSkeletonProps {
  variant?: 'calendar' | 'tasks' | 'ataglance' | 'generic';
  className?: string;
}

const OptimizedSkeleton: React.FC<OptimizedSkeletonProps> = ({ 
  variant = 'generic', 
  className = '' 
}) => {
  const baseClassName = `animate-pulse ${className}`;

  switch (variant) {
    case 'calendar':
      return (
        <div className={baseClassName}>
          {/* Time filter buttons */}
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
          </div>
          
          {/* Event list */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-3"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Add button */}
          <div className="mt-4 pt-3 border-t">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </div>
      );
      
    case 'tasks':
      return (
        <div className={baseClassName}>
          {/* Add task input */}
          <div className="mb-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
          
          {/* Task list */}
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      );
      
    case 'ataglance':
      return (
        <div className={baseClassName}>
          {/* Header with avatar */}
          <div className="flex items-center mb-4 p-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <div className="w-8 h-8 bg-white/30 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="h-4 bg-white/30 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
          
          {/* Dashboard grid */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border rounded-lg">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto"></div>
          </div>
        </div>
      );
      
    default:
      return (
        <div className={baseClassName}>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded h-24"></div>
        </div>
      );
  }
};

export default OptimizedSkeleton;
