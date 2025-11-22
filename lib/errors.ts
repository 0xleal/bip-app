export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = "Rate limit exceeded",
    public resetAt?: Date
  ) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "RateLimitError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function logError(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", error, context);
  } else {
    console.error(
      JSON.stringify({
        message: getErrorMessage(error),
        ...(error instanceof Error && { stack: error.stack }),
        ...context,
        timestamp: new Date().toISOString(),
      })
    );
  }
}
