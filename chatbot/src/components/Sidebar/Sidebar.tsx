import React from 'react';
import { Conversation } from '../../types/conversation';
import { capitalize } from '../../utils/formatString';

export function Sidebar({
  conversations,
  selected,
  onSelect,
  onClose,
}: Readonly<{
  conversations: ReadonlyArray<Conversation>;
  selected: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
}>) {
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
      
      <header className="mb-4">
        <h1 className="text-lg font-bold text-gray-800" id="conversations-heading">
          Conversations
        </h1>
      </header>
      
      <nav role="navigation" aria-labelledby="conversations-heading">
        <ul className="space-y-1">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  selected === conv.id 
                    ? 'bg-blue-200 text-blue-900 font-medium' 
                    : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
                onClick={() => onSelect(conv.id)}
                onKeyDown={(e) => handleKeyDown(e, conv.id)}
                aria-pressed={selected === conv.id}
                aria-describedby={selected === conv.id ? 'current-conversation' : undefined}
                tabIndex={0}
              >
                {capitalize(conv.name)}
              </button>
              {selected === conv.id && (
                <div id="current-conversation" className="sr-only">
                  Currently selected conversation
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
