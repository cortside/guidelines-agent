import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendMessage } from '../lib/api';

export function ChatPage({ conversationId }: Readonly<{ conversationId: string }>) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (input.trim()) {
      setMessages((msgs) => [...msgs, { role: 'user', content: input }]);
      const res = await sendMessage(conversationId, input);
      setMessages((msgs) => [...msgs, { role: 'assistant', content: res.answer || '' }]);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 bg-linear-to-br from-blue-50 to-green-50">
      <div
        ref={historyRef}
        className="flex-1 overflow-y-auto mb-4 p-2 rounded-lg bg-white shadow border border-gray-300"
        style={{ maxHeight: '70vh' }}
      >
        {messages.map((msg, i) => (
          <div
            key={`${msg.role}-${msg.content}-${i}`}
            className={
              msg.role === 'user'
                ? 'flex justify-end mb-4'
                : 'flex justify-start mb-4'
            }
          >
            {msg.role === 'assistant' && (
              <div className="flex items-end mr-2">
                <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white font-bold shadow">A</div>
              </div>
            )}
            <div
              className={
                msg.role === 'user'
                  ? 'max-w-lg bg-blue-600 text-white px-4 py-2 rounded-2xl whitespace-pre-line shadow-lg border border-blue-700'
                  : 'max-w-lg bg-green-100 text-gray-900 px-4 py-2 rounded-2xl whitespace-pre-line shadow border border-green-300'
              }
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            {msg.role === 'user' && (
              <div className="flex items-end ml-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow">U</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          className="border-2 border-blue-400 rounded px-2 py-1 flex-1 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shadow"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl h-10 shadow-lg font-semibold"
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  );
}
