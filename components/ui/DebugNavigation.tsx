import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function DebugNavigation() {
  const router = useRouter();
  
  useEffect(() => {
    console.log('Current route:', router.pathname);
    console.log('Router state:', router);
    
    // Add event listener to debug navigation clicks
    const handleClick = (e: MouseEvent) => {
      console.log('Click event:', e);
      console.log('Target:', e.target);
      
      // Check if the click is on a navigation link
      const link = (e.target as HTMLElement).closest('a');
      if (link) {
        console.log('Link clicked:', link.href);
      }
    };
    
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [router]);
  
  return null;
}