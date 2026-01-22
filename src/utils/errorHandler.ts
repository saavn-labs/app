/**
 * Centralized Error Handler
 * Consistent error handling across the application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export interface ErrorResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Wraps async operations with consistent error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  errorMessage: string = "Operation failed",
): Promise<ErrorResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(errorMessage, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : errorMessage,
    };
  }
}

/**
 * Safe wrapper for synchronous operations
 */
export function handleSync<T>(
  operation: () => T,
  fallback: T,
  errorMessage?: string,
): T {
  try {
    return operation();
  } catch (error) {
    if (errorMessage) {
      console.error(errorMessage, error);
    }
    return fallback;
  }
}

/**
 * Logs errors consistently
 */
export function logError(context: string, error: unknown): void {
  if (__DEV__) {
    console.error(`[${context}]`, error);
  }
}
