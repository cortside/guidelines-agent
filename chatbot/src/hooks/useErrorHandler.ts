import { useState, useCallback } from "react";
import {
  getNetworkErrorType,
  NetworkErrorType,
} from "../components/common/NetworkError";

export interface ErrorState {
  error: Error | null;
  isError: boolean;
  errorType?: NetworkErrorType;
  isRetrying: boolean;
}

export interface ErrorHandlerActions {
  setError: (error: Error | null) => void;
  clearError: () => void;
  retry: (retryFn: () => Promise<void> | void) => Promise<void>;
  handleAsyncError: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook for managing error state and providing error handling utilities
 */
export function useErrorHandler(): ErrorState & ErrorHandlerActions {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorType: undefined,
    isRetrying: false,
  });

  const setError = useCallback((error: Error | null) => {
    if (error) {
      const errorType = getNetworkErrorType(error);
      setErrorState({
        error,
        isError: true,
        errorType,
        isRetrying: false,
      });
    } else {
      setErrorState({
        error: null,
        isError: false,
        errorType: undefined,
        isRetrying: false,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorType: undefined,
      isRetrying: false,
    });
  }, []);

  const retry = useCallback(
    async (retryFn: () => Promise<void> | void) => {
      setErrorState((prev) => ({
        ...prev,
        isRetrying: true,
      }));

      try {
        await retryFn();
        clearError();
      } catch (error) {
        setError(error as Error);
      }
    },
    [clearError, setError],
  );

  const handleAsyncError = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
      try {
        clearError();
        const result = await asyncFn();
        return result;
      } catch (error) {
        setError(error as Error);
        return null;
      }
    },
    [clearError, setError],
  );

  return {
    ...errorState,
    setError,
    clearError,
    retry,
    handleAsyncError,
  };
}

/**
 * Hook for managing form validation errors
 */
export function useFormErrors<T extends Record<string, string>>() {
  const [fieldErrors, setFieldErrors] = useState<Partial<T>>({});
  const [isValid, setIsValid] = useState(true);

  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (error) {
        updated[field] = error as T[keyof T];
      } else {
        delete updated[field];
      }
      return updated;
    });
  }, []);

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({});
    setIsValid(true);
  }, []);

  const validateField = useCallback(
    (
      field: keyof T,
      value: string,
      validator: (value: string) => string | null,
    ) => {
      const error = validator(value);
      setFieldError(field, error);
      return error === null;
    },
    [setFieldError],
  );

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    isValid: isValid && !hasErrors,
    hasErrors,
    setFieldError,
    clearFieldErrors,
    validateField,
  };
}
