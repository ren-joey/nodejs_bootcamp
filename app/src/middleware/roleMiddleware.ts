import { NextFunction, Request, Response } from "express";
import { UserRole } from "../entity/User";
import jwt from 'jsonwebtoken';
import { ReqUser } from "../types/express";
import logger from "../utils/logger";

// Middleware to check if the user has the required role
export const checkRole = (roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as ReqUser;

            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // Attach user info to request object
            req.user = decoded;
            next();
        } catch (error) {
            logger.error('Invalid token:', error);
            res.status(401).json({ message: 'Invalid token' });
        }
    };
};