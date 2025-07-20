'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';

const PagePreloader: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const preloadPage = (href: string) => {
      // Preload the page by prefetching it
      router.prefetch(href);
    };

    // Preload common pages on mount
    const commonPages = [
      '/dashboard',
      '/dashboard/tasks',
      '/dashboard/notes',
      '/habit-tracker',
      '/dashboard/journal',
      '/calendar',
      '/dashboard/meetings',
      '/feedback',
      '/dashboard/settings'
    ];

    commonPages.forEach(page => {
      router.prefetch(page);
    });

    // Add hover listeners to navigation links
    const navLinks = document.querySelectorAll('a[href^="/"]');
    
    const handleMouseEnter = (event: Event) => {
      const link = event.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute('href');
      if (href && href !== router.pathname) {
        preloadPage(href);
      }
    };

    navLinks.forEach(link => {
      link.addEventListener('mouseenter', handleMouseEnter);
    });

    return () => {
      navLinks.forEach(link => {
        link.removeEventListener('mouseenter', handleMouseEnter);
      });
    };
  }, [router]);

  return null; // This component doesn't render anything
};

export default PagePreloader;