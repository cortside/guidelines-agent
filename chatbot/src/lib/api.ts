import axios from 'axios';

export async function sendMessage(user_id: string, message: string) {
  const res = await axios.post(`${import.meta.env.VITE_API_URL}/chat`, { user_id, message });
  return res.data;
}
