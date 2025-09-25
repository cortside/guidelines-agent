import { useState } from 'react';
import { sendMessage } from '../lib/api';
import { Message } from '../types/message';
import { isBlank } from '../utils/isBlank';
import { parseChatResponse } from '../utils/parseChatResponse';
import { getErrorMessage } from '../utils/getErrorMessage';

export function useChatApi(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const send = async (input: string) => {
    if (isBlank(input)) return;
    
    setError(null); // Clear previous errors
    setMessages((msgs) => [...msgs, { role: 'user', content: input }]);
    setLoading(true);
    
    try {
      const res = await sendMessage(conversationId, input);
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: parseChatResponse(res) }
      ]);
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(getErrorMessage(error));
      setError(errorInstance);
      
      // Still add error message to chat for user visibility
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: getErrorMessage(error) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { messages, send, loading, error, clearError };
}
