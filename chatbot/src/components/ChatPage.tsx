import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import ReactMarkdown from 'react-markdown';
import { sendMessage } from '../lib/api';

export function ChatPage({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    wsRef.current = new WebSocket(`${import.meta.env.VITE_API_URL.replace('http', 'ws')}/chat/ws?user_id=${conversationId}`);
    wsRef.current.onmessage = (event) => {
      setMessages((msgs) => [...msgs, { role: 'assistant', content: event.data }]);
    };
    return () => {
      wsRef.current?.close();
    };
  }, [conversationId]);

  const send = () => {
    if (wsRef.current && input.trim()) {
      setMessages((msgs) => [...msgs, { role: 'user', content: input }]);
      wsRef.current.send(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="border rounded px-2 py-1 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type your message..."
        />
        <button className="bg-blue-500 text-white px-4 py-1 rounded" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
