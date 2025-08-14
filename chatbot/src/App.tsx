import React, { useState } from 'react';
import { ChatPage } from './components/ChatPage';
import { Sidebar } from './components/Sidebar';
import { AuthProvider } from './components/AuthProvider';
import './App.css';

export default function App() {
  const [selectedConversation, setSelectedConversation] = useState<string>('default');
  return (
    <AuthProvider>
      <div className="flex h-screen">
        <Sidebar selected={selectedConversation} onSelect={setSelectedConversation} />
        <ChatPage conversationId={selectedConversation} />
      </div>
    </AuthProvider>
  );
}
