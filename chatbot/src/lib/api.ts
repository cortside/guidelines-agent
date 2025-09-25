import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

export async function sendMessage(user_id: string, message: string) {
  const res = await axios.post(`${API_URL}/chat`, { threadId: user_id, message });
  return res.data;
}
