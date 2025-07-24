'use client'

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatToggleButtonProps {
  onClick: () => void;
  hasUnreadMessages?: boolean;
}

const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ 
  onClick, 
  hasUnreadMessages = false 
}) => {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
      aria-label="Open chat"
    >
      <MessageCircle className="w-5 h-5 text-neutral-600 dark:text-neutral-400 group-hover:text-primary-500 transition-colors" />
      
      {/* Unread indicator */}
      {hasUnreadMessages && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse">
          <div className="w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}
      
      {/* Tooltip */}
      <span className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
        Chat with FloCat
      </span>
    </button>
  );
};

export default ChatToggleButton;