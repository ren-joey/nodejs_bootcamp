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