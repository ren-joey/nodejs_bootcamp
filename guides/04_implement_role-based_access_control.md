# Implement Role-Based Access Control

## Introduction
Now that we have user authentication in place, the next logical step is to implement Role-Based Access Control (RBAC). This will allow different users to have different levels of access or permissions based on their roles (e.g., admin, user, guest).

Step-by-Step Guide to Implementing RBAC
- Add Role Field to User Entity: Update the `User` entity to include a `role` field.
- Set Up Middleware for Role Checking: Create a middleware function to check user roles and restrict access to certain routes.
- Protect Routes Based on Roles: Apply the middleware to routes that require specific roles.

## STEP 1: Update the User Entity
First, add a role field to the User entity. We'll define roles as an enumeration for better type safety.<br>
Modify `src/entity/User.ts` to include a `role` field:
```ts
import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin'
}

@Entity()
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role!: UserRole
}
```
Update the `UserRequestBody` interface in `src/types/UserRequest.ts` to include a role:
```ts
import { UserRole } from "../entity/User";

export interface UserRequestBody {
    name: string,
    email: string,
    password: string,
    role?: UserRole
}
```
Extend the `Request` type in Express to include user information. Create a new file `src/types/express/index.d.ts`:
```ts
import { UserRole } from '../../entity/User';

interface ReqUser {
    userId: number;
    role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: ReqUser
    }
  }
}
```
Update the configuration in `app/tsconfig.json`:
```json
{
    "compilerOptions": {
        "typeRoots": [
            "./src/types",
            "./node_modules/@types"
        ]
    },
    "include": ["src/**/*"]
}
```

## STEP 2: Set Up Middleware for Role Checking
Create a middleware function to check if the authenticated user has the required role to access certain routes.<br>
Inside the `src/middleware` directory (create it if it doesn't exist), create a new file `roleMiddleware.ts`:
```ts
import { NextFunction, Request, Response } from "express";
import { UserRole } from "../entity/User";
import jwt from 'jsonwebtoken';
import { ReqUser } from "../types/express";

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
            res.status(401).json({ message: 'Invalid token' });
        }
    }
}
```

## STEP 3: Protect Routes Based on Roles
Now, apply the role-checking middleware to protect specific routes.<br>
Update Routes in `userRoutes.ts` and apply the `checkRole` middleware to routes that require specific roles:
```ts
import { Router } from "express";
import { Repository } from "typeorm";
import { User, UserRole } from "../entity/User";
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { checkRole } from "../middleware/roleMiddleware";

dotenv.config();

const router = Router();

export const initUserRoutes = (userRepository: Repository<User>) => {

    // Registration Route
    router.post('/register', async (req, res) => {
        if (!process.env.HASH_SALT) return res.status(500).json({ message: 'Some crucial keys haven\'t been set' })

        const { name, email, password, role } = req.body;
        const user = await userRepository.findOne({ where: { email } });

        // Check if user already exists
        if (user) {
            return res.status(400).json({ message: 'This email address have been used' })
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
    router.post('/login', async (req, res) => {
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
}

export default router;
```

## STEP 4: Rebuild and Restart Your Docker Environment
Rebuild and restart your Docker containers to apply the changes:
```bash
docker-compose down
docker-compose up --build
```

## STEP 5: Test Role-Based Access Control
- Register a New User with Admin Role: Send a `POST` request to [http://localhost:8080/register](http://localhost:8080/register) with a JSON body that includes the `role` field set to `admin`.
```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "securepassword",
  "role": "admin"
}
```
- Access Admin-Only Route: Send a `GET` request to [http://localhost:8080/admin](http://localhost:8080/admin) with the `Authorization` header set to `Bearer <token>` where `<token>` is the JWT from the login step.

If the user is an admin, you should receive a welcome message.
If the user is not an admin, you should receive an "Access denied" message.