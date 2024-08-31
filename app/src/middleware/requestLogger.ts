// src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`);
    res.on('finish', () => {
        logger.info(`Response status: ${res.statusCode}`);
    });
    next();
};
