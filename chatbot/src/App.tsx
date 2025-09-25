import React, { useState } from 'react';
import { ChatPage } from './components/ChatPage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useConversations } from './hooks/useConversations';
import { useResponsive } from './hooks/useResponsive';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './App.css';

function generateGuid() {
  // RFC4122 version 4 compliant GUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function App() {
  const conversations = useConversations();
  const [threadId] = useState<string>(generateGuid());
  const [selectedConversation, setSelectedConversation] = useState<string>(conversations[0]?.id || threadId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile, sidebarWidth, padding } = useResponsive();
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  const handleConversationSelect = (id: string) => {
    setSelectedConversation(id);
    if (isMobile) setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Calculate sidebar classes
  const getSidebarClasses = () => {
    if (isMobile) {
      const mobileClasses = sidebarOpen ? 'translate-x-0' : '-translate-x-full';
      return `fixed top-0 left-0 h-full z-40 transform ${mobileClasses} w-64 bg-white shadow-lg`;
    }
    return 'relative';
  };
  
  return (
    <ErrorBoundary>
      <div className={`flex h-screen bg-gray-50 ${padding}`}>
        {/* Mobile menu button */}
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Toggle conversation menu"
            aria-expanded={sidebarOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Sidebar */}
        <nav 
          role="navigation" 
          aria-label="Conversation navigation"
          className={`${sidebarWidth} transition-all duration-300 ease-in-out ${getSidebarClasses()}`}
        >
          <Sidebar 
            conversations={conversations} 
            selected={selectedConversation} 
            onSelect={handleConversationSelect}
            onClose={isMobile ? () => setSidebarOpen(false) : undefined}
          />
        </nav>

        {/* Overlay for mobile */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <main 
          role="main" 
          className={`flex-1 overflow-hidden ${isMobile ? 'ml-0' : ''}`}
          aria-label="Chat interface"
        >
          <ChatPage conversationId={selectedConversation} />
        </main>
      </div>
    </ErrorBoundary>
  );
}
