import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendMessage } from '../lib/api';

export function ChatPage({ conversationId }: Readonly<{ conversationId: string }>) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');

  const send = async () => {
    if (input.trim()) {
      setMessages((msgs) => [...msgs, { role: 'user', content: input }]);
      const res = await sendMessage(conversationId, input);
      setMessages((msgs) => [...msgs, { role: 'assistant', content: res.answer || '' }]);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${msg.content}-${i}`} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
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
