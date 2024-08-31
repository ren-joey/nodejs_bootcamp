# Add User Authentication

## Introduction
The next logical step in building a robust backend application is to implement user authentication. This will typically involve:

- Setting Up User Registration and Login: Create endpoints for user registration and login.
- Password Hashing: Use a library like `bcrypt` to hash passwords before storing them in the database.
- Token-Based Authentication: Use JWT (JSON Web Tokens) to authenticate users and protect routes.

## STEP 1: Install Necessary Packages
First, install the necessary packages for user authentication:
```bash
npm install bcryptjs jsonwebtoken
npm install @types/bcryptjs @types/jsonwebtoken --save-dev
```
- `bcryptjs`: A library to hash and compare passwords.
- `jsonwebtoken`: A library to generate and verify JSON Web Tokens.

## STEP 2: Update User Entity for Authentication
Update your `User` entity to include a password field. Modify `src/entity/User.ts` to include a password property:
```ts
import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

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
}
```

## STEP 3: Create User Routes
Inside your `app/src` directory, create a `routes` directory to store all route-related files, and inside the `routes` directory, create a new file called `userRoutes.ts`:
```
mkdir src/routes
touch src/routes/userRoutes.ts
```
Move the user registration, login, and any user-related logic from `index.ts` to `userRoutes.ts`:
```ts
import { Router } from "express";
import { Repository } from "typeorm";
import { User } from "../entity/User";
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = Router();

export const initUserRoutes = (userRepository: Repository<User>) => {

    // Registration Route
    router.post('/register', async (req, res) => {
        if (!process.env.HASH_SALT) return res.status(500).json({ message: 'Some crucial keys haven\'t been set' })

        const { name, email, password } = req.body;
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
        const newUser = userRepository.create({ name, email, password: hashedPassword });
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
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: '1h'
        });

        res.json({ token });
    });

    return router;
}

export default router;
```

## STEP 4: Create Authentication Routes
Next, create routes for user registration and login. Update your `index.ts` file to include these new routes:
```ts
import express from 'express';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { initUserRoutes } from './routes/userRoutes';

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
            res.status(401).json({ message: 'Invalid token' });
        }
    });

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
    });
}).catch((error) => console.log(error));
```

## STEP 5: Add JWT Secret to `.env` and `.env.sample` File
Update your `.env` file to include a JWT secret:
```
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=testdb
APP_PORT=3000
NGINX_PORT=8080
HASH_SALT=10
JWT_SECRET=your_jwt_secret
```
Make sure to replace your_jwt_secret with a strong, secure secret key.

## STEP 6: Rebuild and Run Your Docker Environment
Rebuild your Docker environment to apply the changes:
```bash
docker-compose down
docker-compose up --build
```

## STEP 7: Test Your Authentication
- Register a User: Send a `POST` request to [http://localhost:8080/register](http://localhost:8080/register) with a JSON body like:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```
- Login: Send a `POST` request to [http://localhost:8080/login](http://localhost:8080/login) with a JSON body like:
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```
You should receive a JWT token in response.
- Access a Protected Route: Send a `GET` request to [http://localhost:8080/protected](http://localhost:8080/protected) with the `Authorization` header set to `Bearer <token>`, replacing `<token>` with the JWT received from the login step.