import React from "react";
import { Message } from "../../types/message";
import ReactMarkdown from "react-markdown";

function isErrorMessage(content: string) {
  // Simple heuristic: matches default error or starts with 'Error:'
  return (
    content === "An unknown error occurred." ||
    content.toLowerCase().startsWith("error:")
  );
}

export function MessageBubble({ msg }: Readonly<{ msg: Message }>) {
  const isError = msg.role === "assistant" && isErrorMessage(msg.content);
  const isUser = msg.role === "user";

  let bubbleClass = "";
  let roleLabel = "";

  if (isError) {
    bubbleClass =
      "max-w-lg bg-red-100 text-red-800 px-4 py-3 rounded-2xl shadow border border-red-300";
    roleLabel = "Error message from assistant";
  } else if (isUser) {
    bubbleClass =
      "max-w-lg bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-lg border border-blue-700";
    roleLabel = "Message from you";
  } else {
    bubbleClass =
      "max-w-lg bg-green-100 text-gray-900 px-4 py-3 rounded-2xl shadow border border-green-300";
    roleLabel = "Message from assistant";
  }

  return (
    <article
      className={bubbleClass}
      role={isError ? "alert" : "article"}
      aria-label={roleLabel}
    >
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          components={{
            // Ensure links are accessible
            a: ({ href, children, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                {...props}
              >
                {children}
              </a>
            ),
            // Add proper heading hierarchy
            h1: ({ children, ...props }) => (
              <h3 className="text-lg font-semibold mt-2 mb-1" {...props}>
                {children}
              </h3>
            ),
            h2: ({ children, ...props }) => (
              <h4 className="text-base font-semibold mt-2 mb-1" {...props}>
                {children}
              </h4>
            ),
            // Improve code block accessibility
            code: ({ className, children, ...props }) => (
              <code
                className={`${className || ""} px-1 py-0.5 bg-gray-200 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            ),
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>

      {/* Streaming indicators */}
      {msg.isStreaming && (
        <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-25"
            ></circle>
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              className="opacity-75"
            ></path>
          </svg>
          <span>{msg.streamingStep || "Streaming..."}</span>
        </div>
      )}

      {/* Error indicator */}
      {msg.error && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          ⚠️ {msg.error}
        </div>
      )}

      {/* Hidden timestamp for future implementation */}
      <time
        className="sr-only"
        dateTime={msg.timestamp || new Date().toISOString()}
      >
        Sent {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
      </time>
    </article>
  );
}
