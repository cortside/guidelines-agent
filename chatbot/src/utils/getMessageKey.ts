import { Message } from "../types/message";
// Utility to generate a unique key for a message
export function getMessageKey(msg: Message, index: number): string {
  return `${msg.role}-${msg.content}-${index}`;
}
