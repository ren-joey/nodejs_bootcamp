import express from 'express';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import dotenv from 'dotenv';

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

    // Basic CRUD routes
    app.get('/users', async (req, res) => {
        const users = await userRepository.find();
        res.json(users);
    });

    app.post('/users', async (req, res) => {
        const user = userRepository.create(req.body);
        const result = await userRepository.save(user);
        res.json(result);
    });

    app.put('/users/:id', async (req, res) => {
        const user = await userRepository.findOneBy({ id: parseInt(req.params.id) });
        if (user) {
            userRepository.merge(user, req.body);
            const result = await userRepository.save(user);
            res.json(result);
        } else {
            res.status(404).send('User not found');
        }
    });

    app.delete('/users/:id', async (req, res) => {
        const result = await userRepository.delete(req.params.id);
        res.json(result);
    });

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`)
    });
}).catch((error) => console.log(error));
