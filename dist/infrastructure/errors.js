// src/infrastructure/errors.ts
export class ConfluenceError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = "ConfluenceError";
    }
}
export class ValidationError extends ConfluenceError {
    constructor(message) {
        super(message, "VALIDATION_ERROR", 400);
        this.name = "ValidationError";
    }
}
export class NotFoundError extends ConfluenceError {
    constructor(resource, identifier) {
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
//# sourceMappingURL=errors.js.map