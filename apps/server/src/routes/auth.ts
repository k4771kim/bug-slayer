import express, { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    // Validate request body
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      displayName: z.string().min(2, 'Display name must be at least 2 characters'),
    });

    const data = schema.parse(req.body);

    // Register user
    const result = await authService.register(
      data.email,
      data.password,
      data.displayName
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login an existing user
 */
router.post('/login', async (req, res, next) => {
  try {
    // Validate request body
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    });

    const data = schema.parse(req.body);

    // Login user
    const result = await authService.login(data.email, data.password);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new Error('UNAUTHORIZED');
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
