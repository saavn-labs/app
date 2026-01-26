export interface ErrorResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function handleAsync<T>(
  operation: () => Promise<T>,
  errorMessage: string = "Operation failed",
): Promise<ErrorResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : errorMessage;
    console.error(`[Error] ${errorMessage}:`, error);
    return { success: false, error: message };
  }
}
