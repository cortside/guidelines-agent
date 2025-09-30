import React from "react";

export type NetworkErrorType =
  | "offline"
  | "timeout"
  | "server_error"
  | "unknown";

interface NetworkErrorProps {
  error: Error;
  type?: NetworkErrorType;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Component for displaying network-related errors with appropriate messaging and actions
 */
export function NetworkError({
  error,
  type = "unknown",
  onRetry,
  onDismiss,
  className = "",
}: Readonly<NetworkErrorProps>) {
  const getErrorConfig = (errorType: NetworkErrorType) => {
    switch (errorType) {
      case "offline":
        return {
          title: "No Internet Connection",
          message: "Please check your internet connection and try again.",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case "timeout":
        return {
          title: "Request Timeout",
          message:
            "The request is taking longer than expected. Please try again.",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case "server_error":
        return {
          title: "Server Error",
          message:
            "Something went wrong on our end. Please try again in a moment.",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      default:
        return {
          title: "Connection Error",
          message: "Unable to connect to the service. Please try again.",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
        };
    }
  };

  const config = getErrorConfig(type);

  return (
    <div
      className={`bg-red-50 border-l-4 border-red-400 p-4 rounded-md ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 text-red-400" aria-hidden="true">
          {config.icon}
        </div>

        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{config.title}</h3>

          <p className="mt-1 text-sm text-red-700">{config.message}</p>

          {/* Technical error details for development */}
          {import.meta.env?.DEV && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                Technical Details (Dev Only)
              </summary>
              <pre className="mt-1 text-xs text-red-600 whitespace-pre-wrap font-mono bg-red-100 p-2 rounded">
                {error.message}
                {error.stack && `\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="mt-3 flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50"
                aria-describedby="retry-button-help"
              >
                Try Again
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="bg-white hover:bg-gray-50 text-red-800 text-sm font-medium px-3 py-2 border border-red-300 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50"
                aria-describedby="dismiss-button-help"
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Hidden help text for screen readers */}
          {onRetry && (
            <div id="retry-button-help" className="sr-only">
              Retry the failed operation
            </div>
          )}
          {onDismiss && (
            <div id="dismiss-button-help" className="sr-only">
              Dismiss this error message
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to determine network error type from error object
 */
export function getNetworkErrorType(error: Error): NetworkErrorType {
  const message = error.message.toLowerCase();

  if (message.includes("network") && message.includes("offline")) {
    return "offline";
  }

  if (message.includes("timeout") || message.includes("time out")) {
    return "timeout";
  }

  if (message.includes("server") || message.includes("5")) {
    return "server_error";
  }

  return "unknown";
}
