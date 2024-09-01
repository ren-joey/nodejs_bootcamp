# Implement Server-Side Caching with Redis

## Introduction
The next step is to implement server-side caching with Redis. Caching can significantly improve the performance of your application by storing frequently accessed data in a fast, in-memory data store, reducing the need to repeatedly query the database.

Step-by-Step Guide
- Set Up Redis: Install and set up Redis on your local machine or use a managed Redis service.
- Install Redis Client Library: Install a Redis client library for Node.js.
- Integrate Redis Caching in Your Application: Implement caching for frequently accessed data using Redis.
- Implement Cache Invalidation: Ensure the cache is kept up-to-date and doesn't serve stale data.

## STEP 1: Set Up Redis
Update `.env` and `.env.sample` files:
```
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=testdb
APP_PORT=3000
NGINX_PORT=8080

REDIS_HOST=redis
REDIS_PORT=6379

HASH_SALT=10
JWT_SECRET=your_jwt_secret
```
updated `docker-compose.yml`:
```
version: '3.8'

services:
  app:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./app:/app
    command: sh -c "npm install && npm run dev"
    ports:
      - "${APP_PORT:-3000}:3000"
    depends_on:
      - db
    env_file:
      - .env

  nginx:
    image: nginx:alpine
    ports:
      - "${NGINX_PORT:-8080}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    env_file:
      - .env

  redis:
    image: redis:latest
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    environment:
      REDIS_HOST: ${REDIS_HOST}
      REDIS_PORT: ${REDIS_PORT}

volumes:
  postgres_data:
  redis_data:
```

## STEP 2: Install Redis Client Library
Install the Redis client library for Node.js. We'll use `ioredis` because it's feature-rich and supports both single-node and cluster setups.
```bash
npm install ioredis
```

## STEP 3: Integrate Redis Caching in Your Application
Create `src/utils/redisClient.ts`:
```ts
import Redis from "ioredis";

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379')
});

export default redis;
```
Update `src/routes/userRoutes.ts` to Use Redis Caching and add cache invalidation logic:
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
import redis from "../utils/redisClient";

dotenv.config();

const router = Router();

export const initUserRoutes = (userRepository: Repository<User>) => {

    // Registration Route
    router.post(
        '/register',
        validationMiddleware(RegisterUserDTO),
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

            // Invalidate the cache for user list
            await redis.del('users');

            res.status(201).json({ message: 'User registered successfully' });
        });

    // Login Route
    router.post(
        '/login',
        validationMiddleware(LoginUserDTO),
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

    // Cached route example: Get all users
    router.get('/users', async (req, res) => {
        const cacheKey = 'users';

        // Try to get cache data
        const cachedUsers = await redis.get(cacheKey);
        if (cachedUsers) return res.json(JSON.parse(cachedUsers));

        // If not cached, fetch from the database
        const users = await userRepository.find();

        // Cache the fetched data for 5 minutes
        await redis.set(cacheKey, JSON.stringify(users), 'EX', 60 * 5);

        return res.json(users);
    });

    // Admin-Only Route
    router.get('/admin', checkRole([UserRole.ADMIN]), (req, res) => {
        res.json({ message: 'Welcome to the admin panel!' });
    });

    return router;
};

export default router;
```

## STEP 4: Rebuild and Restart Your Docker Environment
Rebuild your Docker environment to apply the changes:
```bash
docker-compose down
docker-compose up --build
```

## STEP 5: Test Caching with Redis
- **Test Caching**: Access the `/users` route multiple times to see if the second and subsequent requests retrieve data from the cache.
- **Test Cache** Invalidation: Add a new user and ensure the `/users` route retrieves fresh data (not stale cached data).