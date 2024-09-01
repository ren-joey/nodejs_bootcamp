# Implement Rate Limiting

## Introduction
Rate limiting is crucial for protecting your application from abuse, such as brute-force attacks or denial-of-service (DoS) attacks. It also helps manage server load and ensures fair usage among all clients.

Step-by-Step Guide:<br>
- **Install Rate Limiting Middleware**: Use a middleware like `express-rate-limit` to control the number of requests a client can make.
- **Configure Rate Limiting**: Set up rate limiting rules based on IP address or other criteria.
- **Integrate Redis for Distributed Rate Limiting**: Use Redis to store rate limit counters if you have a distributed system setup.
- **Apply Rate Limiting to Specific Routes or Globally**: Apply rate limiting to sensitive routes or globally across all routes.

## STEP 1: Implement Rate Limiting
We will use the `express-rate-limit` package to handle rate limiting in your Express application.
```bash
npm install express-rate-limit rate-limit-redis
```

## STEP 2: Configure Rate Limiting
Configure the rate limiter with specific rules. For example, you might want to allow a maximum of 10 requests per a minute per IP address.

Create `src/middleware/rateLimiter.ts`:
```ts
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../utils/redisClient';  // Import your Redis client

const rateLimiter = rateLimit({
    store: new RedisStore({
        // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
        sendCommand: (...args: string[]) => redisClient.call(...args),  // Use Redis client for storing rate limits
    }),
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 1 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default rateLimiter;
```
## STEP 3: Apply Rate Limiting Middleware
Apply the rate limiting middleware to your application. You can choose to apply it globally or to specific routes.

Update `index.ts` to Use Rate Limiter:
```ts
import express from 'express';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { initUserRoutes } from './routes/userRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';
import logger from './utils/logger';
import { requestLogger } from './middleware/requestLogger';
import { httpRequestDurationMicroseconds, register } from './utils/monitoring';
import rateLimiter from './middleware/rateLimiter';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter); // update here

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
            logger.warn('Authorization header missing');
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!);
            res.json({ message: 'This is a protected route', decoded });
        } catch (error) {
            logger.error('Invalid token:', error);
            res.status(401).json({ message: 'Invalid token' });
        }
    });

    // Expose /metrics endpoint for Prometheus
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    });

    // Request duration monitoring middleware
    app.use((req, res, next) => {
        const end = httpRequestDurationMicroseconds.startTimer();
        res.on('finish', () => {
            end({ route: req.route?.path || req.url, code: res.statusCode, method: req.method });
        });
        next();
    });

    // Apply the error handling middleware at the end
    app.use(errorMiddleware);

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch((error) => {
    logger.error('Database initialization failed:', error);
    console.log(error);
});
```

## STEP 4: Apply Rate Limiting to Specific Routes (Optional)
If you want to apply rate limiting only to specific routes, you can do so by using the middleware directly in your route definitions:
```ts
// app/src/routes/userRoutes.ts
// Apply rate limiter only to login route
router.post(
    '/login',
    rateLimiter,
    validationMiddleware(LoginUserDTO),
    async (req: Request, res: Response) => {
        // Login logic here
    }
);
```

## STEP 5: Rebuild and Restart Your Docker Environment
Rebuild your Docker environment to apply the changes:
```bash
docker-compose down
docker-compose up --build
```

## STEP 6: Test Rate Limiting
**Test Rate Limiting**: Send multiple requests to the same route to ensure that rate limiting is enforced. After exceeding the limit, the server should respond with the rate limit message.