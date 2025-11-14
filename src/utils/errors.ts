export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        // Set the prototype explicitly
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Bad Request') {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Not Found') {
        super(message, 404);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal Server Error') {
        super(message, 500);
    }
}

// Specific application errors
export class InvalidCardDataError extends BadRequestError {
    constructor(message: string = 'Invalid card data') {
        super(message);
    }
}

export class InvalidTokenError extends UnauthorizedError {
    constructor(message: string = 'Invalid card token') {
        super(message);
    }
}

export class UserNotFoundError extends NotFoundError {
    constructor(message: string = 'User not found') {
        super(message);
    }
}
