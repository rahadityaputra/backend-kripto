import { Request, Response } from 'express';
import { AppError, BadRequestError, UnauthorizedError, NotFoundError, InternalServerError } from '../utils/errors';
import { logger } from '../config/logger.config';

export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response
): void => {
    let error: AppError;

    // Log the error
    if (err instanceof Error) {
        logger.error(`Error: ${err.message}`, { stack: err.stack });
    } else {
        logger.error('Unknown error occurred', { error: err });
    }

    // Handle known AppError instances
    if (err instanceof AppError) {
        error = err;
    }
    // Handle other Error instances
    else if (err instanceof Error) {
        // Map common error messages to appropriate status codes
        if (err.message.includes('validation') || err.message.includes('invalid')) {
            error = new BadRequestError(err.message);
        } else if (err.message.includes('unauthorized') || err.message.includes('forbidden')) {
            error = new UnauthorizedError(err.message);
        } else if (err.message.includes('not found')) {
            error = new NotFoundError(err.message);
        } else {
            error = new InternalServerError(err.message);
        }
    }
    // Handle unknown errors
    else {
        error = new InternalServerError('An unexpected error occurred');
    }

    // Send error response
    res.status(error.statusCode).json({
        status: false,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};
