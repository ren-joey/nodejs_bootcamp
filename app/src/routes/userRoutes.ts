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