import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    logger.error('Error occurred:', err);

    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};