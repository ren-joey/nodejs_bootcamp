# Implement Logging and Monitoring

## Introduction
To make your backend application more robust and production-ready, it's crucial to implement logging and monitoring. Logging helps you understand what's happening in your application by capturing critical information about errors, warnings, and other significant events. Monitoring allows you to keep an eye on your application's performance and resource usage.

Step-by-Step Guide
- Set Up a Logging Library: Use a logging library like `winston` to log messages in different formats (e.g., info, error).
- Integrate Logging with Middleware: Set up middleware to log requests and responses.
- Configure Application Monitoring: Use tools like Prometheus, Grafana, or third-party services to monitor your application.

## STEP 1: Modules Installation
Install the related packages:
```bash
npm install winston prom-client
```

## STEP 2: Create Logging Configuration File
Create a logger.ts file to configure logging:
```bash
touch src/utils/logger.ts
```
```ts
import { createLogger, format, transports } from "winston";

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
    ]
});

export default logger;
```
- `level`: Sets the minimum logging level. Messages below this level won't be logged.
- `transports`: Specifies where to send log messages (console, files, etc.).

## STEP 3: Add Request and Response Logging Middleware
Create a middleware at `src/middleware/requestLogger.ts` to log all incoming requests and their responses:
```ts
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
```

## STEP 4: Set Up Monitoring Tools
Set up a basic Prometheus client to collect and expose metrics.<br>
Create `src/utils/monitoring.ts`:
```ts
// src/utils/monitoring.ts
import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Create a histogram metric
const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000],  // Buckets for response time in ms
});

// Register the histogram
register.registerMetric(httpRequestDurationMicroseconds);

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

export { httpRequestDurationMicroseconds, register };
```

## STEP 5: Integrate Logging into Your Application
Update `index.ts` to Use the Logger:
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

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());
app.use(requestLogger); // update here

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
            logger.warn('Authorization header missing'); // update here
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!);
            res.json({ message: 'This is a protected route', decoded });
        } catch (error) {
            logger.error('Invalid token:', error); // update here
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
    logger.error('Database initialization failed:', error); // update here
    console.log(error);
});

```

## STEP 6: Update Catch Handling
Update all catch errors handling to logging tool.<br>
```ts
// src/middleware/errorMiddleware.ts
import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger"; // update here

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    logger.error('Error occurred:', err); // update here

    res.status(err.status || 500).json({
        message: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
```
```ts
// src/middleware/roleMiddleware.ts
import { NextFunction, Request, Response } from "express";
import { UserRole } from "../entity/User";
import jwt from 'jsonwebtoken';
import { ReqUser } from "../types/express";
import logger from "../utils/logger"; // update here

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
            logger.error('Invalid token:', error); // update here
            res.status(401).json({ message: 'Invalid token' });
        }
    };
};
```


## STEP 7: Rebuild and Restart Your Docker Environment
Rebuild your Docker environment to apply the changes:
```bash
docker-compose down
docker-compose up --build
```

## STEP 8: Test Logging and Monitoring
- **Check Logs**: Trigger some requests and check your console or log files (`logs/error.log` and logs`/combined.log`) to ensure logging works correctly.
- **Monitor Metrics**: Access [http://localhost:3000/metrics](http://localhost:3000/metrics) to see the Prometheus metrics exposed by your application.