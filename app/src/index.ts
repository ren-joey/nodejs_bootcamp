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
            console.log(error);
            res.status(401).json({ message: 'Invalid token' });
        }
    });

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch((error) => console.log(error));
