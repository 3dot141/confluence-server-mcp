// src/infrastructure/errors.ts

export class ConfluenceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "ConfluenceError";
  }
}

export class ValidationError extends ConfluenceError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ConfluenceError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class AuthenticationError extends ConfluenceError {
  constructor(message = "Authentication failed") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends ConfluenceError {
  constructor(message = "Permission denied") {
    super(message, "PERMISSION_ERROR", 403);
    this.name = "PermissionError";
  }
}
