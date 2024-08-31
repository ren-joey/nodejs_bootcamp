import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { NextFunction, Request, Response } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validationMiddleware = (type: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const dtoInstance = plainToInstance(type, req.body);
        validate(dtoInstance).then((errors: ValidationError[]) => {
            if (errors.length > 0) {
                const errorMessages = errors.map(error => Object.values(error.constraints || {}));
                res.status(400).json({ message: 'Validation failed', errors: errorMessages });
            } else next();
        });
    };
};