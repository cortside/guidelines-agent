import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red';
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

/**
 * Accessible loading spinner component with customizable size, color, and messaging
 */
export function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  message, 
  className = '', 
  fullScreen = false 
}: Readonly<LoadingSpinnerProps>) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    gray: 'border-gray-500',
    white: 'border-white',
    green: 'border-green-500',
    red: 'border-red-500'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  };

  const spinner = (
    <output 
      className={`inline-block animate-spin rounded-full border-2 border-solid border-t-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      aria-hidden="true"
    />
  );

  const content = (
    <div className={`flex items-center justify-center ${message ? 'flex-col space-y-3' : ''}`}>
      {spinner}
      {message && (
        <div 
          className={`text-gray-700 ${textSizeClasses[size]} font-medium`}
          aria-live="polite"
          aria-atomic="true"
        >
          {message}
        </div>
      )}
      <span className="sr-only">
        {message || 'Loading, please wait...'}
      </span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50">
        <output 
          className="bg-white rounded-lg shadow-lg p-6"
          aria-label="Loading"
        >
          {content}
        </output>
      </div>
    );
  }

  return content;
}

/**
 * Inline loading spinner for use within other components
 */
export function InlineSpinner({ 
  size = 'sm', 
  color = 'blue', 
  className = '' 
}: Readonly<Pick<LoadingSpinnerProps, 'size' | 'color' | 'className'>>) {
  return (
    <LoadingSpinner 
      size={size} 
      color={color} 
      className={className}
    />
  );
}

/**
 * Button loading state component
 */
export function ButtonSpinner({ 
  size = 'sm', 
  color = 'white', 
  message = 'Loading...' 
}: Readonly<Pick<LoadingSpinnerProps, 'size' | 'color' | 'message'>>) {
  return (
    <span className="inline-flex items-center space-x-2">
      <LoadingSpinner size={size} color={color} />
      <span>{message}</span>
    </span>
  );
}
