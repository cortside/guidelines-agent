import React from 'react';

const conversations = ['default', 'project', 'architecture', 'errors'];

export function Sidebar({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="w-64 bg-gray-100 p-4 border-r flex flex-col">
      <h2 className="font-bold mb-4">Conversations</h2>
      <ul>
        {conversations.map((id) => (
          <li key={id}>
            <button
              className={`w-full text-left px-2 py-1 rounded ${selected === id ? 'bg-blue-200' : ''}`}
              onClick={() => onSelect(id)}
            >
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
