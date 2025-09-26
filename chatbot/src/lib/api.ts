import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

export interface ThreadSummary {
  threadId: string;
  name: string;
  lastMessage?: string;
  lastActivity: Date;
  messageCount: number;
  createdAt: Date;
}

export interface ThreadMessage {
  id: string;
  type: 'human' | 'ai' | 'system' | 'tool';
  content: string;
}

export interface ThreadResponse {
  threadId: string;
  name: string;
  messages: ThreadMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export async function sendMessage(threadId: string, message: string) {
  const res = await axios.post(`${API_URL}/chat`, { threadId, message });
  return res.data;
}

export async function getAllThreads(): Promise<ThreadSummary[]> {
  const res = await axios.get(`${API_URL}/threads`);
  return res.data.threads;
}

export async function getThread(threadId: string): Promise<ThreadResponse> {
  const res = await axios.get(`${API_URL}/threads/${threadId}`);
  return res.data;
}

export async function createNewThread(name?: string): Promise<{ threadId: string }> {
  console.log('API: Creating new thread with name:', name);
  console.trace('API: createNewThread called from:');
  const res = await axios.post(`${API_URL}/threads`, name ? { name } : {});
  console.log('API: Thread created successfully:', res.data);
  return res.data;
}

export async function updateThreadName(threadId: string, name: string): Promise<void> {
  await axios.patch(`${API_URL}/threads/${threadId}`, { name });
}

export async function deleteThread(threadId: string): Promise<void> {
  await axios.delete(`${API_URL}/threads/${threadId}`);
}
