import React, { useState } from 'react';
import { useConversations } from '../../hooks/useConversations';

interface SidebarProps {
  selected: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
}

export function Sidebar({ selected, onSelect, onClose }: Readonly<SidebarProps>) {
  const {
    threads,
    loading,
    error,
    createThread,
    removeThread,
    clearError,
  } = useConversations();
  
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateThread = async () => {
    setIsCreating(true);
    const threadId = await createThread();
    if (threadId) {
      onSelect(threadId);
    }
    setIsCreating(false);
  };

  const handleDeleteThread = async (threadId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      await removeThread(threadId);
    }
  };

  const formatLastActivity = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleKeyDown = (e: React.KeyboardEvent, convId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(convId);
    }
    // Close sidebar with Escape key on mobile
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  return (
    <aside 
      className="w-full bg-gray-100 p-4 border-r border-gray-300 flex flex-col min-h-full relative"
      aria-label="Conversation list"
    >
      {/* Close button for mobile */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Close conversation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800" id="conversations-heading">
          Conversations
        </h1>
        <button
          onClick={handleCreateThread}
          disabled={isCreating}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isCreating ? '...' : '+ New'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded text-sm">
          <div className="text-red-700">{error}</div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading conversations...</div>
        </div>
      ) : (
        <nav role="navigation" aria-labelledby="conversations-heading" className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-sm">
              No conversations yet.<br />
              Click "New" to start!
            </div>
          ) : (
            <ul className="space-y-1">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-md group hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      selected === thread.id 
                        ? 'bg-blue-200 text-blue-900' 
                        : 'text-gray-700'
                    }`}
                    onClick={() => onSelect(thread.id)}
                    onKeyDown={(e) => handleKeyDown(e, thread.id)}
                    aria-pressed={selected === thread.id}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {thread.name}
                        </div>
                        {thread.lastMessage && (
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {thread.lastMessage}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {formatLastActivity(thread.lastActivity)} • {thread.messageCount} msgs
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteThread(thread.id, e)}
                        className="opacity-0 group-hover:opacity-100 ml-2 text-red-500 hover:text-red-700 text-xs p-1 focus:outline-none focus:ring-1 focus:ring-red-300 rounded"
                        title="Delete conversation"
                        aria-label={`Delete conversation ${thread.name}`}
                      >
                        ×
                      </button>
                    </div>
                  </button>
                  {selected === thread.id && (
                    <div className="sr-only" aria-live="polite">
                      Currently selected conversation: {thread.name}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}
    </aside>
  );
}
