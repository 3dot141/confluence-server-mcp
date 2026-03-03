// Confluence Client Errors

export class ConfluenceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ConfluenceError';
  }
}

export class NotFoundError extends ConfluenceError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ConfluenceError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ConfluenceError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends ConfluenceError {
  constructor(message = 'Permission denied') {
    super(message, 403);
    this.name = 'PermissionError';
  }
}

export class RateLimitError extends ConfluenceError {
  public readonly retryAfter: number;

  constructor(retryAfter = 60) {
    super('Rate limit exceeded', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
