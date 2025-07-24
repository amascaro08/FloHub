'use client'

import React, { useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import ChatWidget from '../assistant/ChatWidget';
import { useChat } from '../assistant/ChatContext';

interface ChatSideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSideModal: React.FC<ChatSideModalProps> = ({ isOpen, onClose }) => {
  const { setIsChatOpen } = useChat();

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Side Modal */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              FloCat Chat
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Chat Content */}
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ChatWidget onClose={onClose} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatSideModal;