# Implement Data Validation and Error Handling

## Introduction
Now that we have user authentication and role-based access control in place, the next step is to ensure our API is robust by implementing data validation and centralized error handling.

Step-by-Step Guide
- **Set Up Data Validation**: Use a library like `class-validator` and `class-transformer` to validate incoming data.
- **Implement Centralized Error Handling**: Create a centralized error handling mechanism using middleware to handle errors consistently.

## STEP 1: Set Up Data Validation
To validate incoming request data, we'll use the `class-validator` library along with `class-transformer` to automatically validate and transform incoming request bodies into defined DTO (Data Transfer Object) classes.<br>
Install `class-validator` and `class-transformer`:
```bash
npm install class-validator class-transformer
```
Create a `DTO` Directory and classes for validation:
```bash
mkdir src/dto
touch src/dto/UserDTO.ts
```
Define the DTO Classes:
```ts
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { UserRole } from "../entity/User";

export class RegisterUserDTO {
@IsString()
@MinLength(2)
    name!: string;

@IsEmail()
    email!: string;

@IsString()
@MinLength(6)
    password!: string;

@IsOptional()
@IsEnum(UserRole)
    role?: UserRole;
}

export class LoginUserDTO {
@IsEmail()
    email!: string;

@IsString()
    password!: string;
}
```
Create a middleware function to validate incoming requests using the DTO classes:
```bash
touch src/middleware/validationMiddleware.ts
```
```ts
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
```
Update your routes in `src/routes/userRoutes.ts` to use the validation middleware:

```ts
import { Router } from "express";
import { Repository } from "typeorm";
import { User, UserRole } from "../entity/User";
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { checkRole } from "../middleware/roleMiddleware";
import { validationMiddleware } from "../middleware/validationMiddleware";
import { LoginUserDTO, RegisterUserDTO } from "../dto/UserDTO";

dotenv.config();

const router = Router();

export const initUserRoutes = (userRepository: Repository<User>) => {

    // Registration Route
    router.post(
        '/register',
        validationMiddleware(RegisterUserDTO), // Apply validation middleware
        async (req, res) => {
            if (!process.env.HASH_SALT) return res.status(500).json({ message: 'Some crucial keys haven\'t been set' });

            const { name, email, password, role } = req.body;
            const user = await userRepository.findOne({ where: { email } });

            // Check if user already exists
            if (user) {
                return res.status(400).json({ message: 'This email address have been used' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(
                password,
                parseInt(process.env.HASH_SALT)
            );

            // Create new user
            const newUser = userRepository.create({
                name,
                email,
                password: hashedPassword,
                role: role || UserRole.USER
            });
            await userRepository.save(newUser);

            res.status(201).json({ message: 'User registered successfully' });
        });

    // Login Route
    router.post(
        '/login',
        validationMiddleware(LoginUserDTO), // Apply validation middleware
        async (req, res) => {
            const { email, password } = req.body;
            const user = await userRepository.findOne({ where: { email } });

            // Check if user exists
            if (!user) {
                return res.status(400).json({ message: 'This user doesn\'t exist' });
            }

            // Check password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Generate JWT
            const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
                expiresIn: '1h'
            });

            res.json({ token });
        });

    // Admin-Only Route
    router.get('/admin', checkRole([UserRole.ADMIN]), (req, res) => {
        res.json({ message: 'Welcome to the admin panel!' });
    });

    return router;
};

export default router;
```

## STEP 2: Implement Centralized Error Handling
Create a centralized error-handling middleware to catch and handle errors consistently across your application.<br>

Create an `src/middleware/errorMiddleware.ts` file to handle errors:
```ts
import { NextFunction, Request, Response } from "express";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
```

Update your `index.ts` to use the error-handling middleware:
```ts
import express from 'express';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { initUserRoutes } from './routes/userRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());

// Initialize DataSource with environment variables
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_HOST || '5432'),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: true,
    logging: false,
    entities: [User],
    migrations: [],
    subscribers: []
});

// Connect to the database
AppDataSource.initialize().then(async () => {
    app.get('/', (req, res) => {
        res.send('Hello World!');
    });

    const userRepository = AppDataSource.getRepository(User);
    app.use(initUserRoutes(userRepository));

    // A protected route example
    app.get('/protected', (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!);
            res.json({ message: 'This is a protected route', decoded });
        } catch (error) {
            console.log(error);
            res.status(401).json({ message: 'Invalid token' });
        }
    });

    // Apply the error handling middleware at the end
    app.use(errorMiddleware);

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch((error) => console.log(error));
```

## STEP 3: Rebuild and Restart Your Docker Environment
Rebuild your Docker environment to apply the changes:
```bash
docker-compose down
docker-compose up --build
```

## STEP 4: Test Validation and Error Handling
- **Test Validation**: Send invalid data to the registration and login endpoints to ensure the validation middleware catches the errors.
- **Test Error Handling**: Test any other endpoints to see how the centralized error middleware handles unexpected errors.