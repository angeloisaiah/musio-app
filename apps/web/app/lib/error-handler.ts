export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }

  if (error instanceof ValidationError) {
    return `Validation Error${error.field ? ` (${error.field})` : ''}: ${error.message}`;
  }

  if (error instanceof NetworkError) {
    return `Network Error: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof APIError) {
    // Retry on server errors (5xx) but not client errors (4xx)
    return error.status >= 500;
  }

  if (error instanceof NetworkError) {
    return true; // Network errors are typically retryable
  }

  return false;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export function createErrorBoundaryState(): ErrorBoundaryState {
  return {
    hasError: false,
  };
}

export function handleErrorBoundary(
  error: Error,
  errorInfo?: { componentStack?: string },
): ErrorBoundaryState {
  const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log error for debugging
  console.error('Error Boundary caught an error:', error, errorInfo);

  // In production, you might want to send this to an error reporting service
  if (process.env.NODE_ENV === 'production') {
    // reportError(error, { errorId, ...errorInfo });
  }

  return {
    hasError: true,
    error,
    errorId,
  };
}

export function resetErrorBoundary(): ErrorBoundaryState {
  return createErrorBoundaryState();
}
