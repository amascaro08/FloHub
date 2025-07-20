import { useEffect } from 'react';

const InstantFeedback: React.FC = () => {
  useEffect(() => {
    // Add instant feedback to all clickable elements
    const addInstantFeedback = () => {
      const clickableElements = document.querySelectorAll('a, button, [role="button"]');
      
      const handleMouseDown = (event: Event) => {
        const element = event.currentTarget as HTMLElement;
        element.style.transform = 'scale(0.98)';
        element.style.transition = 'transform 0.1s ease-out';
      };

      const handleMouseUp = (event: Event) => {
        const element = event.currentTarget as HTMLElement;
        element.style.transform = 'scale(1)';
      };

      const handleMouseLeave = (event: Event) => {
        const element = event.currentTarget as HTMLElement;
        element.style.transform = 'scale(1)';
      };

      clickableElements.forEach(element => {
        element.addEventListener('mousedown', handleMouseDown);
        element.addEventListener('mouseup', handleMouseUp);
        element.addEventListener('mouseleave', handleMouseLeave);
      });

      return () => {
        clickableElements.forEach(element => {
          element.removeEventListener('mousedown', handleMouseDown);
          element.removeEventListener('mouseup', handleMouseUp);
          element.removeEventListener('mouseleave', handleMouseLeave);
        });
      };
    };

    // Add feedback after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(addInstantFeedback, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return null;
};

export default InstantFeedback;