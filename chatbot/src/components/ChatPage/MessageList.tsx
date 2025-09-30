import React from "react";
import { Message } from "../../types/message";
import { MessageBubble } from "./MessageBubble";
import { getMessageKey } from "../../utils/getMessageKey";

export function MessageList({
  messages,
}: {
  messages: ReadonlyArray<Message>;
}) {
  return (
    <div>
      {messages.map((msg, i) => (
        <div
          key={getMessageKey(msg, i)}
          className={
            msg.role === "user"
              ? "flex justify-end mb-4"
              : "flex justify-start mb-4"
          }
        >
          {msg.role === "assistant" && (
            <div className="flex items-end mr-2">
              <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white font-bold shadow">
                A
              </div>
            </div>
          )}
          <MessageBubble msg={msg} />
          {msg.role === "user" && (
            <div className="flex items-end ml-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow">
                U
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
